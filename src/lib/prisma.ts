import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { transactionContext } from './transaction'

const globalDb = globalThis as unknown as { crmDb?: ReturnType<typeof createClient> }
function createClient() {
  const pool = new Pool({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL, max: 10 })
  return new PrismaClient({ adapter: new PrismaPg(pool), omit: {
    user: { password: true, resetToken: true, resetTokenExpiry: true },
  } })
}
const client = globalDb.crmDb ?? createClient()
if (process.env.NODE_ENV !== 'production') globalDb.crmDb = client
export const prisma = new Proxy(client, {
  get(target, property) {
    const active = transactionContext.getStore() ?? target
    const value = Reflect.get(active, property)
    return typeof value === 'function' ? value.bind(active) : value
  },
})
export async function withLeadTransaction<T>(work: () => Promise<T>): Promise<T> {
  if (transactionContext.getStore()) return work()
  class RollbackResult { constructor(readonly value: T) {} }
  try { return await client.$transaction(async tx => {
    // Serialize lead transitions and legacy ID allocation across workers.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(836172)`
    const result = await transactionContext.run(tx, work)
    if (result && typeof result === 'object' && 'error' in result && result.error) throw new RollbackResult(result)
    return result
  }, { maxWait: 15000, timeout: 60000 })
  } catch (error) { if (error instanceof RollbackResult) return error.value; throw error }
}
