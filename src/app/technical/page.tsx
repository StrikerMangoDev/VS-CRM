import { getLeadPage,getWebinarStats } from '@/app/actions/lead-query'
import { dashboardLeadSelect } from '@/lib/lead-query'
import { getSessionCookie } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import SalesPortalTabs from '@/components/SalesPortalTabs'
import { redirect } from 'next/navigation'

export default async function TechnicalDashboardPage() {
  const sessionCookie = (await getSessionCookie())
  
  if (!sessionCookie) redirect('/login')
  
  const user = sessionCookie.user
  
  if (user.department !== 'ALL' && user.department !== 'TECHNICAL') {
    redirect('/')
  }
  const isAdmin = user.department === 'ALL';

  const initialPage=await getLeadPage({sheet:'TECHNICAL',tab: 'daily_paid'})
  const webinarStats=await getWebinarStats({sheet:'TECHNICAL'})

  const allLeadsForDashboard = await prisma.lead.findMany({select:dashboardLeadSelect,orderBy:{createdAt:'desc'}});

  const executives = await prisma.user.findMany({
    where: { 
      isActive: true,
      ...(isAdmin ? {} : { id: user.id })
    },
    select: { id: true, name: true, department: true }
  })

  const customColumns = await prisma.customColumn.findMany({
    where: { departmentTarget: 'TECHNICAL' }
  })

  const webinars = await prisma.webinarMaster.findMany({
    orderBy: { date: 'desc' }
  })

  const issues = await prisma.issue.findMany({
    orderBy: { createdAt: 'desc' },
    include: { issueStatus: true, issueType: true }
  })

  let topPerformers: import('@/lib/view-types').TopPerformer[] = [];
  if (user?.role === 'EXEC' && user?.department === 'TECHNICAL') {
    const execMap: Record<string,{ name: string; leads: number; closed: number; }> = {};
    allLeadsForDashboard.forEach(l => {
      const exec = l.assignments?.[0]?.user;
      if (exec && exec.department === 'TECHNICAL') {
        if (!execMap[exec.id]) execMap[exec.id] = { name: exec.name, leads: 0, closed: 0 };
        execMap[exec.id].leads++;
        if (l.leadStatus?.startsWith('CLOSED')) execMap[exec.id].closed++;
      }
    });

    topPerformers = Object.values(execMap).map((p) => ({
      name: p.name,
      closed: p.closed,
      conversion: p.leads ? Number(((p.closed / p.leads) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.closed - a.closed || b.conversion - a.conversion).slice(0, 3);
  }

  return (
    <div className="glass-panel" style={{ minHeight: 'calc(100vh - 120px)' }}>
      <SalesPortalTabs 
        initialPage={initialPage} webinarStats={webinarStats} 
        allLeadsForDashboard={allLeadsForDashboard}
        isAdmin={isAdmin} 
        customColumns={customColumns} 
        executives={executives}
        webinars={webinars}
        userRole={user?.role}
        isClosed={false}
        portalType="TECHNICAL"
        currentUser={user}
        topPerformers={topPerformers}
        issues={issues}
      />
    </div>
  )
}
