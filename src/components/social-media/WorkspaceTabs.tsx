'use client';

import { useState,useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getRevisionCounts } from '@/app/actions/content';
import {
FileSpreadsheet,
Palette,
Film,
Layout,
Share2,
CheckSquare,
ClipboardList
} from 'lucide-react';

export const WORKSPACE_TABS = [
  {
    name: 'Editor',
    label: 'Editor Working Sheet',
    path: '/social-media/working-sheet',
    icon: FileSpreadsheet,
    color: '#3b82f6',
    activeBg: 'rgba(59, 130, 246, 0.2)',
    activeBorder: 'rgba(59, 130, 246, 0.5)',
    activeText: '#60a5fa'
  },
  {
    name: 'Graphics',
    label: 'Graphics Working Sheet',
    path: '/social-media/graphics-working-sheet',
    icon: Palette,
    color: '#a855f7',
    activeBg: 'rgba(168, 85, 247, 0.2)',
    activeBorder: 'rgba(168, 85, 247, 0.5)',
    activeText: '#c084fc'
  },
  {
    name: 'Ad Creative',
    label: 'Ad Creative Working Sheet',
    path: '/social-media/ad-creative-working-sheet',
    icon: Film,
    color: '#f59e0b',
    activeBg: 'rgba(245, 158, 11, 0.2)',
    activeBorder: 'rgba(245, 158, 11, 0.5)',
    activeText: '#fbbf24'
  },
  {
    name: 'Thumbnail',
    label: 'Thumbnail Sheet',
    path: '/social-media/thumbnail-sheet',
    icon: Layout,
    color: '#ec4899',
    activeBg: 'rgba(236, 72, 153, 0.2)',
    activeBorder: 'rgba(236, 72, 153, 0.5)',
    activeText: '#f472b6'
  },
  {
    name: 'Task',
    label: 'Task Sheet',
    path: '/social-media/task-assigned',
    icon: ClipboardList,
    color: '#06b6d4',
    activeBg: 'rgba(6, 182, 212, 0.2)',
    activeBorder: 'rgba(6, 182, 212, 0.5)',
    activeText: '#22d3ee'
  },
  {
    name: 'Posting',
    label: 'Posting Working Sheet',
    path: '/social-media/posting-sheet',
    icon: Share2,
    color: 'var(--success)',
    activeBg: 'rgba(16, 185, 129, 0.2)',
    activeBorder: 'rgba(16, 185, 129, 0.5)',
    activeText: '#34d399'
  },
  {
    name: 'Daily Additional Task',
    label: 'Daily Additional Task',
    path: '/social-media/posting-daily-task',
    icon: CheckSquare,
    color: '#f59e0b',
    activeBg: 'rgba(245, 158, 11, 0.2)',
    activeBorder: 'rgba(245, 158, 11, 0.5)',
    activeText: '#fbbf24'
  }
];

export default function WorkspaceTabs({ user }: { user?: import('@/lib/view-types').DashboardUser }) {
  const pathname = usePathname();
  const [revisionData, setRevisionData] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user?.id) {
      getRevisionCounts(user.id).then(res => {
        if (res.data) {
          setRevisionData(res.data);
        }
      });
    }
  }, [user]);

  const isEditingTeam = user?.department === 'Editing Team';
  const isPostingTeam = user?.department === 'Posting Team';
  const isGraphicsTeam = user?.department === 'Graphics Team' || user?.department === 'Graphics';
  const isOtherTeam = user?.department === 'Other Team';
  
  const visibleTabs = WORKSPACE_TABS.filter(tab => {
    if (isEditingTeam) {
      return ['Editor Working Sheet', 'Ad Creative Working Sheet', 'Task Sheet'].includes(tab.label);
    }
    if (isPostingTeam) {
      return ['Posting Working Sheet', 'Daily Additional Task'].includes(tab.label);
    }
    if (isGraphicsTeam) {
      return ['Graphics Working Sheet', 'Ad Creative Working Sheet', 'Thumbnail Sheet', 'Task Sheet'].includes(tab.label);
    }
    if (isOtherTeam) {
      return ['Task Sheet'].includes(tab.label);
    }
    return true;
  });

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
      maxWidth: '100%',
    }}>
      {visibleTabs.map((tab) => {
        const isActive = pathname === tab.path;
        const IconComponent = tab.icon;

        return (
          <Link
            key={tab.path}
            href={tab.path}
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
              background: isActive ? tab.activeBg : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              border: `1px solid ${isActive ? tab.activeBorder : 'transparent'}`,
              boxShadow: isActive ? `0 2px 10px ${tab.activeBg}` : 'none',
              cursor: 'pointer',
              position: 'relative',
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
              color={isActive ? tab.activeText : 'var(--text-muted)'} 
              style={{ transition: 'color 0.2s ease' }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {tab.label}
              {revisionData[tab.label] && (
                <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1.6rem', lineHeight: '0', position: 'relative', top: '4px' }}>*</span>
              )}
            </span>
            {isActive && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: tab.activeText,
                display: 'inline-block',
                boxShadow: `0 0 8px ${tab.activeText}`
              }} />
            )}
          </Link>
        );
      })}
    </div>
  );
}
