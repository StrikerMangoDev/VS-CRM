'use client'

import { usePathname } from 'next/navigation'
import SocialMediaTabs from '@/components/social-media/SocialMediaTabs'
import WorkspaceTabs from '@/components/social-media/WorkspaceTabs'
import SalesTabs from '@/components/SalesTabs'

export default function ClientTabManager({ user, dynamicChannels = [] }: { user?: import('@/lib/view-types').DashboardUser, dynamicChannels?: import('@prisma/client').SocialMediaChannel[] }) {
  const pathname = usePathname();
  
  if (!pathname || pathname === '/login') return null;

  // Social Media - Channels
  if (pathname.startsWith('/social-media/') && (
    [
      'vs', 'lvs', 'ai-telmate', 'vedic-code', 'occult-sage', 'malyam', 'ad-creative-sheet'
    ].includes(pathname.split('/').pop() || '') || pathname.includes('/social-media/c/')
  )) {
    return <SocialMediaTabs dynamicChannels={dynamicChannels} />;
  }

  // Social Media - Workspace
  if (pathname.startsWith('/social-media/') && [
    'working-sheet', 'thumbnail-sheet', 'graphics-working-sheet', 'task-assigned', 'posting-sheet', 'posting-daily-task', 'ad-creative-working-sheet'
  ].includes(pathname.split('/').pop() || '')) {
    return <WorkspaceTabs user={user} />;
  }

  // Sales (Root level and /sales/issues)
  const isSalesTab = ['/', '/part-payment', '/full-payment', '/sales/issues', '/extra-dialer-leads'].includes(pathname);
  if (isSalesTab) {
    return <SalesTabs user={user} />;
  }

  return null;
}
