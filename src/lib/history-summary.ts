import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
type CallSummary = { leadId: string; userId: string; createdAt: Date; count: number; duration: number; user: { id: string; name: string; department: string; subTeam: string | null } }
type AuditSummary = { leadId: string; createdAt: Date; newValue: string; count: number }
export async function getLeadHistorySummary(ids: string[]) {
  const calls: Record<string, CallSummary[]> = {}, audits: Record<string, AuditSummary[]> = {}
  if (!ids.length) return { calls, audits }
  const callRows = await prisma.$queryRaw<CallSummary[]>(Prisma.sql`
    SELECT c."leadId", c."userId",
      date_trunc('day', c."createdAt" + interval '330 minutes') - interval '330 minutes' AS "createdAt",
      count(*)::int AS count, sum(c.duration)::int AS duration,
      json_build_object('id', u.id, 'name', u.name, 'department', u.department, 'subTeam', u."subTeam") AS "user"
    FROM "CallRecord" c JOIN "User" u ON u.id = c."userId"
    WHERE c."leadId" IN (${Prisma.join(ids)})
    GROUP BY c."leadId", c."userId", 3, u.id ORDER BY 3 DESC
  `)
  const auditRows = await prisma.$queryRaw<AuditSummary[]>(Prisma.sql`
    SELECT "leadId", date_trunc('day', "createdAt" + interval '330 minutes') - interval '330 minutes' AS "createdAt",
      "newValue", count(*)::int AS count
    FROM "AuditHistory" WHERE "leadId" IN (${Prisma.join(ids)}) AND field = 'Call Status'
    GROUP BY "leadId", 2, "newValue" ORDER BY 2 DESC
  `)
  for (const row of callRows) (calls[row.leadId] ??= []).push(row)
  for (const row of auditRows) (audits[row.leadId] ??= []).push(row)
  return { calls, audits }
}

