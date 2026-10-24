'use client'
import BodyPortal from '@/components/BodyPortal'
import { useInfinitePage } from '@/hooks/use-lead-page'
import { getCallPage,getCallLeadQueue } from '@/app/actions/lead-query'
import { getLeadHistoryAction,getCallLogsAction } from '@/app/actions/lead'
import type { CallPage,CallQuery } from '@/lib/call-query'
import type { LeadRow } from '@/lib/lead-query'

import React,{ useState } from 'react'
import { Phone,X,Save,PhoneCall,RefreshCcw,Edit2,History } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createExtraDialerLeadAndCallAction,saveExtraDialerLeadRemarksAction } from '@/app/actions/extraDialer'
import { fetchCallRecordingAction,checkCallStatusAction,saveCallLogAction } from '@/app/actions/call'
import { useRouter } from 'next/navigation'

export default function ExtraDialerClient({ initialPage }: { initialPage: CallPage }) {
  const [dialerDrafts, setDialerDrafts] = useState<Record<string, Record<string, string>>>({})
  const [showModal, setShowModal] = useState(false)
  const [historyLead, setHistoryLead] = useState<(LeadRow & {auditLogs:Awaited<ReturnType<typeof getLeadHistoryAction>>}) | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [remark1, setRemark1] = useState('')
  const [remark2, setRemark2] = useState('')
  const [callStatus, setCallStatus] = useState('UNTOUCHED')
  const [leadStatus, setLeadStatus] = useState('IN_PROGRESS')
  const [nextFollowUpDate, setNextFollowUpDate] = useState('')
  
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [leadStatusFilter, setLeadStatusFilter] = useState('ACTIVE')
  const [followUpFilter, setFollowUpFilter] = useState('ALL')
  const [lastCallFilter, setLastCallFilter] = useState('ALL')
  const [today]=useState(()=>{const d=new Date();d.setHours(0,0,0,0);return d.toISOString()})
  const callQuery:CallQuery={mode:'DIALER',search:searchFilter,status:statusFilter,leadStatus:leadStatusFilter,follow:followUpFilter,lastCall:lastCallFilter,today,size:50}
  const [pageData,sentinel]=useInfinitePage(initialPage,callQuery,getCallPage)
  const [dialerQueue,setDialerQueue]=useState<LeadRow[]>([])
  async function openHistory(lead:import('@prisma/client').Lead){try{const [callRecords,auditLogs]=await Promise.all([getCallLogsAction(lead.id),getLeadHistoryAction(lead.id)]);setHistoryLead({...lead,assignments:[],callRecords,auditLogs})}catch{toast.error('Unable to load lead history')}}

  
  const [isCalling, setIsCalling] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)
  const [fetchingId, setFetchingId] = useState<string | null>(null)
  
  const [isPowerDialerMode, setIsPowerDialerMode] = useState(false)
  const [powerDialerIndex, setPowerDialerIndex] = useState(0)

  const router = useRouter()

  const [callStatusMessage, setCallStatusMessage] = useState('')
  const [callDuration, setCallDuration] = useState<number>(0)
  const [isCallConnected, setIsCallConnected] = useState(false)
  const [hasCallBeenLive, setHasCallBeenLive] = useState(false)
  const [callRefId, setCallRefId] = useState<string | null>(null)
  
  // Call Tracker Logic
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallConnected) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCallConnected]);

  React.useEffect(() => {
    if (!isCallConnected || callDuration === 0) return;
    
    // Poll API every 5 seconds
    if (callDuration % 5 === 0) {
      checkCallStatusAction(callRefId || undefined).then(status => {
        if (status.active === true) {
          setHasCallBeenLive(true);
        } else if (status.active === false) {
          // If it's not active, maybe it disconnected.
          if (hasCallBeenLive || callDuration > 20) {
            setIsCallConnected(false);
            setCallStatusMessage('Call Disconnected');
            if (activeLeadId && callRefId) {
              saveCallLogAction({
                leadId: activeLeadId,
                refId: callRefId,
                duration: callDuration
              }).then(() => {
                router.refresh();
              }).catch(() => {});
            }
            setTimeout(() => {
              setIsCalling(false);
              setCallDuration(0);
              setCallRefId(null);
              setCallStatusMessage('');
            }, 2000);
          }
        }
      }).catch(() => {});
    }
  }, [callDuration, isCallConnected, activeLeadId, callRefId, hasCallBeenLive,router]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const handleCall = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number')
      return
    }
    setIsCalling(true)
    setCallDuration(0)
    setIsCallConnected(false)
    setHasCallBeenLive(false)
    setCallRefId(null)
    setCallStatusMessage('Initiating call...')
    try {
      const res = await createExtraDialerLeadAndCallAction(phoneNumber, remark1, remark2, callStatus, nextFollowUpDate, true, leadStatus)
      if (res.error) {
        toast.error(res.error)
        setCallStatusMessage(res.error)
        setTimeout(() => setCallStatusMessage(''), 3000)
        setIsCalling(false)
      } else {
        toast.success('Call initiated')
        setCallRefId(res.ref_id || null);
        setCallStatusMessage(res.message || 'Call initiated. Please pick up your device.');
        setIsCallConnected(true);
      }
      if (res.leadId) {
        setActiveLeadId(res.leadId)
      }
    } catch (e) {
      toast.error((e instanceof Error ? e.message : String(e)) || 'Failed to initiate call')
      setCallStatusMessage('Failed to initiate call.')
      setIsCalling(false)
      setTimeout(() => setCallStatusMessage(''), 3000)
    }
  }

  const handleSave = async () => {
    if (!activeLeadId) {
      // If they haven't called yet, we need to create the lead first
      setIsSaving(true)
      try {
        const res = await createExtraDialerLeadAndCallAction(phoneNumber, remark1, remark2, callStatus, nextFollowUpDate, false, leadStatus)
        if (res.leadId) {
          toast.success('Saved to Extra Dialer sheet')
          setShowModal(false)
          resetModal()
        }
      } catch (e) {
        toast.error((e instanceof Error ? e.message : String(e)) || 'Failed to save')
      } finally {
        setIsSaving(false)
      }
      return
    }

    setIsSaving(true)
    try {
      await saveExtraDialerLeadRemarksAction(activeLeadId, remark1, remark2, callStatus, nextFollowUpDate, leadStatus)
      toast.success('Remarks saved')
      setShowModal(false)
      resetModal()
      router.refresh()
    } catch (e) {
      toast.error((e instanceof Error ? e.message : String(e)) || 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePowerDialerSave = async () => {
    const lead = uniqueLeadsForDialer[powerDialerIndex];
    if (!lead) return;
    setIsSaving(true);
    try {
      await saveExtraDialerLeadRemarksAction(lead.id, lead.remark1 || '', lead.remark2 || '', lead.callStatus || 'UNTOUCHED', lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toISOString() : '', lead.leadStatus || 'IN_PROGRESS');
      toast.success('Remarks saved');
      setPowerDialerIndex(prev => Math.min(uniqueLeadsForDialer.length - 1, prev + 1));
    } catch (e) {
      toast.error((e instanceof Error ? e.message : String(e)) || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  const resetModal = () => {
    setPhoneNumber('')
    setRemark1('')
    setRemark2('')
    setCallStatus('UNTOUCHED')
    setLeadStatus('IN_PROGRESS')
    setNextFollowUpDate('')
    setActiveLeadId(null)
  }

  const handleFetchRecording = async (refId: string) => {
    if (!refId) {
      toast.error('No valid Call Reference ID found');
      return;
    }
    setFetchingId(refId)
    try {
      const res = await fetchCallRecordingAction(refId)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Recording fetched successfully')
        router.refresh()
      }
    } catch {
      toast.error('Failed to fetch recording')
    } finally {
      setFetchingId(null)
    }
  }

  const filteredCalls=pageData.rows
  const uniqueLeadsForDialer=dialerQueue.map(lead=>({...lead,...dialerDrafts[lead.id]}))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          <input 
            type="text"
            placeholder="Search number or remarks..."
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none', minWidth: '200px', fontSize: '0.9rem' }}
          />
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="CALL_CONNECTED">Connected</option>
            <option value="CALL_NOT_CONNECTED">Not Connected</option>
            <option value="UNTOUCHED">Untouched</option>
          </select>
          <select 
            value={leadStatusFilter}
            onChange={e => setLeadStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem' }}
          >
            <option value="ACTIVE">Active Leads</option>
            <option value="CLOSED">Closed Leads</option>
            <option value="ALL">All Leads</option>
          </select>
          <select 
            value={followUpFilter}
            onChange={e => setFollowUpFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem' }}
          >
            <option value="ALL">All Follow Ups</option>
            <option value="TODAY">Today</option>
            <option value="PENDING">Pending (Past)</option>
            <option value="UPCOMING">Upcoming</option>
          </select>
          <select 
            value={lastCallFilter}
            onChange={e => setLastCallFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem' }}
          >
            <option value="ALL">All Last Calls</option>
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="OLDER">Older</option>
            <option value="NONE">No Calls</option>
          </select>
          {(searchFilter || statusFilter !== 'ALL' || leadStatusFilter !== 'ACTIVE' || followUpFilter !== 'ALL' || lastCallFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchFilter('')
                setStatusFilter('ALL')
                setLeadStatusFilter('ACTIVE')
                setFollowUpFilter('ALL')
                setLastCallFilter('ALL')
              }}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={async () => {
              const queue=await getCallLeadQueue(callQuery);setDialerQueue(queue)
              if (queue.length === 0) {
                toast.error('No calls found in current filter');
                return;
              }
              setIsPowerDialerMode(true);
              setPowerDialerIndex(0);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
              background: '#10b981', color: 'white', borderRadius: '8px',
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem'
            }}
          >
            <PhoneCall size={18} />
            Start Calling
          </button>
          <button 
            onClick={() => { resetModal(); setShowModal(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
              background: 'var(--primary)', color: 'white', borderRadius: '8px',
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem'
            }}
          >
            <PhoneCall size={18} />
            Add New Call
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--background)', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>DATE (CALL)</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>PHONE NUMBER</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>CALL STATUS</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>REMARK 1</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>REMARK 2</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>NEXT FOLLOW UP</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>CALL DETAIL</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>RECORDING</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No extra calls found.</td>
                </tr>
              ) : (
                filteredCalls.map(call => {
                  const lead = call.lead;
                  return (
                    <tr key={call.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {new Date(call.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>
                        {lead.mobileNumber}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ 
                          background: lead.callStatus === 'CALL_CONNECTED' ? 'rgba(34, 197, 94, 0.1)' : lead.callStatus === 'CALL_NOT_CONNECTED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                          color: lead.callStatus === 'CALL_CONNECTED' ? '#22c55e' : lead.callStatus === 'CALL_NOT_CONNECTED' ? '#ef4444' : '#9ca3af',
                          padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600
                        }}>
                          {lead.callStatus === 'CALL_CONNECTED' ? 'CONNECTED' : lead.callStatus === 'CALL_NOT_CONNECTED' ? 'NOT CONNECTED' : 'UNTOUCHED'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {lead.remark1 || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {lead.remark2 || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {lead.nextFollowUpDate ? (() => {
                          const fd = new Date(lead.nextFollowUpDate);
                          return `${fd.getDate().toString().padStart(2, '0')}/${(fd.getMonth() + 1).toString().padStart(2, '0')}/${fd.getFullYear()} ${fd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                        })() : '-'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {(() => {
                          const d = new Date(call.createdAt);
                          const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ 
                                background: call.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: call.status === 'COMPLETED' ? '#22c55e' : '#ef4444',
                                padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, width: 'fit-content'
                              }}>
                                {call.status}
                              </span>
                              <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{dateStr}</span>
                            </div>
                          )
                        })()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {call.recordingUrl ? (
                          <audio src={call.recordingUrl} controls style={{ height: '30px', width: '200px' }} />
                        ) : (
                          <button 
                            onClick={() => handleFetchRecording(call.smartfloRefId)}
                            disabled={fetchingId === call.smartfloRefId || !call.smartfloRefId}
                            style={{
                              background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none',
                              padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 500,
                              cursor: (fetchingId === call.smartfloRefId || !call.smartfloRefId) ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                          >
                            <RefreshCcw size={14} className={fetchingId === call.smartfloRefId ? "animate-spin" : ""} />
                            {fetchingId === call.smartfloRefId ? 'Fetching...' : 'Fetch'}
                          </button>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
                        <button
                          title="Edit Lead"
                          onClick={() => {
                            setPhoneNumber(lead.mobileNumber);
                            setCallStatus(lead.callStatus || 'UNTOUCHED');
                            setLeadStatus(lead.leadStatus || 'IN_PROGRESS');
                            setRemark1(lead.remark1 || '');
                            setRemark2(lead.remark2 || '');
                            if (lead.nextFollowUpDate) {
                              setNextFollowUpDate(new Date(lead.nextFollowUpDate).toISOString().slice(0, 16));
                            } else {
                              setNextFollowUpDate('');
                            }
                            setActiveLeadId(lead.id);
                            setShowModal(true);
                          }}
                          style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          title="View History"
                          onClick={() => {void openHistory(lead)}}
                          style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <History size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
              <tr ref={sentinel} aria-hidden="true" style={{height:0}} />
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <BodyPortal><div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div style={{
            background: 'var(--card-bg)', width: '100%', maxWidth: '400px',
            borderRadius: '16px', border: '1px solid var(--card-border)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--card-border)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PhoneCall size={20} color="var(--primary)" /> {activeLeadId ? 'Edit Lead' : 'Extra Dialer'}
              </h2>
              <button onClick={() => { setShowModal(false); resetModal(); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Phone Number *</label>
                <input 
                  type="tel"
                  placeholder="Enter 10-digit number"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={!!activeLeadId}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px',
                    border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)',
                    color: !!activeLeadId ? 'var(--text-muted)' : 'var(--text-primary)', fontSize: '1rem', outline: 'none'
                  }}
                />
              </div>

              {phoneNumber.length >= 10 && !activeLeadId && (
                <button 
                  onClick={handleCall}
                  disabled={isCalling}
                  style={{
                    width: '100%', padding: '12px', background: 'var(--primary)', color: 'white',
                    borderRadius: '8px', border: 'none', cursor: isCalling ? 'not-allowed' : 'pointer',
                    fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <Phone size={18} /> {isCalling ? 'Initiating Call...' : 'Call Now'}
                </button>
              )}

              <div style={{ marginTop: '8px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Call Status</label>
                <select 
                  value={callStatus}
                  onChange={e => setCallStatus(e.target.value)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px',
                    border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)',
                    color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none'
                  }}
                >
                  <option value="UNTOUCHED">Untouched</option>
                  <option value="CALL_CONNECTED">Connected</option>
                  <option value="CALL_NOT_CONNECTED">Not Connected</option>
                </select>
              </div>

              <div style={{ marginTop: '8px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Remark 1</label>
                <input 
                  type="text"
                  placeholder="Any remarks..."
                  value={remark1}
                  onChange={e => setRemark1(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)',
                    color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Remark 2</label>
                <input 
                  type="text"
                  placeholder="Additional remarks..."
                  value={remark2}
                  onChange={e => setRemark2(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)',
                    color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginTop: '8px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Next Follow Up</label>
                <input 
                  type="datetime-local"
                  value={nextFollowUpDate}
                  onChange={e => setNextFollowUpDate(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)',
                    color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', colorScheme: 'dark'
                  }}
                />
              </div>

              <div style={{ marginTop: '8px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Lead Status</label>
                <select 
                  value={leadStatus}
                  onChange={e => setLeadStatus(e.target.value)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px',
                    border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)',
                    color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none'
                  }}
                >
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PAYMENT_DONE_CLOSED">Payment Done Closed</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleSave}
                disabled={isSaving || !phoneNumber}
                style={{
                  padding: '10px 20px', background: '#22c55e', color: 'white',
                  borderRadius: '8px', border: 'none', cursor: (isSaving || !phoneNumber) ? 'not-allowed' : 'pointer',
                  fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', opacity: (isSaving || !phoneNumber) ? 0.7 : 1
                }}
              >
                <Save size={18} /> {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div></BodyPortal>
      )}

      {historyLead && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div style={{
            background: 'var(--card-bg)', width: '100%', maxWidth: '600px', maxHeight: '80vh',
            borderRadius: '16px', border: '1px solid var(--card-border)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--card-border)' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={20} color="var(--primary)" /> History for {historyLead.mobileNumber}
              </h2>
              <button onClick={() => setHistoryLead(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Call Logs</h3>
                {(!historyLead.callRecords || historyLead.callRecords.length === 0) ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No calls recorded yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {historyLead.callRecords.map((cr) => (
                      <div key={cr.id} style={{ background: 'var(--table-hover)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9rem' }}>{cr.status} ({cr.duration}s)</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                            {new Date(cr.createdAt).toLocaleString('en-IN')}
                          </div>
                        </div>
                        {cr.recordingUrl && (
                          <audio src={cr.recordingUrl} controls style={{ height: '30px', width: '200px' }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Change History (Audit Logs)</h3>
                {(!historyLead.auditLogs || historyLead.auditLogs.length === 0) ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No changes recorded yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {historyLead.auditLogs.map((log) => (
                      <div key={log.id} style={{ background: 'var(--table-hover)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                          <div>
                            <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>{log.field}</span>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                              <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{log.oldValue || 'None'}</span>
                              {' → '}
                              <span style={{ color: 'var(--success)' }}>{log.newValue || 'None'}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(log.createdAt).toLocaleString('en-IN')}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>by {log.userName || 'Unknown'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Call Tracker */}
      {(isCalling || callStatusMessage) && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999, pointerEvents: 'none', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <div className="card" style={{ padding: '24px', borderRadius: '16px', background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', width: '320px', textAlign: 'center', pointerEvents: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
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
              <h3 style={{ fontSize: '1.25rem', color: 'var(--foreground)', fontWeight: 600, margin: 0 }}>
                Calling
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>
                {phoneNumber}
              </p>
              <div style={{ marginTop: '8px', color: callStatusMessage.includes('Error') || callStatusMessage.includes('Failed') || callStatusMessage.includes('missed') ? '#ef4444' : '#60a5fa', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                {callStatusMessage}
              </div>
              {isCallConnected && (
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)', marginTop: '16px', fontVariantNumeric: 'tabular-nums' }}>
                  {formatDuration(callDuration)}
                </div>
              )}
              <style>{`
                @keyframes pulse {
                  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
                  70% { box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); }
                  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
                }
              `}</style>
              <button 
                onClick={() => {
                  setIsCallConnected(false);
                  setCallStatusMessage('Call Saved');
                  if (activeLeadId && callRefId) {
                    saveCallLogAction({
                      leadId: activeLeadId,
                      refId: callRefId,
                      duration: callDuration
                    }).then(() => router.refresh()).catch(() => {});
                  }
                  setTimeout(() => {
                    setIsCalling(false);
                    setCallDuration(0);
                    setCallRefId(null);
                    setCallStatusMessage('');
                  }, 1000);
                }}
                style={{
                  marginTop: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <X size={16} /> Close & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {isPowerDialerMode && uniqueLeadsForDialer[powerDialerIndex] && (
        <BodyPortal><div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--background)', zIndex: 1000, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
          <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.5rem' }}>Calling Session ({powerDialerIndex + 1} / {uniqueLeadsForDialer.length})</h2>
              <button 
                onClick={() => setIsPowerDialerMode(false)} 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
              >
                <X size={18} /> Close Session
              </button>
            </div>
            
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>{uniqueLeadsForDialer[powerDialerIndex].uniqueId}</div>
                  <h1 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '2rem' }}>{uniqueLeadsForDialer[powerDialerIndex].name}</h1>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PhoneCall size={20} /> {uniqueLeadsForDialer[powerDialerIndex].mobileNumber}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={async () => {
                      if (!isCallConnected) {
                        const lead = uniqueLeadsForDialer[powerDialerIndex];
                        setActiveLeadId(lead.id);
                        setIsCalling(true);
                        setCallDuration(0);
                        setIsCallConnected(false);
                        setHasCallBeenLive(false);
                        setCallRefId(null);
                        setCallStatusMessage('Initiating call...');
                        try {
                          const res = await createExtraDialerLeadAndCallAction(lead.mobileNumber, lead.remark1 || '', lead.remark2 || '', lead.callStatus || 'UNTOUCHED', lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toISOString() : '', true);
                          if (res.error) setCallStatusMessage(res.error);
                          else {
                            setCallRefId(res.ref_id || null);
                            setCallStatusMessage(res.message || 'Call initiated. Please pick up your device.');
                            setIsCallConnected(true);
                          }
                        } catch {
                          setCallStatusMessage('Failed to initiate call.');
                        }
                      }
                    }}
                    style={{ background: isCallConnected ? '#ef4444' : '#10b981', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {isCallConnected ? <Phone size={20} /> : <PhoneCall size={20} />}
                    {isCallConnected ? 'Call Active' : 'Call Now'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', background: 'var(--table-hover)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Call Status</label>
                  <select 
                    value={uniqueLeadsForDialer[powerDialerIndex].callStatus || 'UNTOUCHED'}
                    onChange={e => {
                      const id = uniqueLeadsForDialer[powerDialerIndex].id;
                      setDialerDrafts(prev => ({ ...prev, [id]: { ...prev[id], callStatus: e.target.value } }));
                    }}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)',
                      color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none'
                    }}
                  >
                    <option value="UNTOUCHED">Untouched</option>
                    <option value="CALL_CONNECTED">Connected</option>
                    <option value="CALL_NOT_CONNECTED">Not Connected</option>
                  </select>
                </div>
                
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Next Follow Up</label>
                  <input 
                    type="datetime-local"
                    value={uniqueLeadsForDialer[powerDialerIndex].nextFollowUpDate ? new Date(uniqueLeadsForDialer[powerDialerIndex].nextFollowUpDate).toISOString().slice(0, 16) : ''}
                    onChange={e => {
                      const id = uniqueLeadsForDialer[powerDialerIndex].id;
                      setDialerDrafts(prev => ({ ...prev, [id]: { ...prev[id], nextFollowUpDate: e.target.value } }));
                    }}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)',
                      color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', colorScheme: 'dark'
                    }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Remark 1</label>
                  <input 
                    type="text"
                    value={uniqueLeadsForDialer[powerDialerIndex].remark1 || ''}
                    onChange={e => {
                      const id = uniqueLeadsForDialer[powerDialerIndex].id;
                      setDialerDrafts(prev => ({ ...prev, [id]: { ...prev[id], remark1: e.target.value } }));
                    }}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)',
                      color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>
                
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Remark 2</label>
                  <input 
                    type="text"
                    value={uniqueLeadsForDialer[powerDialerIndex].remark2 || ''}
                    onChange={e => {
                      const id = uniqueLeadsForDialer[powerDialerIndex].id;
                      setDialerDrafts(prev => ({ ...prev, [id]: { ...prev[id], remark2: e.target.value } }));
                    }}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)',
                      color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Lead Status</label>
                  <select 
                    value={uniqueLeadsForDialer[powerDialerIndex].leadStatus || 'IN_PROGRESS'}
                    onChange={e => {
                      const id = uniqueLeadsForDialer[powerDialerIndex].id;
                      setDialerDrafts(prev => ({ ...prev, [id]: { ...prev[id], leadStatus: e.target.value } }));
                    }}
                    style={{
                      width: '100%', padding: '12px 16px', background: 'var(--background)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '1rem', outline: 'none'
                    }}
                  >
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="PAYMENT_DONE_CLOSED">Payment Done Closed</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button 
                  onClick={handlePowerDialerSave}
                  disabled={isSaving}
                  style={{ flex: 1, padding: '12px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Save size={18} /> {isSaving ? 'Saving...' : 'Save & Next'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={() => setPowerDialerIndex(prev => Math.max(0, prev - 1))}
                disabled={powerDialerIndex === 0}
                style={{ padding: '12px 24px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', borderRadius: '8px', fontWeight: 600, cursor: powerDialerIndex === 0 ? 'not-allowed' : 'pointer', opacity: powerDialerIndex === 0 ? 0.5 : 1 }}
              >
                Previous Lead
              </button>
              <button 
                onClick={() => setPowerDialerIndex(prev => Math.min(uniqueLeadsForDialer.length - 1, prev + 1))}
                disabled={powerDialerIndex === uniqueLeadsForDialer.length - 1}
                style={{ padding: '12px 24px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', borderRadius: '8px', fontWeight: 600, cursor: powerDialerIndex === uniqueLeadsForDialer.length - 1 ? 'not-allowed' : 'pointer', opacity: powerDialerIndex === uniqueLeadsForDialer.length - 1 ? 0.5 : 1 }}
              >
                Skip to Next Lead
              </button>
            </div>
          </div>
        </div></BodyPortal>
      )}
    </div>
  )
}
