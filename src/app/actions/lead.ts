'use server'
import { requireUser,requireSales,requireLeadAccess } from '@/lib/auth'
import { getSessionCookie } from '@/lib/auth'


import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import Papa from 'papaparse'
import { calculateLeadStatus } from '@/utils/leadStatus'
import { prisma,withLeadTransaction } from '@/lib/prisma'
import { createHash } from 'node:crypto'
import { refreshPendingCalls } from '@/lib/smartflo'
import { nextLeadId } from '@/lib/ids'


async function generateNextPartPaymentId() {
  let nextNum = 1;
  const lastLead = await prisma.lead.findFirst({
    where: { partPaymentId: { startsWith: 'PR-' } },
    orderBy: { partPaymentId: 'desc' }
  });
  if (lastLead && lastLead.partPaymentId) {
    const parts = lastLead.partPaymentId.split('-');
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num)) {
        nextNum = num + 1;
      }
    }
  }
  return `PR-${nextNum.toString().padStart(5, '0')}`;
}

async function generateNextFullPaymentId() {
  let nextNum = 1;
  const lastLead = await prisma.lead.findFirst({
    where: { fullPaymentId: { startsWith: 'FP-' } },
    orderBy: { fullPaymentId: 'desc' }
  });
  if (lastLead && lastLead.fullPaymentId) {
    const parts = lastLead.fullPaymentId.split('-');
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num)) {
        nextNum = num + 1;
      }
    }
  }
  return `FP-${nextNum.toString().padStart(5, '0')}`;
}

export async function logAuditChanges(leadId: string, changes: { field: string, oldVal: string, newVal: string }[]) {
  await requireLeadAccess(leadId);

  if (changes.length === 0) return;
  await cookies();
  const session = (await getSessionCookie())?.value
  if (!session) return;
  
  try {
    const user = JSON.parse(session)
    await prisma.auditHistory.createMany({
      data: changes.map(c => ({
        leadId,
        userName: user.name,
        userRole: user.role,
        field: c.field,
        oldValue: c.oldVal,
        newValue: c.newVal
      }))
    })
  } catch (e) {
    console.error('Failed to log audit changes:', e)
    throw e
  }
}

export async function getLeadHistoryAction(leadId: string) {
  await requireLeadAccess(leadId);

  return await prisma.auditHistory.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getCallLogsAction(leadId: string) {
  await requireLeadAccess(leadId);

  try {
    const readLogs = () => prisma.callRecord.findMany({
      where: { leadId },
      include: {
        user: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    const logs = await readLogs()
    return await refreshPendingCalls(logs) ? await readLogs() : logs;
  } catch {
    return [];
  }
}

export async function getAllHistoryAction() {
  const actor = await requireUser();

  const history = await prisma.auditHistory.findMany({
    where: actor.role === 'ADMIN' ? {} : { userName: actor.name },
    orderBy: { createdAt: 'desc' },
    include: { lead: { select: { uniqueId: true, name: true, webinarId: true, webinarName: true } } }
  })
  
  const users = await prisma.user.findMany({ select: { name: true, mainDepartment: true } })
  const userTeamMap = new Map(users.map((u) => [u.name, u.mainDepartment]))
  
  return history.map((h) => ({
    ...h,
    userTeam: userTeamMap.get(h.userName) || 'Unknown'
  }))
}


function calculateLeadLogStatus(recoveryAssignedAt: Date | null): string {
  if (!recoveryAssignedAt) return "Fresh Log";
  
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - recoveryAssignedAt.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 21) {
    return "Fresh Log";
  } else if (diffDays <= 81) {
    return "New Log";
  } else {
    return "Old Log";
  }
}

export async function updateLeadAction(formData: FormData) {
  return withLeadTransaction(async () => {

  await requireLeadAccess(String(formData.get("id")));

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const webinarName = formData.get('webinarName') as string || null
  const webinarId = formData.get('webinarId') as string || null
  const email = formData.get('email') as string || null
  const state = formData.get('state') as string || null
  const mobileNumber = formData.get('mobileNumber') as string
  const partPaymentAmount = Number(formData.get('partPaymentAmount') || 0)
  const fullPaymentAmount = Number(formData.get('fullPaymentAmount') || 0)
  const totalPayment = Number(formData.get('totalPayment') || 0)
  
  let paymentStatus = 'NO_PAYMENT'
  if (fullPaymentAmount > 0) {
    paymentStatus = 'FULL_PAYMENT'
  } else if (partPaymentAmount > 0) {
    paymentStatus = 'PART_PAYMENT'
  }
  if ([partPaymentAmount, fullPaymentAmount, totalPayment].some(n => !Number.isFinite(n) || n < 0)) throw new Error('Invalid amount')
  const salesAmountStr = formData.get('salesAmount')
  const recoveryAmountStr = formData.get('recoveryAmount')
  const salesAmount = salesAmountStr ? parseFloat(salesAmountStr as string) : null
  const recoveryAmount = recoveryAmountStr ? parseFloat(recoveryAmountStr as string) : null
  const whatsappJoined = formData.get('whatsappJoined') === 'on'
  const customData = formData.get('customData') as string || "{}"

  const existingLead = await prisma.lead.findUnique({ where: { id } });
  
  let frozenLeadLogStatus = existingLead?.frozenLeadLogStatus || null;
  if (!frozenLeadLogStatus && (paymentStatus === 'FULL_PAYMENT' || totalPayment >= 15999)) {
    frozenLeadLogStatus = calculateLeadLogStatus(existingLead?.recoveryAssignedAt || null);
  }
  let partPaymentId = existingLead?.partPaymentId;
  if (paymentStatus === 'PART_PAYMENT' && !partPaymentId) {
    partPaymentId = await generateNextPartPaymentId();
  }
  let fullPaymentId = existingLead?.fullPaymentId;
  if (paymentStatus === 'FULL_PAYMENT' && !fullPaymentId) {
    fullPaymentId = await generateNextFullPaymentId();
  }

  await prisma.lead.update({
    where: { id },
    data: {
      name,
      webinarName,
      webinarId,
      email,
      state,
      mobileNumber,
      paymentStatus,
      totalPayment,
      partPaymentAmount,
      fullPaymentAmount,
      salesAmount,
      recoveryAmount,
      whatsappJoined,
      partPaymentId,
      fullPaymentId,
      frozenLeadLogStatus,
      customData
    }
  })

  revalidatePath('/')
  revalidatePath('/sales')
  revalidatePath('/recovery')
  revalidatePath('/technical/tech')
  revalidatePath('/technical/access')
  revalidatePath('/technical/welcome')

  });
}

export async function deleteLeadAction(leadId: string) {
  return withLeadTransaction(async () => {

  await requireLeadAccess(leadId, true);

  await prisma.actionLog.deleteMany({ where: { leadId } })
  await prisma.assignment.deleteMany({ where: { leadId } })
  
  await prisma.lead.delete({
    where: { id: leadId }
  })

  revalidatePath('/')
  revalidatePath('/part-payment')
  revalidatePath('/full-payment')
  revalidatePath('/sales')
  revalidatePath('/recovery')
  revalidatePath('/technical')

  });
}

export async function bulkDeleteLeadsAction(leadIds: string[]) {
  return withLeadTransaction(async () => {

  await requireSales(true); for (const id of leadIds) await requireLeadAccess(id, true);

  if (!leadIds || leadIds.length === 0) return;
  
  await prisma.actionLog.deleteMany({ where: { leadId: { in: leadIds } } })
  await prisma.assignment.deleteMany({ where: { leadId: { in: leadIds } } })
  
  await prisma.lead.deleteMany({
    where: { id: { in: leadIds } }
  })

  revalidatePath('/')
  revalidatePath('/part-payment')
  revalidatePath('/full-payment')
  revalidatePath('/sales')
  revalidatePath('/recovery')
  revalidatePath('/technical')

  });
}

export async function removeLeadFromSheetAction(leadId: string, sheetName: string) {
  return withLeadTransaction(async () => {

  await requireLeadAccess(leadId, true);

  if (sheetName === 'PART_PAYMENT') {
    await prisma.lead.update({
      where: { id: leadId },
      data: { 
        paymentStatus: 'NO_PAYMENT',
        partPaymentAmount: 0,
        totalPayment: 0,
        paymentDate: null
      }
    })
  } else if (sheetName === 'FULL_PAYMENT') {
    await prisma.lead.update({
      where: { id: leadId },
      data: { 
        paymentStatus: 'NO_PAYMENT',
        fullPaymentAmount: 0,
        totalPayment: 0,
        paymentDate: null
      }
    })
  } else if (sheetName === 'SALES' || sheetName === 'RECOVERY') {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        amount1: null,
        amount2: null,
        amount3: null,
        discount: null,
        totalPayment: 0,
        nextFollowUpDate: null,
        remark1: null,
        remark2: null,
        paymentDate: null,
        salesAmount: sheetName === 'SALES' ? 0 : undefined,
        recoveryAmount: sheetName === 'RECOVERY' ? 0 : undefined,
      }
    })

    const assignments = await prisma.assignment.findMany({
      where: { leadId },
      include: { user: true }
    })
    for (const a of assignments) {
      if (a.user.department === sheetName) {
        await prisma.assignment.delete({
          where: { id: a.id }
        })
      }
    }
  }

  revalidatePath('/')
  revalidatePath('/part-payment')
  revalidatePath('/full-payment')
  revalidatePath('/sales')
  revalidatePath('/recovery')

  });
}

