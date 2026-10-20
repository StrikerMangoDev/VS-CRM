import { getSessionCookie } from '@/lib/auth'
import React from 'react'
import { redirect } from 'next/navigation'

import Link from 'next/link'
import { Users,Settings as SettingsIcon,History as HistoryIcon,ChevronRight,IndianRupee,ClipboardList,Target,MessageSquare,PhoneCall } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const sessionCookie = (await getSessionCookie())
  
  if (!sessionCookie) {
    redirect('/login')
  }

  const user = sessionCookie.user
  const isAdmin = user.role === 'ADMIN'
  const isManager = user.role === 'MANAGER'
  const isTL = user.role === 'TL'
  const isSocialMedia = user.mainDepartment === 'Social Media' || ['Editing Team', 'Graphics Team', 'Posting Team', 'Other Team'].includes(user.department)
  const isSalesDept = !isSocialMedia && (user.department === 'SALES' || user.mainDepartment === 'Sales Department')
  const canManageWhatsApp = !isSocialMedia && (isAdmin || ((isManager || isTL) && isSalesDept))
  const canViewSocialMediaTargets = isAdmin || (isManager && isSocialMedia)

  const links = [
    {
      href: '/settings/theme',
      icon: SettingsIcon,
      iconcolor: 'var(--primary)',
      iconBg: 'rgba(56, 189, 248, 0.1)',
      iconHoverBg: 'rgba(56, 189, 248, 0.2)',
      title: 'Theme Settings',
      desc: 'Customize the appearance of the CRM (Light/Dark mode).'
    },
    ...(isAdmin || isManager || (isTL && isSalesDept) ? [
      {
        href: '/team',
        icon: Users,
        iconcolor: 'var(--primary)',
        iconBg: 'rgba(59, 130, 246, 0.1)',
        iconHoverBg: 'rgba(59, 130, 246, 0.2)',
        title: 'Users & Roles',
        desc: 'Manage team members, roles, and access.'
      }
    ] : []),
    ...(isAdmin ? [
      {
        href: '/settings/issues',
        icon: SettingsIcon,
        iconcolor: 'var(--primary)',
        iconBg: 'rgba(168, 85, 247, 0.1)',
        iconHoverBg: 'rgba(168, 85, 247, 0.2)',
        title: 'Issue Settings',
        desc: 'Configure issue categories and automated routing.'
      }
    ] : []),
    {
      href: '/settings/history',
      icon: HistoryIcon,
      iconcolor: 'var(--warning)',
      iconBg: 'rgba(245, 158, 11, 0.1)',
      iconHoverBg: 'rgba(245, 158, 11, 0.2)',
      title: isAdmin || isManager ? 'Global Change History' : 'My Change History',
      desc: isAdmin || isManager ? 'View all recent updates to leads across the system.' : 'View your recent updates to leads.'
    },
    {
      href: '/settings/call-history',
      icon: PhoneCall,
      iconcolor: 'var(--primary)',
      iconBg: 'rgba(59, 130, 246, 0.1)',
      iconHoverBg: 'rgba(59, 130, 246, 0.2)',
      title: 'Call History',
      desc: 'View your call logs, recordings, lead IDs, and contact numbers.'
    },
    ...(isAdmin || isTL ? [
      {
        href: '/settings/incentives',
        icon: IndianRupee,
        iconcolor: 'var(--success)',
        iconBg: 'rgba(16, 185, 129, 0.1)',
        iconHoverBg: 'rgba(16, 185, 129, 0.2)',
        title: 'Incentive Management',
        desc: 'Configure agent performance targets, incentive rules, and PIP criteria.'
      }
    ] : []),
    ...(isAdmin || (!isSocialMedia && (isManager || isTL)) ? [
      {
        href: '/settings/sales-call-report',
        icon: PhoneCall,
        iconColor: '#f97316',
        iconBg: 'rgba(249, 115, 22, 0.1)',
        iconHoverBg: 'rgba(249, 115, 22, 0.2)',
        title: 'Sales Call Report',
        desc: 'View daily calling performance and follow-up metrics for sales executives.'
      }
    ] : []),
    ...(isAdmin ? [
      {
        href: '/settings/webinar-attendance-upload',
        icon: ClipboardList,
        iconColor: '#fb7185',
        iconBg: 'rgba(244, 63, 94, 0.1)',
        iconHoverBg: 'rgba(244, 63, 94, 0.2)',
        title: 'Webinar Attendance Upload',
        desc: 'Upload and manage agent attendance records for webinars.'
      }
    ] : []),
    ...(canViewSocialMediaTargets ? [
      {
        href: '/settings/social-channels',
        icon: Target,
        iconcolor: '#3b82f6',
        iconBg: 'rgba(59, 130, 246, 0.1)',
        iconHoverBg: 'rgba(59, 130, 246, 0.2)',
        title: 'Social Channels',
        desc: 'Manage custom social media channels and their platforms.'
      },
      {
        href: '/settings/social-media-targets',
        icon: Target,
        iconcolor: 'var(--primary)',
        iconBg: 'rgba(56, 189, 248, 0.1)',
        iconHoverBg: 'rgba(56, 189, 248, 0.2)',
        title: 'Social Media Teams Target',
        desc: 'Configure weekly and monthly performance targets for Editing, Graphics, and Posting teams.'
      }
    ] : []),
    ...(canManageWhatsApp ? [
      {
        href: '/settings/whatsapp-templates',
        icon: MessageSquare,
        iconcolor: 'var(--success)',
        iconBg: 'rgba(34, 197, 94, 0.1)',
        iconHoverBg: 'rgba(34, 197, 94, 0.2)',
        title: 'WhatsApp Message Templates',
        desc: 'Create and manage WhatsApp message templates for Sales Department.'
      }
    ] : [])
  ]

  return (
    <div className="settings-container h-full p-6">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
      </div>

      <div className="settings-scroll-area">
        <div className="settings-grid">
          {links.map((link, idx) => {
            const Icon = link.icon
            return (
              <Link 
                key={idx} 
                href={link.href} 
                className="settings-card"
                style={{"--icon-hover-bg": link.iconHoverBg} as React.CSSProperties}
              >
                <div 
                  className="settings-icon-wrapper"
                  style={{ backgroundColor: link.iconBg, color: link.iconColor }}
                >
                  <Icon size={24} strokeWidth={2} />
                </div>
                <div className="settings-card-content">
                  <h3 className="settings-card-title">{link.title}</h3>
                  <p className="settings-card-desc">{link.desc}</p>
                </div>
                <div className="settings-chevron">
                  <ChevronRight size={20} />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
