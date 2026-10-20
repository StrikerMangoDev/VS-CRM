'use server'
import type { Prisma } from '@prisma/client'
import { getLeadHistorySummary } from '@/lib/history-summary'
import { requireUser } from '@/lib/auth'


import { prisma } from '@/lib/prisma'


export async function getPerformanceData() {
  const user=await requireUser()
  const isAdmin = user.role === 'ADMIN'
  const isTL = user.role === 'TL' || user.role === 'MANAGER'

  let whereClause: Prisma.LeadWhereInput = {}

  if (isAdmin || user.department === 'TECHNICAL') {
    // Admin and Technical see all leads
    whereClause = {}
  } else if (isTL) {
    // TL sees leads assigned to users in their department or calls made by users in their department
    whereClause = {
      OR: [
        {
          assignments: {
            some: {
              user: {
                department: user.department
              }
            }
          }
        },
        {
          callRecords: {
            some: {
              user: {
                department: user.department
              }
            }
          }
        }
      ]
    }
  } else {
    // Executive sees only their own leads (both CRM assigned and Extra Dialer calls)
    whereClause = {
      OR: [
        {
          assignments: {
            some: {
              userId: user.id
            }
          }
        },
        {
          callRecords: {
            some: {
              userId: user.id
            }
          }
        }
      ]
    }
  }

  // Fetch leads and their assignments (so we know who they belong to)
  const rawLeads = await prisma.lead.findMany({
    where: whereClause,
    include: {
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              department: true,
              subTeam: true,
            }
          }
        }
      },
      
      
    },
    orderBy: { createdAt: 'desc' }
  })
  const historySummary = await getLeadHistorySummary(rawLeads.map(l => l.id));
  const leads = rawLeads.map(l => ({ ...l, callRecords: historySummary.calls[l.id] || [], auditLogs: historySummary.audits[l.id] || [] }));

  // Ensure every lead has assignments mapped, even if only callRecords exist
  const mappedLeads = leads.map(l => {
    if ((!l.assignments || l.assignments.length === 0) && l.callRecords && l.callRecords.length > 0) {
      const callUser = l.callRecords[0]?.user;
      if (callUser) {
        return {
          ...l,
          assignments: [{
            id: `ext_assign_${l.id}`,
            stage: 'EXTRA_DIALER',
            user: callUser
          }]
        };
      }
    }
    return l;
  });

  let issuesWhereClause: Prisma.IssueWhereInput = {}

  if (isAdmin || user.department === 'TECHNICAL') {
    issuesWhereClause = {}
  } else if (isTL) {
    issuesWhereClause = {
      leadOwner: {
        department: user.department
      }
    }
  } else {
    issuesWhereClause = {
      leadOwnerId: user.id
    }
  }

  const issues = await prisma.issue.findMany({
    where: issuesWhereClause,
    include: {
      issueStatus: true,
      issueType: true,
      leadOwner: {
        select: {
          id: true,
          name: true,
          department: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // We return the leads directly, and let the client component process them 
  // depending on the date range filter. 
  // We'll also return the current user's details for UI configuration.
  return { leads: mappedLeads, issues, user: { ...user, isAdmin, isTL } }
}

export async function getSocialMediaPerformanceData() {
  const user=await requireUser()
  const isAdmin = user.role === 'ADMIN'
  const isTL = user.role === 'TL' || user.role === 'MANAGER'

  let whereClause: Prisma.ContentRecordWhereInput = {}

  if (isAdmin) {
    // Admin sees all content records
    whereClause = {}
  } else if (isTL) {
    // TL sees all content records for their department
    if (user.department === 'Posting Team') {
      whereClause = {
        OR: [
          {
            approvalStatus: 'Approved',
            postOnDate: { not: null }
          },
          { postedById: user.id },
          { uploadingStatus: { in: ['Scheduled', 'Published', 'Uploaded'] } }
        ]
      }
    } else {
      whereClause = {
        editor: {
          department: user.department
        }
      }
    }
  } else {
    // Executive
    if (user.department === 'Posting Team') {
      whereClause = {
        OR: [
          {
            approvalStatus: 'Approved',
            postOnDate: { not: null }
          },
          { postedById: user.id },
          { uploadingStatus: { in: ['Scheduled', 'Published', 'Uploaded'] } }
        ]
      }
    } else {
      whereClause = {
        editorId: user.id
      }
    }
  }

  const contentRecords = await prisma.contentRecord.findMany({
    where: whereClause,
    include: {
      editor: {
        select: {
          id: true,
          name: true,
          department: true,
          subTeam: true,
        }
      },
      approver: {
        select: {
          id: true,
          name: true,
        }
      },
      postedBy: {
        select: {
          id: true,
          name: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  let taskWhereClause: Prisma.TaskRecordWhereInput = {}
  if (user.department === 'Posting Team') {
    // Posting Team does not use task sheet
    taskWhereClause = { id: '__none__' }
  } else if (isAdmin) {
    taskWhereClause = {}
  } else if (isTL) {
    taskWhereClause = {
      assignedDepartment: user.department
    }
  } else {
    taskWhereClause = {
      assignedToId: user.id
    }
  }

  const taskRecords = await prisma.taskRecord.findMany({
    where: taskWhereClause,
    orderBy: { id: 'desc' }
  })

  return { contentRecords, taskRecords, user: { ...user, isAdmin, isTL } }
}