export async function updateLeadAmountsAction(leadId: string, amount1: number | null, amount2: number | null, amount3: number | null, discount: number | null, totalPayment: number, updaterDepartment: string = '', nextFollowUpDate: Date | null = null, remark1: string | null = null, remark2: string | null = null) {
  return withLeadTransaction(async () => {

  await requireLeadAccess(leadId, false);

  const actor = await requireLeadAccess(leadId);
  if (actor.role === 'EXEC' && updaterDepartment && updaterDepartment !== actor.department) throw new Error('Forbidden');
  if ([amount1, amount2, amount3, discount, totalPayment].some(n => n != null && (!Number.isFinite(n) || n < 0))) throw new Error('Invalid amount');
  const dataToUpdate: import('@prisma/client').Prisma.LeadUncheckedUpdateInput = {
    amount1,
    amount2,
    amount3,
    discount,
    totalPayment,
    nextFollowUpDate,
    remark1,
    remark2
  }

  const existingLead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (existingLead && existingLead.totalPayment !== totalPayment) {
    dataToUpdate.updateStatusDate = new Date();
  }
  if (existingLead && ((existingLead.partPaymentAmount || 0) + totalPayment + (discount || 0)) >= 15999) {
    if (!existingLead.frozenLeadStatus) {
      dataToUpdate.frozenLeadStatus = calculateLeadStatus(existingLead.paymentDate, null);
    }
    if (!existingLead.frozenLeadLogStatus) {
      dataToUpdate.frozenLeadLogStatus = calculateLeadLogStatus(existingLead.recoveryAssignedAt);
    }
  }

  // Route amounts exactly as requested by user.
  // Never touch partPaymentAmount or fullPaymentAmount.
  if (updaterDepartment === 'SALES') {
    dataToUpdate.salesAmount = totalPayment;
  } else if (updaterDepartment === 'RECOVERY') {
    dataToUpdate.recoveryAmount = totalPayment;
  }
  
  const changes = []
  const fieldMap: Record<string,string> = {
    amount1: 'Amount 1',
    amount2: 'Amount 2',
    amount3: 'Amount 3',
    discount: 'Discount',
    totalPayment: 'Total Payment',
    nextFollowUpDate: 'Next Follow Up',
    remark1: 'Remark 1',
    remark2: 'Remark 2'
  }
  
  if (existingLead) {
    for (const [key, label] of Object.entries(fieldMap)) {
      if (dataToUpdate[key as keyof typeof dataToUpdate] !== undefined) {
        let oldV = existingLead[key as keyof typeof existingLead]
        let newV = dataToUpdate[key as keyof typeof dataToUpdate]
        
        if (oldV instanceof Date) oldV = oldV.toISOString().split('T')[0]
        if (newV instanceof Date) newV = newV.toISOString().split('T')[0]
        
        oldV = oldV !== null && oldV !== undefined ? String(oldV) : ''
        newV = newV !== null && newV !== undefined ? String(newV) : ''
        
        if (oldV !== newV) {
          changes.push({ field: label as string, oldVal: oldV || '-', newVal: newV || '-' })
        }
      }
    }
    if (changes.length > 0) {
      await logAuditChanges(leadId, changes)
    }
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: dataToUpdate
  })

  revalidatePath('/sales')
  revalidatePath('/recovery')
  revalidatePath('/')

  });
}

