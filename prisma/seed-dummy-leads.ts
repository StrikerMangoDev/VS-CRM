import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import Database from 'better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL as string || 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding 300 dummy leads...')
  
  const paymentStatuses = ['NO_PAYMENT', 'PART_PAYMENT', 'FULL_PAYMENT']
  const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'WA']
  
  const dummyLeads = []
  
  for (let i = 1; i <= 300; i++) {
    const paddedId = String(i).padStart(4, '0')
    const uniqueId = `DUMMY-${Date.now()}-${paddedId}`
    
    const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)]
    
    let totalPayment = 0
    if (paymentStatus === 'PART_PAYMENT') {
      totalPayment = Math.floor(Math.random() * 5000) + 1000
    } else if (paymentStatus === 'FULL_PAYMENT') {
      totalPayment = 10000
    }
    
    dummyLeads.push({
      uniqueId,
      name: `Dummy Lead ${i}`,
      mobileNumber: `555${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`,
      email: `dummy${i}@example.com`,
      paymentStatus,
      totalPayment,
      state: states[Math.floor(Math.random() * states.length)],
      webinarName: 'Masterclass 2026',
    })
  }
  
  const result = await prisma.lead.createMany({
    data: dummyLeads,
  })
  
  console.log(`Successfully added ${result.count} dummy leads.`)
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
