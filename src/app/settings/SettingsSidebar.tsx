'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users,Settings as SettingsIcon,History as HistoryIcon,IndianRupee,ClipboardList,Target,MessageSquare,LayoutGrid,PhoneCall } from 'lucide-react'

export default function SettingsSidebar({ user }: { user: import('@/lib/view-types').DashboardUser }) {
  const pathname = usePathname()

  const isAdmin = user.role === 'ADMIN'
  const isManager = user.role === 'MANAGER'
  const isTL = user.role === 'TL'
  const isSocialMedia = user.mainDepartment === 'Social Media' || ['Editing Team', 'Graphics Team', 'Posting Team', 'Other Team'].includes(user.department)
  const isSalesDept = !isSocialMedia && (user.department === 'SALES' || user.mainDepartment === 'Sales Department')
  const canManageWhatsApp = !isSocialMedia && (isAdmin || ((isManager || isTL) && isSalesDept))
  const canViewSocialMediaTargets = isAdmin || (isManager && isSocialMedia)

  const links = [
    {
      href: '/settings',
      icon: LayoutGrid,
      iconColor: 'var(--text-muted)',
      title: 'Overview',
      exact: true
    },
    {
      href: '/settings/theme',
      icon: SettingsIcon,
      iconColor: 'var(--primary)',
      title: 'Theme'
    },
    ...(isAdmin || isManager || (isTL && isSalesDept) ? [
      {
        href: '/team',
        icon: Users,
        iconColor: 'var(--primary)',
        title: 'Users & Roles'
      }
    ] : []),

    ...(isAdmin ? [
      {
        href: '/settings/issues',
        icon: SettingsIcon,
        iconColor: 'var(--primary)',
        title: 'Issue Settings'
      }
    ] : []),
    {
      href: '/settings/history',
      icon: HistoryIcon,
      iconColor: 'var(--warning)',
      title: isAdmin || isManager ? 'Global Change History' : 'My Change History'
    },
    {
      href: '/settings/call-history',
      icon: PhoneCall,
      iconColor: '#3b82f6',
      title: 'Call History'
    },
    ...(isAdmin || isTL ? [
      {
        href: '/settings/incentives',
        icon: IndianRupee,
        iconColor: 'var(--success)',
        title: 'Incentive Management'
      }
    ] : []),
    ...(isAdmin || (!isSocialMedia && (isManager || isTL)) ? [
      {
        href: '/settings/sales-call-report',
        icon: PhoneCall,
        iconColor: '#f97316',
        title: 'Sales Call Report'
      }
    ] : []),
    ...(isAdmin ? [
      {
        href: '/settings/webinar-attendance-upload',
        icon: ClipboardList,
        iconColor: '#fb7185',
        title: 'Webinar Attendance'
      }
    ] : []),
    ...(canViewSocialMediaTargets ? [
      {
        href: '/settings/social-channels',
        icon: Target,
        iconColor: '#3b82f6',
        title: 'Social Channels'
      },
      {
        href: '/settings/social-media-targets',
        icon: Target,
        iconColor: 'var(--primary)',
        title: 'Social Media Targets'
      }
    ] : []),
    ...(canManageWhatsApp ? [
      {
        href: '/settings/whatsapp-templates',
        icon: MessageSquare,
        iconColor: 'var(--success)',
        title: 'WhatsApp Templates'
      }
    ] : [])
  ]

  return (
    <div className="glass-panel" style={{
      width: '260px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flexShrink: 0,
      padding: 0
    }}>
      <div style={{
        padding: '20px',
        borderBottom: '1px solid var(--card-border, rgba(255, 255, 255, 0.1))'
      }}>
        <h2 style={{
          fontSize: '1.2rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: 0
        }}>
          <SettingsIcon size={20} color='var(--text-muted)' />
          Settings Menu
        </h2>
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 0'
      }} className="custom-scrollbar">
        <ul style={{
          listStyleType: 'none',
          padding: '0 12px',
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {links.map((link, idx) => {
            const Icon = link.icon
            const isActive = link.exact ? pathname === link.href : pathname.startsWith(link.href)
            
            return (
              <li key={idx} style={{ margin: 0, padding: 0 }}>
                <Link
                  href={link.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    background: isActive ? 'rgba(30, 41, 59, 0.8)' : 'transparent',
                    border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent'}`,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)'
                      e.currentTarget.style.color = '#e2e8f0'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }
                  }}
                >
                  <Icon size={18} style={{ color: isActive ? link.iconColor : 'currentColor' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{link.title}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
