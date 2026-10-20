import { getSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import IncentiveTable from '@/components/IncentiveTable';
import { prisma } from '@/lib/prisma';

export default async function IncentivesPage() {
  const sessionCookie = (await getSessionCookie());
  const auth = sessionCookie ? sessionCookie.user : null;
  
  if (!auth) {
    redirect('/login')
  }

  // Only allow Admin or TL to view incentives
  if (auth.role !== 'ADMIN' && auth.role !== 'TL') {
    redirect('/')
  }

    

  // Fetch the active incentive configuration
  let config = await prisma.incentiveConfiguration.findFirst()
  if (!config) {
    // Fallback if none exists yet
    config = {
      id: 1,
      webinarTarget: 6,
      webinarWeightage: 15,
      webinarMaximumCap: 15,
      callingTarget: 5200,
      callingWeightage: 15,
      callingMaximumCap: 15,
      revenueTarget: 160000,
      revenueWeightage: 70,
      revenueHasCap: false,
      pipThreshold: 75,
      noIncentiveStart: 75.01,
      noIncentiveEnd: 94.99,
      fixedIncentiveStart: 95,
      fixedIncentiveEnd: 100,
      fixedIncentiveAmount: 500,
      additionalIncentiveStart: 100,
      additionalIncentivePerPercentage: 300,
      updatedAt: new Date()
    }
  }

  const now = new Date(new Date().getTime() + 330 * 60000);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 330 * 60000);
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 330 * 60000);
  const period = { gte: monthStart, lt: monthEnd };
  const calling = await prisma.callRecord.groupBy({ by: ['userId'], where: { createdAt: period }, _sum: { duration: true } });
  const callingMinutes = new Map(calling.map(c => [c.userId, (c._sum.duration || 0) / 60]));
  // Fetch all Sales Executives
  const salesUsers = await prisma.user.findMany({
    where: {
      department: 'SALES',
      ...(auth.role === 'ADMIN' ? {} : { mainDepartment: auth.mainDepartment }),
      role: 'EXEC', isActive: true
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  })

  // Keep the existing assignment attribution and restrict inputs to the displayed month.
  const leads = await prisma.lead.findMany({
    where: { OR: [{ paymentDate: period }, { paymentDate: null, updateStatusDate: period }] },
    select: {
      totalPayment: true,
      assignments: {
        select: {
          userId: true
        }
      }
    }
  })

  // Calculate revenue map
  const revenueMap: Record<string, number> = {}
  leads.forEach(l => {
    const total = l.totalPayment || 0
    l.assignments.forEach(a => {
      revenueMap[a.userId] = (revenueMap[a.userId] || 0) + total
    })
  })

  // Fetch real webinar attendance data for all agents
  const webinarRecords = await prisma.webinarAttendance.findMany({
    where: {
      email: { in: salesUsers.map(u => u.email.toLowerCase()) },
      upload: { createdAt: period }
    }
  })
  
  // Create a map to store unique attended days per agent
  // We use a Set to avoid counting duplicates if an agent is somehow in multiple files for the same Day
  const agentAttendanceMap: Record<string, Set<string>> = {}
  webinarRecords.forEach(record => {
    const email = record.email.toLowerCase().trim()
    const uniqueDayStr = `${record.webinarId}_${record.webinarDay}`
    if (!agentAttendanceMap[email]) {
      agentAttendanceMap[email] = new Set()
    }
    agentAttendanceMap[email].add(uniqueDayStr)
  })

  // Build data array for the table
  const tableData = salesUsers.map(user => {
    const actualRevenue = revenueMap[user.id] || 0
    
    // -------------------------------------------------------------
    // Current-month attendance and actual connected call duration.
    // -------------------------------------------------------------
    const userEmail = user.email.toLowerCase().trim()
    const realWebinarDays = agentAttendanceMap[userEmail] ? agentAttendanceMap[userEmail].size : 0
    const callingMins = callingMinutes.get(user.id) || 0
    // -------------------------------------------------------------
    
    // Webinar Calculation
    let webinarPercentage = (realWebinarDays / config.webinarTarget) * config.webinarWeightage
    if (webinarPercentage > config.webinarMaximumCap) webinarPercentage = config.webinarMaximumCap
    
    // Calling Calculation
    let callingPercentage = (callingMins / config.callingTarget) * config.callingWeightage
    if (callingPercentage > config.callingMaximumCap) callingPercentage = config.callingMaximumCap
    
    // Revenue Calculation
    let revenuePercentage = (actualRevenue / config.revenueTarget) * config.revenueWeightage
    if (config.revenueHasCap && revenuePercentage > config.revenueWeightage) {
      revenuePercentage = config.revenueWeightage
    }
    
    const totalAchievement = webinarPercentage + callingPercentage + revenuePercentage
    
    // Payout Logic
    let status = 'NO INCENTIVE'
    let incentiveAmount = 0
    
    if (totalAchievement <= config.pipThreshold) {
      status = 'PIP'
    } else if (totalAchievement >= config.noIncentiveStart && totalAchievement <= config.noIncentiveEnd) {
      status = 'NO INCENTIVE'
    } else if (totalAchievement >= config.fixedIncentiveStart) {
      status = 'ACHIEVED'
      
      // Calculate Fixed Incentive
      if (totalAchievement <= config.fixedIncentiveEnd) {
        incentiveAmount = config.fixedIncentiveAmount
      } else {
        // Additional Incentive
        const extraPercentage = Math.floor(totalAchievement - config.additionalIncentiveStart)
        if (extraPercentage > 0) {
          incentiveAmount = config.fixedIncentiveAmount + (extraPercentage * config.additionalIncentivePerPercentage)
        } else {
          incentiveAmount = config.fixedIncentiveAmount
        }
      }
    }
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      webinarDays: realWebinarDays,
      callingMins: callingMins,
      revenue: actualRevenue,
      totalAchievement,
      status,
      incentiveAmount
    }
  })

  return <IncentiveTable data={tableData} config={config} />
}
