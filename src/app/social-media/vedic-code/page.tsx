import { getSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import ContentManagementTable from '@/components/social-media/ContentManagementTable';

export default async function VedicCodeDashboard() {
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
            <BookOpen size={44} color="#34d399" />
          </div>
          <div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: 700, margin: '0 0 8px 0' }}>Vedic Code Channel</h1>
            <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
              Social Media
            </span>
          </div>
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ContentManagementTable channel="Vedic Code" currentUserId={user.id} currentUserRole={user.role} />
      </div>
    </>
  )
}
