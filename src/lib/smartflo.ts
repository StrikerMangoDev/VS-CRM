import type { CallRecord } from '@prisma/client'
import { prisma } from './prisma'

type ProviderRecord = Record<string, unknown>
const callerIds = ['917969081999', '917969081998', '917969081997', '917969081996', '917969081995', '917969081994', '917969081993', '917969081992', '917969081991']
export const pendingCallStatuses = ['INITIATING', 'RINGING', 'ACTIVE', 'UNKNOWN']

async function request(path: string, body?: ProviderRecord): Promise<unknown> {
  const token = process.env.SMARTFLO_API_TOKEN
  if (!token) throw new Error('Smartflo API integration is not configured. Missing SMARTFLO_API_TOKEN.')
  const response = await fetch('https://api-smartflo.tatateleservices.com/v1/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store', signal: AbortSignal.timeout(20000),
  })
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
  return providerRecords(await request('live_calls' + (refId ? '?ref_id=' + encodeURIComponent(refId) : '')))
}

export async function refreshStoredCall(call: CallRecord) {
  if (!process.env.SMARTFLO_API_TOKEN || /^(manual_|local_|pending_)/.test(call.smartfloRefId)) return { call, complete: !pendingCallStatuses.includes(call.status) }
  const final = await finalSmartfloCall(call.smartfloRefId)
  if (!final) return { call, complete: false }
  const updated = await prisma.$transaction(async tx => {
    const saved = await tx.callRecord.update({ where: { id: call.id }, data: { duration: final.duration, status: 'COMPLETED', ...(final.recordingUrl ? { recordingUrl: final.recordingUrl } : {}) } })
    const latest = await tx.callRecord.findFirst({ where: { leadId: call.leadId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } })
    if (latest?.id === call.id) await tx.lead.update({ where: { id: call.leadId }, data: { callStatus: final.connected ? 'CALL_CONNECTED' : 'CALL_NOT_CONNECTED' } })
    return saved
  })
  return { call: updated, complete: true }
}

export async function refreshPendingCalls(calls: CallRecord[]) {
  const pending = calls.filter(call => pendingCallStatuses.includes(call.status))
  // Limit concurrent provider reads when a user returns after closing a calling tab.
  for (let index = 0; index < pending.length; index += 4) await Promise.all(pending.slice(index, index + 4).map(call => refreshStoredCall(call).catch(() => null)))
  return pending.length > 0
}
