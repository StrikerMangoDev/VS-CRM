import { getLeadPage } from '@/app/actions/lead-query';
import { getSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SimpleLeadTable from '@/components/SimpleLeadTable';
import NewLeadButton from '@/components/NewLeadButton';
import BulkUploadButton from '@/components/BulkUploadButton';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';

// We need to instantiate Prisma inside the component or server action

export default async function PartPaymentSheet() {
  const sessionCookie = (await getSessionCookie());
  
  if (!sessionCookie) {
    redirect('/login');
  }
  
  const user = sessionCookie.user;
  const isAdmin = user.role === 'ADMIN';

  if (!isAdmin && user.mainDepartment === 'Social Media') {
    redirect('/social-media/vs');
  }

  if (user.department === 'SALES' && user.role === 'EXEC') {
    redirect('/sales/issues');
  }

  const initialPage=await getLeadPage({sheet:'PART_PAYMENT',size:50})

  const customColumns = await prisma.customColumn.findMany({
    where: { departmentTarget: 'PART_PAYMENT' }
  })

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 600 }}>Part Payment Sheet</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <BulkUploadButton 
            defaultPaymentStatus="PART_PAYMENT" 
            customColumns={customColumns}
            baseColumns={['Name', 'Mobile', 'Email', 'Webinar ID', 'State', 'Part Payment', 'Payment Date']}
          />
          <NewLeadButton defaultPaymentStatus="PART_PAYMENT" />
        </div>
      </div>

      <SimpleLeadTable initialPage={initialPage} isAdmin={isAdmin} customColumns={customColumns} sheetName="PART_PAYMENT" />
    </>
  )
}