export async function assignLeadAction(leadId: string, userId: string, stage: string) {
  return withLeadTransaction(async () => {

  await requireLeadAccess(leadId, true);

  // Fetch the new user to check their department
  const newUser = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!newUser || !newUser.isActive) throw new Error('Invalid assignee');
  const actor = await requireSales(true);
  if (actor.role !== 'ADMIN' && newUser.mainDepartment !== actor.mainDepartment) throw new Error('Forbidden');
  if (!['FRESH_LOG','NEXT_LOG','OLD_LOG','COMPLETED','IN_PROGRESS','EXTRA_DIALER'].includes(stage)) throw new Error('Invalid stage');

  let oldOwner = 'Unassigned'
  // Remove any existing assignments that belong to the same mainDepartment (e.g. Sales replacing Sales)
  const existingAssignments = await prisma.assignment.findMany({
    where: { leadId },
    include: { user: true }
  })
  
  const sameDeptAssignments = existingAssignments.filter(a => a.user.mainDepartment === newUser.mainDepartment)
  if (sameDeptAssignments.length > 0) {
    oldOwner = sameDeptAssignments.map(a => a.user.name).join(', ')
  }
  
  for (const assignment of existingAssignments) {
    // If it's a generic unassign or matches the new user's main department
    if (assignment.user.mainDepartment === newUser.mainDepartment || assignment.user.department === 'SALES' || assignment.user.department === 'RECOVERY') {
      await prisma.assignment.delete({
        where: { id: assignment.id }
      })
    }
  }

  if (oldOwner !== newUser.name) {
    await logAuditChanges(leadId, [{ field: 'Lead Owner', oldVal: oldOwner, newVal: newUser.name }])
  }

  // Create the new assignment
  await prisma.assignment.create({
    data: {
      leadId,
      userId,
      stage
    }
  })

  if (newUser.department === 'RECOVERY') {
    await prisma.lead.update({
      where: { id: leadId },
      data: { recoveryAssignedAt: new Date(), frozenLeadLogStatus: null }
    })
  }

  revalidatePath('/')
  revalidatePath('/sales')
  revalidatePath('/recovery')

  });
}

export async function unassignLeadAction(leadId: string) {
  return withLeadTransaction(async () => {

  await requireLeadAccess(leadId, true);

  // Remove non-technical assignments from the lead (e.g. Sales/Recovery/Custom departments)
  const existingAssignments = await prisma.assignment.findMany({
    where: { leadId },
    include: { user: true }
  })
  
  for (const assignment of existingAssignments) {
    if (assignment.user.department !== 'TECHNICAL' && assignment.user.mainDepartment !== 'Technical Department') {
      await prisma.assignment.delete({
        where: { id: assignment.id }
      })
    }
  }

  revalidatePath('/')
  revalidatePath('/sales')
  revalidatePath('/recovery')

  });
}

export async function bulkAssignLeadsAction(leadIds: string[], userId: string, stage: string) {
  return withLeadTransaction(async () => {

  await requireSales(true); for (const id of leadIds) await requireLeadAccess(id, true);

  const newUser = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!newUser || !newUser.isActive) throw new Error('Invalid assignee');
  const actor = await requireSales(true);
  if (actor.role !== 'ADMIN' && newUser.mainDepartment !== actor.mainDepartment) throw new Error('Forbidden');
  if (!['FRESH_LOG','NEXT_LOG','OLD_LOG','COMPLETED','IN_PROGRESS','EXTRA_DIALER'].includes(stage)) throw new Error('Invalid stage');

  for (const leadId of leadIds) {
    const existingAssignments = await prisma.assignment.findMany({
      where: { leadId },
      include: { user: true }
    })
    
    let oldOwner = 'Unassigned'
    const sameDeptAssignments = existingAssignments.filter(a => a.user.mainDepartment === newUser.mainDepartment)
    if (sameDeptAssignments.length > 0) {
      oldOwner = sameDeptAssignments.map(a => a.user.name).join(', ')
    }
    if (oldOwner !== newUser.name) {
      await logAuditChanges(leadId, [{ field: 'Lead Owner', oldVal: oldOwner, newVal: newUser.name }])
    }
    
    for (const assignment of existingAssignments) {
      if (assignment.user.mainDepartment === newUser.mainDepartment || assignment.user.department === 'SALES' || assignment.user.department === 'RECOVERY') {
        await prisma.assignment.delete({
          where: { id: assignment.id }
        })
      }
    }

    await prisma.assignment.create({
      data: {
        leadId,
        userId,
        stage
      }
    })

    if (newUser.department === 'RECOVERY') {
      await prisma.lead.update({
        where: { id: leadId },
        data: { recoveryAssignedAt: new Date(), frozenLeadLogStatus: null }
      })
    }
  }

  revalidatePath('/')
  revalidatePath('/sales')
  revalidatePath('/recovery')

  });
}

export async function updateTechnicalStageAction(leadId: string, actionType: 'WHATSAPP' | 'LMS' | 'WELCOME') {
  return withLeadTransaction(async () => {

  await requireLeadAccess(leadId, false);

  const data: import('@prisma/client').Prisma.LeadUncheckedUpdateInput = {}
  
  if (actionType === 'WHATSAPP') data.whatsappJoined = true
  if (actionType === 'LMS') data.lmsAccessGranted = true
  if (actionType === 'WELCOME') data.enrollmentCompleted = true

  await prisma.lead.update({
    where: { id: leadId },
    data
  })

  revalidatePath('/technical')
  revalidatePath('/technical')
  revalidatePath('/')

  });
}

