'use server'
import { requireUser,requireSales } from '@/lib/auth'
import { getSessionCookie } from '@/lib/auth'


import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export type SalesCallReportRow = {
  userId: string
  executiveName: string
  totalCalls: number
  followUpsToday: number
  dueFollowUps: number
  averageCallingTimeSeconds: number
  callConnected: number
  callNotConnected: number
  totalUntouched: number
  totalClosed: number
}

export async function getSalesCallReportAction(targetDate?: string): Promise<SalesCallReportRow[]> {
  await requireSales(true);

  await cookies();
  const sessionCookie = (await getSessionCookie())?.value
  
  if (!sessionCookie) {
    throw new Error('Unauthorized')
  }

  let year, month, day;
  if (targetDate) {
    const parts = targetDate.split('-');
    year = Number(parts[0]);
    month = Number(parts[1]);
    day = Number(parts[2]);
  } else {
    // Get current date in IST
    const now = new Date();
    const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    year = istNow.getUTCFullYear();
    month = istNow.getUTCMonth() + 1;
    day = istNow.getUTCDate();
  }

  // Create UTC date at 00:00:00 for the given date, then subtract 5 hours 30 mins to get the UTC time for 00:00 IST
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  startOfDay.setMinutes(startOfDay.getMinutes() - 330) // IST is UTC+5:30
  
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
  endOfDay.setMinutes(endOfDay.getMinutes() - 330)

  // Get all users in Sales Department
  const salesUsers = await prisma.user.findMany({
    where: {
      mainDepartment: 'Sales Department',
    },
    select: {
      id: true,
      name: true,
      assignments: {
        select: {
          lead: {
            select: {
              nextFollowUpDate: true,
              leadStatus: true,
              callStatus: true,
              createdAt: true,
              updatedAt: true,
              updateStatusDate: true,
              callRecords: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          }
        }
      },
      callRecords: {
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        select: {
          duration: true
        }
      },
    }
  })

  const allAuditHistories = await prisma.auditHistory.findMany({
    where: {
      field: 'Call Status',
      createdAt: { gte: startOfDay, lte: endOfDay }
    },
    select: { userName: true, newValue: true }
  });

  const auditHistoryByUser: Record<string, typeof allAuditHistories> = {};
  for (const history of allAuditHistories) {
    if (!auditHistoryByUser[history.userName]) {
      auditHistoryByUser[history.userName] = [];
    }
    auditHistoryByUser[history.userName].push(history);
  }

  const report: SalesCallReportRow[] = salesUsers.map(user => {
    // Calls
    const dialerCalls = user.callRecords;
    const manualCalls = auditHistoryByUser[user.name] || [];
    
    const totalCalls = dialerCalls.length;
    const manualNotConn = manualCalls.filter((a) => a.newValue === 'CALL_NOT_CONNECTED').length;
    
    const callNotConnected = Math.min(totalCalls, manualNotConn);
    const callConnected = totalCalls - callNotConnected;
    const totalDuration = dialerCalls.reduce((sum, record) => sum + (record.duration || 0), 0);
    const averageCallingTimeSeconds = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

    // Follow-ups
    let followUpsToday = 0
    let dueFollowUps = 0
    let totalUntouched = 0
    let totalClosed = 0

    user.assignments.forEach(assignment => {
      // Determine lead's date
      const l = assignment.lead
      // Determine lead's date based strictly on updatedAt for other metrics
      const d = new Date(l.updatedAt || l.createdAt);
      const isDateInRange = d.getTime() >= startOfDay.getTime() && d.getTime() <= endOfDay.getTime();

      if (isDateInRange) {
        if (l.callStatus === 'UNTOUCHED') {
          totalUntouched++
        }
      }
      
      if (isDateInRange && l.leadStatus?.startsWith('CLOSED')) {
        totalClosed++
      }

      // Calculate follow-ups
      const followUpDate = assignment.lead.nextFollowUpDate
      // Assuming !leadStatus?.startsWith('CLOSED') means it is still active
      if (followUpDate && !assignment.lead.leadStatus?.startsWith('CLOSED')) {
        const fwTime = followUpDate.getTime()
        if (fwTime >= startOfDay.getTime() && fwTime <= endOfDay.getTime()) {
          followUpsToday++
        } else if (fwTime < startOfDay.getTime()) {
          dueFollowUps++
        }
      }
    })

    return {
      userId: user.id,
      executiveName: user.name,
      totalCalls,
      followUpsToday,
      dueFollowUps,
      averageCallingTimeSeconds,
      callConnected,
      callNotConnected,
      totalUntouched,
      totalClosed
    }
  })

  return report
}

export async function getHourlyLoginReportAction(userName: string, dateStr: string) {
  const actor = await requireUser(); const target = await prisma.user.findFirst({ where: { name: userName } }); if (!target || (actor.role !== "ADMIN" && actor.id !== target.id && !(["TL", "MANAGER"].includes(actor.role) && actor.mainDepartment === target.mainDepartment))) throw new Error("Forbidden");

  await cookies();
  if (!(await getSessionCookie())) throw new Error('Unauthorized')

  const userRec = await prisma.user.findFirst({ where: { name: userName } })
  if (!userRec) throw new Error('User not found')
  const userId = userRec.id

  const [year, month, day] = dateStr.split('-').map(Number)
  
  // Create UTC date at 00:00:00 for the given date, then subtract 5 hours 30 mins to get the UTC time for 00:00 IST
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  startOfDay.setMinutes(startOfDay.getMinutes() - 330) // IST is UTC+5:30
  
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
  endOfDay.setMinutes(endOfDay.getMinutes() - 330)

  const calls = await prisma.callRecord.findMany({
    where: {
      userId,
      createdAt: { gte: startOfDay, lte: endOfDay }
    },
    include: {
      lead: { select: { callStatus: true } }
    }
  })

  // Hourly slots: 9AM to 8PM (9-10, 10-11, ... 19-20)
  const hourlyData = Array.from({ length: 11 }, (_, i) => {
    const hour = i + 9;
    
    const formatHour = (h: number) => {
      if (h === 12) return '12PM';
      if (h === 24) return '12AM';
      return h > 12 ? `${h - 12}PM` : `${h}AM`;
    };

    const label = `${formatHour(hour)}-${formatHour(hour + 1)}`;
    const hourCalls = calls.filter(c => {
      // Get IST hour
      const istDate = new Date(c.createdAt.getTime() + (5.5 * 60 * 60 * 1000));
      return istDate.getUTCHours() === hour;
    });
    
    const connected = hourCalls.filter(c => {
      const status = (c.lead?.callStatus || '').toUpperCase();
      return status === 'CALL_CONNECTED' || status === 'CONNECTED' || (status.includes('CONNECTED') && !status.includes('NOT'));
    }).length;
    
    const notConnected = hourCalls.filter(c => {
      const status = (c.lead?.callStatus || '').toUpperCase();
      return status === 'CALL_NOT_CONNECTED' || status === 'NOT_CONNECTED' || status.includes('NOT') || status === 'UNTOUCHED' || status.includes('SWITCHED') || status.includes('WRONG');
    }).length;
    
    return {
      hourLabel: label,
      connected,
      notConnected
    }
  });

  // Check login data (format YYYY-MM-DD)
  const yyyyMMdd = dateStr
  const loginData = await prisma.userShift.findFirst({
    where: { userId, date: yyyyMMdd }
  })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })

  return { hourlyData, loginData, userName: user?.name || '' }
}
