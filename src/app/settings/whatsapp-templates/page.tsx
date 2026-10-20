import { getSessionCookie } from '@/lib/auth'
import { redirect } from 'next/navigation'
import WhatsAppTemplatesClient from './WhatsAppTemplatesClient'

export const dynamic = 'force-dynamic'

export default async function WhatsAppTemplatesPage() {
  const sessionCookie = (await getSessionCookie())
  
  if (!sessionCookie) {
    redirect('/login')
  }

  let user: import('@/lib/public-user').PublicUser | null = null
  try {
    user = sessionCookie.user
  } catch {
    redirect('/login')
  }

  const isAdmin = user.role === 'ADMIN'
  const isManager = user.role === 'MANAGER'
  const isTL = user.role === 'TL'
  const isSocialMedia = user.mainDepartment === 'Social Media' || ['Editing Team', 'Graphics Team', 'Posting Team', 'Other Team'].includes(user.department)
  const isSalesDept = !isSocialMedia && (user.department === 'SALES' || user.mainDepartment === 'Sales Department')
  
  // Only Sales Department TL, Manager, and Admin can view and edit templates
  // Under no circumstances can Social Media department users access this!
  const canManageWhatsApp = !isSocialMedia && (isAdmin || ((isManager || isTL) && isSalesDept))

  if (!canManageWhatsApp) {
    redirect('/settings')
  }

  return <WhatsAppTemplatesClient userRole={user.role} userDept={user.department} />
}