export async function updateWhatsAppStatusAction(leadId: string, joined: boolean) {
  return withLeadTransaction(async () => {

  await requireLeadAccess(leadId, false);

  await prisma.lead.update({
    where: { id: leadId },
    data: { whatsappJoined: joined }
  })
  
  revalidatePath('/technical')
  revalidatePath('/')

  });
}

export async function updateAccessDetailsAction(leadId: string, accessStatus: string, accessType: string | null) {
  return withLeadTransaction(async () => {

  await requireLeadAccess(leadId, false);

  await prisma.lead.update({
    where: { id: leadId },
    data: { accessStatus, accessType }
  })
  
  revalidatePath('/technical')
  revalidatePath('/')

  });
}

export async function createLeadAction(formData: FormData) {
  return withLeadTransaction(async () => {

  await requireSales(true);

  const name = formData.get('name') as string
  const rawMobileNumber = (formData.get('mobileNumber') as string || '').trim()
  
  if (!rawMobileNumber) {
    throw new Error('Mobile number is required')
  }

  let mobileStr = rawMobileNumber
  if (/^\d+(\.\d+)?[eE]\+\d+$/.test(mobileStr)) {
    const n = Number(mobileStr)
    if (!isNaN(n)) mobileStr = BigInt(Math.round(n)).toString()
  }
  if (/^\d+\.0+$/.test(mobileStr)) {
    mobileStr = mobileStr.split('.')[0]
  }

  const hasLetters = /[a-zA-Z]/.test(mobileStr)
  const isValidPhone = /^\+?[0-9\s\-]+$/.test(mobileStr)
  const digits = mobileStr.replace(/\D/g, '')

  if (hasLetters || !isValidPhone || digits.length < 7) {
    throw new Error(`Invalid Mobile Number: Mobile number must contain only numbers (minimum 7 digits), text is not allowed (got: "${rawMobileNumber}").`)
  }

  const mobileNumber = mobileStr.replace(/[\s\-]/g, '')
  const email = formData.get('email') as string
  const paymentStatus = formData.get('paymentStatus') as string || 'NO_PAYMENT'
  if (!['NO_PAYMENT', 'PART_PAYMENT', 'FULL_PAYMENT'].includes(paymentStatus)) throw new Error('Invalid payment status')
  const state = formData.get('state') as string || null
  const customData = formData.get('customData') as string || "{}"
  
  const rawPayment = formData.get('totalPayment') as string
  let totalPayment = rawPayment ? Number(rawPayment) : 0
  if (!totalPayment && paymentStatus === 'FULL_PAYMENT') {
    totalPayment = 15999
  }
  
  if (!Number.isFinite(totalPayment) || totalPayment < 0) throw new Error('Invalid payment amount')
  let webinarName = formData.get('webinarName') as string || null
  let webinarId = formData.get('webinarId') as string || null
  if (webinarId) webinarId = webinarId.trim()
  if (webinarName) webinarName = webinarName.trim()

  if (webinarId) {
    const webinarExists = await prisma.webinarMaster.findFirst({
      where: { id: { equals: webinarId, mode: 'insensitive' } }
    })
    if (!webinarExists) {
      throw new Error(`Webinar ID "${webinarId}" does not exist. Please check and try again.`)
    }
    webinarId = webinarExists.id
    if (!webinarName) {
      webinarName = webinarExists.name
    }
  } else if (webinarName) {
    const webinarExists = await prisma.webinarMaster.findFirst({
      where: { name: { equals: webinarName, mode: 'insensitive' } }
    })
    if (webinarExists) {
      webinarId = webinarExists.id
      webinarName = webinarExists.name
    }
  }

  let oldLeadDataToCopy: import('@prisma/client').Prisma.LeadGetPayload<{include:{assignments:true}}> | null = null;

  if (email || mobileNumber) {
    const OR: import('@prisma/client').Prisma.LeadWhereInput[] = []
    if (email) {
      OR.push({ email: email })
      OR.push({ mobileNumber: email })
    }
    if (mobileNumber) {
      OR.push({ mobileNumber: mobileNumber })
      OR.push({ email: mobileNumber })
    }

    // Check if lead already exists in THIS current webinar
    const leadInThisWebinar = await prisma.lead.findFirst({
      where: {
        AND: [
          { OR },
          {
            OR: [
              ...(webinarId ? [{ webinarId }] : []),
              ...(webinarName ? [{ webinarName }] : [])
            ]
          }
        ]
      },
      include: { assignments: true },
      orderBy: { createdAt: 'desc' }
    })
    
    if (leadInThisWebinar) {
      if (paymentStatus === 'PART_PAYMENT' || paymentStatus === 'FULL_PAYMENT') {
        await prisma.lead.update({
          where: { id: leadInThisWebinar.id },
          data: {
            partPaymentAmount: paymentStatus === 'PART_PAYMENT' ? (leadInThisWebinar.partPaymentAmount || 0) + totalPayment : (leadInThisWebinar.partPaymentAmount || 0),
            fullPaymentAmount: paymentStatus === 'FULL_PAYMENT' ? (leadInThisWebinar.fullPaymentAmount || 0) + totalPayment : (leadInThisWebinar.fullPaymentAmount || 0),
            totalPayment: (leadInThisWebinar.totalPayment || 0) + totalPayment,
            paymentStatus: paymentStatus,
            leadStatus: leadInThisWebinar.leadStatus?.startsWith('CLOSED') ? 'Fresh Lead' : leadInThisWebinar.leadStatus,
            partPaymentId: (paymentStatus === 'PART_PAYMENT' && !leadInThisWebinar.partPaymentId) ? await generateNextPartPaymentId() : leadInThisWebinar.partPaymentId,
            fullPaymentId: (paymentStatus === 'FULL_PAYMENT' && !leadInThisWebinar.fullPaymentId) ? await generateNextFullPaymentId() : leadInThisWebinar.fullPaymentId
          }
        })
        revalidatePath('/')
        revalidatePath('/part-payment')
        revalidatePath('/full-payment')
        return
      } else {
        throw new Error("Duplicate Error: This lead already exists in the selected webinar.");
      }
    } else {
      // Lead does NOT exist in this webinar ("es webinar me vo lead nhi h")!
      // Find all earlier leads in previous webinars ("sale master sheet me vo phle ke webinar me h")
      const previousLeads = await prisma.lead.findMany({
        where: {
          AND: [
            { OR },
            {
              OR: [
                { webinarId: { not: webinarId } },
                { webinarId: null }
              ]
            }
          ]
        },
        include: { assignments: true },
        orderBy: { createdAt: 'desc' }
      })

      if (previousLeads.length > 0) {
        // Close all earlier leads from previous webinars ("vo phle vali lead close ho jaye gi")
        await prisma.lead.updateMany({
          where: { id: { in: previousLeads.map(l => l.id) } },
          data: { leadStatus: 'CLOSED' }
        })
        oldLeadDataToCopy = previousLeads[0];
      }
      // Now proceed to create this lead in THIS webinar ("and es webinar me vo create hogi and usme hi rhye gi")!
    }
  }

  let newLead;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const uniqueId = await nextLeadId(webinarId || null, webinarName || null)

      newLead = await prisma.lead.create({
        data: {
          uniqueId,
          name,
          mobileNumber,
          email: email || null,
          webinarName,
          webinarId,
          state,
          paymentStatus,
          totalPayment: totalPayment,
          partPaymentAmount: paymentStatus === 'PART_PAYMENT' ? totalPayment : 0,
          fullPaymentAmount: paymentStatus === 'FULL_PAYMENT' ? totalPayment : 0,
          partPaymentId: paymentStatus === 'PART_PAYMENT' ? await generateNextPartPaymentId() : null,
          fullPaymentId: paymentStatus === 'FULL_PAYMENT' ? await generateNextFullPaymentId() : null,
          customData,
          leadStatus: 'Fresh Lead',
          callStatus: 'UNTOUCHED',
          updateStatusDate: totalPayment > 0 ? new Date() : null,
          frozenLeadStatus: totalPayment >= 15999 ? 'Fresh Lead' : null,
          frozenLeadLogStatus: totalPayment >= 15999 ? 'Fresh Log' : null,
          remark1: oldLeadDataToCopy?.remark1,
          remark2: oldLeadDataToCopy?.remark2,
          amount1: oldLeadDataToCopy?.amount1,
          amount2: oldLeadDataToCopy?.amount2,
          amount3: oldLeadDataToCopy?.amount3,
          discount: oldLeadDataToCopy?.discount,
          salesAmount: oldLeadDataToCopy?.salesAmount,
          recoveryAmount: oldLeadDataToCopy?.recoveryAmount,
          nextFollowUpDate: oldLeadDataToCopy?.nextFollowUpDate
        }
      })
      break; // Success! Break out of the retry loop.
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002' && attempts < maxAttempts - 1) {
        attempts++;
        continue;
      }
      throw error;
    }
  }

  if (!newLead) {
    throw new Error('Failed to create lead after multiple attempts');
  }

  if (oldLeadDataToCopy?.assignments && oldLeadDataToCopy.assignments.length > 0) {
    await prisma.assignment.createMany({
      data: oldLeadDataToCopy.assignments.map((a) => ({
        leadId: newLead.id,
        userId: a.userId,
        stage: a.stage
      }))
    });
  } else {
    // Auto assign to technical team only if no old assignments were copied
    const techUser = await prisma.user.findFirst({
      where: { department: 'TECHNICAL', isActive: true, role: 'EXEC' }
    })

    if (techUser) {
      await prisma.assignment.create({
        data: {
          leadId: newLead.id,
          userId: techUser.id,
          stage: 'FRESH_LOG'
        }
      })
    }
  }

  revalidatePath('/')
  revalidatePath('/part-payment')
  revalidatePath('/full-payment')

  });
}

