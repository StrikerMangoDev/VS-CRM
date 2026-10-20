const assert = require('node:assert/strict')
const { PrismaClient } = require('@prisma/client'), { PrismaPg } = require('@prisma/adapter-pg'), { Pool } = require('pg')
assert.equal(process.env.APP_URL, 'https://vscrm.orgogo.com')
const tag = 'E2E20261020A'
const pool = new Pool({ connectionString: process.env.DATABASE_URL }), db = new PrismaClient({ adapter: new PrismaPg(pool) })
async function main() {
  const mode = process.argv[2]
  assert.ok(['seed', 'verify', 'cleanup'].includes(mode))
  if (mode === 'seed') {
    assert.equal(await db.webinarCategory.count({ where: { code: tag } }), 0)
    await db.webinarCategory.create({ data: { code: tag, name: 'E2E disposable category ' + tag } })
    console.log('Temporary webinar category created; no existing configuration changed')
  }
  const leads = await db.lead.findMany({ where: { email: 'e2e-live-20261020a@example.invalid' }, select: { id: true, name: true, state: true, paymentStatus: true, totalPayment: true, webinarId: true } })
  console.log(JSON.stringify({ temporaryLeads: leads }))
  if (mode === 'cleanup') {
    await db.$transaction(async tx => {
      const ids = leads.map(item => item.id)
      await tx.actionLog.deleteMany({ where: { leadId: { in: ids } } })
      await tx.assignment.deleteMany({ where: { leadId: { in: ids } } })
      await tx.lead.deleteMany({ where: { id: { in: ids } } })
      await tx.webinarMaster.deleteMany({ where: { category: { code: tag } } })
      await tx.webinarCategory.deleteMany({ where: { code: tag } })
    })
    assert.equal(await db.lead.count({ where: { email: 'e2e-live-20261020a@example.invalid' } }), 0)
    console.log('Only the tagged disposable live fixtures were removed')
  }
}
main().catch(() => { console.error('Live fixture operation failed'); process.exitCode = 1 }).finally(async () => { await db.$disconnect(); await pool.end() })
