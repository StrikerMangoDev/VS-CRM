import { getSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ContentManagementTable from '@/components/social-media/ContentManagementTable';

export default async function WorkingSheetDashboard() {
  const sessionCookie = (await getSessionCookie());
  
  if (!sessionCookie) {
    redirect('/login');
  }

  const user = sessionCookie.user;

  // You can restrict access here if needed, but sidebar takes care of hiding the menu
  // if (!user || user.mainDepartment !== 'Social Media') {
  //   redirect('/');
  // }
  
  if (user.department === 'Other Team') {
    redirect('/social-media/task-assigned');
  }
  if (user.department === 'Posting Team') {
    redirect('/social-media/posting-sheet');
  }
  const isGraphicsTeam = user?.department === 'Graphics Team' || user?.department === 'Graphics';
  if (isGraphicsTeam) {
    redirect('/social-media/graphics-working-sheet');
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          <div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: 700, margin: '0 0 8px 0' }}>
              Editor Working Sheet
            </h1>
            <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
              {user.mainDepartment} / {user.department === 'ALL' ? 'All Teams' : user.department}
            </span>
          </div>
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* We use 'ALL' so the executive can view and manage their content across all channels. */}
        <ContentManagementTable channel="ALL" isWorkingSheet={true} currentUserId={user.id} currentUserRole={user.role} />
      </div>
    </>
  )
}