export async function bulkUploadLeadsAction(formData: FormData) {
  await requireSales(true);
  const file = formData.get('file') as File;
  if (!file || file.size > 100 * 1024 * 1024) throw new Error('Choose a CSV file smaller than 100 MB');
  const parsed = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase() });
  if (parsed.errors.length) throw new Error('Invalid CSV file');
  return bulkUploadChunkAction(parsed.data, String(formData.get('paymentStatus') || 'NO_PAYMENT'), String(formData.get('expectedColumns') || '[]'));
}

export async function updateLeadStatusAction(id: string, status: string) {
  return withLeadTransaction(async () => {

  await requireLeadAccess(id);

  const existingLead = await prisma.lead.findUnique({ where: { id } })
  if (existingLead && existingLead.leadStatus !== status) {
    await logAuditChanges(id, [{ field: 'Lead Status', oldVal: existingLead.leadStatus, newVal: status }])
  }
  await prisma.lead.update({
    where: { id },
    data: { leadStatus: status }
  })
  revalidatePath('/')

  });
}

export async function updateLeadCallStatusAction(id: string, callStatus: string) {
  return withLeadTransaction(async () => {

  await requireLeadAccess(id);

  const existingLead = await prisma.lead.findUnique({ where: { id } })
  if (existingLead && existingLead.callStatus !== callStatus) {
    await logAuditChanges(id, [{ field: 'Call Status', oldVal: existingLead.callStatus, newVal: callStatus }])
  }
  await prisma.lead.update({
    where: { id },
    data: { callStatus }
  })
  revalidatePath('/')
  revalidatePath('/sales')

  });
}

