'use client'
import type { LeadMetrics,IssueView,ContentView,TaskView,AdCreativeView,Person,DashboardUser,AttendanceUser } from '@/lib/view-types';

import { useState } from 'react';
import SalesReport from '@/components/SalesReport';
import SocialMediaReport from '@/components/SocialMediaReport';

interface ReportsPageWrapperProps {
  leads: LeadMetrics[];
  issues: IssueView[];
  socialMediaData: ContentView[];
  taskData: TaskView[];
  adCreativeData?: AdCreativeView[];
  executives: Person[];
  currentUser: DashboardUser;
  teamAttendanceData: AttendanceUser[];
}

export default function ReportsPageWrapper({ 
  leads, 
  issues, 
  socialMediaData, 
  taskData, 
  adCreativeData,
  executives, 
  currentUser, 
  teamAttendanceData 
}: ReportsPageWrapperProps) {
  const [activeDepartment, setActiveDepartment] = useState<'SALES' | 'SOCIAL_MEDIA'>('SALES')

  const isSocialMediaUser = currentUser.mainDepartment === 'Social Media' || currentUser.department === 'Graphics Team' || currentUser.department === 'Editing Team' || currentUser.department === 'Posting Team';

  // For Admin that needs to see both (excluding Social Media specific portals)
  if (currentUser.role === 'ADMIN' && currentUser.mainDepartment !== 'Social Media') {
    return (
      <div style={{ flex: 1, padding: "24px", overflowY: "auto", background: "var(--background)" }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveDepartment('SALES')}
            style={{
              background: activeDepartment === 'SALES' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: activeDepartment === 'SALES' ? '#3b82f6' : 'var(--text-muted)',
              border: `1px solid ${activeDepartment === 'SALES' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.1)'}`,
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
            onClick={() => setActiveDepartment('SOCIAL_MEDIA')}
            style={{
              background: activeDepartment === 'SOCIAL_MEDIA' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: activeDepartment === 'SOCIAL_MEDIA' ? '#3b82f6' : 'var(--text-muted)',
              border: `1px solid ${activeDepartment === 'SOCIAL_MEDIA' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.1)'}`,
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

        {activeDepartment === 'SALES' ? (
          <SalesReport leads={leads} issues={issues} executives={executives} currentUser={currentUser} teamAttendanceData={teamAttendanceData} />
        ) : (
          <SocialMediaReport socialMediaData={socialMediaData} taskData={taskData} adCreativeData={adCreativeData} executives={executives} currentUser={currentUser} />
        )}
      </div>
    )
  }

  // Role-based isolation for TLs / Management
  if (isSocialMediaUser) {
    return (
      <div style={{ flex: 1, padding: "24px", overflowY: "auto", background: "var(--background)" }}>
        <SocialMediaReport socialMediaData={socialMediaData} taskData={taskData} adCreativeData={adCreativeData} executives={executives} currentUser={currentUser} />
      </div>
    )
  }

  // Default to Sales for Sales users or anyone else who somehow gets here
  return (
    <div style={{ flex: 1, padding: "24px", overflowY: "auto", background: "var(--background)" }}>
      <SalesReport leads={leads} issues={issues} executives={executives} currentUser={currentUser} teamAttendanceData={teamAttendanceData} />
    </div>
  )
}
