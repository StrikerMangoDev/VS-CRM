import { getSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Moon } from 'lucide-react';
import ContentManagementTable from '@/components/social-media/ContentManagementTable';

export default async function OccultSageDashboard() {
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
            <Moon size={44} color="#60a5fa" />
          </div>
          <div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: 700, margin: '0 0 8px 0' }}>Occult Sage Channel</h1>
            <span style={{ background: 'rgba(96, 165, 250, 0.2)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
              Social Media
            </span>
          </div>
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ContentManagementTable channel="Occult Sage" currentUserId={user.id} currentUserRole={user.role} />
      </div>
    </>
  )
}
