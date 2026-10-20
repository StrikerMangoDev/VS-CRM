import { getSessionCookie } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdCreativeSheetTable from '@/components/social-media/AdCreativeSheetTable'
import { getAdCreativeRecordsAction } from '@/app/actions/adCreative'

export const dynamic = 'force-dynamic'

export default async function AdCreativeSheetPage() {
  const sessionCookie = (await getSessionCookie())

  if (!sessionCookie) {
    redirect('/login')
  }

  const user = sessionCookie.user
  const { records, editors, canApprove } = await getAdCreativeRecordsAction()

  return (
    <>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: 700, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Ad Creative Sheet</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
              Social Media / {user.department === 'ALL' ? 'All Teams' : user.department}
            </span>
            {canApprove && (
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                Manager Approval Enabled
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <AdCreativeSheetTable 
          initialRecords={records} 
          editors={editors} 
          canApprove={canApprove} 
          currentUser={user} 
        />
      </div>
    </>
  )
}
