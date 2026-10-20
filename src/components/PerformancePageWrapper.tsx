'use client'
import type { LeadMetrics,DashboardUser,ContentView,TaskView,IssueView } from '@/lib/view-types'

import { useState } from 'react'
import PerformanceDashboard from '@/components/PerformanceDashboard'
import SocialMediaPerformanceDashboard from '@/components/social-media/SocialMediaPerformanceDashboard'

export default function PerformancePageWrapper({ 
  salesData, 
  issuesData,
  socialMediaData, 
  taskData,
  user 
}: {salesData:LeadMetrics[];issuesData:IssueView[];socialMediaData:ContentView[];taskData:TaskView[];user:DashboardUser}) {
  const [activeTab, setActiveTab] = useState<'SALES' | 'SOCIAL_MEDIA'>('SALES')

  const isSocialMediaUser = user.mainDepartment === 'Social Media' || user.department === 'Graphics Team' || user.department === 'Editing Team' || user.department === 'Posting Team';
  

  if (user.role === 'ADMIN') {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('SALES')}
            style={{
              background: activeTab === 'SALES' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: activeTab === 'SALES' ? '#3b82f6' : 'var(--text-muted)',
              border: `1px solid ${activeTab === 'SALES' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.1)'}`,
              padding: '8px 24px',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Sales Department
          </button>
          <button
            onClick={() => setActiveTab('SOCIAL_MEDIA')}
            style={{
              background: activeTab === 'SOCIAL_MEDIA' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: activeTab === 'SOCIAL_MEDIA' ? '#3b82f6' : 'var(--text-muted)',
              border: `1px solid ${activeTab === 'SOCIAL_MEDIA' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.1)'}`,
              padding: '8px 24px',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Social Media Department
          </button>
        </div>

        {activeTab === 'SALES' ? (
          <PerformanceDashboard initialLeads={salesData} issues={issuesData} user={user} />
        ) : (
          <SocialMediaPerformanceDashboard initialContent={socialMediaData} initialTasks={taskData} user={user} />
        )}
      </div>
    )
  }

  // Role-based isolation
  if (isSocialMediaUser) {
    return (
      <div style={{ padding: '24px' }}>
        <SocialMediaPerformanceDashboard initialContent={socialMediaData} initialTasks={taskData} user={user} />
      </div>
    )
  }

  // Default to Sales for Sales users or anyone else who somehow gets here
  return (
    <div style={{ padding: '24px' }}>
      <PerformanceDashboard initialLeads={salesData} issues={issuesData} user={user} />
    </div>
  )
}
