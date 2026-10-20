import { getLeadPage,getWebinarStats } from '@/app/actions/lead-query';
import { dashboardLeadSelect } from '@/lib/lead-query';
import { getSessionCookie } from '@/lib/auth';
import SalesPortalTabs from '@/components/SalesPortalTabs';
import { prisma } from '@/lib/prisma';


export default async function RecoveryDashboard({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const isClosed = type === 'closed';

  const sessionCookie = (await getSessionCookie());
  const user = sessionCookie ? sessionCookie.user : null;
  if (!user) return null;
  const isAdmin = user?.department === 'ALL';

  const initialPage=await getLeadPage({sheet:'RECOVERY',closed:isClosed})
  const webinarStats=await getWebinarStats({sheet:'RECOVERY',closed:isClosed})

  const allLeadsForDashboard = await prisma.lead.findMany({
    where: { 
      ...(isAdmin ? { assignments: { some: { user: { department: 'RECOVERY' } } } } : { assignments: { some: { userId: user.id } } })
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
    where: { departmentTarget: 'RECOVERY' }
  })

  const webinars = await prisma.webinarMaster.findMany({
    orderBy: { date: 'desc' }
  })

  return (
    <div className="glass-panel">
      <SalesPortalTabs 
        initialPage={initialPage} webinarStats={webinarStats} 
        allLeadsForDashboard={allLeadsForDashboard}
        isAdmin={isAdmin} 
        customColumns={customColumns} 
        executives={executives}
        webinars={webinars}
        userRole={user?.role}
        isClosed={isClosed}
        portalType="RECOVERY"
        currentUser={user}
      />
    </div>
  )
}
