import { createHash,randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

export const safeUserSelect = {
  id: true, email: true, name: true, role: true, department: true,
  mainDepartment: true, subTeam: true, isActive: true, mobileNumber: true,
  employeeId: true, createdAt: true, updatedAt: true,
} as const
export type SessionUser = Awaited<ReturnType<typeof requireUser>>
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
export const cookieOptions = {
  httpOnly: true, sameSite: 'lax' as const, path: '/',
  secure: process.env.APP_URL ? new URL(process.env.APP_URL).protocol === 'https:' : process.env.NODE_ENV === 'production',
}
export async function resolveSession(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null
  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenHash(token) }, include: { user: { select: safeUserSelect } },
  })
  return session && session.expiresAt > new Date() && session.user.isActive ? session.user : null
}
export async function getCurrentUser() {
  return resolveSession((await cookies()).get('vscrm_session')?.value)
}
// Existing page callers consume this safe, server-derived identity.
export async function getSessionCookie() {
  const user = await getCurrentUser()
  return user ? { value: JSON.stringify(user), user } : undefined
}
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}
export async function requireRoles(...roles: string[]) {
  const user = await requireUser()
  if (!roles.includes(user.role)) throw new Error('Forbidden')
  return user
}
export const isSocial = (user: { mainDepartment: string; department: string }) =>
  user.mainDepartment === 'Social Media' || ['Editing Team', 'Graphics Team', 'Posting Team', 'Other Team', 'Thumbnail Team'].includes(user.department)
export async function requireSales(manager = false) {
  const user = await requireUser()
  if (user.role !== 'ADMIN' && (isSocial(user) || (manager && !['TL', 'MANAGER'].includes(user.role)))) throw new Error('Forbidden')
  return user
}
export async function requireSocial(manager = false) {
  const user = await requireUser()
  if (user.role !== 'ADMIN' && (!isSocial(user) || (manager && !['TL', 'MANAGER'].includes(user.role)))) throw new Error('Forbidden')
  return user
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex')
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  await prisma.session.create({ data: {
    tokenHash: tokenHash(token), userId, expiresAt: new Date(Date.now() + 7 * 86400000),
  } })
  ;(await cookies()).set('vscrm_session', token, { ...cookieOptions, maxAge: 7 * 86400 })
}
export async function requireLeadAccess(leadId: string, management = false) {
  const user = await requireSales(management)
  if (user.role === 'ADMIN') return user
  const lead = await prisma.lead.findFirst({ where: {
    id: leadId, ...(management || ['TL', 'MANAGER'].includes(user.role)
      ? { OR: [{ assignments: { none: {} } }, { assignments: { some: { user: { mainDepartment: user.mainDepartment } } } }] }
      : { assignments: { some: { userId: user.id } } }),
  }, select: { id: true } })
  if (!lead) throw new Error('Forbidden: lead is outside your assignment scope')
  return user
}

export async function requireIssueAccess(issueId: string) {
  const user = await requireSales()
  const issue = await prisma.issue.findUnique({ where: { id: issueId }, include: { creator: { select: safeUserSelect } } })
  if (!issue || (user.role !== 'ADMIN' && issue.creatorId !== user.id && issue.leadOwnerId !== user.id && !(['TL', 'MANAGER'].includes(user.role) && issue.creator.mainDepartment === user.mainDepartment && issue.creator.department === user.department))) throw new Error('Forbidden')
  return user
}
export function contentScope(user: SessionUser) {
  if (user.role === 'ADMIN' || user.role === 'MANAGER') return {}
  if (user.role === 'TL') {
    if (user.department === 'Editing Team') return { format: { in: ['Long Video', 'Short / Reel'] } }
    if (user.department === 'Graphics Team') return { format: { in: ['Post', 'Carousel', 'Story', 'Graphics Task'] } }
    return {}
  }
  if (['Posting Team', 'Thumbnail Team'].includes(user.department)) return {}
  if (user.department === 'Editing Team') return { editorId: user.id }
  if (user.department === 'Graphics Team') return { graphicDesignerId: user.id }
  return { OR: [{ editorId: user.id }, { graphicDesignerId: user.id }] }
}
export async function requireContentAccess(id: string) {
  const user = await requireSocial()
  const record = await prisma.contentRecord.findFirst({ where: { id, ...contentScope(user) } })
  if (!record) throw new Error('Forbidden')
  return { user, record }
}
export async function requireTaskAccess(id?: string, mode: 'edit' | 'delete' | 'create' = 'edit') {
  const user = await requireSocial()
  const manages = ['ADMIN', 'MANAGER'].includes(user.role) || user.department === 'Other Team'
  if (mode === 'create' && !manages) throw new Error('Forbidden')
  if (mode === 'delete' && ['Editing Team', 'Graphics Team'].includes(user.department) && !['ADMIN', 'MANAGER'].includes(user.role)) throw new Error('Forbidden')
  if (id) {
    const task = await prisma.taskRecord.findUnique({ where: { id } })
    if (!task || (!manages && (task.assignedToId ? task.assignedToId !== user.id : task.assignedDepartment !== user.department))) throw new Error('Forbidden')
  }
  return user
}
export async function requireTeamAccess(targetId?: string, proposed?: { role: string; mainDepartment: string; department: string }) {
  const actor = await requireRoles('ADMIN', 'MANAGER', 'TL')
  if (actor.role !== 'ADMIN') {
    if (actor.role === 'TL' && isSocial(actor)) throw new Error('Forbidden')
    if (proposed && (proposed.mainDepartment !== actor.mainDepartment || !['EXEC', 'TL'].includes(proposed.role) || (actor.role === 'TL' && proposed.role !== 'EXEC'))) throw new Error('Forbidden: cannot grant that role or department')
    if (targetId) {
      const target = await prisma.user.findUnique({ where: { id: targetId }, select: safeUserSelect })
      if (!target || target.mainDepartment !== actor.mainDepartment || target.role === 'ADMIN' || target.role === 'MANAGER' || (actor.role === 'TL' && target.role !== 'EXEC')) throw new Error('Forbidden: user is outside your management scope')
    }
  }
  return actor
}
export async function requireModuleAccess(moduleId: string, departmentId?: string) {
  const user = await requireUser()
  const orgModule = await prisma.orgModule.findUnique({ where: { id: moduleId }, include: { department: true, allowedTeams: true } })
  if (!orgModule || (departmentId && orgModule.departmentId !== departmentId)) throw new Error('Module not found')
  const matchesDepartment = (orgModule.department.userMatchRule || orgModule.department.name) === user.mainDepartment
  const matchesTeam = orgModule.allowedTeams.some(t => t.departmentId === orgModule.departmentId && (t.userMatchRule || t.name) === user.department)
  if (user.role !== 'ADMIN' && orgModule.ownerId !== user.id && orgModule.department.managerId !== user.id && !(matchesDepartment && matchesTeam)) throw new Error('Forbidden')
  return orgModule
}
export async function consumeAttempt(key: string, limit: number, seconds: number) {
  const now = Date.now()
  const bucket = Math.floor(now / (seconds * 1000))
  const counter = await prisma.securityAttempt.upsert({
    where: { key: key + ':' + bucket },
    create: { key: key + ':' + bucket, attempts: 1, expiresAt: new Date((bucket + 1) * seconds * 1000) },
    update: { attempts: { increment: 1 } },
  })
  await prisma.securityAttempt.deleteMany({ where: { expiresAt: { lt: new Date(now) } } })
  return counter.attempts <= limit
}

