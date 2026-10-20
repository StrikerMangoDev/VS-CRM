import { getSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ContentManagementTable from '@/components/social-media/ContentManagementTable';

export default async function LVSDashboard() {
  const sessionCookie = (await getSessionCookie());
  
  if (!sessionCookie) {
    redirect('/login');
  }

  const user = sessionCookie.user;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '16px', overflow: 'hidden', 
            background: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <img src="/vs-logo.jpeg" alt="LVS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
          </div>

          <div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: 700, margin: '0 0 8px 0' }}>
              LVS Channel
            </h1>
            <span style={{ background: 'rgba(251, 146, 60, 0.2)', color: '#fb923c', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
              Social Media
            </span>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ContentManagementTable channel="LVS Channel" currentUserRole={user.role} currentUserId={user.id} />
      </div>
    </>
  )
}
