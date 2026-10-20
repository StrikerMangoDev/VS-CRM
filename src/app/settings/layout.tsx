import { getSessionCookie } from '@/lib/auth'
import React from 'react'
import { redirect } from 'next/navigation'
import SettingsSidebar from './SettingsSidebar'

export const dynamic = 'force-dynamic'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const sessionCookie = (await getSessionCookie())
  
  if (!sessionCookie || !sessionCookie.value) {
    redirect('/login')
  }

  let user;
  try {
    user = sessionCookie.user
  } catch {
    redirect('/login')
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', gap: '20px' }}>
      <SettingsSidebar user={user} />
      <div className="glass-panel" style={{ flex: 1, overflowY: 'auto', padding: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}
