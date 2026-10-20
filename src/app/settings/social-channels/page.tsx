import { getSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getSocialMediaChannelsAction } from '@/app/actions/socialMediaChannel';
import SocialChannelsClient from './SocialChannelsClient';

export const dynamic = 'force-dynamic';

export default async function SocialChannelsPage() {
  const sessionCookie = (await getSessionCookie());
  
  if (!sessionCookie) {
    redirect('/login');
  }

  const user = sessionCookie.user;
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
    return <div style={{ padding: '24px', color: 'red' }}>Access Denied</div>;
  }

  const { channels } = await getSocialMediaChannelsAction();

  return <SocialChannelsClient initialChannels={channels || []} />;
}
