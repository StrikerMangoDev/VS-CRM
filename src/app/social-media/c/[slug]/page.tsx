import { getSessionCookie } from '@/lib/auth';
import { redirect,notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ContentManagementTable from '@/components/social-media/ContentManagementTable';

export default async function DynamicChannelDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const sessionCookie = (await getSessionCookie());
  
  if (!sessionCookie) {
    redirect('/login');
  }

  const user = sessionCookie.user;

  // Find channel
  const { slug } = await params;
  const channel = await prisma.socialMediaChannel.findUnique({
    where: { slug }
  });

  if (!channel) {
    notFound();
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '16px', overflow: 'hidden', 
            background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            color: '#3b82f6',
            fontSize: '1.5rem',
            fontWeight: 700
          }}>
            {channel.name.substring(0, 2).toUpperCase()}
          </div>

          <div>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: 700, margin: '0 0 8px 0' }}>
              {channel.name}
            </h1>
            <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
              Social Media - Dynamic Channel
            </span>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ContentManagementTable channel={channel.name} currentUserRole={user.role} currentUserId={user.id} />
      </div>
    </>
  )
}
