'use client'

import { useState,useEffect } from 'react'
import { getLeadHistoryAction,getCallLogsAction } from '@/app/actions/lead'
import { fetchCallRecordingAction } from '@/app/actions/call'
import { format } from 'date-fns'
import { useCallRecordings } from '@/hooks/use-call-recordings'

export default function LeadHistoryModal({
  lead,
  onClose
}: {
  lead: Pick<import('@prisma/client').Lead,'id'|'name'|'uniqueId'>,
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<'history' | 'calls'>('history')
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getLeadHistoryAction>>>([])
  const [callLogs, setCallLogs] = useState<Awaited<ReturnType<typeof getCallLogsAction>>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchingRecordingId, setFetchingRecordingId] = useState<string | null>(null)
  useCallRecordings(activeTab === 'calls' ? callLogs : [], call => setCallLogs(rows => rows.map(row => row.id === call.id ? { ...row, ...call } : row)))

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        if (activeTab === 'history') {
          const data = await getLeadHistoryAction(lead.id)
          setHistory(data)
        } else {
          const logs = await getCallLogsAction(lead.id)
          setCallLogs(logs)
        }
      } catch (err) {
        console.error('Failed to fetch data', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [lead.id, activeTab])

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleFetchRecording = async (refId: string) => {
    setFetchingRecordingId(refId)
    try {
      const res = await fetchCallRecordingAction(refId)
      if (res.error) {
        alert(res.error)
      } else if (res.url) {
        // Update local state to show player immediately
        setCallLogs(prev => prev.map(log => log.smartfloRefId === refId ? { ...log, recordingUrl: res.url } : log))
      }
    } catch {
      alert('Failed to fetch recording.')
    } finally {
      setFetchingRecordingId(null)
    }
  }

  const thStyle = {
    padding: '12px',
    textAlign: 'left' as const,
    borderBottom: '1px solid var(--card-border)',
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontWeight: 600
  }

  const tdStyle = {
    padding: '12px',
    borderBottom: '1px solid var(--card-border)',
    color: 'var(--text-primary)',
    fontSize: '0.85rem'
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--card-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--card-bg)',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Lead Logs</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{lead.uniqueId}</span>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ color: 'var(--text-primary)' }}>{lead.name}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', fontSize: '1.2rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', background: 'var(--table-hover)' }}>
          <button 
            onClick={() => setActiveTab('history')}
            style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', color: activeTab === 'history' ? '#3b82f6' : 'var(--text-muted)', borderBottom: activeTab === 'history' ? '2px solid #3b82f6' : '2px solid transparent', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
          >
            Change History
          </button>
          <button 
            onClick={() => setActiveTab('calls')}
            style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', color: activeTab === 'calls' ? '#3b82f6' : 'var(--text-muted)', borderBottom: activeTab === 'calls' ? '2px solid #3b82f6' : '2px solid transparent', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
          >
            Call Logs & Recordings
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading data...</div>
          ) : activeTab === 'history' ? (
            history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No change history found for this lead.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Date & Time</th>
                    <th style={thStyle}>Changed By</th>
                    <th style={thStyle}>Field</th>
                    <th style={thStyle}>Old Value</th>
                    <th style={thStyle}>New Value</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} style={{ transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
                      <td style={tdStyle}>{format(new Date(h.createdAt), 'dd MMM yyyy, hh:mm a')}</td>
                      <td style={tdStyle}>
                        <div>{h.userName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{h.userRole}</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>
                          {h.field}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{h.oldValue}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ color: 'var(--success)', fontWeight: 500 }}>{h.newValue}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            callLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No calls have been made to this lead yet.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Date & Time</th>
                    <th style={thStyle}>Agent</th>
                    <th style={thStyle}>Duration</th>
                    <th style={thStyle}>Recording</th>
                  </tr>
                </thead>
                <tbody>
                  {callLogs.map((log) => (
                    <tr key={log.id} style={{ transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
                      <td style={tdStyle}>{format(new Date(log.createdAt), 'dd MMM yyyy, hh:mm a')}</td>
                      <td style={tdStyle}>
                        <div>{log.user?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{log.user?.role || ''}</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', background: 'var(--table-hover)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                          {Math.floor(log.duration / 60)}:{log.duration % 60 < 10 ? '0' : ''}{log.duration % 60}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {log.recordingUrl ? (
                          <audio controls src={log.recordingUrl} style={{ height: '32px' }} />
                        ) : (
                          <button 
                            onClick={() => handleFetchRecording(log.smartfloRefId)}
                            disabled={fetchingRecordingId === log.smartfloRefId}
                            style={{ 
                              background: '#3b82f6', 
                              color: 'var(--text-primary)', 
                              border: 'none', 
                              padding: '6px 12px', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem', 
                              fontWeight: 600, 
                              cursor: fetchingRecordingId === log.smartfloRefId ? 'not-allowed' : 'pointer',
                              opacity: fetchingRecordingId === log.smartfloRefId ? 0.7 : 1
                            }}
                          >
                            {fetchingRecordingId === log.smartfloRefId ? 'Fetching...' : 'Fetch Recording'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  )
}
