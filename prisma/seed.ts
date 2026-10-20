import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import Database from 'better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL as string || 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // Create Users
  const tlSales = await prisma.user.upsert({
    where: { email: 'tl.sales@vscrm.com' },
    update: {},
    create: {
      email: 'tl.sales@vscrm.com',
      name: 'Sarah Sales (TL)',
      role: 'TL',
      department: 'SALES',
    },
  })

  const execSales = await prisma.user.upsert({
    where: { email: 'exec.sales@vscrm.com' },
    update: {},
    create: {
      email: 'exec.sales@vscrm.com',
      name: 'Sam Sales (Exec)',
      role: 'EXEC',
      department: 'SALES',
    },
  })

  const tlRecovery = await prisma.user.upsert({
    where: { email: 'tl.recovery@vscrm.com' },
    update: {},
    create: {
      email: 'tl.recovery@vscrm.com',
      name: 'Rick Recovery (TL)',
      role: 'TL',
      department: 'RECOVERY',
    },
  })

  const execRecovery = await prisma.user.upsert({
    where: { email: 'exec.recovery@vscrm.com' },
    update: {},
    create: {
      email: 'exec.recovery@vscrm.com',
      name: 'Rachel Recovery (Exec)',
      role: 'EXEC',
      department: 'RECOVERY',
    },
  })

  const tlTech = await prisma.user.upsert({
    where: { email: 'tl.tech@vscrm.com' },
    update: {},
    create: {
      email: 'tl.tech@vscrm.com',
      name: 'Tom Tech (TL)',
      role: 'TL',
      department: 'TECHNICAL',
    },
  })

  const execTech = await prisma.user.upsert({
    where: { email: 'exec.tech@vscrm.com' },
    update: {},
    create: {
      email: 'exec.tech@vscrm.com',
      name: 'Tim Tech (Exec)',
      role: 'EXEC',
      department: 'TECHNICAL',
      subTeam: 'TECH',
    },
  })

  // Create Leads
  const leads = [
    { uniqueId: 'WEB-01-0001', name: 'John Doe', mobileNumber: '1234567890', paymentStatus: 'NO_PAYMENT' },
    { uniqueId: 'WEB-01-0002', name: 'Jane Smith', mobileNumber: '0987654321', paymentStatus: 'PART_PAYMENT', totalPayment: 3000 },
    { uniqueId: 'WEB-01-0003', name: 'Alice Johnson', mobileNumber: '5551112222', paymentStatus: 'FULL_PAYMENT', totalPayment: 10000, whatsappJoined: false },
    { uniqueId: 'WEB-01-0004', name: 'Bob Williams', mobileNumber: '5553334444', paymentStatus: 'PART_PAYMENT', totalPayment: 5000 },
    { uniqueId: 'WEB-01-0005', name: 'Charlie Brown', mobileNumber: '5557778888', paymentStatus: 'NO_PAYMENT' },
  ]

  for (const leadData of leads) {
    await prisma.lead.upsert({
      where: { uniqueId: leadData.uniqueId },
      update: {},
      create: leadData,
    })
  }

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
