import { getSessionCookie } from '@/lib/auth'
import { redirect } from 'next/navigation'
import WebinarTable from '@/components/WebinarTable'
import { getWebinars,getWebinarCategories } from '@/app/actions/webinar'
import { getDropdownsForSheet } from '@/lib/dropdowns'

export default async function WebinarsPage() {
  const sessionCookie = (await getSessionCookie())
  
  if (!sessionCookie) {
    redirect('/login')
  }

  const user = sessionCookie.user
  const webinars = await getWebinars()
  const categories = await getWebinarCategories()
  const webinarSheetDropdowns = await getDropdownsForSheet('Webinars Module')

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '24px' }}>
      <div style={{ marginBottom: '24px', flexShrink: 0 }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Webinars</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px', marginBottom: 0 }}>Access webinar resources and recordings</p>
      </div>
      
      <WebinarTable webinars={webinars} categories={categories} currentUser={user} dropdowns={webinarSheetDropdowns} />
    </div>
  )
}
