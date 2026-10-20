import { getSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import IssueTable from '@/components/IssueTable';

export default async function SalesIssuesPage() {
  const sessionCookie = (await getSessionCookie());
  
  if (!sessionCookie) redirect('/login');
  const user = sessionCookie.user;
  
  if (user.role !== 'ADMIN' && user.department !== 'SALES') {
    redirect('/');
  }

  return (
    <div style={{ padding: '0', maxWidth: '100%', boxSizing: 'border-box' }}>
      <IssueTable userRole={user.role} userId={user.id} />
    </div>
  );
}