export async function updateLeadCompleteAction(
  leadId: string,
  data: {
    callStatus?: string
    nextFollowUpDate?: Date | null
    remark1?: string | null
    remark2?: string | null
    amount1?: number | null
    amount2?: number | null
    amount3?: number | null
    discount?: number | null
    totalPayment?: number
    updaterDepartment: string
    leadStatus?: string
    whatsappTemplate?: string | null
  }
) {
  return withLeadTransaction(async () => {

  await requireLeadAccess(leadId, false);

  const actor = await requireLeadAccess(leadId);
  if (actor.role === 'EXEC' && data.updaterDepartment !== actor.department) throw new Error('Forbidden');
  if ([data.amount1, data.amount2, data.amount3, data.discount, data.totalPayment].some(n => n != null && (!Number.isFinite(n) || n < 0))) throw new Error('Invalid amount');
  if (data.nextFollowUpDate && !Number.isFinite(data.nextFollowUpDate.getTime())) throw new Error('Invalid follow-up date');
  const existingLead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!existingLead) throw new Error('Lead not found')

  const dataToUpdate: import('@prisma/client').Prisma.LeadUncheckedUpdateInput = {
    callStatus: data.callStatus,
    nextFollowUpDate: data.nextFollowUpDate,
    remark1: data.remark1,
    remark2: data.remark2,
    amount1: data.amount1,
    amount2: data.amount2,
    amount3: data.amount3,
    discount: data.discount,
    leadStatus: data.leadStatus,
    ...(data.whatsappTemplate !== undefined ? { whatsappTemplate: data.whatsappTemplate } : {})
  }

  // Payment Logic
  if (data.totalPayment !== undefined) {
    dataToUpdate.totalPayment = data.totalPayment
    if (existingLead.totalPayment !== data.totalPayment) {
      dataToUpdate.updateStatusDate = new Date()
    }
    
    if (((existingLead.partPaymentAmount || 0) + data.totalPayment + (data.discount || 0)) >= 15999 && !existingLead.frozenLeadStatus) {
      dataToUpdate.frozenLeadStatus = calculateLeadStatus(existingLead.paymentDate, null)
    }

    if (data.updaterDepartment === 'SALES') {
      dataToUpdate.salesAmount = data.totalPayment
    } else if (data.updaterDepartment === 'RECOVERY') {
      dataToUpdate.recoveryAmount = data.totalPayment
    }
  }

  // Compute diffs for history
  const changes = []
  const fieldMap: Record<string,string> = {
    callStatus: 'Call Status',
    nextFollowUpDate: 'Next Follow Up',
    remark1: 'Remark 1',
    remark2: 'Remark 2',
    amount1: 'Amount 1',
    amount2: 'Amount 2',
    amount3: 'Amount 3',
    discount: 'Discount',
    totalPayment: 'Total Payment',
    leadStatus: 'Lead Status'
  }
  
  for (const [key, label] of Object.entries(fieldMap)) {
    if (dataToUpdate[key as keyof typeof dataToUpdate] !== undefined) {
      let oldV = existingLead[key as keyof typeof existingLead]
      let newV = dataToUpdate[key as keyof typeof dataToUpdate]
      
      if (oldV instanceof Date) oldV = oldV.toISOString().split('T')[0]
      if (newV instanceof Date) newV = newV.toISOString().split('T')[0]
      
      oldV = oldV !== null && oldV !== undefined ? String(oldV) : ''
      newV = newV !== null && newV !== undefined ? String(newV) : ''
      
      if (oldV !== newV) {
        changes.push({ field: label as string, oldVal: oldV || '-', newVal: newV || '-' })
      }
    }
  }

  if (changes.length > 0) {
    await logAuditChanges(leadId, changes)
  }

  const savedLead = await prisma.lead.update({
    where: { id: leadId },
    data: dataToUpdate,
    select: { id: true, callStatus: true, nextFollowUpDate: true, remark1: true, remark2: true, amount1: true, amount2: true, amount3: true, discount: true, totalPayment: true, salesAmount: true, recoveryAmount: true, leadStatus: true, whatsappTemplate: true, whatsappSentAt: true, updatedAt: true }
  })

  revalidatePath('/')
  revalidatePath('/sales')
  revalidatePath('/recovery')

  return savedLead

  });
}



