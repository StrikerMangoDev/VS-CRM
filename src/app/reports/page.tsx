import { getLeadHistorySummary } from '@/lib/history-summary';
import { isSocial,contentScope,getSessionCookie } from '@/lib/auth';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ReportsPageWrapper from "@/components/ReportsPageWrapper";

export default async function SalesReportPage() {
  const sessionCookie = (await getSessionCookie());
  const user = sessionCookie ? sessionCookie.user : null;

  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.role === "ADMIN";
  const isManager = user.role === "MANAGER";
  const isTL = user.role === "TL";

  // Reports page is strictly for Manager, TL, and Admin only!
  if (!isAdmin && !isTL && !isManager) {
    redirect("/performance");
  }

  // Fetch all leads assigned to any executive
  const rawLeads = await prisma.lead.findMany({
    where: {
      assignments: {
        some: isAdmin ? {} : { user: { mainDepartment: user.mainDepartment, ...(user.department === "ALL" ? {} : { department: user.department }) } }
      }
    },
    include: {
      assignments: {
        include: {
          user: true
        }
      },
      
      
      webinar: true
    }
  });
  const historySummary = await getLeadHistorySummary(rawLeads.map(l => l.id));
  const leads = rawLeads.map(l => ({ ...l, callRecords: historySummary.calls[l.id] || [], auditLogs: historySummary.audits[l.id] || [] }));

  // Fetch all issues
  const issues = await prisma.issue.findMany({
    where: isAdmin ? {} : { leadOwner: { mainDepartment: user.mainDepartment, ...(user.department === "ALL" ? {} : { department: user.department }) } },
    include: {
      leadOwner: true,
      issueStatus: true
    }
  });

  // Extract unique users that are assigned to these leads
  const userMap = new Map();
  leads.forEach(l => {
    const exec = l.assignments?.[0]?.user;
    if (exec) {
      userMap.set(exec.id, exec);
    }
  });
  
  // Also include technical executives who are assigned issues
  issues.forEach(i => {
    const exec = i.leadOwner;
    if (exec && !userMap.has(exec.id)) {
      userMap.set(exec.id, exec);
    }
  });

  // Include ALL users for reporting
  const allUsers = await prisma.user.findMany({
    where: { isActive: true, ...(isAdmin ? {} : { mainDepartment: user.mainDepartment }) },
    select: { 
      id: true, 
      name: true, 
      department: true, 
      mainDepartment: true, 
      email: true,
      socialMediaTarget: true 
    }
  });

  // Fetch Webinar Attendance
  const rawAttendances = await prisma.webinarAttendance.findMany({ where: { email: { in: allUsers.map(u => u.email) } } });
  
  // Match attendance with team members
  const teamAttendanceData = [];
  
  // Group by email (lowercase) + webinarId
  const attendanceMap = new Map<string,Set<string>>(); // key: "email|webinarId", value: Set of unique days
  
  for (const record of rawAttendances) {
    if (!record.email) continue;
    const emailLower = record.email.toLowerCase().trim();
    const key = `${emailLower}|${record.webinarId}`;
    if (!attendanceMap.has(key)) {
      attendanceMap.set(key, new Set());
    }
    attendanceMap.get(key)!.add(record.webinarDay);
  }

  // Find matching users and build the report data
  for (const [key, daysSet] of attendanceMap.entries()) {
    const [email, webinarId] = key.split('|');
    const matchedUser = allUsers.find(u => u.email.toLowerCase().trim() === email);
    
    if (matchedUser) {
      teamAttendanceData.push({
        id: `${matchedUser.id}-${webinarId}`,
        userId: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        department: matchedUser.department,
        webinarId: webinarId,
        days: Array.from(daysSet),
        totalAttendance: daysSet.size
      });
    }
  }

  // Fetch Social Media Content
  const socialMediaData = await prisma.contentRecord.findMany({
    where: isAdmin ? {} : isSocial(user) ? contentScope(user) : { id: "__none__" },
    include: {
      editor: {
        select: { id: true, name: true, department: true }
      },
      postedBy: {
        select: { id: true, name: true, department: true }
      }
    }
  });

  // Fetch Tasks
  const taskData = await prisma.taskRecord.findMany({
    where: isAdmin ? {} : !isSocial(user) ? { id: "__none__" } : user.role === "MANAGER" ? {} : { assignedDepartment: user.department },
    include: {
      assignedTo: {
        select: { id: true, name: true, department: true }
      }
    }
  });

  // Fetch Ad Creatives
  const adCreativeData = await prisma.adCreativeRecord.findMany({
    where: isAdmin ? {} : !isSocial(user) ? { id: "__none__" } : user.role === "MANAGER" ? {} : { editor: { department: user.department } },
    include: {
      editor: {
        select: { id: true, name: true, department: true }
      }
    }
  });

  return (
    <ReportsPageWrapper 
      leads={leads} 
      issues={issues} 
      socialMediaData={socialMediaData}
      taskData={taskData}
      adCreativeData={adCreativeData}
      executives={allUsers} 
      currentUser={user} 
      teamAttendanceData={teamAttendanceData} 
    />
  );
}
