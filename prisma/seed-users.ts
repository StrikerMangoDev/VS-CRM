import { PrismaClient } from '@prisma/client'
import Database from 'better-sqlite3'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL as string || 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding users for authentication...')

  // 1. Admin
  await prisma.user.upsert({
    where: { email: 'admin@vscrm.com' },
    update: { role: 'ADMIN', department: 'ALL' },
    create: { email: 'admin@vscrm.com', name: 'Admin User', role: 'ADMIN', department: 'ALL' },
  })

  // 2. Sales
  await prisma.user.upsert({
    where: { email: 'sales@vscrm.com' },
    update: { role: 'EXEC', department: 'SALES' },
    create: { email: 'sales@vscrm.com', name: 'Sales Executive', role: 'EXEC', department: 'SALES' },
  })

  // 3. Recovery
  await prisma.user.upsert({
    where: { email: 'recovery@vscrm.com' },
    update: { role: 'EXEC', department: 'RECOVERY' },
    create: { email: 'recovery@vscrm.com', name: 'Recovery Executive', role: 'EXEC', department: 'RECOVERY' },
  })

  // 4. Technical
  await prisma.user.upsert({
    where: { email: 'tech@vscrm.com' },
    update: { role: 'EXEC', department: 'TECHNICAL' },
    create: { email: 'tech@vscrm.com', name: 'Technical Executive', role: 'EXEC', department: 'TECHNICAL' },
  })

  console.log('Users seeded successfully.')
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
