'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect,useState } from 'react';
import { getPendingCounts } from '@/app/actions/content';
import {
Tv,Bot,
BookOpen,
Moon,
Video,
Layers,
ClipboardList
} from 'lucide-react';

export const SOCIAL_CHANNELS = [
  {
    name: 'VS',
    label: 'VS',
    channelName: 'VS Channel',
    path: '/social-media/vs',
    icon: Tv,
    color: '#3b82f6',
    activeBg: 'rgba(59, 130, 246, 0.2)',
    activeBorder: 'rgba(59, 130, 246, 0.5)',
    activeText: '#60a5fa'
  },
  {
    name: 'LVS',
    label: 'LVS',
    channelName: 'LVS Channel',
    path: '/social-media/lvs',
    icon: Layers,
    color: '#f97316',
    activeBg: 'rgba(249, 115, 22, 0.2)',
    activeBorder: 'rgba(249, 115, 22, 0.5)',
    activeText: '#fb923c'
  },
  {
    name: 'Ai Telmate',
    label: 'Ai Telmate',
    channelName: 'AI Telmate',
    path: '/social-media/ai-telmate',
    icon: Bot,
    color: '#06b6d4',
    activeBg: 'rgba(6, 182, 212, 0.2)',
    activeBorder: 'rgba(6, 182, 212, 0.5)',
    activeText: '#22d3ee'
  },
  {
    name: 'Vedic code',
    label: 'Vedic code',
    channelName: 'Vedic Code',
    path: '/social-media/vedic-code',
    icon: BookOpen,
    color: 'var(--success)',
    activeBg: 'rgba(16, 185, 129, 0.2)',
    activeBorder: 'rgba(16, 185, 129, 0.5)',
    activeText: '#34d399'
  },
  {
    name: 'Occult Sage',
    label: 'Occult Sage',
    channelName: 'Occult Sage',
    path: '/social-media/occult-sage',
    icon: Moon,
    color: '#a855f7',
    activeBg: 'rgba(168, 85, 247, 0.2)',
    activeBorder: 'rgba(168, 85, 247, 0.5)',
    activeText: '#c084fc'
  },
  {
    name: 'Malyam',
    label: 'Malyam',
    channelName: 'Malyam Channel',
    path: '/social-media/malyam',
    icon: Video,
    color: '#f59e0b',
    activeBg: 'rgba(245, 158, 11, 0.2)',
    activeBorder: 'rgba(245, 158, 11, 0.5)',
    activeText: '#fbbf24'
  },
  {
    name: 'Ad Creative',
    label: 'Ad Creative Sheet',
    channelName: 'Ad Creative Sheet',
    path: '/social-media/ad-creative-sheet',
    icon: ClipboardList,
    color: 'var(--primary)',
    activeBg: 'rgba(56, 189, 248, 0.2)',
    activeBorder: 'rgba(56, 189, 248, 0.5)',
    activeText: '#38bdf8'
  }
];

export default function SocialMediaTabs({ dynamicChannels = [] }: { dynamicChannels?: import('@prisma/client').SocialMediaChannel[] }) {
  const pathname = usePathname();
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Fetch counts whenever pathname changes (e.g. user navigates between channels or comes back from editing)
    const fetchCounts = async () => {
      const res = await getPendingCounts();
      if (res.data) {
        setPendingCounts(res.data);
      }
    };
    fetchCounts();
    
    // Also poll every 10 seconds just in case data changes in the background
    const interval = setInterval(fetchCounts, 10000);
    return () => clearInterval(interval);
  }, [pathname]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px',
      background: 'var(--card-bg)',
      backdropFilter: 'blur(12px)',
      borderRadius: '12px',
      border: '1px solid var(--card-border)',
      marginBottom: '24px',
      flexWrap: 'wrap',
      maxWidth: '100%'
    }}>
      {[
        ...SOCIAL_CHANNELS.filter(c => c.name !== 'Ad Creative'),
        ...dynamicChannels.map((dc) => ({
          name: dc.name,
          label: dc.name,
          channelName: dc.name,
          path: `/social-media/c/${dc.slug}`,
          icon: Tv,
          color: '#10b981',
          activeBg: 'rgba(16, 185, 129, 0.2)',
          activeBorder: 'rgba(16, 185, 129, 0.5)',
          activeText: '#34d399'
        })),
        ...SOCIAL_CHANNELS.filter(c => c.name === 'Ad Creative')
      ].map((ch) => {
        const isActive = pathname === ch.path;
        const IconComponent = ch.icon;
        const count = ch.channelName ? (pendingCounts[ch.channelName] || 0) : 0;

        return (
          <Link
            key={ch.path}
            href={ch.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 500,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              background: isActive ? ch.activeBg : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              border: `1px solid ${isActive ? ch.activeBorder : 'transparent'}`,
              boxShadow: isActive ? `0 2px 10px ${ch.activeBg}` : 'none',
              cursor: 'pointer',
              flexShrink: 0,
              minWidth: 'max-content'
            }}
            onMouseOver={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }
            }}
            onMouseOut={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <IconComponent 
              size={16} 
              color={isActive ? ch.activeText : 'var(--text-muted)'} 
              style={{ transition: 'color 0.2s ease' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{ch.label}</span>
              {count > 0 && (
                <span style={{
                  background: ch.activeText,
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  lineHeight: 1
                }}>
                  {count}
                </span>
              )}
            </div>
            {isActive && count === 0 && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: ch.activeText,
                display: 'inline-block',
                boxShadow: `0 0 8px ${ch.activeText}`
              }} />
            )}
          </Link>
        );
      })}
    </div>
  );
}
