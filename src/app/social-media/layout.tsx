import { getSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ClientTabManager from '@/components/ClientTabManager';
import { prisma } from '@/lib/prisma';

export default async function SocialMediaLayout({ children }: { children: React.ReactNode }) {
  const sessionCookie = (await getSessionCookie());
  
  if (!sessionCookie) {
    redirect('/login');
  }

  const user = sessionCookie.user;
  const dynamicChannels = await prisma.socialMediaChannel.findMany({
    orderBy: { createdAt: 'asc' }
  });

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <ClientTabManager user={user} dynamicChannels={dynamicChannels} />
      {children}
    </div>
  );
}
