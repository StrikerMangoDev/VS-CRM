import { NextRequest,NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { nextRecordId } from '@/lib/ids'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, emailId, mobileNumber, issueTypeId } = await req.json()
  if (![name, mobileNumber, issueTypeId].every(v => typeof v === 'string' && v.trim())) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  const ids = await prisma.issue.findMany({ select: { issueId: true } })
  const issueId = await nextRecordId('ISS-', ids.map(i => i.issueId), 4)
  const defaultStatus = await prisma.issueDropdownValue.findFirst({ where: { type: 'ISSUE_STATUS', value: 'Unassigned/Open' } })
  const issue = await prisma.issue.create({ data: {
    issueId, name, emailId, mobileNumber, issueTypeId, creatorId: user.id, issueStatusId: defaultStatus?.id,
    histories: { create: { userId: user.id, action: 'CREATED' } },
  } })
  return NextResponse.json(issue)
}
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const status = req.nextUrl.searchParams.get('status')
  const scope = user.role === 'ADMIN' ? {} : user.department === 'TECHNICAL'
    ? { OR: [{ leadOwnerId: null }, { leadOwnerId: user.id }] }
    : ['TL', 'MANAGER'].includes(user.role) ? { creator: { department: user.department, mainDepartment: user.mainDepartment } } : { creatorId: user.id }
  const issues = await prisma.issue.findMany({ where: { ...scope, ...(status ? { status } : {}) },
    include: { issueType: true, issueStatus: true, actualIssue: true, creator: { select: { name: true, department: true } }, leadOwner: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(issues)
}
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const input = await req.json()
  if (typeof input.id !== 'string') return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
  const existing = await prisma.issue.findUnique({ where: { id: input.id }, include: { creator: { select: { department: true, mainDepartment: true } } } })
  if (!existing) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
  const manager = ['TL', 'MANAGER'].includes(user.role) && existing.creator.department === user.department && existing.creator.mainDepartment === user.mainDepartment
  if (user.role !== 'ADMIN' && existing.creatorId !== user.id && existing.leadOwnerId !== user.id && !manager) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (input.status !== undefined && !['OPEN','CLOSED'].includes(input.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  if (input.leadOwnerId !== undefined && user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const fields = ['issueStatusId','actualIssueId','remark','leadOwnerId','status'] as const
  const changes = fields.filter(field => input[field] !== undefined && input[field] !== existing[field])
  for (const field of changes) if (input[field] !== null && typeof input[field] !== 'string') return NextResponse.json({ error: 'Invalid value' }, { status: 400 })
  const actions = { issueStatusId: 'STATUS_CHANGED', actualIssueId: 'ACTUAL_ISSUE_CHANGED', remark: 'REMARK_UPDATED', leadOwnerId: 'ASSIGNED', status: input.status === 'CLOSED' ? 'CLOSED' : 'STATUS_CHANGED' }
  const updated = await prisma.issue.update({ where: { id: input.id }, data: {
    ...Object.fromEntries(changes.map(field => [field, input[field]])),
    histories: { create: changes.map(field => ({ userId: user.id, action: actions[field], fieldName: field, oldValue: existing[field], newValue: input[field] })) },
  }, include: { issueType: true, issueStatus: true, actualIssue: true, creator: { select: { name: true, department: true } }, leadOwner: { select: { name: true } } } })
  return NextResponse.json(updated)
}
