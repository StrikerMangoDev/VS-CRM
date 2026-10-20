import { getSessionCookie } from '@/lib/auth'
import TeamTable from '@/components/TeamTable'
import { redirect } from 'next/navigation'
import { getDropdownsForSheet } from '@/lib/dropdowns'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'


export default async function TeamManagementPage() {
  const sessionCookie = (await getSessionCookie())
  
  if (!sessionCookie) redirect('/login')
  
  const user = sessionCookie.user
  
  const isSocialMedia = user.mainDepartment === 'Social Media' || ['Editing Team', 'Graphics Team', 'Posting Team', 'Other Team'].includes(user.department)
  const isSalesDept = !isSocialMedia && (user.department === 'SALES' || user.mainDepartment === 'Sales Department')
  const isSalesTL = user.role === 'TL' && isSalesDept

  if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && !isSalesTL) {
    redirect('/') // Only Admins, Managers, and Sales TLs can access
  }

  const users = await prisma.user.findMany({
    where: (user.role === 'MANAGER' || isSalesTL) ? { mainDepartment: user.mainDepartment } : undefined,
    orderBy: { createdAt: 'desc' }
  })
  
  const teamDataDropdowns = await getDropdownsForSheet('Teams Module')
  
  const orgDepartments = await prisma.orgDepartment.findMany({
    include: {
      teams: true
    }
  });

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ marginBottom: '16px', flexShrink: 0 }}>
        <Link href="/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, transition: 'color 0.2s' }}>
          <ArrowLeft size={16} /> Back to Settings
        </Link>
      </div>
      <TeamTable users={users} currentUserId={user.id} dropdowns={teamDataDropdowns} orgDepartments={orgDepartments} />
    </div>
  )
}
