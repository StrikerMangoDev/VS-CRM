'use client'
import BodyPortal from '@/components/BodyPortal'
import {getLeadBulkOptions} from '@/app/actions/lead-query'
import { useLeadPage,usePageNumber,allMatchingLeads,dateBounds } from '@/hooks/use-lead-page'
import type { LeadPage,LeadQuery,LeadBulkOption } from '@/lib/lead-query'

import React,{ useState,useEffect } from 'react'
import { updateLeadAction,assignLeadAction,bulkAssignLeadsAction,deleteLeadAction,unassignLeadAction,bulkDeleteLeadsAction } from '@/app/actions/lead'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { initiateCallAction,checkCallStatusAction,saveCallLogAction } from '@/app/actions/call'
import AddColumnModal from '@/components/AddColumnModal'
import LeadHistoryModal from '@/components/LeadHistoryModal'
import EditLeadModal from '@/components/EditLeadModal'
import { Trash2,Pencil,UserPlus,UserMinus,RotateCcw,Download,Eye,PhoneCall,ArrowRightLeft,AlertTriangle,X } from 'lucide-react'
import { getLeadsCountByStatusAction,transferLeadsBulkAction } from '@/app/actions/team'
import { useConfirm } from '@/providers/ConfirmProvider'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

type Executive = {
  id: string;
  name: string;
  department: string;
}

const BulkAssignIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h6" />
    <path d="M3 12h7" />
    <path d="M3 18h6" />
    <path d="M12 12h4m0 0l-1.5 -1.5m1.5 1.5l-1.5 1.5" />
    <circle cx="20" cy="8" r="2.5" />
    <path d="M16.5 19c0-2 1.5-3 3.5-3s3.5 1 3.5 3" />
  </svg>
)

type Assignment = {
  id: string;
  stage: string;
  user: Executive;
}

type LeadData = {
  id: string;
  uniqueId: string;
  name: string;
  webinarName: string | null;
  webinarId?: string | null;
  callStatus?: string | null;
  email: string | null;
  state: string | null;
  mobileNumber: string;
  webinarAttendanceCount?: number;
  paymentStatus: string;
  totalPayment: number;
  partPaymentAmount: number;
  fullPaymentAmount: number;
  discount: number | null;
  salesAmount: number | null;
  recoveryAmount: number | null;
  whatsappJoined: boolean;
  leadStatus: string;
  createdAt: string | Date;
  assignments?: Assignment[];
  customData?: string;
  frozenLeadLogStatus?: string | null;
  recoveryAssignedAt?: string | Date | null;
  updateStatusDate?: string | Date | null;
  nextFollowUpDate?: string | Date | null;
  remark1?: string | null;
  remark2?: string | null;
  callRecords?: { createdAt: string | Date }[];
}

