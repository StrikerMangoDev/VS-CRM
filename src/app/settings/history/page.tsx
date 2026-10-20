import { getSessionCookie } from '@/lib/auth'
import GlobalHistorySection from '@/components/GlobalHistorySection'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const sessionCookie = (await getSessionCookie())
  
  if (!sessionCookie) {
    redirect('/login')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '24px' }}>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <GlobalHistorySection currentUser={sessionCookie.user} />
      </div>
    </div>
  )
}
