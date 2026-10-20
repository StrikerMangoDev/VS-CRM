'use server'
import { requireSales,requireLeadAccess } from '@/lib/auth'
import { getSessionCookie } from '@/lib/auth'


import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { initiateCallAction } from './call'
import { revalidatePath } from 'next/cache'

export async function createExtraDialerLeadAndCallAction(mobileNumber: string, remark1: string, remark2: string, callStatus: string = 'UNTOUCHED', nextFollowUpDateStr: string = '', shouldCall: boolean = true, leadStatus: string = 'IN_PROGRESS') {
  await requireSales();

  await cookies();
  const session = (await getSessionCookie())?.value
  if (!session) throw new Error('Not authenticated')
  const auth = JSON.parse(session)

  // 1. Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: auth.id }
  })
  if (!user) throw new Error('User not found')

  // 2. Check if a lead with this mobile number already exists in EXTRA_DIALER
  let lead = await prisma.lead.findFirst({
    where: {
      mobileNumber,
      currentModuleId: 'EXTRA_DIALER'
    }
  });

  if (lead) {
    await requireLeadAccess(lead.id);
    // Update existing lead
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        callStatus,
        remark1,
        remark2,
        leadStatus,
        nextFollowUpDate: nextFollowUpDateStr ? new Date(nextFollowUpDateStr) : null,
      }
    });
  } else {
    // Create new lead
    lead = await prisma.lead.create({
      data: {
        uniqueId: `EXT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: 'Extra Dialer Lead',
        mobileNumber,
        paymentStatus: 'NO_PAYMENT',
        currentModuleId: 'EXTRA_DIALER',
        callStatus: callStatus,
        remark1,
        remark2,
        leadStatus,
        nextFollowUpDate: nextFollowUpDateStr ? new Date(nextFollowUpDateStr) : null
      }
    })
  }

  // Ensure assignment exists for this user so it appears in performance metrics
  const existingAssignment = await prisma.assignment.findFirst({
    where: { leadId: lead.id, userId: user.id }
  });
  if (!existingAssignment) {
    await prisma.assignment.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        stage: 'EXTRA_DIALER'
      }
    });
  }

  // 3. Trigger smartflo call if shouldCall is true
  if (shouldCall) {
    const callRes = await initiateCallAction(lead.id)
    
    if (callRes.error) {
      return { error: callRes.error, leadId: lead.id }
    }

    revalidatePath('/extra-dialer')
    revalidatePath('/performance')
    return { success: true, leadId: lead.id, message: callRes.message, ref_id: callRes.ref_id }
  } else {
    // If not calling via dialer but callStatus is connected or not connected, create a call record if needed
    if (callStatus === 'CALL_CONNECTED' || callStatus === 'CALL_NOT_CONNECTED') {
      const existingCallRecord = await prisma.callRecord.findFirst({
        where: { leadId: lead.id, userId: user.id }
      });
      if (!existingCallRecord) {
        await prisma.callRecord.create({
          data: {
            smartfloRefId: `manual_ext_${lead.id}_${Date.now()}`,
            leadId: lead.id,
            userId: user.id,
            duration: callStatus === 'CALL_CONNECTED' ? 60 : 0,
            status: 'COMPLETED'
          }
        });
      }
    }
    revalidatePath('/extra-dialer')
    revalidatePath('/performance')
    return { success: true, leadId: lead.id, message: 'Saved without calling' }
  }
}

export async function saveExtraDialerLeadRemarksAction(leadId: string, remark1: string, remark2: string, callStatus: string, nextFollowUpDateStr: string = '', leadStatus: string = 'IN_PROGRESS') {
  await requireLeadAccess(leadId);

  await cookies();
  const session = (await getSessionCookie())?.value
  if (!session) throw new Error('Not authenticated')
  const auth = JSON.parse(session)

  await prisma.lead.update({
    where: { id: leadId },
    data: { remark1, remark2, callStatus, leadStatus, nextFollowUpDate: nextFollowUpDateStr ? new Date(nextFollowUpDateStr) : null, updatedAt: new Date() }
  })

  // Ensure assignment exists for this user
  const existingAssignment = await prisma.assignment.findFirst({
    where: { leadId, userId: auth.id }
  });
  if (!existingAssignment) {
    await prisma.assignment.create({
      data: {
        leadId,
        userId: auth.id,
        stage: 'EXTRA_DIALER'
      }
    });
  }

  // If status is connected or not connected, ensure callRecord exists
  if (callStatus === 'CALL_CONNECTED' || callStatus === 'CALL_NOT_CONNECTED') {
    const existingCallRecord = await prisma.callRecord.findFirst({
      where: { leadId, userId: auth.id }
    });
    if (!existingCallRecord) {
      await prisma.callRecord.create({
        data: {
          smartfloRefId: `manual_ext_${leadId}_${Date.now()}`,
          leadId,
          userId: auth.id,
          duration: callStatus === 'CALL_CONNECTED' ? 60 : 0,
          status: 'COMPLETED'
        }
      });
    }
  }
  
  revalidatePath('/extra-dialer')
  revalidatePath('/performance')
  return { success: true }
}