function MasterLeadTable({ 
  initialPage, 
  executives, 
  isAdmin,
  isTL,
  customColumns = [], 
  sheetName = 'MASTER',
  dropdowns = {}
}: { 
  initialPage: LeadPage, 
  executives: import('@/lib/view-types').Person[], 
  isAdmin: boolean,
  isTL?: boolean,
  customColumns?: import('@prisma/client').CustomColumn[], 
  sheetName?: string,
  dropdowns?: Record<string, string[]>
}) {
  const [editingLead, setEditingLead] = useState<LeadData | null>(null)
  const [viewingHistoryLead, setViewingHistoryLead] = useState<LeadData | null>(null)
  const [activeCallLead, setActiveCallLead] = useState<LeadData | null>(null)
  const router = useRouter()

  // Issue Modal State
  const [issueLead, setIssueLead] = useState<LeadData | null>(null)
  const [issueTypes, setIssueTypes] = useState<import('@prisma/client').IssueDropdownValue[]>([])
  const [issueTypeId, setIssueTypeId] = useState('')
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false)

  const [isCalling, setIsCalling] = useState(false)
  const [callStatusMessage, setCallStatusMessage] = useState('')
  const [callDuration, setCallDuration] = useState<number>(0)
  const [isCallConnected, setIsCallConnected] = useState(false)
  const [hasCallBeenLive, setHasCallBeenLive] = useState(false)
  const [callRefId, setCallRefId] = useState<string | null>(null)

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
    
    // Poll API every 5 seconds
    if (callDuration % 5 === 0) {
      checkCallStatusAction(callRefId || undefined).then(status => {
        if (status.active === true) {
          setHasCallBeenLive(true);
        } else if (status.active === false) {
          // If it's not active, maybe it disconnected.
          // To avoid false negatives early in the call, we wait until it has been live or 15 seconds have passed.
          if (hasCallBeenLive || callDuration > 15) {
            setIsCallConnected(false);
            setCallStatusMessage('Call Disconnected');
            if (activeCallLead && callRefId) {
              saveCallLogAction({
                leadId: activeCallLead.id,
                refId: callRefId,
                duration: callDuration
              }).then(() => {
                router.refresh();
              }).catch(() => {});
            }
            setTimeout(() => {
              setActiveCallLead(null);
              setIsCalling(false);
              setCallDuration(0);
              setCallRefId(null);
            }, 2000);
          }
        }
      }).catch(() => {});
    }
  }, [callDuration, isCallConnected, activeCallLead, callRefId, hasCallBeenLive, router]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const [assigningLead, setAssigningLead] = useState<LeadData | null>(null)
  const [isBulkAssigning, setIsBulkAssigning] = useState(false)
  const [assignProgress, setAssignProgress] = useState<{current: number, total: number} | null>(null)
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [selectedTeam, setSelectedTeam] = useState<string>('')

  const [searchQuery, setSearchQuery] = useState('')
  const [filterWebinar, setFilterWebinar] = useState('')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('')
  const [filterCallStatus, setFilterCallStatus] = useState('')
  const [filterLogStatus, setFilterLogStatus] = useState('')
  const [filterState, setFilterState] = useState('')
  const [filterWhatsapp, setFilterWhatsapp] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterExecutive, setFilterExecutive] = useState('')
  const [filterDateRange, setFilterDateRange] = useState('')
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null)
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc')
  const [sortColumn, setSortColumn] = useState<string>('createdAt')
  const [pageSize, setPageSize] = useState(15)
  
  const [modalFilterWebinar, setModalFilterWebinar] = useState('')
  const [modalFilterPayment, setModalFilterPayment] = useState('')
  const [modalFilterLeadIdFrom, setModalFilterLeadIdFrom] = useState('')
  const [modalFilterLeadIdTo, setModalFilterLeadIdTo] = useState('')
  const [modalFilterAssignment, setModalFilterAssignment] = useState('UNASSIGNED')

  // Bulk Transfer by Status States
  const [isBulkTransferModalOpen, setIsBulkTransferModalOpen] = useState(false)
  const [transferFromUser, setTransferFromUser] = useState('')
  const [transferCallStatus, setTransferCallStatus] = useState('')
  const [transferWebinar, setTransferWebinar] = useState('')
  const [transferCount, setTransferCount] = useState<number | ''>('')
  const [transferToUser, setTransferToUser] = useState('')
  const transferKey=JSON.stringify([transferFromUser,transferCallStatus,transferWebinar])
  const [countResult,setCountResult]=useState<{key:string;count:number}|null>(null)
  const isFetchingCount=Boolean(transferFromUser&&transferCallStatus&&countResult?.key!==transferKey)
  const availableLeadsCount=transferFromUser&&transferCallStatus&&countResult?.key===transferKey?countResult.count:null
  const [isTransferring, setIsTransferring] = useState(false)

  useEffect(()=>{if(!transferFromUser||!transferCallStatus)return;let active=true;
    getLeadsCountByStatusAction(transferFromUser,transferCallStatus,transferWebinar).then(res=>{if(active)setCountResult({key:transferKey,count:res.count??0})}).catch(()=>{if(active){setCountResult({key:transferKey,count:0});toast.error('Unable to count leads')}})
    return()=>{active=false}
  },[transferFromUser,transferCallStatus,transferWebinar,transferKey])

  const [filterNow] = useState(() => new Date())
  const queryFilters: LeadQuery = { sheet: sheetName === 'EXTRA_DIALER' ? 'EXTRA_DIALER' : 'MASTER', search: searchQuery, webinar: filterWebinar, payment: filterPaymentStatus, call: filterCallStatus, log: filterLogStatus, state: filterState, whatsapp: filterWhatsapp, team: filterTeam, executive: filterExecutive, ...dateBounds(filterDateRange,filterStartDate,filterEndDate,filterNow), sort: sortColumn, direction: sortDirection }
  const [requestedPage, setRequestedPage] = usePageNumber(JSON.stringify({...queryFilters,size:pageSize}))
  const query = {...queryFilters,page:requestedPage,size:pageSize}
  const pageData = useLeadPage(initialPage,query)
  const leads = pageData.rows
  const currentPage = Math.min(requestedPage,Math.max(1,Math.ceil(pageData.total/pageSize)))
  const setCurrentPage = (next: number | ((page:number)=>number)) => setRequestedPage(typeof next==='function'?next(currentPage):next)
  const [bulkLeads,setBulkLeads] = useState<LeadBulkOption[]>([])
  useEffect(()=>{if(!isBulkAssigning)return;let active=true;getLeadBulkOptions(queryFilters.sheet as 'MASTER'|'EXTRA_DIALER').then(rows=>{if(active)setBulkLeads(rows)}).catch(()=>toast.error('Unable to load assignment options'));return()=>{active=false}},[isBulkAssigning,queryFilters.sheet])

  const teams = Array.from(new Set(executives.map(e => e.department)))
  const extraCallStatuses = Array.from(new Set([
    ...(dropdowns?.['Call Status'] || []),
    ...pageData.options.calls
  ])).filter(s => !['UNTOUCHED', 'CALL_CONNECTED', 'CALL_NOT_CONNECTED'].includes(s));
  const filteredExecutives = selectedTeam ? executives.filter(e => e.department === selectedTeam) : executives

  const uniqueWebinars = pageData.options.webinars;
  const uniqueStates = pageData.options.states;

  const confirm = useConfirm();

  

  const handleDeleteLead = async (leadId: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Lead?',
      message: 'Are you sure you want to delete this lead? This action cannot be undone.',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await deleteLeadAction(leadId);
      toast.success('Lead deleted successfully');
    } catch {
      toast.error('Failed to delete lead');
    }
  }


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

  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0) {
      toast.error('Please select at least one lead to delete');
      return;
    }
    const isConfirmed = await confirm({
      title: 'Delete Selected Leads?',
      message: `Are you sure you want to delete ${selectedLeadIds.size} selected leads? This action cannot be undone.`,
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await bulkDeleteLeadsAction(Array.from(selectedLeadIds));
      toast.success(`${selectedLeadIds.size} leads deleted successfully`);
      setSelectedLeadIds(new Set());
    } catch {
      toast.error('Failed to delete selected leads');
    }
  }

  let selectedWebinarPrefix = '';

  let availableFullLeadIds: string[] = [];
  
  if (modalFilterWebinar) {
    const webinarLeads = bulkLeads.filter((l) => (l.webinarId || l.webinarName) === modalFilterWebinar && l.uniqueId);
    
    if (webinarLeads.length > 0) {
      const firstId = webinarLeads[0].uniqueId;
      if (firstId && firstId.toUpperCase().startsWith('WEB-')) {
        const parts = firstId.split('-');
        if (parts.length >= 2) {
          selectedWebinarPrefix = `${parts[0]}-${parts[1]}-`;
        }
      }
      
      if (!selectedWebinarPrefix) {
        availableFullLeadIds = webinarLeads.map((l) => l.uniqueId!).sort();
      }
    }
  } else {
    availableFullLeadIds = bulkLeads.map((l) => l.uniqueId).filter(Boolean) as string[];
    availableFullLeadIds.sort();
  }

  const fullLeadIdFrom = selectedWebinarPrefix && modalFilterLeadIdFrom ? (modalFilterLeadIdFrom.toUpperCase().startsWith('WEB-') ? modalFilterLeadIdFrom : selectedWebinarPrefix + modalFilterLeadIdFrom) : modalFilterLeadIdFrom;
  const fullLeadIdTo = selectedWebinarPrefix && modalFilterLeadIdTo ? (modalFilterLeadIdTo.toUpperCase().startsWith('WEB-') ? modalFilterLeadIdTo : selectedWebinarPrefix + modalFilterLeadIdTo) : modalFilterLeadIdTo;

  let rangeError = '';
  if (modalFilterLeadIdFrom && !/^\d+$/.test(modalFilterLeadIdFrom)) {
    rangeError = 'Please enter a valid numeric Lead ID.';
  } else if (modalFilterLeadIdTo && !/^\d+$/.test(modalFilterLeadIdTo)) {
    rangeError = 'Please enter a valid numeric Lead ID.';
  } else if (modalFilterLeadIdFrom && modalFilterLeadIdTo) {
    if (parseInt(modalFilterLeadIdFrom, 10) > parseInt(modalFilterLeadIdTo, 10)) {
      rangeError = 'Lead From cannot be greater than Lead To.';
    }
  }

  const isModalFilterActive = modalFilterWebinar || modalFilterPayment || fullLeadIdFrom || fullLeadIdTo || (modalFilterAssignment && modalFilterAssignment !== 'ALL');
  
  const modalFilteredLeads = bulkLeads.filter((lead) => {
    if (!isModalFilterActive || rangeError) return false;
    
    if (modalFilterWebinar && (lead.webinarId || lead.webinarName) !== modalFilterWebinar) return false;

    if (fullLeadIdFrom || fullLeadIdTo) {
      const leadIdStr = String(lead.uniqueId || '').toUpperCase();
      if (fullLeadIdFrom && leadIdStr < fullLeadIdFrom.toUpperCase()) return false;
      if (fullLeadIdTo && leadIdStr > fullLeadIdTo.toUpperCase()) return false;
    }
    
    if (modalFilterPayment && lead.paymentStatus !== modalFilterPayment) return false;
    
    const visibleAssignments = lead.assignments ? lead.assignments.filter((a) => a.user.department !== 'TECHNICAL') : [];

    if (modalFilterAssignment === 'UNASSIGNED') {
      if (visibleAssignments.length > 0) return false;
    } else if (modalFilterAssignment === 'ASSIGNED') {
      if (visibleAssignments.length === 0) return false;
    }

    return true;
  });

  
  const totalPages = Math.ceil(pageData.total / pageSize)
  const paginatedLeads = leads

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSet = new Set(selectedLeadIds)
      paginatedLeads.forEach((l) => newSet.add(l.id))
      setSelectedLeadIds(newSet)
    } else {
      const newSet = new Set(selectedLeadIds)
      paginatedLeads.forEach((l) => newSet.delete(l.id))
      setSelectedLeadIds(newSet)
    }
  }

  const handleSelectLead = (id: string) => {
    const newSet = new Set(selectedLeadIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedLeadIds(newSet)
  }

  const exportToCSV = async () => {
    const exportLeads = await allMatchingLeads(queryFilters)
    const headers = ['Lead ID', 'Name', 'Email', 'Mobile', 'Webinar ID', 'State', 'Call Status', 'Remark 1', 'Remark 2', 'Next Follow Up', 'Part Payment', 'Full Payment', 'Discount', 'Sales Amount', 'Recovery Amount', 'Total Paid', 'WhatsApp', 'LEAD OWNER', 'Lead Status'];
    const rows = exportLeads.filter(lead => !lead.leadStatus?.startsWith('CLOSED')).map(lead => [
      lead.uniqueId,
      lead.name,
      lead.email || '-',
      lead.mobileNumber,
      lead.webinarId || lead.webinarName || '-',
      lead.state || '-',
      lead.callStatus || 'UNTOUCHED',
      lead.remark1 || '-',
      lead.remark2 || '-',
      lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-GB') : '-',
      lead.partPaymentAmount.toString(),
      lead.fullPaymentAmount.toString(),
      (lead.discount || 0).toString(),
      (lead.salesAmount || 0).toString(),
      (lead.recoveryAmount || 0).toString(),
      lead.totalPayment.toString(),
      lead.whatsappJoined ? 'JOINED' : 'PENDING',
      lead.assignments && lead.assignments.filter((a) => a.user.department !== 'TECHNICAL').length > 0
        ? lead.assignments.filter((a) => a.user.department !== 'TECHNICAL').map((a) => `${a.user.name} (${a.user.department})`).join('; ')
        : 'Unassigned',
      lead.leadStatus === 'CLOSED_FULL_PAYMENT' ? 'Full Payment Done (Close)' : lead.leadStatus?.startsWith('CLOSED') ? 'Closed Lead' : 'In Progress'
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCallStatusBadge = (status: string | null) => {
    if (!status) return <span style={{ background: 'var(--bg-lighter)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>UNTARGETED</span>;
    switch (status) {
      case 'CALL_CONNECTED':
        return <span style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, border: '1px solid rgba(34,197,94,0.2)' }}>CALL CONNECTED</span>;
      case 'CALL_NOT_CONNECTED':
        return <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, border: '1px solid rgba(239,68,68,0.2)' }}>CALL NOT CONNECTED</span>;
      default:
        return <span style={{ background: 'var(--bg-lighter)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>{status.replace(/_/g, ' ')}</span>;
    }
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px', background: 'var(--card-bg)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', position: 'relative', zIndex: 50, flexShrink: 0 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--foreground)', fontWeight: 600, fontSize: '0.85rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filter Leads
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '6px', overflow: 'hidden', minWidth: '200px', padding: '0 8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke='var(--text-muted)' strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                placeholder="Search leads by ID, Name, Mobile, Email..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', color: 'var(--foreground)', padding: '6px', outline: 'none', fontSize: '0.75rem', width: '100%', fontFamily: 'inherit' }} 
              />
            </div>
            
            <button 
              onClick={() => {
                setSearchQuery('')
                setFilterWebinar('')
                setFilterPaymentStatus('')
                setFilterCallStatus('')
                setFilterLogStatus('')
                setFilterState('')
                setFilterWhatsapp('')
                setFilterTeam('')
                setFilterExecutive('')
                setFilterDateRange('')
                setFilterStartDate(null)
                setFilterEndDate(null)
              }}
              className="btn"
              title="Reset Filters"
              style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--foreground)', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', padding: 0 }}
            >
              <RotateCcw size={18} />
            </button>

            {(isAdmin || sheetName === 'MASTER') && (
              <>
                <button
                  onClick={() => setIsBulkAssigning(true)}
                  className="btn"
                  title="Bulk Assign Leads"
                  style={{ 
                    width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', padding: 0,
                    background: selectedLeadIds.size > 0 ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(255,255,255,0.1)',
                    border: selectedLeadIds.size > 0 ? 'none' : '1px solid var(--card-border)',
                    color: 'var(--foreground)'
                  }}
                >
                  <BulkAssignIcon size={18} />
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="btn"
                  title="Delete Selected Leads"
                  style={{ 
                    height: '38px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', padding: '0 12px',
                    background: selectedLeadIds.size > 0 ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'rgba(255,255,255,0.1)',
                    border: selectedLeadIds.size > 0 ? 'none' : '1px solid var(--card-border)',
                    color: selectedLeadIds.size > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                    transition: 'all 0.2s',
                    opacity: selectedLeadIds.size > 0 ? 1 : 0.6,
                    cursor: selectedLeadIds.size > 0 ? 'pointer' : 'not-allowed'
                  }}
                  disabled={selectedLeadIds.size === 0}
                >
                  <Trash2 size={16} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Delete Selected</span>
                </button>
                <button
                  onClick={() => setIsBulkTransferModalOpen(true)}
                  className="btn"
                  title="Transfer Leads by Status"
                  style={{ 
                    width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', padding: 0,
                    background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--foreground)'
                  }}
                >
                  <ArrowRightLeft size={18} />
                </button>
              </>
            )}

            <button 
              onClick={()=>{void exportToCSV().catch(()=>alert('Failed to export leads'))}}
              className="btn btn-primary"
              title="Export CSV"
              style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', padding: 0, background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' }}
            >
              <Download size={18} />
            </button>
            {isAdmin && <AddColumnModal sheetName={sheetName} />}
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--card-border)', opacity: 0.3 }} />

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filterWebinar} onChange={e => setFilterWebinar(e.target.value)} style={filterInputStyle}>
            <option value="">All Webinars</option>
            {pageData.options.webinars.map(w => (
              <option key={w as string} value={w as string}>{w}</option>
            ))}
          </select>

          <select value={filterPaymentStatus} onChange={e => setFilterPaymentStatus(e.target.value)} style={filterInputStyle}>
            <option value="">All Payment Statuses</option>
            <option value="FULL_PAYMENT">Full Payment</option>
            <option value="PART_PAYMENT">Part Payment</option>
            <option value="NO_PAYMENT">Zero Pay</option>
          </select>

          <select value={filterCallStatus} onChange={e => setFilterCallStatus(e.target.value)} style={filterInputStyle}>
            <option value="">All Call Status</option>
            <option value="UNTOUCHED">Untouched</option>
            <option value="CALL_CONNECTED">Call Connected</option>
            <option value="CALL_NOT_CONNECTED">Call Not Connected</option>
            {extraCallStatuses.map(status => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </select>
          
          {sheetName === 'RECOVERY' && (
            <select value={filterLogStatus} onChange={e => setFilterLogStatus(e.target.value)} style={filterInputStyle}>
              <option value="">All Log Statuses</option>
              <option value="Fresh Log">Fresh Log</option>
              <option value="New Log">New Log</option>
              <option value="Old Log">Old Log</option>
            </select>
          )}

          <select value={filterState} onChange={e => setFilterState(e.target.value)} style={filterInputStyle}>
            <option value="">All States</option>
            {pageData.options.states.map(s => (
              <option key={s as string} value={s as string}>{s}</option>
            ))}
          </select>

          <select value={filterWhatsapp} onChange={e => setFilterWhatsapp(e.target.value)} style={filterInputStyle}>
            <option value="">All WhatsApp</option>
            <option value="JOINED">Joined</option>
            <option value="PENDING">Pending</option>
          </select>

          <select value={filterTeam} onChange={e => { setFilterTeam(e.target.value); setFilterExecutive(''); }} style={filterInputStyle}>
            <option value="">All Teams</option>
            {teams.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>

          <select value={filterExecutive} onChange={e => setFilterExecutive(e.target.value)} style={filterInputStyle}>
            <option value="">All Lead Owners</option>
            <option value="UNASSIGNED">Unassigned</option>
            {(filterTeam ? executives.filter((e) => e.department === filterTeam) : executives).map((exec) => (
              <option key={exec.id} value={exec.id}>{exec.name}</option>
            ))}
          </select>
          
          <div style={{ position: 'relative' }}>
            <select 
              value={filterDateRange} 
              onChange={e => {
                const val = e.target.value;
                setFilterDateRange(val);
                if (val === 'custom') {
                  setIsCalendarOpen(true);
                } else {
                  setIsCalendarOpen(false);
                }
              }} 
              style={filterInputStyle}
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option 
                value="custom" 
                onClick={() => {
                  if (filterDateRange === 'custom') setIsCalendarOpen(true);
                }}
              >
                {filterDateRange === 'custom' && filterStartDate && filterEndDate
                  ? `${filterStartDate.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})} – ${filterEndDate.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})}`
                  : "Custom Range..."}
              </option>
            </select>

            {filterDateRange === 'custom' && isCalendarOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: '4px' }}>
                <DatePicker
                  selectsRange={true}
                  startDate={filterStartDate || undefined}
                  endDate={filterEndDate || undefined}
                  onChange={(update) => {
                    setFilterStartDate(update[0]);
                    setFilterEndDate(update[1]);
                    if (update[0] && update[1]) {
                      setIsCalendarOpen(false);
                    }
                  }}
                  onClickOutside={() => {
                    setIsCalendarOpen(false);
                    if (!filterStartDate || !filterEndDate) {
                      setFilterDateRange('');
                      setFilterStartDate(null);
                      setFilterEndDate(null);
                    }
                  }}
                  open={true}
                  customInput={<div style={{ width: 0, height: 0, padding: 0, border: 'none', margin: 0, overflow: 'hidden' }} />}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="table-container" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0, position: 'relative' }}>
        <table style={{ width: '100%', minWidth: `${1800 + (customColumns.length * 100)}px`, tableLayout: 'fixed', borderCollapse: 'collapse', borderSpacing: 0 }}>
          <thead>
            <tr style={{ height: '40px' }}>
              <th style={{ width: '40px', padding: '10px 12px', textAlign: 'left', background: 'var(--table-header-bg)', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll} 
                  checked={paginatedLeads.length > 0 && paginatedLeads.every((l) => selectedLeadIds.has(l.id))} 
                  style={{ cursor: 'pointer' }}
                />
              </th>
              {(() => {
                const renderSortableHeader = (columnId: string, label: string, width: string, extraStyles = {}) => (
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none', width, padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textAlign: 'left', whiteSpace: 'nowrap', background: 'var(--table-header-bg)', ...extraStyles }}
                    onClick={() => {
                      if (sortColumn === columnId) {
                        setSortDirection(prev => prev === 'asc' ? 'desc' : (prev === 'desc' ? null : 'asc'))
                      } else {
                        setSortColumn(columnId)
                        setSortDirection('asc')
                      }
                    }}
                    title={`Click to sort by ${label}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {label}
                      {sortColumn === columnId && sortDirection === 'asc' && <span style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>↑</span>}
                      {sortColumn === columnId && sortDirection === 'desc' && <span style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>↓</span>}
                      {(sortColumn !== columnId || !sortDirection) && <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>↕</span>}
                    </div>
                  </th>
                )

                return (
                  <>
                    {renderSortableHeader('uniqueId', 'LEAD ID', '140px')}
                    {renderSortableHeader('name', 'NAME', '130px')}
                    {renderSortableHeader('email', 'EMAIL', '160px')}
                    {renderSortableHeader('mobileNumber', 'MOBILE', '130px')}
                    {renderSortableHeader('updateStatusDate', 'LAST CALL', '145px')}
                    {renderSortableHeader('callStatus', 'CALL STATUS', '140px')}
                    {renderSortableHeader('webinarId', 'WEBINAR ID', '110px')}
                    {renderSortableHeader('totalPayment', 'TOTAL PAID', '100px')}
                    {renderSortableHeader('nextFollowUpDate', 'NEXT FOLLOW UP', '145px')}
                    {renderSortableHeader('paymentStatus', 'PAYMENT STATUS', '130px')}
                    {renderSortableHeader('whatsappJoined', 'WHATSAPP', '100px')}
                    {renderSortableHeader('leadOwner', 'LEAD OWNER', '140px')}
                    {renderSortableHeader('state', 'STATE', '100px')}
                    {renderSortableHeader('webinarAttendanceCount', 'ATTENDANCE', '100px')}
                    {sheetName === 'RECOVERY' && renderSortableHeader('frozenLeadLogStatus', 'LOG STATUS', '100px')}
                  </>
                )
              })()}
              <th style={{ width: '80px', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textAlign: 'center', whiteSpace: 'nowrap', background: 'var(--table-header-bg)', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLeads.map((lead) => (
              <tr 
                key={lead.id} 
                style={{ 
                  borderBottom: '1px solid var(--card-border)', 
                  height: '48px',
                  background: selectedLeadIds.has(lead.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  textDecoration: lead.leadStatus?.startsWith('CLOSED') ? 'line-through' : 'none',
                  opacity: lead.leadStatus?.startsWith('CLOSED') ? 0.6 : 1
                }} 
                onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'} 
                onMouseOut={e => e.currentTarget.style.background=selectedLeadIds.has(lead.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
              >
                <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedLeadIds.has(lead.id)} 
                    onChange={() => handleSelectLead(lead.id)} 
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td style={{ padding: '0 12px', color: 'var(--primary)', fontWeight: 500, fontSize: '0.8rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }} >{lead.uniqueId}</td>
                <td style={{ padding: '0 12px', color: 'var(--text-primary)', fontSize: '0.85rem', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} >{lead.name}</td>
                <td style={{ padding: '0 12px', color: 'var(--text-muted)', fontSize: '0.85rem', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} >{lead.email || '-'}</td>
                <td style={{ padding: '0 12px', color: 'var(--text-muted)', fontSize: '0.85rem', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{lead.mobileNumber}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
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
                    >
                      <PhoneCall size={12} />
                    </button>
                  </div>
                </td>
                <td style={{ padding: '0 12px', color: 'var(--text-muted)', fontSize: '0.8rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                  {lead.callRecords?.[0]?.createdAt ? (() => {
                    const d = new Date(lead.callRecords[0].createdAt);
                    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
                  })() : '-'}
                </td>
                <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                  {getCallStatusBadge(lead.callStatus || null)}
                </td>
                <td style={{ padding: '0 12px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} >
                  <span style={{ background: '#3b0764', color: '#d8b4fe', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
                    {lead.webinarId || lead.webinarName || '-'}
                  </span>
                </td>
                <td style={{ padding: '0 12px', color: 'var(--text-primary)', fontSize: '0.85rem', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>₹{lead.totalPayment}</td>
                <td style={{ padding: '0 12px', color: 'var(--text-muted)', fontSize: '0.8rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                  {lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}
                </td>
                <td style={{ padding: '0 12px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ 
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                    background: lead.fullPaymentAmount > 0 ? 'rgba(34, 197, 94, 0.1)' : lead.partPaymentAmount > 0 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: lead.fullPaymentAmount > 0 ? '#22c55e' : lead.partPaymentAmount > 0 ? '#eab308' : '#ef4444'
                  }}>
                    {lead.fullPaymentAmount > 0 ? 'Full Payment' : 
                     lead.partPaymentAmount > 0 ? 'Part Payment' : 'ZERO PAY'}
                  </span>
                </td>
                <td style={{ padding: '0 12px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ 
                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                    background: lead.whatsappJoined ? 'rgba(34, 197, 94, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                    color: lead.whatsappJoined ? '#22c55e' : 'var(--text-muted)'
                  }}>
                    {lead.whatsappJoined ? 'JOINED' : 'PENDING'}
                  </span>
                </td>
                <td style={{ padding: '0 12px', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {(() => {
                    const visibleAssignments = lead.assignments ? lead.assignments.filter(a => a.user.department !== 'TECHNICAL') : [];
                    return visibleAssignments.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {visibleAssignments.map(a => (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }} title={`${a.user.name} - ${a.user.department}`}>
                            <div style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', background: '#2563eb', color: 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                              {a.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <div style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.user.name}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.user.department}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }} title="Unassigned">
                        <div style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%', background: '#7c3aed', color: 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                          U
                        </div>
                        <div style={{ lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <div style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Unassigned</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>UNASSIGNED</div>
                        </div>
                      </div>
                    );
                  })()}
                </td>
                <td style={{ padding: '0 12px', color: 'var(--text-muted)', fontSize: '0.85rem', verticalAlign: 'middle', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} >{lead.state || '-'}</td>
                <td style={{ padding: '0 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                  {lead.webinarAttendanceCount === 3 && (
                    <span style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block', minWidth: '65px', textAlign: 'center' }}>
                      3 Days
                    </span>
                  )}
                  {lead.webinarAttendanceCount === 2 && (
                    <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block', minWidth: '65px', textAlign: 'center' }}>
                      2 Days
                    </span>
                  )}
                  {lead.webinarAttendanceCount === 1 && (
                    <span style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block', minWidth: '65px', textAlign: 'center' }}>
                      1 Day
                    </span>
                  )}
                  {(!lead.webinarAttendanceCount || lead.webinarAttendanceCount === 0) && (
                    <span style={{ background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block', minWidth: '65px', textAlign: 'center' }}>
                      0 Days
                    </span>
                  )}
                </td>
                {sheetName === 'RECOVERY' && (
                  <td style={{ padding: '0 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
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
                      
                      const colors = {
                        'Fresh Log': { bg: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' },
                        'New Log': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
                        'Old Log': { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }
                      }[logStatus] || { bg: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)' };
                      
                      return (
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block', minWidth: '70px', textAlign: 'center',
                          background: colors.bg, color: colors.color
                        }}>
                          {logStatus}
                        </span>
                      );
                    })()}
                  </td>
                )}
                <td style={{ padding: '0 12px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'center' }}>
                    
                    <button 
                      onClick={() => {
                        setIssueLead(lead);
                        if (issueTypes.length === 0) {
                          fetch('/api/issues/dropdowns?type=ISSUE_TYPE').then(r => r.json()).then(setIssueTypes).catch(() => {});
                        }
                      }} 
                      style={{ padding: '0', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer' }}
                      title="Create Issue"
                    >
                      <AlertTriangle size={14} />
                    </button>

                    <button 
                      onClick={() => setViewingHistoryLead(lead)} 
                      style={{ padding: '0', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2563eb', color: 'var(--foreground)', border: 'none', cursor: 'pointer' }}
                      title="View History"
                    >
                      <Eye size={14} />
                    </button>
                    <button 
                      onClick={() => setEditingLead(lead)} 
                      style={{ padding: '0', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--card-border)', cursor: 'pointer' }}
                      title="Edit Lead"
                    >
                      <Pencil size={14} />
                    </button>
                    {(!lead.assignments || lead.assignments.filter((a) => a.user.department !== 'TECHNICAL').length === 0) ? (
                      <button 
                        onClick={() => setAssigningLead(lead)} 
                        style={{ padding: '0', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--card-border)', cursor: 'pointer' }}
                        title="Assign Lead"
                      >
                        <UserPlus size={14} />
                      </button>
                    ) : (
                      <button 
                        onClick={async () => {
                          if (isAdmin || isTL) {
                            if (await confirm({ title: 'Unassign Lead', message: 'Are you sure you want to unassign this lead?' })) {
                              try {
                                await unassignLeadAction(lead.id)
                                toast.success('Lead unassigned')
                              } catch {
                                toast.error('Failed to unassign lead')
                              }
                            }
                          }
                        }}
                        style={{ padding: '0', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--card-border)', cursor: (isAdmin || isTL) ? 'pointer' : 'default' }}
                        title={(isAdmin || isTL) ? "Unassign Lead" : "More Actions"}
                      >
                        <UserMinus size={14} />
                      </button>
                    )}
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteLead(lead.id)} 
                        style={{ padding: '0', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer' }}
                        title="Delete Lead"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: 'var(--card-bg)', borderTop: '1px solid var(--card-border)', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Showing {pageData.total === 0 ? 0 : ((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, pageData.total)} of {pageData.total} leads
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Rows per page:
            <select 
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{
                background: 'var(--table-hover)', color: 'var(--foreground)', border: '1px solid var(--card-border)', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem'
              }}
            >
              <option value={15} style={{ background: 'var(--background)' }}>15</option>
              <option value={25} style={{ background: 'var(--background)' }}>25</option>
              <option value={50} style={{ background: 'var(--background)' }}>50</option>
              <option value={100} style={{ background: 'var(--background)' }}>100</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ background: 'transparent', border: '1px solid var(--card-border)', color: currentPage === 1 ? '#475569' : 'var(--text-muted)', padding: '6px 12px', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
          >
            ← Previous
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => page === 1 || page === totalPages || Math.abs(currentPage - page) <= 1 || (currentPage === 1 && page <= 3) || (currentPage === totalPages && page >= totalPages - 2))
            .map((page, index, array) => (
              <React.Fragment key={page}>
                {index > 0 && array[index - 1] !== page - 1 && <span style={{ color: 'var(--text-muted)' }}>...</span>}
                <button
                  onClick={() => setCurrentPage(page)}
                  style={{ 
                    background: currentPage === page ? '#3b82f6' : 'transparent',
                    color: currentPage === page ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: currentPage === page ? '1px solid #3b82f6' : '1px solid var(--card-border)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: currentPage === page ? 600 : 400
                  }}
                >
                  {page}
                </button>
              </React.Fragment>
            ))}
          
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            style={{ background: 'transparent', border: '1px solid var(--card-border)', color: (currentPage === totalPages || totalPages === 0) ? '#475569' : 'var(--text-muted)', padding: '6px 12px', borderRadius: '6px', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Edit Lead Modal */}
      {editingLead && (
        <div style={modalOverlayStyle}>
          <div className="glass-panel" style={modalContentStyle}>
            <h2 style={modalHeaderStyle}>Edit Lead: {editingLead.uniqueId}</h2>
            
            <form action={async (formData) => {
              try {
                await updateLeadAction(formData)
                toast.success('Lead updated successfully')
                setEditingLead(null)
              } catch {
                toast.error('Failed to update lead')
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="hidden" name="id" value={editingLead.id} />
              
              <div>
                <label style={labelStyle}>Name</label>
                <input name="name" type="text" defaultValue={editingLead.name} required style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Webinar ID</label>
                <input name="webinarId" type="text" defaultValue={editingLead.webinarId || editingLead.webinarName || ''} style={inputStyle} />
              </div>
              
              <div>
                <label style={labelStyle}>Email</label>
                <input name="email" type="email" defaultValue={editingLead.email || ''} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>State</label>
                <input name="state" type="text" defaultValue={editingLead.state || ''} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Mobile Number</label>
                <input name="mobileNumber" type="text" defaultValue={editingLead.mobileNumber} required style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Total Paid (₹)</label>
                  <input name="totalPayment" type="number" step="0.01" defaultValue={editingLead.totalPayment} required style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Part Payment (₹)</label>
                  <input name="partPaymentAmount" type="number" step="0.01" defaultValue={editingLead.partPaymentAmount} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Full Payment (₹)</label>
                  <input name="fullPaymentAmount" type="number" step="0.01" defaultValue={editingLead.fullPaymentAmount} required style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Sales Amount (₹)</label>
                  <input name="salesAmount" type="number" step="0.01" defaultValue={editingLead.salesAmount || 0} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Recovery Amount (₹)</label>
                  <input name="recoveryAmount" type="number" step="0.01" defaultValue={editingLead.recoveryAmount || 0} style={inputStyle} />
                </div>
              </div>



              {customColumns.length > 0 && (
                <div style={{ marginTop: '16px', padding: '16px', background: 'var(--table-hover)', borderRadius: '8px' }}>
                  <h3 style={{ color: 'var(--foreground)', fontSize: '1rem', marginTop: 0, marginBottom: '16px' }}>Custom Fields</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {customColumns.map(col => {
                      let val = ''
                      try {
                        const parsed = JSON.parse(editingLead.customData || '{}')
                        val = parsed[col.name] || ''
                      } catch {}
                      return (
                        <div key={col.id}>
                          <label style={labelStyle}>{col.name}</label>
                          <input 
                            name={`custom_${col.name}`} 
                            type={col.type === 'NUMBER' ? 'number' : col.type === 'DATE' ? 'date' : 'text'} 
                            defaultValue={val} 
                            style={inputStyle} 
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <input type="hidden" name="customData" id="customDataInput" value={editingLead.customData || "{}"} />

              <div style={modalActionRowStyle}>
                <button type="button" onClick={() => setEditingLead(null)} className="btn" style={{ background: 'transparent', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" onClick={() => {
                  // Reconstruct customData string before submit
                  const obj: Record<string,string> = {};
                  customColumns.forEach(col => {
                    const el = document.querySelector(`[name="custom_${col.name}"]`) as HTMLInputElement;
                    if (el) obj[col.name] = el.value;
                  });
                  const hiddenInput = document.getElementById('customDataInput') as HTMLInputElement;
                  if (hiddenInput) hiddenInput.value = JSON.stringify(obj);
                }} className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Lead Modal */}
      {(assigningLead || isBulkAssigning) && (
        <div style={modalOverlayStyle}>
          <div className="glass-panel" style={modalContentStyle}>
            <h2 style={modalHeaderStyle}>
              {isBulkAssigning ? `Assign ${selectedLeadIds.size} Leads` : `Assign Lead: ${assigningLead?.uniqueId}`}
            </h2>
            
            <form action={async (formData) => {
              const userId = formData.get('userId') as string
              if (userId) {
                try {
                  const targetExec = executives.find(e => e.id === userId);
                  if (targetExec && (targetExec.department === 'SALES' || targetExec.department === 'RECOVERY')) {
                    if (isBulkAssigning) {
                      const idsToAssign = isModalFilterActive ? modalFilteredLeads.map(l => l.id) : Array.from(selectedLeadIds);
                      const leadsToAssignList = isModalFilterActive ? modalFilteredLeads : bulkLeads.filter(l => selectedLeadIds.has(l.id));
                      const leadsWithConflict = leadsToAssignList.filter(l => {
                        const existing = l.assignments?.find((a) => a.user.department === 'SALES' || a.user.department === 'RECOVERY');
                        return existing && existing.user.id !== userId;
                      });
                      if (leadsWithConflict.length > 0) {
                        const confirmTransfer = window.confirm(`Warning: ${leadsWithConflict.length} leads are currently assigned to a different Sales/Recovery user. Do you want to allow transferring all of them?`);
                        if (!confirmTransfer) return;
                      }
                      if (idsToAssign.length > 0) {
                        setAssignProgress({ current: 0, total: idsToAssign.length });
                        let assignedCount = 0;
                        const chunkSize = 1;
                        for (let i = 0; i < idsToAssign.length; i += chunkSize) {
                          const chunk = idsToAssign.slice(i, i + chunkSize);
                          await bulkAssignLeadsAction(chunk, userId, 'FRESH_LOG');
                          assignedCount += chunk.length;
                          setAssignProgress({ current: assignedCount, total: idsToAssign.length });
                        }
                      }
                    } else if (assigningLead) {
                      const existingAssignment = assigningLead.assignments?.find(a => a.user.department === 'SALES' || a.user.department === 'RECOVERY');
                      if (existingAssignment && existingAssignment.user.id !== userId) {
                        const confirmTransfer = window.confirm(`Warning: This lead is currently assigned to ${existingAssignment.user.name} (${existingAssignment.user.department}). Do you want to allow this transfer?`);
                        if (!confirmTransfer) {
                          return;
                        }
                      }
                      await assignLeadAction(assigningLead.id, userId, 'FRESH_LOG')
                    }
                  } else {
                    if (isBulkAssigning) {
                      const idsToAssign = isModalFilterActive ? modalFilteredLeads.map(l => l.id) : Array.from(selectedLeadIds);
                      if (idsToAssign.length > 0) {
                        setAssignProgress({ current: 0, total: idsToAssign.length });
                        let assignedCount = 0;
                        const chunkSize = 1;
                        for (let i = 0; i < idsToAssign.length; i += chunkSize) {
                          const chunk = idsToAssign.slice(i, i + chunkSize);
                          await bulkAssignLeadsAction(chunk, userId, 'FRESH_LOG');
                          assignedCount += chunk.length;
                          setAssignProgress({ current: assignedCount, total: idsToAssign.length });
                        }
                      }
                    } else if (assigningLead) {
                      await assignLeadAction(assigningLead.id, userId, 'FRESH_LOG')
                    }
                  }
                  toast.success(isBulkAssigning ? 'Leads assigned successfully' : 'Lead assigned successfully')
                } catch {
                  toast.error('Failed to assign lead(s)')
                }
              }
              setAssigningLead(null)
              setIsBulkAssigning(false)
              setAssignProgress(null)
              if (isBulkAssigning) setSelectedLeadIds(new Set())
              setSelectedTeam('')
              setModalFilterWebinar('')
              setModalFilterPayment('')
              setModalFilterLeadIdFrom('')
              setModalFilterLeadIdTo('')
              setModalFilterAssignment('UNASSIGNED')
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {isBulkAssigning && (
                <div style={{ marginBottom: '16px', padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    <div>
                      <label style={labelStyle}>Webinar ID</label>
                      <select value={modalFilterWebinar} onChange={(e) => {
                        setModalFilterWebinar(e.target.value)
                        setModalFilterLeadIdFrom('')
                        setModalFilterLeadIdTo('')
                      }} style={inputStyle}>
                        <option value="">All Webinars</option>
                        {pageData.options.webinars.map(w => (
                          <option key={w as string} value={w as string}>{w}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>Lead ID Range</label>
                      {selectedWebinarPrefix && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
                          Prefix: <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{selectedWebinarPrefix}</span>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>From</span>
                        <input 
                          type="text" 
                          placeholder="Enter start ID"
                          value={modalFilterLeadIdFrom} 
                          onChange={(e) => setModalFilterLeadIdFrom(e.target.value)} 
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>To</span>
                        <input 
                          type="text" 
                          placeholder="Enter end ID"
                          value={modalFilterLeadIdTo} 
                          onChange={(e) => setModalFilterLeadIdTo(e.target.value)} 
                          style={{ ...inputStyle, flex: 1 }}
                        />
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '6px' }}>
                        Enter the numeric Lead ID range only.
                      </div>
                      {rangeError && (
                        <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>
                          {rangeError}
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={labelStyle}>Payment Status</label>
                      <select value={modalFilterPayment} onChange={(e) => setModalFilterPayment(e.target.value)} style={inputStyle}>
                        <option value="">All</option>
                        <option value="FULL_PAYMENT">Full Payment</option>
                        <option value="PART_PAYMENT">Part Payment</option>
                        <option value="NO_PAYMENT">Zero Pay</option>
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>Assignment Status</label>
                      <select value={modalFilterAssignment} onChange={(e) => setModalFilterAssignment(e.target.value)} style={inputStyle}>
                        <option value="ALL">All Leads</option>
                        <option value="UNASSIGNED">Unassigned Only</option>
                        <option value="ASSIGNED">Assigned Only</option>
                      </select>
                    </div>

                  </div>
                </div>
              )}

              <div style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                {isModalFilterActive ? `${modalFilteredLeads.length} leads match these filters` : `Assigning ${selectedLeadIds.size} manually selected leads`}
              </div>
              
              <div>
                <label style={labelStyle}>Team</label>
                <select 
                  value={selectedTeam} 
                  onChange={(e) => setSelectedTeam(e.target.value)} 
                  style={inputStyle}
                >
                  <option value="">-- All Teams --</option>
                  {teams.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Executive</label>
                <select name="userId" required style={inputStyle}>
                  <option value="">-- Select Executive --</option>
                  {filteredExecutives.map(exec => (
                    <option key={exec.id} value={exec.id}>{exec.name} ({exec.department})</option>
                  ))}
                </select>
              </div>



              <div style={modalActionRowStyle}>
                <button type="button" onClick={() => { 
                  setAssigningLead(null); 
                  setIsBulkAssigning(false); 
                  setSelectedTeam(''); 
                  setModalFilterWebinar('');
                  setModalFilterPayment('');
                  setModalFilterLeadIdFrom('');
                  setModalFilterLeadIdTo('');
                }} className="btn" style={{ background: 'transparent', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!!rangeError || (isBulkAssigning && (isModalFilterActive ? modalFilteredLeads.length === 0 : selectedLeadIds.size === 0))}>
                  {isBulkAssigning ? `Confirm Assignment (${isModalFilterActive ? modalFilteredLeads.length : selectedLeadIds.size})` : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingHistoryLead && (
        <LeadHistoryModal 
          lead={viewingHistoryLead} 
          onClose={() => setViewingHistoryLead(null)} 
        />
      )}
      {editingLead && (
        <EditLeadModal 
          lead={editingLead} 
          onClose={() => setEditingLead(null)} 
          webinars={uniqueWebinars}
          executives={executives}
          states={uniqueStates}
          isAdmin={isAdmin}
          updaterDepartment={isAdmin ? 'ADMIN' : (isTL ? 'TL' : 'SALES')}
          dropdowns={dropdowns}
          onSaveSuccess={() => {setEditingLead(null)}} 
        />
      )}
      {activeCallLead && (
        <BodyPortal><div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999, pointerEvents: 'none', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <div className="card" style={{ padding: '24px', borderRadius: '16px', background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', width: '320px', textAlign: 'center', pointerEvents: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
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

      {issueLead && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
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

      {isBulkTransferModalOpen && (
        <div style={modalOverlayStyle} onClick={() => setIsBulkTransferModalOpen(false)}>
          <div style={{...modalContentStyle, padding: '24px', background: 'var(--table-header-bg)', borderRadius: '12px'}} onClick={e => e.stopPropagation()}>
            <h2 style={modalHeaderStyle}>Bulk Transfer Leads by Status</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>From Executive</label>
                <select 
                  value={transferFromUser} 
                  onChange={e => setTransferFromUser(e.target.value)} 
                  style={inputStyle}
                >
                  <option value="">Select Executive...</option>
                  {executives.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.department})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Webinar (Optional / Specific)</label>
                <select 
                  value={transferWebinar} 
                  onChange={e => setTransferWebinar(e.target.value)} 
                  style={inputStyle}
                >
                  <option value="">All Webinars</option>
                  {uniqueWebinars.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={labelStyle}>Call Status</label>
                <select 
                  value={transferCallStatus} 
                  onChange={e => setTransferCallStatus(e.target.value)} 
                  style={inputStyle}
                >
                  <option value="">Select Status...</option>
                  <option value="UNTOUCHED">Untouched</option>
                  <option value="CALL_CONNECTED">Call Connected</option>
                  <option value="CALL_NOT_CONNECTED">Call Not Connected</option>
                  {extraCallStatuses.map(status => (
                    <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {availableLeadsCount !== null && (
                <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', color: 'var(--primary)', fontSize: '0.9rem' }}>
                  {isFetchingCount ? 'Calculating available leads...' : `Total leads available: ${availableLeadsCount}`}
                </div>
              )}

              <div>
                <label style={labelStyle}>Number of Leads to Transfer</label>
                <input 
                  type="number" 
                  value={transferCount} 
                  onChange={e => setTransferCount(e.target.value ? Number(e.target.value) : '')} 
                  style={inputStyle}
                  min="1"
                  max={availableLeadsCount || 1}
                  placeholder="Enter number of leads"
                />
              </div>

              <div>
                <label style={labelStyle}>To Executive</label>
                <select 
                  value={transferToUser} 
                  onChange={e => setTransferToUser(e.target.value)} 
                  style={inputStyle}
                >
                  <option value="">Select Executive...</option>
                  {executives.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.department})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={modalActionRowStyle}>
              <button 
                onClick={() => setIsBulkTransferModalOpen(false)}
                className="btn"
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--foreground)', borderRadius: '8px' }}
                disabled={isTransferring}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!transferFromUser || !transferToUser || !transferCallStatus || !transferCount) {
                    toast.error('Please fill all fields');
                    return;
                  }
                  if (transferFromUser === transferToUser) {
                    toast.error('Cannot transfer to the same executive');
                    return;
                  }
                  if (transferCount > (availableLeadsCount || 0)) {
                    toast.error('Cannot transfer more leads than available');
                    return;
                  }
                  
                  setIsTransferring(true);
                  try {
                    const res = await transferLeadsBulkAction(transferFromUser, transferToUser, transferCallStatus, Number(transferCount), transferWebinar);
                    if (res.error) {
                      toast.error(res.error);
                    } else {
                      toast.success(`Successfully transferred ${res.transferredCount} leads!`);
                      setIsBulkTransferModalOpen(false);
                      setTransferFromUser('');
                      setTransferToUser('');
                      setTransferCallStatus('');
                      setTransferWebinar('');
                      setTransferCount('');
                      setCountResult(null);
                      router.refresh();
                    }
                  } catch (e) {
                    toast.error((e instanceof Error ? e.message : String(e)) || 'Failed to transfer leads');
                  }
                  setIsTransferring(false);
                }}
                className="btn btn-primary"
                style={{ padding: '8px 16px', background: 'var(--primary)', color: 'var(--foreground)', border: 'none', borderRadius: '8px' }}
                disabled={isTransferring || !transferFromUser || !transferToUser || !transferCallStatus || !transferCount}
              >
                {isTransferring ? 'Transferring...' : 'Transfer Leads'}
              </button>
            </div>
          </div>
        </div>
      )}

      {assignProgress && (
        <div style={{...modalOverlayStyle, zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '6px solid var(--card-border)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }}></div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}} />
          <h2 style={{ color: 'var(--foreground)', fontSize: '1.5rem', fontWeight: 600 }}>Assigning Leads...</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '10px', fontSize: '1.2rem' }}>
            {assignProgress.current} assigned out of {assignProgress.total}
          </p>
        </div>
      )}
    </>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid var(--card-border)',
  background: 'var(--card-bg)',
  color: 'var(--foreground)',
  outline: 'none',
  fontFamily: 'inherit'
}

const labelStyle = {
  display: 'block',
  color: 'var(--text-muted)',
  fontSize: '0.875rem',
  marginBottom: '8px'
}

const modalOverlayStyle = {
  position: 'fixed' as const, 
  inset: 0, 
  zIndex: 50, 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.6)', 
  backdropFilter: 'blur(4px)'
}

const modalContentStyle = {
  width: '100%', 
  maxWidth: '500px', 
  maxHeight: '90vh', 
  overflowY: 'auto' as const
}

const modalHeaderStyle = {
  color: 'var(--foreground)', 
  marginBottom: '1.5rem', 
  fontSize: '1.25rem', 
  fontWeight: 600
}

const modalActionRowStyle = {
  display: 'flex', 
  gap: '12px', 
  justifyContent: 'flex-end', 
  marginTop: '16px', 
  borderTop: '1px solid var(--card-border)', 
  paddingTop: '16px'
}

const filterInputStyle = {
  minWidth: '120px',
  padding: '6px 28px 6px 10px',
  borderRadius: '6px',
  border: '1px solid var(--card-border)',
  background: 'var(--card-bg) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2394a3b8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E") no-repeat right 10px center/12px',
  color: 'var(--foreground)',
  outline: 'none',
  fontFamily: 'inherit',
  fontSize: '0.75rem',
  cursor: 'pointer',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
}

export default React.memo(MasterLeadTable);
