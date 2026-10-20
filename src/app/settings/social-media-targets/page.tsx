import { getSessionCookie } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getSocialMediaTargetsAction } from '@/app/actions/socialMediaTargets'
import SocialMediaTargetsManager from '@/components/SocialMediaTargetsManager'

export const dynamic = 'force-dynamic'

export default async function SocialMediaTargetsPage() {
  const sessionCookie = (await getSessionCookie())

  if (!sessionCookie) {
    redirect('/login')
  }

  const user = sessionCookie.user
  const isAdmin = user.role === 'ADMIN'
  const isManager = user.role === 'MANAGER'
  const isSocialMedia = user.mainDepartment === 'Social Media' || ['Editing Team', 'Graphics Team', 'Posting Team', 'Other Team'].includes(user.department)
  
  if (!isAdmin && !(isManager && isSocialMedia)) {
    redirect('/settings')
  }

  const { users, canEdit, currentUser } = await getSocialMediaTargetsAction()

  return (
    <div className="glass-panel" style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <SocialMediaTargetsManager 
        initialUsers={users} 
        canEdit={canEdit} 
        currentUser={currentUser} 
      />
    </div>
  )
}
