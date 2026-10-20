import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL as string || 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  const users = await prisma.user.findMany({
    where: { password: null }
  })

  if (users.length === 0) {
    console.log('All users already have passwords set.')
    return
  }

  console.log(`Found ${users.length} users without passwords. Seeding default password '123456'...`)

  const hashedPassword = await bcrypt.hash('123456', 10)

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    })
    console.log(`Updated password for ${user.email}`)
  }

  console.log('Successfully seeded default passwords for all users.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
