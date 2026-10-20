import { getLeadPage,getWebinarStats } from '@/app/actions/lead-query';
import { dashboardLeadSelect } from '@/lib/lead-query';
import { getSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SalesPortalTabs from '@/components/SalesPortalTabs';


export default async function SalesDashboard({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const isClosed = type === 'closed';

  const sessionCookie = (await getSessionCookie());
  if (!sessionCookie) return null;
  const user = sessionCookie.user;

  const isAdmin = user?.department === 'ALL';



  const initialPage=await getLeadPage({sheet:'SALES',closed:isClosed})
  const webinarStats=await getWebinarStats({sheet:'SALES',closed:isClosed})

  const allLeadsForDashboard = await prisma.lead.findMany({
    where: { 
      OR: [
        { currentModuleId: null },
        { currentModuleId: { not: 'EXTRA_DIALER' } }
      ],
      ...(isAdmin ? { assignments: { some: { user: { department: 'SALES' } } } } : { assignments: { some: { userId: user.id } } })
    },
    select: dashboardLeadSelect,
    orderBy: { createdAt: 'desc' }
  })

  const executives = await prisma.user.findMany({
    where: { 
      isActive: true,
      ...(isAdmin ? {} : { id: user.id })
    },
    select: { id: true, name: true, department: true }
  })

  const customColumns = await prisma.customColumn.findMany({
    where: { departmentTarget: 'SALES' }
  })

  const webinars = await prisma.webinarMaster.findMany({
    orderBy: { date: 'desc' }
  })

  let topPerformers: import('@/lib/view-types').TopPerformer[] = [];
  if (user?.role === 'EXEC' && user?.department === 'SALES') {
    const allSalesLeads = await prisma.lead.findMany({
      where: { assignments: { some: { user: { department: 'SALES' } } } },
      include: { assignments: { include: { user: true } } }
    });
    
    const execMap: Record<string,{ name: string; leads: number; closed: number; }> = {};
    allSalesLeads.forEach((l) => {
      const exec = l.assignments?.[0]?.user;
      if (exec && exec.department === 'SALES') {
        if (!execMap[exec.id]) execMap[exec.id] = { name: exec.name, leads: 0, closed: 0 };
        execMap[exec.id].leads++;
        if (l.leadStatus?.startsWith('CLOSED') || l.fullPaymentAmount > 0) execMap[exec.id].closed++;
      }
    });

    topPerformers = Object.values(execMap).map((p) => ({
      name: p.name,
      closed: p.closed,
      conversion: p.leads ? Number(((p.closed / p.leads) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.closed - a.closed || b.conversion - a.conversion).slice(0, 3);
  }

  return (
    <>
      <SalesPortalTabs 
        initialPage={initialPage} webinarStats={webinarStats} 
        allLeadsForDashboard={allLeadsForDashboard}
        isAdmin={isAdmin} 
        customColumns={customColumns} 
        executives={executives}
        webinars={webinars}
        userRole={user?.role}
        isClosed={isClosed}
        currentUser={user}
        topPerformers={topPerformers}
      />
    </>
  )
}
