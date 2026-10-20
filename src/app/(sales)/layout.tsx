import { getSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ClientTabManager from '@/components/ClientTabManager';

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const sessionCookie = (await getSessionCookie());
  
  if (!sessionCookie) {
    redirect('/login');
  }

  const user = sessionCookie.user;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      <ClientTabManager user={user} />
      {children}
    </div>
  );
}
