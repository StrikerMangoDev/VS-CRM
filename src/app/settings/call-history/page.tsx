import { getCallPage } from '@/app/actions/lead-query'
import { getSessionCookie } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CallHistoryClient from './CallHistoryClient'
import HourlyReportButton from '@/components/HourlyReportButton'

export const dynamic = 'force-dynamic'

export default async function CallHistoryPage({ searchParams }: { searchParams: Promise<{ start?: string, end?: string }> }) {
  const sessionCookie = (await getSessionCookie())
  
  if (!sessionCookie || !sessionCookie.value) {
    redirect('/login')
  }

  const { start, end } = await searchParams;

  let currentUser;
  try {
    currentUser = sessionCookie.user
  } catch {
    redirect('/login')
  }
  const isAdmin = currentUser.role === 'ADMIN'
  const isManager = currentUser.role === 'MANAGER'
  
  const startDate=start?new Date(start):null,endDate=end?new Date(end):startDate?new Date(startDate):null
  startDate?.setHours(0,0,0,0);endDate?.setHours(23,59,59,999)
  const initialPage=await getCallPage({mode:'HISTORY',start:startDate?.toISOString(),end:endDate?.toISOString(),size:50})
  const uniqueCallers=initialPage.callers

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/settings" style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '40px', height: '40px', borderRadius: '12px',
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          color: 'var(--text-primary)', transition: 'all 0.2s', textDecoration: 'none'
        }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 600 }}>Call History</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {isAdmin || isManager ? 'View all call logs and recordings across the system.' : 'View your recent call logs and recordings.'}
          </p>
        </div>
        </div>
        
        {/* Hourly Report Button on the far right */}
        {(isAdmin || isManager) && (
          <HourlyReportButton uniqueCallers={uniqueCallers} />
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <CallHistoryClient initialPage={initialPage} isAdmin={isAdmin || isManager} />
      </div>
    </div>
  )
}
