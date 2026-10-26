'use client'
import BodyPortal from '@/components/BodyPortal'
import { useLeadPage,usePageNumber,dateBounds,followBounds,allMatchingLeads } from '@/hooks/use-lead-page';
import type { LeadPage,LeadQuery } from '@/lib/lead-query';
import toast from 'react-hot-toast';

import { useState,useEffect,useCallback,useRef } from 'react';
import { removeLeadFromSheetAction,updateLeadStatusAction } from '@/app/actions/lead';
import { initiateCallAction,checkCallStatusAction,saveCallLogAction } from '@/app/actions/call';
import AddColumnModal from '@/components/AddColumnModal';
import { Trash2,Eye,RefreshCcw,History,Calendar,ChevronDown,MessageSquare,Send,Check,X,PhoneCall,AlertTriangle,ArrowRightLeft,PhoneOff } from 'lucide-react';
import EditLeadModal from './EditLeadModal';
import LeadHistoryModal from '@/components/LeadHistoryModal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { getWhatsAppTemplatesAction,updateLeadWhatsAppTemplateAction } from '@/app/actions/whatsappTemplate';
import { transferLeadWebinarAction } from '@/app/actions/lead';
import { useConfirm } from '@/providers/ConfirmProvider';

export default function SalesTable({ initialPage, webinarFilter, isAdmin = false, updaterDepartment = '', customColumns = [], sheetName = 'SALES', webinars = [], executives = [], isClosed = false, userRole = '', startCallingRequest = 0 }: { initialPage: LeadPage, webinarFilter?: string | null, isAdmin?: boolean, updaterDepartment?: string, customColumns?: import('@prisma/client').CustomColumn[], sheetName?: string, webinars?: import('@prisma/client').WebinarMaster[], executives?: import('@/lib/view-types').Person[], isClosed?: boolean, userRole?: string, startCallingRequest?: number }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLogStatus, setFilterLogStatus] = useState(sheetName === 'RECOVERY' ? 'Fresh Log' : '')
  const [filterCallStatus, setFilterCallStatus] = useState<string>('all')
  const [filterLastCall, setFilterLastCall] = useState<string>('all')
  const [filterLeadStatus, setFilterLeadStatus] = useState<string>('all')
  const [filterNextFollowUp, setFilterNextFollowUp] = useState<string>('all')
  const [filterFollowUpFrom, setFilterFollowUpFrom] = useState<Date | null>(null)
  const [filterFollowUpTo, setFilterFollowUpTo] = useState<Date | null>(null)
  const [filterTotalAmount, setFilterTotalAmount] = useState<string>('all')
  const [tempAmountMin, setTempAmountMin] = useState<string>('')
  const [tempAmountMax, setTempAmountMax] = useState<string>('')
  const [filterAmountMin, setFilterAmountMin] = useState<string>('')
  const [filterAmountMax, setFilterAmountMax] = useState<string>('')
  const [isFollowUpCalendarOpen, setIsFollowUpCalendarOpen] = useState(false)
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
  const [isPowerDialerMode, setIsPowerDialerMode] = useState(false)
  const [powerDialerIndex, setPowerDialerIndex] = useState(0)
  const [powerDialerLeads, setPowerDialerLeads] = useState<import('@/lib/lead-query').LeadRow[]>([])
  const [viewingHistoryLead, setViewingHistoryLead] = useState<import('@/lib/lead-query').LeadRow | null>(null)
  const [transferModalLead, setTransferModalLead] = useState<import('@/lib/lead-query').LeadRow | null>(null)
  const [transferWebinarId, setTransferWebinarId] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)
  
  const [activeCallLead, setActiveCallLead] = useState<import('@/lib/lead-query').LeadRow | null>(null)

  // Issue Modal State
  const [issueLead, setIssueLead] = useState<import('@/lib/lead-query').LeadRow | null>(null)
  const [issueTypes, setIssueTypes] = useState<import('@prisma/client').IssueDropdownValue[]>([])
  const [issueTypeId, setIssueTypeId] = useState('')
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false)

  const [isCalling, setIsCalling] = useState(false)
  const [callStatusMessage, setCallStatusMessage] = useState('')
  const [callDuration, setCallDuration] = useState<number>(0)
  const [isCallConnected, setIsCallConnected] = useState(false)
  const [hasCallBeenLive, setHasCallBeenLive] = useState(false)
  const [callRefId, setCallRefId] = useState<string | null>(null)
  const latestCallRef = useRef<string | null>(null)
  useEffect(() => { latestCallRef.current = callRefId }, [callRefId])

  const [rowsPerPage, setRowsPerPage] = useState(15)

  const [filterNow] = useState(() => new Date())
  const lastCall = dateBounds(filterLastCall,null,null,filterNow)
  if(lastCall.end){const end=new Date(lastCall.end);end.setHours(23,59,59,999);lastCall.end=end.toISOString()}
  const queryFilters: LeadQuery = {sheet:sheetName==='RECOVERY'?'RECOVERY':'SALES',closed:isClosed,webinar:webinarFilter||'',search:searchQuery,log:filterLogStatus,leadStatus:filterLeadStatus,call:filterCallStatus,amount:filterTotalAmount,min:filterAmountMin,max:filterAmountMax,lastCallStart:lastCall.start,lastCallEnd:lastCall.end,...followBounds(filterNextFollowUp,filterFollowUpFrom,filterFollowUpTo,filterNow)}
  const [requestedPage,setRequestedPage] = usePageNumber(JSON.stringify({...queryFilters,size:rowsPerPage}))
  const pageData=useLeadPage(initialPage,{...queryFilters,page:requestedPage,size:rowsPerPage})
  const localLeads=pageData.rows, setLocalLeads=pageData.setRows
  const callingQueryKey=JSON.stringify(queryFilters)
  const openingCalling=useRef(false)
  const handledCallingRequest=useRef(0)
  const openCallingSession=useCallback(async()=>{
    if(openingCalling.current)return
    openingCalling.current=true
    try{
      const queue=await allMatchingLeads(JSON.parse(callingQueryKey))
      if(!queue.length){toast.error('No leads in queue.');return}
      setPowerDialerLeads(queue);setPowerDialerIndex(0);setIsPowerDialerMode(true)
    }catch{toast.error('Unable to load calling queue. Please try again.')}
    finally{openingCalling.current=false}
  },[callingQueryKey])
  useEffect(()=>{
    if(!startCallingRequest||handledCallingRequest.current===startCallingRequest)return
    handledCallingRequest.current=startCallingRequest
    void openCallingSession()
  },[startCallingRequest,openCallingSession])
  const currentPage=Math.min(requestedPage,Math.max(1,Math.ceil(pageData.total/rowsPerPage)))
  const setCurrentPage=(next:number|((page:number)=>number))=>setRequestedPage(typeof next==='function'?next(currentPage):next)


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
          // Always save log if it disconnected, even if duration was short
          setIsCallConnected(false);
          setCallStatusMessage('Call Disconnected');
          if (activeCallLead && callRefId) {
            saveCallLogAction({
              leadId: activeCallLead.id,
              refId: callRefId,
              duration: callDuration
            }).then(result => {
              if (latestCallRef.current !== callRefId) return;
              if (!result.success || !result.callRecord) {toast.error(result.error || 'Failed to save call log');return}
              const newStatus = result.callStatus;
              const newCallRecord = result.callRecord;
              setLocalLeads((prev) => prev.map((l) => {
                if (l.id === activeCallLead.id) {
                  return {
                    ...l,
                    callStatus: newStatus,
                    updatedAt: new Date(),
                    callRecords: [newCallRecord, ...(l.callRecords || []).filter(record => record.id !== newCallRecord.id)]
                  };
                }
                return l;
              }));
              setPowerDialerLeads((prev) => prev.map((l) => {
                if (l.id === activeCallLead.id) {
                  return {
                    ...l,
                    callStatus: newStatus,
                    updatedAt: new Date(),
                    callRecords: [newCallRecord, ...(l.callRecords || []).filter(record => record.id !== newCallRecord.id)]
                  };
                }
                return l;
              }));
              
              if (activeCallLead) {
                setEditingLeadId(activeCallLead.id);
              }
            }).catch(() => {});
          }
          setTimeout(() => {
            if (latestCallRef.current !== callRefId) return;
            setActiveCallLead(null);
            setIsCalling(false);
            setCallDuration(0);
            setCallRefId(null);
          }, 2000);
        }
      }).catch(() => {});
    }
  }, [callDuration, isCallConnected, activeCallLead, callRefId, hasCallBeenLive,setLocalLeads]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())


  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueLead) return;
    setIsSubmittingIssue(true);
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: issueLead.name,
          emailId: issueLead.email || '',
          mobileNumber: issueLead.mobileNumber,
          issueTypeId,
        })
      });
      if (res.ok) {
        toast.success('Issue created successfully');
        setIssueLead(null);
        setIssueTypeId('');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create issue');
      }
    } catch {
      toast.error('Failed to create issue');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSelected = new Set(selectedLeadIds)
      currentLeads.forEach(l => newSelected.add(l.id))
      setSelectedLeadIds(newSelected)
    } else {
      const newSelected = new Set(selectedLeadIds)
      currentLeads.forEach(l => newSelected.delete(l.id))
      setSelectedLeadIds(newSelected)
    }
  }

  const handleSelectLead = (id: string) => {
    const newSelected = new Set(selectedLeadIds)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedLeadIds(newSelected)
  }


  // WhatsApp Templates State
  const [whatsappTemplates, setWhatsappTemplates] = useState<import('@prisma/client').WhatsAppTemplate[]>([])
  const [previewModalData, setPreviewModalData] = useState<{
    message: string;
    leadName: string;
    mobile: string;
    templateName: string;
    lead: import('@/lib/lead-query').LeadRow;
  } | null>(null)

  useEffect(() => {
    if (sheetName === 'SALES') {
      getWhatsAppTemplatesAction().then(res => {
        if (res.success && res.templates) {
          setWhatsappTemplates(res.templates)
        }
      }).catch(err => console.error(err))
    }
  }, [sheetName])

  const personalizeMessage = (templateText: string, lead:import('@/lib/lead-query').LeadRow) => {
    if (!templateText) return ''
    return templateText
      .replace(/\{name\}/g, lead.name || '')
      .replace(/\{mobile\}/g, lead.mobileNumber || '')
      .replace(/\{email\}/g, lead.email || '')
      .replace(/\{webinarId\}/g, lead.webinarId || '')
      .replace(/\{state\}/g, lead.state || '')
      .replace(/\{amount\}/g, lead.partPaymentAmount ? `₹${lead.partPaymentAmount}` : (lead.totalPayment ? `₹${lead.totalPayment}` : ''));
  }

  const handleSendWhatsApp = async (lead:import('@/lib/lead-query').LeadRow, templateName: string) => {
    const template = whatsappTemplates.find(t => t.name === templateName);
    if (!template) {
      alert('Please select a valid template.');
      return;
    }

    let phone = (lead.mobileNumber || '').replace(/\D/g, '');
    if (!phone) {
      alert(`Lead "${lead.name}" does not have a valid mobile number.`);
      return;
    }
    if (phone.length === 10) {
      phone = '91' + phone;
    }

    let finalMsg = personalizeMessage(template.message, lead);
    if (template.imageUrl) {
      finalMsg += `\n\nImage: ${template.imageUrl}`;
    }
    if (template.videoUrl) {
      finalMsg += `\n\nVideo: ${template.videoUrl}`;
    }
    const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(finalMsg)}`;

    window.open(waUrl, '_blank');

    try {
      await updateLeadWhatsAppTemplateAction(lead.id, templateName, true);
      setLocalLeads(prev => prev.map(l => l.id === lead.id ? { 
        ...l, 
        whatsappTemplate: templateName, 
        whatsappSentAt: new Date() 
      } : l));
    } catch (e) {
      console.error('Failed to update lead whatsapp status:', e);
    }
  }

  const handleTransferLead = async () => {
    if (!transferModalLead || !transferWebinarId) return;
    setIsTransferring(true);
    try {
      const res = await transferLeadWebinarAction(transferModalLead.id, transferWebinarId);
      if (res.success) {
        setLocalLeads(prev => prev.filter(l => l.id !== transferModalLead.id));
        setTransferModalLead(null);
        setTransferWebinarId('');
      } else {
        alert(res.error || 'Failed to transfer lead');
      }
    } catch (e) {
      console.error(e);
      alert('Error transferring lead');
    } finally {
      setIsTransferring(false);
    }
  }

  const handleUpdateTemplateSelection = async (leadId: string, templateName: string) => {
    try {
      await updateLeadWhatsAppTemplateAction(leadId, templateName, false);
      setLocalLeads(prev => prev.map(l => l.id === leadId ? { 
        ...l, 
        whatsappTemplate: templateName 
      } : l));
    } catch (e) {
      console.error('Failed to update template selection:', e);
    }
  }

  const confirm = useConfirm();

  

  const handleDeleteLead = async (leadId: string) => {
    const isConfirmed = await confirm({
      title: 'Remove Lead?',
      message: 'Are you sure you want to remove this lead from this sheet?',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await removeLeadFromSheetAction(leadId, sheetName);
      setLocalLeads(prev => prev.filter(l => l.id !== leadId))
    } catch {
      alert('Failed to remove lead');
    }
  }

  const handleRestoreLead = async (leadId: string) => {
    const isConfirmed = await confirm({
      title: 'Restore Lead?',
      message: 'Are you sure you want to move this lead back to Active Leads?',
      type: 'info'
    });
    if (!isConfirmed) return;
    try {
      await updateLeadStatusAction(leadId, 'IN_PROGRESS');
      setLocalLeads(prev => prev.filter(l => l.id !== leadId));
      alert('Lead moved to Active successfully.');
    } catch {
      alert('Failed to restore lead');
    }
  }

  const handleSaveSuccess = (updatedLead:Partial<import('@prisma/client').Lead>&{id:string}) => {
    setLocalLeads(prev => prev.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead } : l))
    setPowerDialerLeads(prev => prev.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead } : l))
    setEditingLeadId(null)
    if (isPowerDialerMode) {
      setPowerDialerIndex(prev => Math.min(powerDialerLeads.length - 1, prev + 1))
    }
  }

  const editingLead = localLeads.find(l => l.id === editingLeadId) || powerDialerLeads.find(l => l.id === editingLeadId)

  // Extract unique states for dropdown
  const states = Array.from(new Set(localLeads.map(l => l.state).filter(Boolean))) as string[]

  const totalLeads=pageData.total
  const totalPages=Math.max(1,Math.ceil(totalLeads/rowsPerPage))
  const currentLeads=localLeads

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--card-bg)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
        
        {/* Top Row: Title, Search, and Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--foreground)', fontWeight: 600, fontSize: '0.85rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filter Leads
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Start Calling Button moved here */}
            <button
              onClick={openCallingSession}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: '#10b981', color: '#fff', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              <PhoneCall size={14} /> Start Calling
            </button>

            {/* Search Box */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--background)', border: '1px solid var(--card-border)', borderRadius: '6px', overflow: 'hidden', minWidth: '250px', padding: '0 8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke='var(--text-muted)' strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                placeholder="Search leads..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', color: 'var(--foreground)', padding: '6px 8px', outline: 'none', fontSize: '0.85rem', width: '100%', fontFamily: 'inherit' }} 
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', color: 'var(--text-muted)', transition: 'color 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  title="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              )}
            </div>

            {/* Reset Filters Button moved here */}
            {(searchQuery || (filterNextFollowUp !== 'all') || (filterCallStatus !== 'all') || (filterLeadStatus !== 'all') || (filterLastCall !== 'all') || (filterTotalAmount !== 'all') || (sheetName === 'RECOVERY' && filterLogStatus !== 'Fresh Log')) && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setFilterLogStatus(sheetName === 'RECOVERY' ? 'Fresh Log' : '');
                  setFilterCallStatus('all');
                  setFilterLeadStatus('all');
                  setFilterLastCall('all');
                  setFilterNextFollowUp('all');
                  setFilterFollowUpFrom(null);
                  setFilterFollowUpTo(null);
                  setIsFollowUpCalendarOpen(false);
                  setFilterTotalAmount('all');
                  setFilterAmountMin('');
                  setFilterAmountMax('');
                  setTempAmountMin('');
                  setTempAmountMax('');
                }}
                className="btn"
                title="Reset Filters"
                style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--foreground)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', padding: 0 }}
              >
                <RefreshCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Dropdown Filters */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          
          {/* Start Calling button moved to top row */}

          {/* Lead Status Filter */}
          <div style={{ position: 'relative' }}>
            <select 
              value={filterLeadStatus} 
              onChange={e => setFilterLeadStatus(e.target.value)}
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', padding: '8px 28px 8px 32px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', appearance: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Lead Status</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CLOSED">Closed</option>
              <option value="CLOSED_FULL_PAYMENT">Full Payment Done (Close)</option>
            </select>
            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
              <ChevronDown size={14} />
            </div>
          </div>

          {/* Call Status Filter */}
          <div style={{ position: 'relative' }}>
            <select 
              value={filterCallStatus} 
              onChange={e => setFilterCallStatus(e.target.value)}
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', padding: '8px 28px 8px 32px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', appearance: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Call Status</option>
              <option value="CALL_CONNECTED">Call Connected</option>
              <option value="CALL_NOT_CONNECTED">Call Not Connected</option>
              <option value="UNTOUCHED">Untouched</option>
            </select>
            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
              <PhoneCall size={14} />
            </div>
            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
              <ChevronDown size={14} />
            </div>
          </div>

          {/* Last Call Filter */}
          <div style={{ position: 'relative' }}>
            <select 
              value={filterLastCall} 
              onChange={e => setFilterLastCall(e.target.value)}
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', padding: '8px 28px 8px 32px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', appearance: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Last Calls</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
            </select>
            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
              <History size={14} />
            </div>
            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
              <ChevronDown size={14} />
            </div>
          </div>

          {/* Next Follow-Up Filter */}
          <div style={{ position: 'relative' }}>
            <select 
              value={filterNextFollowUp} 
              onChange={e => {
                setFilterNextFollowUp(e.target.value);
                if (e.target.value === 'custom') {
                  setIsFollowUpCalendarOpen(true);
                } else {
                  setIsFollowUpCalendarOpen(false);
                  setFilterFollowUpFrom(null);
                  setFilterFollowUpTo(null);
                }
              }}
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', padding: '8px 28px 8px 32px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', appearance: 'none', cursor: 'pointer' }}
            >
              <option value="all">All Follow-Ups</option>
              <option value="due">Due Follow-Up</option>
              <option value="yesterday">Yesterday</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="next7">Next 7 Days</option>
              <option value="last7">Last 7 Days</option>
              <option disabled>──────────</option>
              <option value="custom">Custom Date Range</option>
            </select>
            
            {filterNextFollowUp === 'custom' && isFollowUpCalendarOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: '4px' }}>
                <DatePicker
                  selectsRange={true}
                  startDate={filterFollowUpFrom || undefined}
                  endDate={filterFollowUpTo || undefined}
                  onChange={(update) => {
                    setFilterFollowUpFrom(update[0]);
                    setFilterFollowUpTo(update[1]);
                    if (update[0] && update[1]) {
                      if (update[0] > update[1]) {
                        alert("From Date cannot be greater than To Date.");
                        setFilterFollowUpTo(null);
                      } else {
                        setIsFollowUpCalendarOpen(false);
                      }
                    }
                  }}
                  onClickOutside={() => {
                    setIsFollowUpCalendarOpen(false);
                    if (!filterFollowUpFrom || !filterFollowUpTo) {
                      setFilterNextFollowUp('all');
                      setFilterFollowUpFrom(null);
                      setFilterFollowUpTo(null);
                    }
                  }}
                  open={true}
                  customInput={<div style={{ width: 0, height: 0, padding: 0, border: 'none', margin: 0, overflow: 'hidden' }} />}
                />
              </div>
            )}
            <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />

          </div>

          {/* Total Amount Filter */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <select 
                value={filterTotalAmount} 
                onChange={e => {
                  setFilterTotalAmount(e.target.value);
                  if (e.target.value !== 'between') {
                    setFilterAmountMin('');
                    setFilterAmountMax('');
                    setTempAmountMin('');
                    setTempAmountMax('');
                  }
                }}
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', padding: '8px 28px 8px 32px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="all">All Amounts</option>
                <option value="4000">₹4000</option>
                <option value="8000">₹8000</option>
                <option value="15999">₹15999</option>
                <option value="between">Between</option>
              </select>
              <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>₹</span>
              </div>
              <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                <ChevronDown size={14} />
              </div>
            </div>

            {filterTotalAmount === 'between' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input 
                  type="number"
                  placeholder="Min"
                  value={tempAmountMin}
                  onChange={e => setTempAmountMin(e.target.value)}
                  style={{ width: '70px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', padding: '8px 8px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                <input 
                  type="number"
                  placeholder="Max"
                  value={tempAmountMax}
                  onChange={e => setTempAmountMax(e.target.value)}
                  style={{ width: '70px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', padding: '8px 8px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
                />
                <button 
                  onClick={() => {
                    setFilterAmountMin(tempAmountMin);
                    setFilterAmountMax(tempAmountMax);
                  }}
                  style={{ padding: '6px 12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
          
          {sheetName === 'RECOVERY' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setFilterLogStatus('Fresh Log')}
                style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: filterLogStatus === 'Fresh Log' ? 'none' : '1px solid rgba(255,255,255,0.1)', background: filterLogStatus === 'Fresh Log' ? 'rgba(34, 197, 94, 0.2)' : 'transparent', color: filterLogStatus === 'Fresh Log' ? '#22c55e' : 'var(--text-muted)', transition: 'all 0.2s' }}
              >
                Fresh Log
              </button>
              <button
                onClick={() => setFilterLogStatus('New Log')}
                style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: filterLogStatus === 'New Log' ? 'none' : '1px solid rgba(255,255,255,0.1)', background: filterLogStatus === 'New Log' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', color: filterLogStatus === 'New Log' ? '#3b82f6' : 'var(--text-muted)', transition: 'all 0.2s' }}
              >
                New Log
              </button>
              <button
                onClick={() => setFilterLogStatus('Old Log')}
                style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: filterLogStatus === 'Old Log' ? 'none' : '1px solid rgba(255,255,255,0.1)', background: filterLogStatus === 'Old Log' ? 'rgba(239, 68, 68, 0.2)' : 'transparent', color: filterLogStatus === 'Old Log' ? '#ef4444' : 'var(--text-muted)', transition: 'all 0.2s' }}
              >
                Old Log
              </button>
            </div>
          )}

        </div>
      </div>
      
      <div className="table-container" style={{ position: 'relative', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--card-border)', overflowX: 'auto', overflowY: 'auto', flex: 1, minHeight: 0 }}>
      {isAdmin && (
        <div style={{ position: 'absolute', top: '-48px', right: '0' }}>
          <AddColumnModal sheetName={sheetName} />
        </div>
      )}
      
      <table style={{ width: '100%', minWidth: sheetName === 'SALES' ? '1800px' : '1500px', tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: 0 }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--background)', borderBottom: '1px solid var(--table-border)' }}>
          <tr style={{ height: '44px' }}>
            <th style={{ padding: '6px 12px', width: '40px', textAlign: 'left' }}>
              <input type="checkbox" onChange={handleSelectAll} checked={currentLeads.length > 0 && currentLeads.every(l => selectedLeadIds.has(l.id))} style={{ cursor: 'pointer' }} />
            </th>
            <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '100px' }}>LEAD ID</th>
            <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '130px' }}>NAME</th>
            <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '160px' }}>MOBILE</th>
            <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '170px' }}>EMAIL</th>
            {sheetName === 'RECOVERY' && (
              <>
                <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '120px' }}>PART PAYMENT</th>
                <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '150px' }}>PAYMENT DATE</th>
              </>
            )}
            <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '150px' }}>CALL STATUS</th>
            <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '140px' }}>LAST CALL</th>
            <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '135px' }}>NEXT FOLLOW UP</th>
            <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '110px' }}>TOTAL AMOUNT</th>
            {sheetName === 'RECOVERY' && (
              <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', width: '100px' }}>LOG STATUS</th>
            )}
            {sheetName === 'SALES' && (
              <th style={{ padding: '6px 12px', color: 'var(--success)', fontWeight: 600, fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '280px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <MessageSquare size={13} /> WHATSAPP TEMPLATE
                </span>
              </th>
            )}
            <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '120px' }}>WEBINAR ID</th>
            <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '105px' }}>STATE</th>
            <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', textAlign: 'left', whiteSpace: 'nowrap', width: '170px' }}>LEAD OWNER</th>
            <th style={{ padding: '6px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '13px', textAlign: 'center', whiteSpace: 'nowrap', width: '130px', position: 'sticky', right: 0, background: 'var(--background)', zIndex: 1, boxShadow: '-4px 0 10px rgba(0,0,0,0.2)' }}>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {currentLeads.map((lead) => (
            <SalesLeadRow 
              key={lead.id} 
              lead={lead} 
              isSelected={selectedLeadIds.has(lead.id)}
              onSelect={() => handleSelectLead(lead.id)}
              sheetName={sheetName}
              isAdmin={isAdmin} 
              userRole={userRole}
              updaterDepartment={updaterDepartment} 
              customColumns={customColumns} 
              isClosed={isClosed}
              whatsappTemplates={whatsappTemplates}
              personalizeMessage={personalizeMessage}
              onSendWhatsApp={handleSendWhatsApp}
              onUpdateTemplateSelection={handleUpdateTemplateSelection}
              onTransfer={() => setTransferModalLead(lead)}
              onPreviewMessage={(message, leadName, mobile, templateName, leadObj) => {
                setPreviewModalData({ message, leadName, mobile, templateName, lead: leadObj })
              }}
              onCall={() => {
                setActiveCallLead(lead);
                setIsCalling(true);
                setCallDuration(0);
                setIsCallConnected(false);
                setHasCallBeenLive(false);
                setCallStatusMessage('Initiating call...');
                setCallRefId(null);
                  initiateCallAction(lead.id).then(res => {
                    if (res.error) setCallStatusMessage(res.error);
                    else { 
                      setCallRefId(res.ref_id || null);
                      setCallStatusMessage(res.message || 'Call initiated. Please pick up your device.');
                      setIsCallConnected(true);
                    }
                  }).catch(() => setCallStatusMessage('Failed to initiate call.'));
              }}
              onEdit={() => setEditingLeadId(lead.id)}
              onDelete={() => handleDeleteLead(lead.id)}
              onRestore={() => handleRestoreLead(lead.id)}
              onViewHistory={() => setViewingHistoryLead(lead)}
              onCreateIssue={(l) => { setIssueLead(l); if (issueTypes.length === 0) fetch('/api/issues/dropdowns?type=ISSUE_TYPE').then(r => r.json()).then(setIssueTypes).catch(() => {}); }}
            />
          ))}
          {localLeads.length === 0 && (
            <tr>
              <td colSpan={20} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No leads in queue.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {/* Pagination Footer */}
      {totalLeads > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'var(--background)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <div>
              Showing {((currentPage - 1) * rowsPerPage) + 1}–{Math.min(currentPage * rowsPerPage, totalLeads)} of {totalLeads} leads
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label>Rows per page:</label>
              <select 
                value={rowsPerPage} 
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                style={{ background: 'var(--table-hover)', color: 'var(--foreground)', border: '1px solid var(--card-border)', padding: '4px 8px', borderRadius: '4px', outline: 'none' }}
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{ padding: '6px 12px', background: currentPage === 1 ? 'transparent' : 'rgba(255,255,255,0.05)', color: currentPage === 1 ? '#475569' : 'var(--text-secondary)', border: '1px solid ' + (currentPage === 1 ? 'transparent' : 'rgba(255,255,255,0.1)'), borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              ← Previous
            </button>
            
            <div style={{ display: 'flex', gap: '4px', margin: '0 8px' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <button 
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{ 
                        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', cursor: 'pointer',
                        background: currentPage === page ? '#3b82f6' : 'transparent',
                        color: currentPage === page ? 'var(--text-primary)' : 'var(--text-muted)',
                        border: currentPage === page ? 'none' : '1px solid transparent',
                        fontWeight: currentPage === page ? 600 : 400
                      }}
                      onMouseOver={(e) => { if (currentPage !== page) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                      onMouseOut={(e) => { if (currentPage !== page) e.currentTarget.style.background = 'transparent' }}
                    >
                      {page}
                    </button>
                  )
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} style={{ color: 'var(--text-muted)', padding: '0 4px', display: 'flex', alignItems: 'center' }}>...</span>
                }
                return null;
              })}
            </div>

            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{ padding: '6px 12px', background: currentPage === totalPages ? 'transparent' : 'rgba(255,255,255,0.05)', color: currentPage === totalPages ? '#475569' : 'var(--text-secondary)', border: '1px solid ' + (currentPage === totalPages ? 'transparent' : 'rgba(255,255,255,0.1)'), borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next →
            </button>
          </div>

        </div>
      )}

      {editingLeadId && editingLead && (
        <BodyPortal><EditLeadModal
          lead={editingLead}
          onClose={() => setEditingLeadId(null)}
          webinars={webinars}
          executives={executives}
          states={states}
          isAdmin={isAdmin}
          updaterDepartment={updaterDepartment}
          onSaveSuccess={handleSaveSuccess}
        /></BodyPortal>
      )}

      {viewingHistoryLead && (
        <BodyPortal><LeadHistoryModal
          lead={viewingHistoryLead} 
          onClose={() => setViewingHistoryLead(null)} 
        /></BodyPortal>
      )}

      {transferModalLead && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--background)',
            border: '1px solid var(--card-border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ color: 'var(--foreground)', fontSize: '1.25rem', fontWeight: 600, margin: '0 0 16px 0' }}>Transfer Lead</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Transfer <strong style={{color: 'var(--foreground)'}}>{transferModalLead.name}</strong> from their current webinar to a new one.
            </p>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>Select Target Webinar</label>
              <select
                value={transferWebinarId}
                onChange={(e) => setTransferWebinarId(e.target.value)}
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px',
                  background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--foreground)',
                  fontSize: '0.95rem'
                }}
              >
                <option value="">-- Choose a webinar --</option>
                {webinars.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.id} - {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setTransferModalLead(null)}
                style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', padding: '8px 16px', cursor: 'pointer' }}
                disabled={isTransferring}
              >
                Cancel
              </button>
              <button 
                onClick={handleTransferLead}
                style={{ background: '#8b5cf6', color: 'var(--foreground)', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }}
                disabled={!transferWebinarId || isTransferring}
              >
                {isTransferring ? 'Transferring...' : 'Transfer Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Message Preview & Direct Send Modal */}
      {previewModalData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setPreviewModalData(null)}
        >
          <div
            style={{
              background: 'var(--table-header-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '16px',
              padding: '24px',
              width: '90%',
              maxWidth: '520px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'var(--success)', padding: '6px', borderRadius: '8px' }}>
                    <MessageSquare size={18} />
                  </div>
                  <h3 style={{ margin: 0, color: 'var(--foreground)', fontSize: '1.2rem', fontWeight: 700 }}>
                    WhatsApp Message Preview
                  </h3>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Sending to: <strong style={{ color: 'var(--foreground)' }}>{previewModalData.leadName}</strong> ({previewModalData.mobile})
                </div>
              </div>
              <button
                onClick={() => setPreviewModalData(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Template:</span>
              <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '2px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                {previewModalData.templateName}
              </span>
            </div>

            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              borderRadius: '10px',
              padding: '14px 16px',
              fontSize: '0.9rem',
              color: 'var(--foreground)',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              maxHeight: '260px',
              overflowY: 'auto'
            }}>
              {previewModalData.message}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={() => setPreviewModalData(null)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--card-border)',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleSendWhatsApp(previewModalData.lead, previewModalData.templateName);
                  setPreviewModalData(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#22c55e',
                  color: 'var(--foreground)',
                  border: 'none',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                }}
              >
                <Send size={14} /> Open & Send in WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {activeCallLead && (
        <BodyPortal><div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999, pointerEvents: 'none', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <div className="card" style={{ padding: '24px', borderRadius: '16px', background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', width: '320px', textAlign: 'center', pointerEvents: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            {isCalling ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', animation: 'pulse 2s infinite'
                }}>
                  <PhoneCall size={32} />
                </div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--foreground)', fontWeight: 600, margin: 0 }}>
                  Calling {activeCallLead.name}
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
                {/* End Call button removed as per request */}
              </div>
            ) : (
              <div style={{ padding: '16px', color: 'var(--text-muted)' }}>
                Preparing call...
              </div>
            )}
          </div>
        </div></BodyPortal>
      )}

      {issueLead && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: 'var(--foreground)', fontSize: '1.25rem', fontWeight: 600 }}>Create Issue for Lead</h3>
              <button onClick={() => setIssueLead(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateIssue} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Name <span style={{color: 'var(--danger)'}}>*</span></label>
                <input disabled type="text" value={issueLead.name} style={{ width: '100%', padding: '10px 12px', background: 'var(--table-hover)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--foreground)', opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Mobile Number <span style={{color: 'var(--danger)'}}>*</span></label>
                <input disabled type="text" value={issueLead.mobileNumber} style={{ width: '100%', padding: '10px 12px', background: 'var(--table-hover)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--foreground)', opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Email ID</label>
                <input disabled type="email" value={issueLead.email || ''} style={{ width: '100%', padding: '10px 12px', background: 'var(--table-hover)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--foreground)', opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>
                  <span>Issue Type <span style={{color: 'var(--danger)'}}>*</span></span>
                </label>
                <select required value={issueTypeId} onChange={e => setIssueTypeId(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--table-hover)', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--foreground)' }}>
                  <option value="">Select Issue Type</option>
                  {issueTypes.map(t => <option key={t.id} value={t.id}>{t.value}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setIssueLead(null)} disabled={isSubmittingIssue} style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-muted)', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: isSubmittingIssue ? 'not-allowed' : 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmittingIssue} style={{ padding: '10px 16px', background: '#3b82f6', color: 'var(--foreground)', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: isSubmittingIssue ? 'not-allowed' : 'pointer', opacity: isSubmittingIssue ? 0.7 : 1 }}>
                  {isSubmittingIssue ? 'Saving...' : 'Save Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPowerDialerMode && powerDialerLeads[powerDialerIndex] && (
        <BodyPortal><div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--background)', zIndex: 1000, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
          <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.5rem' }}>Calling Session ({powerDialerIndex + 1} / {powerDialerLeads.length})</h2>
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
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px' }}>{powerDialerLeads[powerDialerIndex].uniqueId}</div>
                  <h1 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '2rem' }}>{powerDialerLeads[powerDialerIndex].name}</h1>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PhoneCall size={20} /> {powerDialerLeads[powerDialerIndex].mobileNumber}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => {
                      if (!isCallConnected) {
                        const lead = powerDialerLeads[powerDialerIndex];
                        setActiveCallLead(lead);
                        setIsCalling(true);
                        setCallDuration(0);
                        setIsCallConnected(false);
                        setHasCallBeenLive(false);
                        setCallRefId(null);
                        setCallStatusMessage('Initiating call...');
                        initiateCallAction(lead.id).then(res => {
                          if (res.error) setCallStatusMessage(res.error);
                          else {
                            setCallRefId(res.ref_id || null);
                            setCallStatusMessage(res.message || 'Call initiated. Please pick up your device.');
                            setIsCallConnected(true);
                          }
                        }).catch(() => setCallStatusMessage('Failed to initiate call.'));
                      }
                    }}
                    style={{ background: isCallConnected ? '#ef4444' : '#10b981', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {isCallConnected ? <PhoneOff size={20} /> : <PhoneCall size={20} />}
                    {isCallConnected ? 'Call Active' : 'Call Now'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', background: 'var(--table-hover)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ gridColumn: 'span 1' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Email</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{powerDialerLeads[powerDialerIndex].email || '-'}</div>
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Call Status</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{powerDialerLeads[powerDialerIndex].callStatus || '-'}</div>
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Next Follow Up</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{powerDialerLeads[powerDialerIndex].nextFollowUpDate ? new Date(powerDialerLeads[powerDialerIndex].nextFollowUpDate).toLocaleDateString('en-GB') : '-'}</div>
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Paid</div>
                  <div style={{ color: 'var(--success)', fontWeight: 600 }}>₹{((Number(powerDialerLeads[powerDialerIndex].amount1) || 0) + (Number(powerDialerLeads[powerDialerIndex].amount2) || 0) + (Number(powerDialerLeads[powerDialerIndex].amount3) || 0)).toLocaleString()}</div>
                </div>
                
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Remark 1</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'pre-wrap', maxHeight: '80px', overflowY: 'auto' }}>{powerDialerLeads[powerDialerIndex].remark1 || '-'}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Remark 2</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'pre-wrap', maxHeight: '80px', overflowY: 'auto' }}>{powerDialerLeads[powerDialerIndex].remark2 || '-'}</div>
                </div>

                <div style={{ gridColumn: 'span 1' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>State</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{powerDialerLeads[powerDialerIndex].state || '-'}</div>
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Webinar ID</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{powerDialerLeads[powerDialerIndex].webinarId || '-'}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Last Call</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {powerDialerLeads[powerDialerIndex].callRecords?.[0]?.createdAt ? (() => {
                      const d = new Date(powerDialerLeads[powerDialerIndex].callRecords[0].createdAt);
                      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                    })() : '-'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setEditingLeadId(powerDialerLeads[powerDialerIndex].id)}
                  style={{ flex: 1, minWidth: '160px', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Eye size={18} /> Update / Edit
                </button>
                <button 
                  onClick={() => setViewingHistoryLead(powerDialerLeads[powerDialerIndex])}
                  style={{ flex: 1, minWidth: '160px', padding: '12px', background: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-secondary)', border: '1px solid rgba(107, 114, 128, 0.2)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <History size={18} /> View History
                </button>
                <button 
                  onClick={() => {
                    setIssueLead(powerDialerLeads[powerDialerIndex]);
                    if (issueTypes.length === 0) fetch('/api/issues/dropdowns?type=ISSUE_TYPE').then(r => r.json()).then(setIssueTypes).catch(() => {});
                  }}
                  style={{ flex: 1, minWidth: '160px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <AlertTriangle size={18} /> Create Issue
                </button>
                {sheetName === 'SALES' && (
                  <button 
                    onClick={() => setTransferModalLead(powerDialerLeads[powerDialerIndex])}
                    style={{ flex: 1, minWidth: '160px', padding: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <ArrowRightLeft size={18} /> Transfer
                  </button>
                )}
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
                onClick={() => setPowerDialerIndex(prev => Math.min(powerDialerLeads.length - 1, prev + 1))}
                disabled={powerDialerIndex === powerDialerLeads.length - 1}
                style={{ padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: powerDialerIndex === powerDialerLeads.length - 1 ? 'not-allowed' : 'pointer', opacity: powerDialerIndex === powerDialerLeads.length - 1 ? 0.5 : 1 }}
              >
                Next Lead
              </button>
            </div>

          </div>
        </div></BodyPortal>
      )}
    </div>
  )
}

function SalesLeadRow({ 
  lead, 
  isSelected,
  onSelect,
  sheetName,
  isAdmin, 
  userRole,
  updaterDepartment, 
  isClosed = false, 
  whatsappTemplates = [],
  personalizeMessage,
  onSendWhatsApp,
  onUpdateTemplateSelection,
  onPreviewMessage,
  onCall,
  onEdit, 
  onDelete, 
  onRestore, 
  onViewHistory,
  onCreateIssue,
  onTransfer
}: { 
  lead: import('@/lib/lead-query').LeadRow, 
  isSelected: boolean,
  onSelect: () => void,
  sheetName?: string,
  isAdmin: boolean, 
  userRole?: string,
  updaterDepartment: string, 
  customColumns?: import('@prisma/client').CustomColumn[], 
  isClosed?: boolean, 
  whatsappTemplates?: import('@prisma/client').WhatsAppTemplate[],
  personalizeMessage: (templateText: string, lead: import('@/lib/lead-query').LeadRow) => string,
  onSendWhatsApp: (lead: import('@/lib/lead-query').LeadRow, templateName: string) => void,
  onUpdateTemplateSelection: (leadId: string, templateName: string) => void,
  onPreviewMessage: (message: string, leadName: string, mobile: string, templateName: string, lead: import('@/lib/lead-query').LeadRow) => void,
  onCall: () => void,
  onEdit: () => void, 
  onDelete: () => void, 
  onRestore: () => void, 
  onViewHistory: () => void,
  onCreateIssue?: (lead: import('@/lib/lead-query').LeadRow) => void,
  onTransfer?: () => void
}) {
  const [templateDraft,setTemplateDraft]=useState({source:lead.whatsappTemplate,value:lead.whatsappTemplate||''})
  const selectedTemplateName=templateDraft.source===lead.whatsappTemplate?templateDraft.value:lead.whatsappTemplate||''
  const handleTemplateChange=(newVal:string)=>{setTemplateDraft({source:lead.whatsappTemplate,value:newVal});onUpdateTemplateSelection(lead.id,newVal)}

  const activeTemplate = whatsappTemplates.find((t) => t.name === selectedTemplateName);
  const activeMessagePreview = activeTemplate ? personalizeMessage(activeTemplate.message, lead) : '';
  
  const visibleAssignments = lead.assignments ? lead.assignments.filter((a) => a.user?.department !== 'TECHNICAL') : [];
  const leadOwners = visibleAssignments.length > 0 
    ? visibleAssignments.map((a) => a.user?.name).join(', ')
    : 'Unassigned';

  const total = (Number(lead.amount1) || 0) + (Number(lead.amount2) || 0) + (Number(lead.amount3) || 0)
  
  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
  }

  const getCallStatusBadge = (status: string) => {
    if (status === 'CALL_CONNECTED') {
      return <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(52, 211, 153, 0.1)', color: 'var(--success)', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', border: '1px solid rgba(52, 211, 153, 0.2)' }}>CALL CONNECTED</span>
    } else if (status === 'CALL_NOT_CONNECTED') {
      return <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(248, 113, 113, 0.1)', color: 'var(--danger)', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', border: '1px solid rgba(248, 113, 113, 0.2)' }}>CALL NOT CONNECTED</span>
    } else {
      return <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', border: '1px solid rgba(148, 163, 184, 0.2)' }}>UNTOUCHED</span>
    }
  }

  return (
    <tr 
      style={{ borderBottom: '1px solid var(--card-border)', height: '44px' }}
      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
        <input type="checkbox" checked={isSelected} onChange={onSelect} style={{ cursor: 'pointer' }} />
      </td>
      <td style={{ color: 'var(--text-muted)', fontWeight: 500, padding: '0 12px', verticalAlign: 'middle', fontSize: '13px' }}>{lead.uniqueId}</td>
      <td style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', padding: '0 12px', verticalAlign: 'middle', fontSize: '14px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={lead.name}>{lead.name}</td>
      <td style={{ color: 'var(--text-muted)', padding: '0 12px', verticalAlign: 'middle', fontSize: '13px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', width: '100%' }}>
          <span  style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{lead.mobileNumber}</span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onCall();
            }}
            style={{ 
              padding: '4px', 
              background: 'rgba(34, 197, 94, 0.1)', 
              color: 'var(--success)', 
              border: '1px solid rgba(34, 197, 94, 0.2)', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              flexShrink: 0
            }}
            title="Call Lead"
          >
            <PhoneCall size={12} />
          </button>
        </div>
      </td>
      <td style={{ color: 'var(--text-muted)', padding: '0 12px', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} >
          {lead.email || '-'}
        </div>
      </td>
      
      {sheetName === 'RECOVERY' && (
        <>
          <td style={{ color: 'var(--warning)', fontWeight: 600, padding: '0 12px', verticalAlign: 'middle', fontSize: '14px' }}>
            ₹{(Number(lead.partPaymentAmount) || 0).toLocaleString()}
          </td>
          <td style={{ color: 'var(--foreground)', padding: '0 12px', verticalAlign: 'middle', fontSize: '13px' }}>
            {formatDate(lead.paymentDate)}
          </td>
        </>
      )}

      <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
        {getCallStatusBadge(lead.callStatus)}
      </td>
      
      <td style={{ color: 'var(--foreground)', padding: '0 12px', verticalAlign: 'middle', fontSize: '13px', whiteSpace: 'nowrap' }}>
        {lead.callRecords?.[0]?.createdAt ? (() => {
          const d = new Date(lead.callRecords[0].createdAt);
          return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        })() : '-'}
      </td>
      
      <td style={{ color: 'var(--foreground)', padding: '0 12px', verticalAlign: 'middle', fontSize: '13px' }}>{formatDate(lead.nextFollowUpDate)}</td>

      <td style={{ color: 'var(--success)', fontWeight: 600, padding: '0 12px', verticalAlign: 'middle', fontSize: '14px' }}>
        ₹{total.toLocaleString()}
      </td>
      
      {updaterDepartment === 'RECOVERY' && (
        <td style={{ padding: '0 12px', verticalAlign: 'middle', textAlign: 'center' }}>
          {(() => {
            let logStatus = lead.frozenLeadLogStatus || 'Fresh Log';
            if (!lead.frozenLeadLogStatus && lead.recoveryAssignedAt) {
              const diffTime = Math.abs(new Date().getTime() - new Date(lead.recoveryAssignedAt).getTime());
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays <= 21) {
                logStatus = 'Fresh Log';
              } else if (diffDays <= 81) {
                logStatus = 'New Log';
              } else {
                logStatus = 'Old Log';
              }
            }
            
            const colors: Record<string, { bg: string; color: string }> = {
              'Fresh Log': { bg: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' },
              'New Log': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
              'Old Log': { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }
            };
            const colorScheme = colors[logStatus] || { bg: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)' };
            
            return (
              <span style={{ 
                padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, display: 'inline-block', whiteSpace: 'nowrap',
                background: colorScheme.bg, color: colorScheme.color, border: `1px solid ${colorScheme.color}33`
              }}>
                {logStatus.toUpperCase()}
              </span>
            );
          })()}
        </td>
      )}

      {/* WHATSAPP TEMPLATE COLUMN (SALES ONLY) */}
      {sheetName === 'SALES' && (
        <td style={{ padding: '4px 12px', verticalAlign: 'middle', width: '280px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                value={selectedTemplateName}
                onChange={(e) => handleTemplateChange(e.target.value)}
                style={{
                  background: 'var(--card-bg)',
                  color: selectedTemplateName ? '#4ade80' : 'var(--text-muted)',
                  border: `1px solid ${selectedTemplateName ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.12)'}`,
                  padding: '5px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer',
                  flex: 1,
                  maxWidth: selectedTemplateName ? '170px' : '100%'
                }}
              >
                <option value="">Select Template</option>
                {whatsappTemplates.map((t) => (
                  <option key={t.id} value={t.name} style={{ background: 'var(--table-header-bg)', color: 'var(--foreground)' }}>
                    {t.name}
                  </option>
                ))}
              </select>

              {selectedTemplateName && (
                <button
                  type="button"
                  onClick={() => onSendWhatsApp(lead, selectedTemplateName)}
                  title="Send via WhatsApp"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#22c55e',
                    color: 'var(--foreground)',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                    transition: 'background 0.15s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#16a34a'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#22c55e'}
                >
                  <Send size={11} /> Send
                </button>
              )}
            </div>

            {selectedTemplateName && activeMessagePreview && (
              <div 
                onClick={() => onPreviewMessage(activeMessagePreview, lead.name, lead.mobileNumber, selectedTemplateName, lead)}
                title="Click to view full message"
                style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  cursor: 'pointer',
                  maxWidth: '260px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span style={{ color: 'var(--success)', fontSize: '10px' }}>💬</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeMessagePreview}</span>
              </div>
            )}

            {lead.whatsappSentAt && (
              <div style={{ fontSize: '10px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Check size={10} /> Sent: {new Date(lead.whatsappSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </td>
      )}
      
      <td style={{ color: 'var(--foreground)', whiteSpace: 'nowrap', padding: '0 12px', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px' }}>{lead.webinarId || '-'}</td>
      <td style={{ color: 'var(--text-muted)', padding: '0 12px', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>{lead.state || '-'}</td>
      <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', padding: '0 12px', verticalAlign: 'middle', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
        <span style={{ display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', background: 'var(--table-hover)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--card-border)' }} title={leadOwners}>
          {leadOwners}
        </span>
      </td>
      <td style={{ position: 'sticky', right: 0, background: 'var(--background)', padding: '0 12px', verticalAlign: 'middle', zIndex: 1, boxShadow: '-4px 0 10px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
          {isClosed ? (
            (isAdmin || userRole === 'TL' || userRole === 'ADMIN') && (
              <button 
                onClick={onRestore}
                style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                title="Move to Active"
              >
                <RefreshCcw size={16} />
              </button>
            )
          ) : (
            <button 
              onClick={onEdit}
              style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--primary)', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
              title="View / Edit Lead"
            >
              <Eye size={16} />
            </button>
          )}

          {sheetName === 'SALES' && (
            <button 
              onClick={() => onTransfer && onTransfer()}
              style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', color: '#a78bfa', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'}
              title="Transfer Lead to Another Webinar"
            >
              <ArrowRightLeft size={16} />
            </button>
          )}


          <button 
            onClick={() => {
              if (onCreateIssue) onCreateIssue(lead);
            }}
            style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            title="Create Issue"
          >
            <AlertTriangle size={16} />
          </button>

          <button 
            onClick={onViewHistory}
            style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            title="View History"
          >
            <History size={16} />
          </button>
          
          {isAdmin && (
            <button 
              onClick={onDelete}
              style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
              title="Delete Lead"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
