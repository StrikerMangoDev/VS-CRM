import type { CallRecord } from '@prisma/client'
import { prisma } from './prisma'

type ProviderRecord = Record<string, unknown>
const callerIds = ['917969081999', '917969081998', '917969081997', '917969081996', '917969081995', '917969081994', '917969081993', '917969081992', '917969081991']
export const pendingCallStatuses = ['INITIATING', 'RINGING', 'ACTIVE', 'UNKNOWN']
const providerQueue = globalThis as unknown as { smartfloRequestTurn?: Promise<void>; smartfloAbsentCalls?: Map<string, number>; smartfloLiveSnapshot?: { token?: string; expiresAt: number; value: Promise<ProviderRecord[]> } }
const absentCalls = providerQueue.smartfloAbsentCalls ??= new Map<string, number>()

async function request(path: string, body?: ProviderRecord, retry = 0): Promise<unknown> {
  const token = process.env.SMARTFLO_API_TOKEN
  if (!token) throw new Error('Smartflo API integration is not configured. Missing SMARTFLO_API_TOKEN.')
  // Smartflo applies an account-wide requests-per-second limit; stagger users' polls.
  const turn = providerQueue.smartfloRequestTurn ?? Promise.resolve()
  providerQueue.smartfloRequestTurn = turn.then(() => new Promise<void>(resolve => setTimeout(resolve, 1100)))
  await turn
  const response = await fetch('https://api-smartflo.tatateleservices.com/v1/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store', signal: AbortSignal.timeout(20000),
  })
  if (!body && response.status === 429 && retry < 2) {
    await response.body?.cancel()
    await new Promise(resolve => setTimeout(resolve, 1500))
    return request(path, undefined, retry + 1)
  }
  const data: unknown = await response.json()
  const result = data as ProviderRecord | null
  if (!response.ok || result?.success === false || result?.status === 'error') {
    const message = String(result?.message || 'Provider request failed').replaceAll(token, '[redacted]').slice(0, 250)
    throw new Error(`Smartflo API Error (${response.status}): ${message}`)
  }
  return data
}

export function providerRecords(data: unknown): ProviderRecord[] {
  const object = data as ProviderRecord | null
  const rows = Array.isArray(data) ? data : object?.results ?? object?.data
  if (!Array.isArray(rows)) throw new Error('Unrecognized Smartflo response')
  return rows.filter((row): row is ProviderRecord => !!row && typeof row === 'object')
}

export async function startSmartfloCall(agent: string | null, destination: string, callRecordId?: string) {
  const agentNumber = (agent || '').replace(/\D/g, '')
  const customerNumber = destination.replace(/\D/g, '')
  if (agentNumber.length < 10 || agentNumber.length > 13) throw new Error('Your mobile number is not configured correctly in your profile. Please update it to make calls.')
  if (customerNumber.length < 10 || customerNumber.length > 13) throw new Error('Lead does not have a valid phone number.')
  const data = await request('click_to_call', {
    agent_number: agentNumber, destination_number: '0' + customerNumber.slice(-10),
    caller_id: callerIds[Math.floor(Math.random() * callerIds.length)], async: 1,
    ...(callRecordId ? { custom_identifier: { crmcall: callRecordId } } : {}),
  }) as ProviderRecord
  if (typeof data.ref_id !== 'string' || !data.ref_id || data.ref_id.length > 200) throw new Error('Smartflo did not return a call reference. Check the phone before retrying.')
  return data.ref_id
}

export async function finalSmartfloCall(refId: string) {
  const records = providerRecords(await request('call/records?ref_id=' + encodeURIComponent(refId) + '&limit=100'))
  const record = records.find(row => [row.ref_id, row.call_id, row.uuid].includes(refId))
  if (!record || !record.end_stamp || !['answered', 'missed', 'failed', 'busy', 'noanswer', 'cancelled', 'completed'].includes(String(record.status).toLowerCase())) return null
  const duration = Number(record.answered_seconds ?? 0)
  if (!Number.isFinite(duration) || duration < 0 || duration > 86400) throw new Error('Invalid provider duration')
  const recordingUrl = typeof record.recording_url === 'string' && record.recording_url.startsWith('https://') ? record.recording_url : null
  return { duration: Math.floor(duration), connected: String(record.status).toLowerCase() === 'answered', recordingUrl }
}