export async function bulkUploadChunkAction(rows: Record<string, string>[], defaultPaymentStatus: string, expectedColumnsStr: string) {
  await requireSales(true);

  if (!Array.isArray(rows) || rows.length > 500) throw new Error('Upload at most 500 rows per chunk');
  if (!['NO_PAYMENT', 'PART_PAYMENT', 'FULL_PAYMENT'].includes(defaultPaymentStatus)) throw new Error('Invalid payment status');
  let successCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  const techUser = await prisma.user.findFirst({
    where: { department: 'TECHNICAL', isActive: true, role: 'EXEC' }
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const outcome = await withLeadTransaction(async () => {
      const name = row['name'];
      const rawMobile = row['mobile'] || row['mobilenumber'] || row['mobile number'] || row['phone'];
      
      if (!name || !rawMobile || rawMobile.trim() === '') {
        return 'error';
      }

      let mobileStr = rawMobile.trim();
      if (/^\d+(\.\d+)?[eE]\+\d+$/.test(mobileStr)) {
        const n = Number(mobileStr);
        if (!isNaN(n)) mobileStr = BigInt(Math.round(n)).toString();
      }
      if (/^\d+\.0+$/.test(mobileStr)) {
        mobileStr = mobileStr.split('.')[0];
      }

      const hasLetters = /[a-zA-Z]/.test(mobileStr);
      const isValidPhone = /^\+?[0-9\s\-]+$/.test(mobileStr);
      const digits = mobileStr.replace(/\D/g, '');

      if (hasLetters || !isValidPhone || digits.length < 7) {
        return 'error';
      }

      const mobileNumber = mobileStr.replace(/[\s\-]/g, '');
      const email = row['email'] || null;
      let webinarName = row['webinar name'] || row['webinarname'] || row['webinar'] || null;
      let webinarId = row['webinar id'] || row['webinarid'] || null;
      if (webinarId) webinarId = webinarId.trim();
      if (webinarName) webinarName = webinarName.trim();

      if (webinarId && !webinarName) {
        const wm = await prisma.webinarMaster.findFirst({
          where: { id: { equals: webinarId, mode: 'insensitive' } }
        });
        if (wm) {
          webinarId = wm.id;
          webinarName = wm.name;
        }
      } else if (webinarName && !webinarId) {
        const wm = await prisma.webinarMaster.findFirst({
          where: { name: { equals: webinarName, mode: 'insensitive' } }
        });
        if (wm) {
          webinarId = wm.id;
          webinarName = wm.name;
        }
      }
      const state = row['state'] || null;
      
      let rawPayment = row['total paid'] || row['totalpayment'] || row['total'];
      if (defaultPaymentStatus === 'PART_PAYMENT') rawPayment = rawPayment || row['part payment'] || row['partpayment'];
      if (defaultPaymentStatus === 'FULL_PAYMENT') rawPayment = rawPayment || row['full payment'] || row['fullpayment'];
      let totalPayment = rawPayment ? parseFloat(rawPayment) : 0;
      if (!totalPayment && defaultPaymentStatus === 'FULL_PAYMENT') {
        totalPayment = 15999;
      }
      
      if (!Number.isFinite(totalPayment) || totalPayment < 0) throw new Error('Invalid payment amount');
      totalPayment = Math.round(totalPayment * 100) / 100;
      const receipt = createHash('sha256').update(JSON.stringify([defaultPaymentStatus, mobileNumber, webinarId, webinarName, totalPayment, Object.entries(row).map(([k,v]) => [k.trim().toLowerCase(), String(v).trim()]).sort(([a], [b]) => a.localeCompare(b))])).digest('hex');
      if (defaultPaymentStatus !== 'NO_PAYMENT') {
        if (await prisma.paymentImport.findUnique({ where: { fingerprint: receipt } })) return 'duplicate';
      }
      const partPayment = Number(row['part payment'] || 0);
      const fullPayment = Number(row['full payment'] || 0);
      const discount = Number(row['discount'] || 0);
      
      const rawPaymentDate = row['payment date'] || row['paymentdate'] || row['payment_date'];
      let parsedPaymentDate: Date | null = null;
      if (rawPaymentDate && rawPaymentDate.trim() !== '') {
        const parts = rawPaymentDate.trim().split('-');
        if (parts.length === 3) {
          const isoDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
          parsedPaymentDate = new Date(isoDateStr);
          if (isNaN(parsedPaymentDate.getTime())) parsedPaymentDate = null;
        }
      }

      if (rawPaymentDate && (!/^\d{2}-\d{2}-\d{4}$/.test(rawPaymentDate.trim()) || !parsedPaymentDate || parsedPaymentDate.getUTCDate() !== Number(rawPaymentDate.slice(0,2)) || parsedPaymentDate.getUTCMonth() + 1 !== Number(rawPaymentDate.slice(3,5)))) throw new Error('Invalid payment date');
      if ([partPayment, fullPayment, discount].some(n => !Number.isFinite(n) || n < 0)) throw new Error('Invalid amount');
      if (webinarId && !await prisma.webinarMaster.findUnique({ where: { id: webinarId } })) throw new Error('Unknown webinar');
      if (defaultPaymentStatus !== 'NO_PAYMENT') await prisma.paymentImport.create({ data: { fingerprint: receipt } });
      const customDataObj: Record<string, string> = {};
      if (expectedColumnsStr) {
        const allExpected = JSON.parse(expectedColumnsStr);
        const explicitBase = ['name', 'mobile', 'email', 'webinar name', 'webinar id', 'state', 'part payment', 'full payment', 'discount', 'total paid', 'payment date'];
        for (const expectedCol of allExpected) {
          if (!explicitBase.includes(expectedCol.trim().toLowerCase())) {
            customDataObj[expectedCol] = row[expectedCol.trim().toLowerCase()] || '';
          }
        }
      }
      const customDataStr = Object.keys(customDataObj).length > 0 ? JSON.stringify(customDataObj) : "{}";

      let oldLeadDataToCopy: import('@prisma/client').Prisma.LeadGetPayload<{include:{assignments:true}}> | null = null;

      if (email || mobileNumber) {
        const OR: import('@prisma/client').Prisma.LeadWhereInput[] = [];
        if (email) {
          OR.push({ email: email });
          OR.push({ mobileNumber: email });
        }
        if (mobileNumber) {
          OR.push({ mobileNumber: mobileNumber });
          OR.push({ email: mobileNumber });
        }

        // Check if lead already exists in THIS current webinar
        const leadInThisWebinar = await prisma.lead.findFirst({
          where: {
            AND: [
              { OR },
              {
                OR: [
                  ...(webinarId ? [{ webinarId }] : []),
                  ...(webinarName ? [{ webinarName }] : [])
                ]
              }
            ]
          },
          include: { assignments: true },
          orderBy: { createdAt: 'desc' }
        });
        
        if (leadInThisWebinar) {
          if (defaultPaymentStatus === 'PART_PAYMENT' || defaultPaymentStatus === 'FULL_PAYMENT') {
            await prisma.lead.update({
              where: { id: leadInThisWebinar.id },
              data: {
                partPaymentAmount: defaultPaymentStatus === 'PART_PAYMENT' ? (leadInThisWebinar.partPaymentAmount || 0) + totalPayment : (leadInThisWebinar.partPaymentAmount || 0),
                fullPaymentAmount: defaultPaymentStatus === 'FULL_PAYMENT' ? (leadInThisWebinar.fullPaymentAmount || 0) + totalPayment : (leadInThisWebinar.fullPaymentAmount || 0),
                totalPayment: (leadInThisWebinar.totalPayment || 0) + totalPayment,
                discount,
                paymentDate: parsedPaymentDate || leadInThisWebinar.paymentDate,
                paymentStatus: defaultPaymentStatus,
                leadStatus: leadInThisWebinar.leadStatus?.startsWith('CLOSED') ? 'Fresh Lead' : leadInThisWebinar.leadStatus,
                partPaymentId: (defaultPaymentStatus === 'PART_PAYMENT' && !leadInThisWebinar.partPaymentId) ? await generateNextPartPaymentId() : leadInThisWebinar.partPaymentId,
                fullPaymentId: (defaultPaymentStatus === 'FULL_PAYMENT' && !leadInThisWebinar.fullPaymentId) ? await generateNextFullPaymentId() : leadInThisWebinar.fullPaymentId,
                customData: customDataStr,
                updateStatusDate: totalPayment > 0 ? new Date() : leadInThisWebinar.updateStatusDate,
                frozenLeadStatus: (!leadInThisWebinar.frozenLeadStatus && totalPayment >= 15999) ? calculateLeadStatus(parsedPaymentDate || leadInThisWebinar.paymentDate, null) : leadInThisWebinar.frozenLeadStatus,
                frozenLeadLogStatus: (!leadInThisWebinar.frozenLeadLogStatus && totalPayment >= 15999) ? calculateLeadLogStatus(leadInThisWebinar.recoveryAssignedAt) : leadInThisWebinar.frozenLeadLogStatus
              }
            });
          }
          return 'duplicate';
        } else {
          // Lead does NOT exist in this webinar ("es webinar me vo lead nhi h")!
          // Find all earlier leads in previous webinars ("sale master sheet me vo phle ke webinar me h")
          const previousLeads = await prisma.lead.findMany({
            where: {
              AND: [
                { OR },
                {
                  OR: [
                    { webinarId: { not: webinarId } },
                    { webinarId: null }
                  ]
                }
              ]
            },
            include: { assignments: true },
            orderBy: { createdAt: 'desc' }
          });

          if (previousLeads.length > 0) {
            // Close all earlier leads from previous webinars ("vo phle vali lead close ho jaye gi")
            await prisma.lead.updateMany({
              where: { id: { in: previousLeads.map(l => l.id) } },
              data: { leadStatus: 'CLOSED' }
            });
            oldLeadDataToCopy = previousLeads[0];
          }
          // Now proceed to create this lead in THIS webinar ("and es webinar me vo create hogi and usme hi rhye gi")!
        }
      }

      const uniqueId = await nextLeadId(webinarId || null, webinarName || null)

      const initialStatus = calculateLeadStatus(parsedPaymentDate || new Date(), null)

      const newLead = await prisma.lead.create({
        data: {
          uniqueId,
          name,
          mobileNumber,
          email,
          webinarName,
          webinarId,
          state,
          paymentStatus: defaultPaymentStatus,
          totalPayment: totalPayment,
          discount: discount,
          paymentDate: parsedPaymentDate,
          partPaymentAmount: defaultPaymentStatus === 'PART_PAYMENT' ? totalPayment : (defaultPaymentStatus === 'FULL_PAYMENT' ? 0 : partPayment),
          fullPaymentAmount: defaultPaymentStatus === 'FULL_PAYMENT' ? totalPayment : fullPayment,
          partPaymentId: defaultPaymentStatus === 'PART_PAYMENT' ? await generateNextPartPaymentId() : null,
          fullPaymentId: defaultPaymentStatus === 'FULL_PAYMENT' ? await generateNextFullPaymentId() : null,
          customData: customDataStr,
          leadStatus: initialStatus,
          callStatus: 'UNTOUCHED',
          updateStatusDate: totalPayment > 0 ? new Date() : null,
          frozenLeadStatus: totalPayment >= 15999 ? initialStatus : null,
          frozenLeadLogStatus: totalPayment >= 15999 ? 'Fresh Log' : null,
          remark1: oldLeadDataToCopy?.remark1,
          remark2: oldLeadDataToCopy?.remark2,
          nextFollowUpDate: oldLeadDataToCopy?.nextFollowUpDate,
          whatsappSentAt: oldLeadDataToCopy?.whatsappSentAt
        }
      });

      if (oldLeadDataToCopy?.assignments && oldLeadDataToCopy.assignments.length > 0) {
        await prisma.assignment.createMany({
          data: oldLeadDataToCopy.assignments.map((a) => ({
            leadId: newLead.id,
            userId: a.userId,
            stage: a.stage
          }))
        });
      } else if (techUser) {
        await prisma.assignment.create({
          data: {
            leadId: newLead.id,
            userId: techUser.id,
            stage: 'FRESH_LOG'
          }
        });
      }

      return 'success';
      });
      if (outcome === 'success') successCount++;
      else if (outcome === 'duplicate') duplicateCount++;
      else errorCount++;
    } catch (err) {
      console.error(err);
      errorCount++;
    }
  }

  // Avoid doing revalidatePath in every chunk if it's too slow, but doing it here ensures the UI updates eventually.
  // Next.js tags the cache for invalidation, which shouldn't block severely.
  revalidatePath('/sales');
  revalidatePath('/part-payment');
  revalidatePath('/full-payment');

  return { successCount, duplicateCount, errorCount };
}

