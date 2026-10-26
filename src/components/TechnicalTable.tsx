'use client'
import BodyPortal from '@/components/BodyPortal'
import { useLeadPage,usePageNumber } from '@/hooks/use-lead-page'
import type { LeadPage } from '@/lib/lead-query'

import { useState,useTransition,useEffect,useRef } from 'react'
import { updateTechnicalStageAction,updateWhatsAppStatusAction,updateAccessDetailsAction } from '@/app/actions/lead'
import { initiateCallAction,checkCallStatusAction,saveCallLogAction } from '@/app/actions/call'
import { PhoneCall,PhoneOff } from 'lucide-react'
import type { Lead } from '@prisma/client'

export default function TechnicalTable({ initialPage, tabType, webinarFilter }: { initialPage: LeadPage, webinarFilter?: string | null, tabType: 'daily_paid' | 'welcome_call' | 'access' }) {
  const [, startTransition] = useTransition()
  
  const [activeCallLead, setActiveCallLead] = useState<Lead | null>(null)
  const [isCalling, setIsCalling] = useState(false)
  const [callStatusMessage, setCallStatusMessage] = useState('')
  const [callDuration, setCallDuration] = useState<number>(0)
  const [isCallConnected, setIsCallConnected] = useState(false)
  const [, setHasCallBeenLive] = useState(false)
  const [callRefId, setCallRefId] = useState<string | null>(null)
  const latestCallRef = useRef<string | null>(null)
  useEffect(() => { latestCallRef.current = callRefId }, [callRefId])

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallConnected) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallConnected]);

  useEffect(() => {
    if (!isCallConnected || callDuration === 0) return;
    
    if (callDuration % 5 === 0) {
      checkCallStatusAction(callRefId || undefined).then(status => {
        if (latestCallRef.current !== callRefId) return;
        if (status.active === true) {
          setHasCallBeenLive(true);
        } else if (status.active === false) {
          setHasCallBeenLive(currentHasLive => {
            if (currentHasLive || callDuration > 15) {
              setIsCallConnected(false);
              setCallStatusMessage('Call Disconnected');
              if (activeCallLead && callRefId) {
                saveCallLogAction({
                  leadId: activeCallLead.id,
                  refId: callRefId,
                  duration: callDuration
                }).catch(() => {});
              }
            }
            return currentHasLive;
          });
        }
      }).catch(() => {});
    }
  }, [callDuration, isCallConnected, activeCallLead, callRefId]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const [pageSize, setPageSize] = useState(15)
  const [requestedPage,setRequestedPage] = usePageNumber(JSON.stringify({tabType,webinarFilter,pageSize}))
  const pageData=useLeadPage(initialPage,{sheet:'TECHNICAL',page:requestedPage,size:pageSize,tab:tabType,webinar:webinarFilter||''})
  const leads=pageData.rows
  const currentPage=Math.min(requestedPage,Math.max(1,Math.ceil(pageData.total/pageSize)))
  const setCurrentPage=(next:number|((page:number)=>number))=>setRequestedPage(typeof next==='function'?next(currentPage):next)
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSelected = new Set(selectedLeadIds)
      paginatedLeads.forEach(l => newSelected.add(l.id))
      setSelectedLeadIds(newSelected)
    } else {
      const newSelected = new Set(selectedLeadIds)
      paginatedLeads.forEach(l => newSelected.delete(l.id))
      setSelectedLeadIds(newSelected)
    }
  }

  const handleSelectLead = (id: string) => {
    const newSelected = new Set(selectedLeadIds)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedLeadIds(newSelected)
  }

  const paginatedLeads=leads
  const totalPages=Math.ceil(pageData.total/pageSize)

  const handleAction = (leadId: string, actionType: 'WHATSAPP' | 'LMS' | 'WELCOME') => {
    startTransition(async () => {
      await updateTechnicalStageAction(leadId, actionType)
    })
  }

  const handleWhatsAppChange = (leadId: string, joined: boolean) => {
    startTransition(async () => {
      await updateWhatsAppStatusAction(leadId, joined)
    })
  }

  const handleAccessDetailsChange = (leadId: string, field: 'status' | 'type', value: string) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return
    const status = field === 'status' ? value : lead.accessStatus
    const type = field === 'type' ? value : lead.accessType
    startTransition(async () => {
      await updateAccessDetailsAction(leadId, status, type || null)
    })
  }

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 320px)' }}>
      <div className="table-container" style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '8px' }}>
        <table>
        <thead>
          <tr>
            <th style={{ width: '40px' }}>
              <input type="checkbox" onChange={handleSelectAll} checked={paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeadIds.has(l.id))} style={{ cursor: 'pointer' }} />
            </th>
            <th>Lead ID</th>
            {tabType !== 'daily_paid' && <th>Name</th>}
            <th>Mobile</th>
            {tabType === 'daily_paid' ? (
              <>
                <th>Webinar ID</th>
                <th>WhatsApp Joined</th>
              </>
            ) : tabType === 'access' ? (
              <>
                <th>Email</th>
                <th>Webinar ID</th>
                <th>State</th>
                <th>Total Paid</th>
                <th>Update Status</th>
                <th>Access Status</th>
                <th>Access Type</th>
              </>
            ) : (
              <>
                <th>Current Stage</th>
                <th>Action Required</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {paginatedLeads.map((lead) => {
            if (tabType === 'daily_paid') {
              return (
                <tr key={lead.id}>
                  <td>
                    <input type="checkbox" checked={selectedLeadIds.has(lead.id)} onChange={() => handleSelectLead(lead.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{lead.uniqueId}</td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{lead.mobileNumber}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCallLead(lead);
                          setIsCalling(true);
                          setCallDuration(0);
                          setIsCallConnected(false);
                          setCallRefId(null);
                          setHasCallBeenLive(false);
                          setCallStatusMessage('Initiating call...');
                          initiateCallAction(lead.id).then(res => {
                            if (res.error) setCallStatusMessage(res.error);
                            else { 
                              if (res.ref_id) setCallRefId(res.ref_id);
                              setCallStatusMessage(res.message || 'Call initiated. Please pick up your device.');
                              setIsCallConnected(true);
                            }
                          }).catch(() => setCallStatusMessage('Failed to initiate call.'));
                        }}
                        style={{ 
                          padding: '4px 6px', 
                          background: 'rgba(34, 197, 94, 0.1)', 
                          color: 'var(--success)', 
                          border: '1px solid rgba(34, 197, 94, 0.2)', 
                          borderRadius: '6px', 
                          display: 'flex', 
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          cursor: 'pointer'
                        }} 
                        title="Call"
                      >
                        <PhoneCall size={14} />
                      </button>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{lead.webinarId || lead.webinarName || '-'}</td>
                  <td>
                    {lead.whatsappJoined ? (
                      <button 
                        onClick={() => handleWhatsAppChange(lead.id, false)}
                        style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.5)', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Joined
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleWhatsAppChange(lead.id, true)}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        Mark as Joined
                      </button>
                    )}
                  </td>
                </tr>
              )
            }

            let currentStage = ''
            let actionType: 'WHATSAPP' | 'LMS' | 'WELCOME' = 'WHATSAPP'
            let actionLabel = ''
            let badgeClass = ''

            if (tabType === 'welcome_call') {
              currentStage = 'Welcome Call Pending'
              actionType = 'WELCOME'
              actionLabel = 'Complete Welcome Call'
              badgeClass = 'badge-primary'
            }

            return (
              <tr key={lead.id}>
                <td>
                  <input type="checkbox" checked={selectedLeadIds.has(lead.id)} onChange={() => handleSelectLead(lead.id)} style={{ cursor: 'pointer' }} />
                </td>
                <td style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{lead.uniqueId}</td>
                <td style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={lead.name}>{lead.name}</td>
                <td style={{ color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{lead.mobileNumber}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCallLead(lead);
                        setIsCalling(true);
                        setCallDuration(0);
                        setIsCallConnected(false);
                        setCallRefId(null);
                        setHasCallBeenLive(false);
                        setCallStatusMessage('Initiating call...');
                        initiateCallAction(lead.id).then(res => {
                          if (res.error) setCallStatusMessage(res.error);
                          else { 
                            if (res.ref_id) setCallRefId(res.ref_id);
                            setCallStatusMessage(res.message || 'Call initiated. Please pick up your device.');
                            setIsCallConnected(true);
                          }
                        }).catch(() => setCallStatusMessage('Failed to initiate call.'));
                      }}
                      style={{ 
                        padding: '4px 6px', 
                        background: 'rgba(34, 197, 94, 0.1)', 
                        color: 'var(--success)', 
                        border: '1px solid rgba(34, 197, 94, 0.2)', 
                        borderRadius: '6px', 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }} 
                      title="Call"
                    >
                      <PhoneCall size={14} />
                    </button>
                  </div>
                </td>
                {tabType === 'access' && (
                  <>
                    <td style={{ color: 'var(--text-muted)' }}>{lead.email || '-'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{lead.webinarId || lead.webinarName || '-'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{lead.state || '-'}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 500 }}>₹{lead.totalPayment.toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {lead.updateStatusDate ? new Date(lead.updateStatusDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td>
                      <select
                        value={lead.accessStatus}
                        onChange={(e) => handleAccessDetailsChange(lead.id, 'status', e.target.value)}
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          color: lead.accessStatus === 'Done' ? '#4ade80' : 'var(--text-primary)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Done">Done</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={lead.accessType || ''}
                        onChange={(e) => handleAccessDetailsChange(lead.id, 'type', e.target.value)}
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          color: 'var(--text-primary)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="" disabled>Select Type...</option>
                        <option value="Half">Half</option>
                        <option value="Full">Full</option>
                        <option value="Additional Requirement">Additional Requirement</option>
                      </select>
                    </td>
                  </>
                )}
                {tabType === 'welcome_call' && (
                  <>
                    <td>
                      <span className={`badge ${badgeClass}`} style={badgeClass === 'badge-primary' ? { background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)' } : {}}>
                        {currentStage}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleAction(lead.id, actionType)}
                        className="btn btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        {actionLabel}
                      </button>
                    </td>
                  </>
                )}
              </tr>
            )
          })}
          {pageData.total === 0 && (
            <tr>
              <td colSpan={tabType === 'daily_paid' ? 4 : tabType === 'access' ? 10 : 5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No pending tasks for this queue!
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {pageData.total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                color: 'var(--text-primary)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.875rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {[15, 25, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, pageData.total)} of {pageData.total} entries
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 12px',
                  background: currentPage === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(59, 130, 246, 0.2)',
                  color: currentPage === 1 ? 'var(--text-muted)' : '#60a5fa',
                  border: '1px solid ' + (currentPage === 1 ? 'transparent' : 'rgba(59, 130, 246, 0.3)'),
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '6px 12px',
                  background: currentPage === totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(59, 130, 246, 0.2)',
                  color: currentPage === totalPages ? 'var(--text-muted)' : '#60a5fa',
                  border: '1px solid ' + (currentPage === totalPages ? 'transparent' : 'rgba(59, 130, 246, 0.3)'),
                  borderRadius: '6px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
      
      {activeCallLead && (
        <BodyPortal><div style={{
          position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ 
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: '12px', padding: '32px', width: '90%', maxWidth: '400px',
            textAlign: 'center', position: 'relative' as const,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            {isCalling ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  background: 'rgba(34, 197, 94, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--success)',
                  animation: 'pulse 2s infinite'
                }}>
                  <PhoneCall size={32} />
                </div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 600, margin: 0 }}>
                  Calling {activeCallLead.name || activeCallLead.mobileNumber}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>
                  {activeCallLead.mobileNumber}
                </p>
                <div style={{ marginTop: '8px', color: callStatusMessage.includes('Error') || callStatusMessage.includes('Failed') ? '#ef4444' : '#60a5fa', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                  {callStatusMessage}
                </div>
                {isCallConnected && (
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)', marginTop: '16px', fontVariantNumeric: 'tabular-nums' }}>
                    {formatDuration(callDuration)}
                  </div>
                )}
                <button 
                  onClick={() => {
                    if (callRefId && callDuration > 0 && activeCallLead) {
                      saveCallLogAction({
                        leadId: activeCallLead.id,
                        refId: callRefId,
                        duration: callDuration
                      }).catch(() => {});
                    }
                    setActiveCallLead(null)
                    setIsCalling(false)
                    setIsCallConnected(false)
                    setCallDuration(0)
                  }}
                  style={{
                    marginTop: '24px',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#ef4444',
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <PhoneOff size={18} />
                  End Call / Close
                </button>
                <style>{`
                  @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
                  }
                `}</style>
              </div>
            ) : null}
          </div>
        </div></BodyPortal>
      )}
    </div>
  )
}
