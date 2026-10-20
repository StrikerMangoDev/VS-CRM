import { dashboardLeadSelect } from '@/lib/lead-query'
import { getSessionCookie } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AnalyticsDashboard from '@/components/AnalyticsDashboard'
import SalesPerformanceDashboard from '@/components/SalesPerformanceDashboard'
import { getDropdownsForSheet } from '@/lib/dropdowns'
import { redirect } from 'next/navigation'

export default async function AnalyticsPage() {
  const sessionCookie = (await getSessionCookie());
  
  if (!sessionCookie) {
    redirect('/login');
  }
  
  const user = sessionCookie.user;
  const isAdmin = user.role === 'ADMIN';

  if (!isAdmin && user.mainDepartment === 'Social Media') {
    redirect('/social-media/vs');
  }

  const leadsQuery: import('@prisma/client').Prisma.LeadFindManyArgs = {
    orderBy: { createdAt: 'desc' },
    select: dashboardLeadSelect
  };

  if (user.role === 'EXEC') {
    leadsQuery.where = {
      assignments: {
        some: { userId: user.id }
      }
    };
  }

  const leads = await prisma.lead.findMany(leadsQuery)

  const executives = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, department: true }
  })
  
  const callingSheetDropdowns = await getDropdownsForSheet('Leads Module')

  let subtitle = 'Complete Sales Performance';
  if (user.role === 'TL') subtitle = 'Team Performance Overview';
  else if (user.role === 'EXEC') subtitle = 'My Sales Performance';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Sales Dashboard</h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>{subtitle}</div>
        </div>
      </div>

      {user.role === 'EXEC' ? (
        <AnalyticsDashboard 
          leads={leads}
          executives={executives}
          userRole={user.role}
          currentUser={user}
          dropdowns={callingSheetDropdowns}
        />
      ) : (
        <SalesPerformanceDashboard />
      )}
    </div>
  )
}