export async function transferLeadWebinarAction(leadId: string, newWebinarId: string) {
  return withLeadTransaction(async () => {
    await requireLeadAccess(leadId, false);
    try {
      const oldLead = await prisma.lead.findUnique({ where: { id: leadId } })
      if (!oldLead) return { success: false, error: 'Lead not found' }
      if (oldLead.isTransferred) return { success: false, error: 'This lead has already been transferred' }
      const newWebinar = await prisma.webinarMaster.findUnique({ where: { id: newWebinarId } })
      if (!newWebinar) return { success: false, error: 'Select a valid webinar' }
      if (oldLead.webinarId === newWebinar.id || (!oldLead.webinarId && oldLead.webinarName === newWebinar.name)) {
        return { success: false, error: 'Select a different webinar' }
      }
      const uniqueId = await nextLeadId(newWebinar.id, newWebinar.name)
      await prisma.lead.create({
        data: {
          uniqueId,
          name: oldLead.name,
          mobileNumber: oldLead.mobileNumber,
          email: oldLead.email,
          webinarId: newWebinar.id,
          webinarName: newWebinar.name,
          whatsappJoined: oldLead.whatsappJoined,
          state: oldLead.state,
          paymentStatus: oldLead.paymentStatus || 'NO_PAYMENT',
          leadStatus: 'UNASSIGNED',
          callStatus: 'UNTOUCHED'
        }
      })
      await prisma.lead.update({ where: { id: leadId }, data: { leadStatus: 'CLOSED', isTransferred: true } })
      revalidatePath('/')
      revalidatePath('/sales')
      revalidatePath('/recovery')
      revalidatePath('/webinars')
      return { success: true }
    } catch (error) {
      console.error('Failed to transfer lead to new webinar:', error)
      return { success: false, error: 'Failed to transfer lead. Please try again.' }
    }
  });
}
