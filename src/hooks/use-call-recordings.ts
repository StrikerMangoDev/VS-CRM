'use client'
import { useEffect, useRef } from 'react'
import type { CallRecord } from '@prisma/client'
import { fetchCallRecordingAction } from '@/app/actions/call'

type RecordingUpdate = Pick<CallRecord, 'id' | 'recordingUrl'>
type RecordingCall = RecordingUpdate & Pick<CallRecord, 'smartfloRefId' | 'createdAt' | 'status'>

export function useCallRecordings(calls: RecordingCall[], onUpdate: (call: RecordingUpdate) => void) {
  const callback = useRef(onUpdate)
  useEffect(() => { callback.current = onUpdate }, [onUpdate])
  const key = JSON.stringify(calls.filter(call => !call.recordingUrl && call.status !== 'FAILED' && !/^(manual_|local_|pending_)/.test(call.smartfloRefId)).map(({ id, smartfloRefId, status, recordingUrl, createdAt }) => ({ id, smartfloRefId, status, recordingUrl, createdAt })))
  useEffect(() => {
    const candidates: RecordingCall[] = JSON.parse(key)
    if (!candidates.length) return
    let cancelled = false, running = false, cursor = 0
    const refresh = async () => {
      if (document.hidden || running) return
      running = true
      try {
        const updates: RecordingUpdate[] = []
        for (let count = 0; count < Math.min(3, candidates.length) && !cancelled; count++) {
          const call = candidates[cursor++ % candidates.length]
          if (Date.now() - new Date(call.createdAt).getTime() >= 3600000) continue
          const result = await fetchCallRecordingAction(call.smartfloRefId).catch(() => null)
          if (result?.callRecord?.recordingUrl) updates.push({ id: result.callRecord.id, recordingUrl: result.callRecord.recordingUrl })
        }
        if (!cancelled) updates.forEach(call => callback.current(call))
      } finally { running = false }
    }
    const timer = setInterval(() => { void refresh() }, 30000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [key])
}
