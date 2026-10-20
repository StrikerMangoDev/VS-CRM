'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
FileSpreadsheet,
CreditCard,
CheckCircle2,
AlertCircle,
LayoutDashboard,
PhoneCall
} from 'lucide-react';

export const SALES_TABS = [
  {
    name: 'Master Sheet',
    label: 'Sales Master Sheet',
    path: '/',
    icon: FileSpreadsheet,
    color: '#3b82f6',
    activeBg: 'rgba(59, 130, 246, 0.2)',
    activeBorder: 'rgba(59, 130, 246, 0.5)',
    activeText: '#60a5fa'
  },
  {
    name: 'Part Payment',
    label: 'Part Payment Sheet',
    path: '/part-payment',
    icon: CreditCard,
    color: '#f59e0b',
    activeBg: 'rgba(245, 158, 11, 0.2)',
    activeBorder: 'rgba(245, 158, 11, 0.5)',
    activeText: '#fbbf24'
  },
  {
    name: 'Full Payment',
    label: 'Full Payment Sheet',
    path: '/full-payment',
    icon: CheckCircle2,
    color: 'var(--success)',
    activeBg: 'rgba(16, 185, 129, 0.2)',
    activeBorder: 'rgba(16, 185, 129, 0.5)',
    activeText: '#34d399'
  },
  {
    name: 'Issue Table',
    label: 'Sales Issues',
    path: '/sales/issues',
    icon: AlertCircle,
    color: 'var(--danger)',
    activeBg: 'rgba(239, 68, 68, 0.2)',
    activeBorder: 'rgba(239, 68, 68, 0.5)',
    activeText: '#f87171'
  },
  {
    name: 'Extra Dialer Leads',
    label: 'Extra Dialer Leads',
    path: '/extra-dialer-leads',
    icon: PhoneCall,
    color: '#8b5cf6',
    activeBg: 'rgba(139, 92, 246, 0.2)',
    activeBorder: 'rgba(139, 92, 246, 0.5)',
    activeText: '#a78bfa'
  }
];

export default function SalesTabs({ showWorkspace = false, user }: { showWorkspace?: boolean, user?: import('@/lib/view-types').DashboardUser }) {
  const pathname = usePathname();

  const isSalesExec = user?.department === 'SALES' && user?.role === 'EXEC';

  let tabs = [...SALES_TABS];

  if (isSalesExec && pathname === '/sales/issues') {
    tabs = tabs.filter(tab => tab.name === 'Issue Table');
  } else if (showWorkspace || pathname === '/sales') {
    tabs.push({
      name: 'Working Space',
      label: 'My Working Space',
      path: '/sales',
      icon: LayoutDashboard,
      color: '#a855f7',
      activeBg: 'rgba(168, 85, 247, 0.2)',
      activeBorder: 'rgba(168, 85, 247, 0.5)',
      activeText: '#c084fc'
    });
  }

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
      marginBottom: '20px',
      flexWrap: 'wrap',
      maxWidth: '100%'
    }}>
      {tabs.map((tab) => {
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
            <span>{tab.label}</span>
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
