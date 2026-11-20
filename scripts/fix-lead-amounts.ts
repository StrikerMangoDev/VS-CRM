import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- Starting Lead Payment Fields Reconciliation ---');
  
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { recoveryAmount: { gt: 0 } },
        { salesAmount: { gt: 0 } },
        { partPaymentAmount: { gt: 0 } }
      ]
    },
    include: {
      assignments: {
        include: { user: true }
      }
    }
  });

  console.log(`Found ${leads.length} leads with payment fields to check.`);

  let updatedCount = 0;

  for (const lead of leads) {
    const partPay = lead.partPaymentAmount || 0;
    const fullPay = lead.fullPaymentAmount || 0;
    const amountSum = (lead.amount1 || 0) + (lead.amount2 || 0) + (lead.amount3 || 0);

    const isRecovery = lead.assignments && lead.assignments.some(a => a.user.department === 'RECOVERY');
    const isSales = lead.assignments && lead.assignments.some(a => a.user.department === 'SALES');

    let correctRecovery = lead.recoveryAmount || 0;
    let correctSales = lead.salesAmount || 0;

    if (isRecovery) {
      // Recovery revenue NEVER includes the initial part payment
      if (amountSum > 0) {
        correctRecovery = amountSum;
      } else if (correctRecovery >= (lead.totalPayment || 0) && partPay > 0) {
        correctRecovery = Math.max(0, correctRecovery - partPay);
      }
      if (!isSales) {
        correctSales = 0;
      }
    } else if (isSales) {
      if (partPay > 0 || fullPay > 0) {
        correctSales = amountSum;
      }
      correctRecovery = 0;
    } else {
      // Unassigned
      if (partPay > 0) {
        correctRecovery = amountSum;
        correctSales = 0;
      } else if (fullPay > 0) {
        correctRecovery = 0;
        correctSales = 0;
      } else {
        correctRecovery = 0;
      }
    }

    const correctTotal = Math.max(lead.totalPayment || 0, partPay + fullPay + correctSales + correctRecovery);

    if (
      lead.recoveryAmount !== correctRecovery ||
      lead.salesAmount !== correctSales ||
      lead.totalPayment !== correctTotal
    ) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          recoveryAmount: correctRecovery,
          salesAmount: correctSales,
          totalPayment: correctTotal
        }
      });
      updatedCount++;
    }
  }

  console.log(`--- Finished. Corrected ${updatedCount} leads. ---`);
}

main()
  .catch(err => {
    console.error('Error running fix script:', err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
