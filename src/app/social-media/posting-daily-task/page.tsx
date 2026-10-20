import { getSessionCookie } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PostingDailyTaskTable from '@/components/social-media/PostingDailyTaskTable'
import { getPostingDailyTasksAction } from '@/app/actions/postingDailyTask'

export const dynamic = 'force-dynamic'

export default async function PostingDailyTaskPage() {
  const sessionCookie = (await getSessionCookie())

  if (!sessionCookie) {
    redirect('/login')
  }

  const user = sessionCookie.user

  // Redirect users who are not Posting Team and not Admin/Manager
  const isAdmin = user.role === 'ADMIN' || user.role === 'MANAGER'
  if (!isAdmin && user.department !== 'Posting Team') {
    if (user.department === 'Editing Team' && user.role === 'EXEC') {
      redirect('/social-media/working-sheet')
    } else if (user.department === 'Graphics Team' || user.department === 'Graphics') {
      redirect('/social-media/graphics-working-sheet')
    } else {
      redirect('/social-media/vs') // Or wherever makes sense
    }
  }

  const { records } = await getPostingDailyTasksAction()

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 600 }}>Daily Additional Task</h1>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(59, 130, 246, 0.15)',
            padding: '4px 12px',
            borderRadius: '100px',
            marginTop: '8px',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}>
              Social Media / Posting Team
            </span>
          </div>
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <PostingDailyTaskTable initialData={records} currentUser={user} />
      </div>
    </>
  )
}