export async function smartfloLiveCalls(refId?: string) {
  const token = process.env.SMARTFLO_API_TOKEN
  const cached = providerQueue.smartfloLiveSnapshot
  if (!refId && cached && cached.token === token && Date.now() < cached.expiresAt) return cached.value
  const value = request('live_calls' + (refId ? '?ref_id=' + encodeURIComponent(refId) : '')).then(providerRecords)
  if (!refId) {
    // Share the provider's complete live list across users, including in-flight reads.
    const snapshot = { token, expiresAt: Infinity, value }
    providerQueue.smartfloLiveSnapshot = snapshot
    void value.then(() => { snapshot.expiresAt = Date.now() + 5000 }, () => { if (providerQueue.smartfloLiveSnapshot === snapshot) delete providerQueue.smartfloLiveSnapshot })
  }
  return value
}

export async function refreshStoredCall(call: CallRecord) {
  const pending = pendingCallStatuses.includes(call.status)
  if (!process.env.SMARTFLO_API_TOKEN || /^(manual_|local_)/.test(call.smartfloRefId)) return { call, complete: !pending, recheckAfterMs: 0 }
  if (!pending && call.status !== 'AWAITING_RESULT' && call.recordingUrl) return { call, complete: true, recheckAfterMs: 0 }
  const user = pending ? await prisma.user.findUnique({ where: { id: call.userId }, select: { mobileNumber: true } }) : null
  const agent = (user?.mobileNumber || '').replace(/\D/g, '').slice(-10)
  if (pending) {
    const live = await smartfloLiveCalls().catch(error => { absentCalls.delete(call.id); throw error })
    const active = live.some(row => [row.ref_id, row.call_id, row.uuid].includes(call.smartfloRefId) || (agent.length === 10 && [row.source, row.destination, row.agent_number, row.agent_number_with_prefix, row.multiple_destination_name].some(value => String(value || '').match(/\d+/g)?.some(number => number.length >= 10 && number.slice(-10) === agent))))
    if (active) {
      absentCalls.delete(call.id)
      await prisma.callRecord.updateMany({ where: { id: call.id, status: { in: pendingCallStatuses } }, data: { status: 'ACTIVE' } })
      const current = await prisma.callRecord.findUniqueOrThrow({ where: { id: call.id } })
      return { call: current, complete: !pendingCallStatuses.includes(current.status), recheckAfterMs: 0 }
    }
  }
  const final = call.smartfloRefId.startsWith('pending_') ? null : await finalSmartfloCall(call.smartfloRefId).catch(error => { absentCalls.delete(call.id); if (pending) throw error; return null })
  if (!final) {
    if (!pending) return { call, complete: true, recheckAfterMs: 0 }
    const grace = call.smartfloRefId.startsWith('pending_') ? 120000 : 60000
    if (agent.length !== 10 || (call.status !== 'ACTIVE' && Date.now() - call.createdAt.getTime() < grace)) return { call, complete: false, recheckAfterMs: 0 }
    // Confirm absence twice, five seconds apart, after ringing grace; CDR delivery may lag.
    const absentSince = absentCalls.get(call.id) ?? Date.now()
    absentCalls.set(call.id, absentSince)
    const remaining = Math.max(0, 5000 - (Date.now() - absentSince))
    if (remaining) return { call, complete: false, recheckAfterMs: remaining }
    await prisma.callRecord.updateMany({ where: { id: call.id, smartfloRefId: call.smartfloRefId, status: { in: pendingCallStatuses } }, data: { status: 'AWAITING_RESULT' } })
    absentCalls.delete(call.id)
    const current = await prisma.callRecord.findUniqueOrThrow({ where: { id: call.id } })
    return { call: current, complete: !pendingCallStatuses.includes(current.status), recheckAfterMs: 0 }
  }
  absentCalls.delete(call.id)
  const updated = await prisma.$transaction(async tx => {
    const saved = await tx.callRecord.update({ where: { id: call.id }, data: { duration: final.duration, status: 'COMPLETED', ...(final.recordingUrl ? { recordingUrl: final.recordingUrl } : {}) } })
    const latest = await tx.callRecord.findFirst({ where: { leadId: call.leadId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } })
    if (latest?.id === call.id) await tx.lead.update({ where: { id: call.leadId }, data: { callStatus: final.connected ? 'CALL_CONNECTED' : 'CALL_NOT_CONNECTED' } })
    return saved
  })
  return { call: updated, complete: true, recheckAfterMs: 0 }
}

export async function refreshPendingCalls(calls: CallRecord[]) {
  const pending = calls.filter(call => pendingCallStatuses.includes(call.status) || call.status === 'AWAITING_RESULT')
  // Limit concurrent provider reads when a user returns after closing a calling tab.
  for (let index = 0; index < pending.length; index += 4) await Promise.all(pending.slice(index, index + 4).map(call => refreshStoredCall(call).catch(() => null)))
  return pending.length > 0
}
