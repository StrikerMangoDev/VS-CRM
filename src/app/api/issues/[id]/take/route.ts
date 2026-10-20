import { NextRequest,NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.department !== 'TECHNICAL') return NextResponse.json({ error: 'Unauthorized. Only Technical executives can take issues.' }, { status: 401 })
  const { id } = await params
  try {
    const result = await prisma.$transaction(async tx => {
      const claim = await tx.issue.updateMany({ where: { id, leadOwnerId: null, status: 'OPEN' }, data: { leadOwnerId: user.id } })
      if (claim.count !== 1) throw new Error('Issue is unavailable or has already been taken')
      await tx.issueHistory.create({ data: { issueId: id, userId: user.id, action: 'ASSIGNED', fieldName: 'Lead Owner', newValue: user.name } })
      return tx.issue.findUnique({ where: { id }, include: { issueType: true, issueStatus: true, actualIssue: true, creator: { select: { name: true, department: true } }, leadOwner: { select: { name: true } } } })
    })
    return NextResponse.json(result)
  } catch { return NextResponse.json({ error: 'Issue is unavailable or has already been taken' }, { status: 409 }) }
}
