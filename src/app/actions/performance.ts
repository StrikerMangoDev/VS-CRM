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
  const user = await requireUser()
  const isAdmin = user.role === 'ADMIN'
  const isTL = user.role === 'TL' || user.role === 'MANAGER'
  const isManager = user.role === 'MANAGER'

  const userDept = (user.department || '').trim();
  const isGraphicsUser = userDept === 'Graphics Team' || 
    userDept === 'Graphics' || 
    userDept === 'Thumbnail Team' || 
    userDept.toLowerCase().includes('graphic');
  const isEditingUser = userDept === 'Editing Team' || 
    userDept === 'Editing' || 
    userDept.toLowerCase().includes('edit');
  const isPostingUser = userDept === 'Posting Team' || 
    userDept === 'Posting' || 
    userDept.toLowerCase().includes('post');

  let whereClause: Prisma.ContentRecordWhereInput = {}

  if (isAdmin || isManager) {
    whereClause = {}
  } else if (isTL) {
    if (isPostingUser) {
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
    } else if (isGraphicsUser) {
      whereClause = {
        OR: [
          { format: 'Graphics Task' },
          { uniqueId: { startsWith: 'GP-' } },
          { graphicDesignerId: { not: null } },
          { sendTo: 'Send for thumbnail' },
          { graphicDesigner: { department: { contains: 'Graphic', mode: 'insensitive' } } }
        ]
      }
    } else if (isEditingUser) {
      whereClause = {
        OR: [
          { editor: { department: { contains: 'Edit', mode: 'insensitive' } } },
          { format: { in: ['Long Video', 'Short / Reel', 'Short', 'Reel'] } }
        ]
      }
    } else {
      whereClause = {}
    }
  } else {
    // Executive
    if (isPostingUser) {
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
    } else if (isGraphicsUser) {
      whereClause = {
        OR: [
          { graphicDesignerId: user.id },
          { editorId: user.id },
          { format: 'Graphics Task' },
          { uniqueId: { startsWith: 'GP-' } },
          { sendTo: 'Send for thumbnail' },
          { thumbnailCount: { not: null } }
        ]
      }
    } else if (isEditingUser) {
      whereClause = {
        OR: [
          { editorId: user.id },
          { graphicDesignerId: user.id }
        ]
      }
    } else {
      whereClause = {
        OR: [
          { editorId: user.id },
          { graphicDesignerId: user.id }
        ]
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
      graphicDesigner: {
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
  if (isPostingUser) {
    taskWhereClause = { id: '__none__' }
  } else if (isAdmin || isManager) {
    taskWhereClause = {}
  } else if (isTL) {
    taskWhereClause = isGraphicsUser
      ? { assignedDepartment: { in: ['Graphics Team', 'Graphics'] } }
      : { assignedDepartment: user.department }
  } else {
    taskWhereClause = isGraphicsUser
      ? {
          OR: [
            { assignedToId: user.id },
            { assignedDepartment: 'Graphics Team' },
            { assignedDepartment: 'Graphics' }
          ]
        }
      : isEditingUser
        ? {
            OR: [
              { assignedToId: user.id },
              { assignedDepartment: 'Editing Team' },
              { assignedDepartment: 'Editing' }
            ]
          }
        : { assignedToId: user.id }
  }

  const taskRecords = await prisma.taskRecord.findMany({
    where: taskWhereClause,
    orderBy: { id: 'desc' }
  })

  // Ad Creative Records
  let adCreativeWhereClause: Prisma.AdCreativeRecordWhereInput = {}
  if (isAdmin || isManager) {
    adCreativeWhereClause = {}
  } else if (isTL) {
    if (isGraphicsUser) {
      adCreativeWhereClause = { mediaType: 'Graphics' }
    } else if (isEditingUser) {
      adCreativeWhereClause = { mediaType: 'Video' }
    } else {
      adCreativeWhereClause = {}
    }
  } else {
    // Executive
    if (isGraphicsUser) {
      adCreativeWhereClause = {
        OR: [
          { editorId: user.id },
          { editorName: { contains: user.name, mode: 'insensitive' } },
          { mediaType: 'Graphics' }
        ]
      }
    } else if (isEditingUser) {
      adCreativeWhereClause = {
        OR: [
          { editorId: user.id },
          { editorName: { contains: user.name, mode: 'insensitive' } },
          { mediaType: 'Video' }
        ]
      }
    } else {
      adCreativeWhereClause = {
        OR: [
          { editorId: user.id },
          { editorName: { contains: user.name, mode: 'insensitive' } }
        ]
      }
    }
  }

  const adCreativeRecords = await prisma.adCreativeRecord.findMany({
    where: adCreativeWhereClause,
    include: {
      editor: {
        select: {
          id: true,
          name: true,
          department: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return { contentRecords, taskRecords, adCreativeRecords, user: { ...user, isAdmin, isTL } }
}
