'use server'
import { randomUUID } from 'node:crypto'
import { requireSales, requireLeadAccess, requireIssueAccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pendingCallStatuses, refreshStoredCall, smartfloLiveCalls, startSmartfloCall } from '@/lib/smartflo'

export async function initiateCallAction(leadId: string) {
  const user = await requireLeadAccess(leadId)
  if (!user.mobileNumber) return { error: 'Your mobile number is not configured in your profile. Please add it to make calls.' }
  if (!process.env.SMARTFLO_API_TOKEN) return { error: 'Smartflo API integration is not configured. Missing SMARTFLO_API_TOKEN.' }
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId }, select: { mobileNumber: true } })
  let callId: string | undefined
  try {
    const pending = await prisma.callRecord.findMany({ where: { userId: user.id, status: { in: pendingCallStatuses } }, orderBy: { createdAt: 'desc' } })
    for (const previous of pending) {
      let current = await refreshStoredCall(previous)
      if (!current.complete && current.recheckAfterMs) {
        await new Promise(resolve => setTimeout(resolve, current.recheckAfterMs))
        current = await refreshStoredCall(await prisma.callRecord.findUniqueOrThrow({ where: { id: previous.id } }))
      }
      if (!current.complete) return { error: 'Your previous call is still active or awaiting confirmation. Please finish it before calling again.' }
    }
    const call = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`
      if (await tx.callRecord.findFirst({ where: { userId: user.id, status: { in: pendingCallStatuses } } })) return null
      return tx.callRecord.create({ data: { leadId, userId: user.id, smartfloRefId: 'pending_' + randomUUID(), status: 'INITIATING' } })
    })
    if (!call) return { error: 'A call is already being initiated. Please wait for confirmation.' }
    callId = call.id
    const refId = await startSmartfloCall(user.mobileNumber, lead.mobileNumber, call.id)
    await prisma.callRecord.update({ where: { id: call.id }, data: { smartfloRefId: refId, status: 'RINGING' } })
    return { success: true, message: 'Call requested. Please answer your phone; connection is confirmed by Smartflo.', ref_id: refId }
  } catch (error) {
    const rejected = error instanceof Error && (error.message.startsWith('Smartflo API Error') || error.message.includes('number is not configured') || error.message.includes('valid phone number'))
    if (callId) await prisma.callRecord.update({ where: { id: callId }, data: { status: rejected ? 'FAILED' : 'UNKNOWN' } }).catch(() => undefined)
    return { error: error instanceof Error ? error.message : 'Failed to initiate call' }
  }
}

export async function checkCallStatusAction(refId?: string) {
  const user = await requireSales()
  if (refId) {
    const call = await prisma.callRecord.findUnique({ where: { smartfloRefId: refId } })
    if (!call || call.userId !== user.id) throw new Error('Forbidden')
    try {
      const current = await refreshStoredCall(call)
      if (current.complete) return { active: false, duration: current.call.duration }
      // An absent live-call row can mean ringing or reporting lag, not a hangup.
      return { active: true }
    } catch { return { active: true, error: 'Call status is temporarily unavailable. The phone call has not been ended.' } }
  }
  // Legacy issue calling has no lead call reference; retain its agent-level lookup.
  try {
    if (!user.mobileNumber) return { active: true }
    const agent = user.mobileNumber.replace(/\D/g, '').slice(-10)
    const rows = await smartfloLiveCalls()
    return { active: rows.some(row => [row.source, row.destination].some(value => String(value || '').replace(/\D/g, '').includes(agent))) }
  } catch { return { active: true } }
}

export async function saveCallLogAction(data: { leadId: string; refId: string; duration: number }) {
  const user = await requireLeadAccess(data.leadId)
  try {
    const existing = await prisma.callRecord.findUnique({ where: { smartfloRefId: data.refId } })
    if (existing && (existing.userId !== user.id || existing.leadId !== data.leadId)) return { error: 'Forbidden' }
    if (!Number.isInteger(data.duration) || data.duration < 0 || data.duration > 86400) return { error: 'Invalid duration' }
    if (existing && !/^(manual_|local_)/.test(data.refId)) {
      const current = await refreshStoredCall(existing)
      if (!current.complete) return { error: 'Smartflo has not confirmed the final call result yet.' }
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: data.leadId }, select: { callStatus: true } })
      return { success: true, callRecord: current.call, callStatus: lead.callStatus }
    }
    const callRecord = await prisma.callRecord.upsert({ where: { smartfloRefId: data.refId }, update: { duration: data.duration, status: 'COMPLETED' }, create: { smartfloRefId: data.refId, leadId: data.leadId, userId: user.id, duration: data.duration, status: 'COMPLETED' } })
    await prisma.lead.update({ where: { id: data.leadId }, data: { callStatus: data.duration > 0 ? 'CALL_CONNECTED' : 'CALL_NOT_CONNECTED' } })
    return { success: true, callRecord, callStatus: data.duration > 0 ? 'CALL_CONNECTED' : 'CALL_NOT_CONNECTED' }
  } catch (error) { return { error: error instanceof Error ? error.message : 'Failed to save call log' } }
}

export async function fetchCallRecordingAction(refId: string) {
  const actor = await requireSales()
  const call = await prisma.callRecord.findUnique({ where: { smartfloRefId: refId } })
  if (!call) throw new Error('Call not found')
  await requireLeadAccess(call.leadId)
  if (actor.role === 'EXEC' && call.userId !== actor.id) throw new Error('Forbidden')
  try {
    const result = await refreshStoredCall(call)
    const callRecord = { id: result.call.id, status: result.call.status, duration: result.call.duration, recordingUrl: result.call.recordingUrl }
    return result.call.recordingUrl ? { success: true, url: result.call.recordingUrl, callRecord } : { error: 'Smartflo is still processing this recording. Call data usually takes 5–10 minutes after the call ends.', callRecord }
  } catch (error) { return { error: error instanceof Error ? error.message : 'Failed to fetch recording from Smartflo' } }
}

export async function initiateIssueCallAction(issueId: string) {
  const user = await requireIssueAccess(issueId)
  const issue = await prisma.issue.findUniqueOrThrow({ where: { id: issueId }, select: { mobileNumber: true } })
  try {
    const refId = await startSmartfloCall(user.mobileNumber, issue.mobileNumber)
    return { success: true, message: 'Call requested. Please answer your phone.', ref_id: refId }
  } catch (error) { return { error: error instanceof Error ? error.message : 'Failed to initiate call' } }
}
