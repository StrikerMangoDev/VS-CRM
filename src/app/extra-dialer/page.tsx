import { getCallPage } from '@/app/actions/lead-query'
import { getSessionCookie } from '@/lib/auth'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import ExtraDialerClient from './ExtraDialerClient'

export const dynamic = 'force-dynamic'

export default async function ExtraDialerPage() {
  const session = (await getSessionCookie())?.value
  
  if (!session) {
    redirect('/login')
  }

  const initialPage=await getCallPage({mode:'DIALER',leadStatus:'ACTIVE',size:50})

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 24px 0 24px' }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 600 }}>Extra Dialer</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Manually dial numbers not in the CRM and track them.
        </p>
      </div>
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <Suspense fallback={<div style={{ color: 'var(--text-muted)' }}>Loading...</div>}>
          <ExtraDialerClient initialPage={initialPage} />
        </Suspense>
      </div>
    </div>
  )
}
