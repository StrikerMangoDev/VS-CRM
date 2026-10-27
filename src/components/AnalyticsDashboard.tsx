'use client'
import type { LeadMetrics,Person,DashboardUser,DateButtonProps } from '@/lib/view-types'
import { useLeadPage,usePageNumber } from '@/hooks/use-lead-page'
import type { LeadPage,LeadQuery } from '@/lib/lead-query'

import { useState,useMemo,forwardRef } from 'react'
import {
PieChart,Pie,Cell,ResponsiveContainer,Tooltip as RechartsTooltip,Legend,
AreaChart,Area,XAxis,YAxis,CartesianGrid,BarChart,Bar
} from 'recharts'
import {
Calendar,RefreshCw,ChevronDown,Eye,Activity,BadgeIndianRupee,CheckCircle2,Users,Target,Phone,PhoneOff,PhoneForwarded
} from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import EditLeadModal from './EditLeadModal'

const DONUT_COLORS = {
  ZERO_PAYMENT: '#ef4444',
  PART_PAYMENT: '#f59e0b',
  FULL_PAYMENT: '#10b981'
}

const CALL_COLORS = {
  UNTOUCHED: 'var(--text-muted)',
  CALL_CONNECTED: '#10b981',
  CALL_NOT_CONNECTED: '#ef4444'
}

const filterInputStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  color: 'var(--text-muted)',
  padding: '6px 30px 6px 12px',
  borderRadius: '6px',
  fontSize: '0.8rem',
  outline: 'none',
  minWidth: '130px',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  backgroundSize: '14px'
}

const cardStyle = {
  background: 'var(--card-bg)', 
  border: '1px solid var(--card-border)', 
  borderRadius: '12px', 
  padding: '20px',
  backdropFilter: 'blur(10px)',
}

const tableHeaderStyle = {
  color: 'var(--text-muted)',
  fontSize: '11px',
  fontWeight: 600,
  padding: '12px 16px',
  borderBottom: '1px solid var(--card-border)',
  textAlign: 'left' as const,
  whiteSpace: 'nowrap' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  background: 'var(--card-bg)'
}

const tableCellStyle = {
  color: 'var(--text-primary)',
  fontSize: '13px',
  padding: '10px 16px',
  borderBottom: '1px solid var(--card-border)',
  whiteSpace: 'nowrap' as const,
  verticalAlign: 'middle' as const
}

const CustomDateInput = forwardRef<HTMLButtonElement,DateButtonProps>(({ value, onClick }, ref) => (
  <button 
    onClick={onClick} 
    ref={ref}
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      background: 'var(--card-bg)', 
      border: '1px solid var(--card-border)', 
      padding: '6px 12px', 
      borderRadius: '6px', 
      color: 'var(--text-muted)', 
      fontSize: '0.8rem',
      cursor: 'pointer',
      minWidth: '200px',
      justifyContent: 'space-between'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Calendar size={14} />
      <span>{value || 'All Time'}</span>
    </div>
    <ChevronDown size={14} />
  </button>
));

// Extracted Pagination Component
const Pagination = ({ total, page, limit, setPage, setLimit }: {total:number;page:number;limit:number;setPage:React.Dispatch<React.SetStateAction<number>>;setLimit:React.Dispatch<React.SetStateAction<number>>}) => {
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  
  if (total === 0) return null;
  
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span>Showing {start}-{end} of {total} leads</span>
        <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }} style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', borderRadius: '4px', padding: '4px 8px', outline: 'none' }}>
          <option value={15}>15</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '4px 12px', background: page === 1 ? 'transparent' : 'rgba(255,255,255,0.05)', color: page === 1 ? '#475569' : '#e2e8f0', border: '1px solid var(--card-border)', borderRadius: '4px', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>Prev</button>
        <span style={{ padding: '4px 12px', color: 'var(--text-primary)' }}>{page} / {totalPages}</span>
        <button onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '4px 12px', background: page === totalPages ? 'transparent' : 'rgba(255,255,255,0.05)', color: page === totalPages ? '#475569' : '#e2e8f0', border: '1px solid var(--card-border)', borderRadius: '4px', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
      </div>
    </div>
  )
}

// Extracted Lead Table Component
const LeadTable = ({ leads, query, initialPage, setEditingLead }: { leads: LeadMetrics[], query:LeadQuery, initialPage:LeadPage, setEditingLead: (lead: import('@/lib/lead-query').LeadRow) => void }) => {
  const [requestedPage, setPage] = usePageNumber(JSON.stringify(query));
  const [limit, setLimit] = useState(15);
  
  const result=useLeadPage(initialPage,{...query,ids:leads.map(l=>l.id),page:requestedPage,size:limit})
  const displayed=result.rows, page=result.page;
  
  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{...tableHeaderStyle, width: '100px'}}>Lead ID</th>
              <th style={{...tableHeaderStyle, width: '130px'}}>Name</th>
              <th style={{...tableHeaderStyle, width: '115px'}}>Mobile</th>
              <th style={{...tableHeaderStyle, width: '170px'}}>Email</th>
              <th style={{...tableHeaderStyle, width: '120px'}}>Webinar ID</th>
              <th style={{...tableHeaderStyle, width: '105px'}}>State</th>
              <th style={{...tableHeaderStyle, width: '150px'}}>Call Status</th>
              <th style={{...tableHeaderStyle, width: '125px'}}>Follow Up</th>
              <th style={{...tableHeaderStyle, width: '110px'}}>Amount</th>
              <th style={{...tableHeaderStyle, width: '65px', textAlign: 'center'}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length > 0 ? displayed.map(lead => (
              <tr key={lead.id} style={{ transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{...tableCellStyle, color: 'var(--text-muted)', fontFamily: 'monospace'}}>{lead.uniqueId}</td>
                <td style={{...tableCellStyle, fontWeight: 500}}>{lead.name}</td>
                <td style={{...tableCellStyle, color: 'var(--text-muted)'}}>{lead.mobileNumber}</td>
                <td style={{...tableCellStyle, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis'}} title={lead.email || undefined}>{lead.email || '-'}</td>
                <td style={{...tableCellStyle, fontWeight: 500}}>{lead.webinarId || '-'}</td>
                <td style={{...tableCellStyle, color: 'var(--text-muted)'}}>{lead.state || '-'}</td>
                <td style={tableCellStyle}>
                  {lead.callStatus ? (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 600,
                      background: lead.callStatus === 'CALL_CONNECTED' ? 'rgba(16, 185, 129, 0.1)' : 
                                lead.callStatus === 'CALL_NOT_CONNECTED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                      color: lead.callStatus === 'CALL_CONNECTED' ? '#34d399' : 
                             lead.callStatus === 'CALL_NOT_CONNECTED' ? '#f87171' : 'var(--text-muted)',
                      border: `1px solid ${lead.callStatus === 'CALL_CONNECTED' ? 'rgba(16, 185, 129, 0.2)' : 
                                      lead.callStatus === 'CALL_NOT_CONNECTED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(148, 163, 184, 0.2)'}`
                    }}>
                      {lead.callStatus.replace(/_/g, ' ')}
                    </span>
                  ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                </td>
                <td style={{...tableCellStyle, color: lead.nextFollowUpDate && new Date(lead.nextFollowUpDate).getTime() < new Date().setHours(0,0,0,0) ? '#f87171' : '#e2e8f0'}}>
                  {lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-GB') : '-'}
                </td>
                <td style={{...tableCellStyle, color: lead.totalPayment > 0 ? '#34d399' : 'var(--text-muted)', fontWeight: lead.totalPayment > 0 ? 600 : 400}}>
                  ₹{(lead.totalPayment || 0).toLocaleString()}
                </td>
                <td style={{...tableCellStyle, textAlign: 'center'}}>
                  <button 
                    onClick={() => setEditingLead(lead)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}
                    title="View / Edit Lead"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No leads found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination total={result.total} page={page} limit={limit} setPage={setPage} setLimit={setLimit} />
    </div>
  )
}

CustomDateInput.displayName = 'CustomDateInput';

export default function AnalyticsDashboard({ leads, leadQuery={sheet:'ANALYTICS'}, initialPage, executives = [], userRole = 'ADMIN', currentUser, onUpdate, dropdowns = {} }: { leads: LeadMetrics[], leadQuery?: LeadQuery, initialPage?: LeadPage, executives?: Person[], userRole?: string, currentUser?: DashboardUser, onUpdate?: () => void, dropdowns?: Record<string, string[]> }) {

  // Role verification
  const isExecutive = userRole === 'EXEC'

  // --- FILTERS ---
  const [filterWebinar, setFilterWebinar] = useState('')
  const [filterCallStatus, setFilterCallStatus] = useState('')
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('')
  const [filterLeadStatus, setFilterLeadStatus] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterExecutive, setFilterExecutive] = useState('')
  
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null)
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null)
  const [filterDateRange, setFilterDateRange] = useState('')

  const [editingLead, setEditingLead] = useState<import('@/lib/lead-query').LeadRow | null>(null)

  // Derived filter options
  const allWebinars = Array.from(new Set(leads.map(l => l.webinarId).filter(Boolean)))
  const allTeams = Array.from(new Set(executives.map(e => e.department).filter(Boolean)))
  const filteredExecutives = filterTeam ? executives.filter(e => e.department === filterTeam) : executives
  const allCallStatuses = Array.from(new Set(leads.map(l => l.callStatus).filter(Boolean)))
  const allLeadStatuses = Array.from(new Set(leads.map(l => l.leadStatus).filter(Boolean)))
  
  const handleDateRangeChange=(filterDateRange:string)=>{
    setFilterDateRange(filterDateRange)
    if (!filterDateRange || filterDateRange === 'custom') return;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (filterDateRange === 'today') {
      setFilterStartDate(today);
      setFilterEndDate(new Date(today.getTime() + 86399999));
    } else if (filterDateRange === 'yesterday') {
      const yesterday = new Date(today.getTime() - 86400000);
      setFilterStartDate(yesterday);
      setFilterEndDate(new Date(yesterday.getTime() + 86399999));
    } else if (filterDateRange === 'last7') {
      setFilterStartDate(new Date(today.getTime() - 6 * 86400000));
      setFilterEndDate(new Date(today.getTime() + 86399999));
    } else if (filterDateRange === 'thisMonth') {
      setFilterStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
      setFilterEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));
    } else if (filterDateRange === 'last30') {
      setFilterStartDate(new Date(now.getTime() - 30 * 86400000));
      setFilterEndDate(now);
    } else if (filterDateRange === 'lastMonth') {
      setFilterStartDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      setFilterEndDate(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59));
    }
  };

  const resetFilters = () => {
    setFilterWebinar('')
    setFilterCallStatus('')
    setFilterPaymentStatus('')
    setFilterLeadStatus('')
    setFilterTeam('')
    setFilterExecutive('')
    setFilterDateRange('')
    setFilterStartDate(null)
    setFilterEndDate(null)
  }

  // --- DATA FILTERING ---
  const displayedLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (filterWebinar && lead.webinarId !== filterWebinar) return false;
      if (filterCallStatus && lead.callStatus !== filterCallStatus) return false;
      if (filterLeadStatus && lead.leadStatus !== filterLeadStatus) return false;
      
      const totalPaid = lead.totalPayment || 0;
      let computedStatus = 'ZERO_PAY';
      if (lead.paymentStatus === 'FULL_PAYMENT') computedStatus = 'FULL_PAYMENT';
      else if (totalPaid > 0) computedStatus = 'PART_PAYMENT';
      
      if (filterPaymentStatus && computedStatus !== filterPaymentStatus) return false;
      
      // Team / Exec Filter
      if (filterTeam || filterExecutive) {
        if (!lead.assignments || lead.assignments.length === 0) return false;
        const matchesTeam = filterTeam ? lead.assignments.some((a) => a.user.department === filterTeam) : true;
        const matchesExec = filterExecutive ? lead.assignments.some((a) => a.user.id === filterExecutive) : true;
        if (!matchesTeam || !matchesExec) return false;
      }

      // Time Filter
      if (filterStartDate || filterEndDate) {
        const leadDate = new Date(lead.createdAt);
        if (filterStartDate) {
          const start = new Date(filterStartDate);
          start.setHours(0, 0, 0, 0);
          if (leadDate < start) return false;
        }
        if (filterEndDate) {
          const end = new Date(filterEndDate);
          end.setHours(23, 59, 59, 999);
          if (leadDate > end) return false;
        }
      }

      return true;
    });
  }, [leads, filterWebinar, filterCallStatus, filterPaymentStatus, filterLeadStatus, filterTeam, filterExecutive, filterStartDate, filterEndDate]);

  const activeLeads = displayedLeads.filter(l => !l.leadStatus?.startsWith('CLOSED'));
  const closedLeads = displayedLeads.filter(l => l.leadStatus?.startsWith('CLOSED'));

  // --- AGGREGATIONS / KPIs ---
  const totalLeadsCount = displayedLeads.length;
  const activeLeadsCount = activeLeads.length;
  const closedLeadsCount = closedLeads.length;
  
  let totalRevenue = 0;
  let callConnected = 0;
  let callNotConnected = 0;
  let callUntouched = 0;
  
  let zeroPaymentCount = 0;
  let partPaymentCount = 0;
  let fullPaymentCount = 0;

  displayedLeads.forEach(lead => {
    const totalPaid = lead.leadStatus?.startsWith('CLOSED') ? 0 : (lead.totalPayment || 0);
    totalRevenue += totalPaid;
    
    if (lead.callStatus === 'CALL_CONNECTED') callConnected++;
    else if (lead.callStatus === 'CALL_NOT_CONNECTED') callNotConnected++;
    else callUntouched++;

    if (lead.paymentStatus === 'FULL_PAYMENT') fullPaymentCount++;
    else if (totalPaid > 0) partPaymentCount++;
    else zeroPaymentCount++;
  });

  const callChartData = [
    { name: 'Connected', value: callConnected, color: CALL_COLORS.CALL_CONNECTED },
    { name: 'Not Connected', value: callNotConnected, color: CALL_COLORS.CALL_NOT_CONNECTED },
    { name: 'Untouched', value: callUntouched, color: CALL_COLORS.UNTOUCHED }
  ].filter(d => d.value > 0);

  const conversionRate = totalLeadsCount > 0 ? ((closedLeadsCount / totalLeadsCount) * 100).toFixed(1) : '0.0';
  

  // --- CHARTS DATA PREP ---
  const webinarDataMap: Record<string,{ name: string; leads: number; revenue: number; closedLeads: number; closedRevenue: number; }> = {};
  displayedLeads.forEach(lead => {
    const wId = lead.webinarId || 'Unknown';
    if (!webinarDataMap[wId]) webinarDataMap[wId] = { name: wId, leads: 0, revenue: 0, closedLeads: 0, closedRevenue: 0 };
    webinarDataMap[wId].leads++;
    if (!lead.leadStatus?.startsWith('CLOSED')) {
      webinarDataMap[wId].revenue += (lead.totalPayment || 0);
    }
    if (lead.leadStatus?.startsWith('CLOSED')) {
      webinarDataMap[wId].closedLeads++;
      webinarDataMap[wId].closedRevenue += (lead.totalPayment || 0);
    }
  });
  const webinarBarData = Object.values(webinarDataMap).sort((a,b) => b.leads - a.leads).slice(0, 10);
  const webinarRevData = Object.values(webinarDataMap).sort((a,b) => b.revenue - a.revenue).slice(0, 10);

  const stateDataMap: Record<string,{ name: string; leads: number; closedLeads: number; }> = {};
  displayedLeads.forEach(lead => {
    const s = lead.state || 'Unknown';
    if (!stateDataMap[s]) stateDataMap[s] = { name: s, leads: 0, closedLeads: 0 };
    stateDataMap[s].leads++;
    if (lead.leadStatus?.startsWith('CLOSED')) stateDataMap[s].closedLeads++;
  });
  const stateBarData = Object.values(stateDataMap).sort((a,b) => b.leads - a.leads).slice(0, 10);

  const execDataMap: Record<string,{ name: string; leads: number; connected: number; closed: number; revenue: number; }> = {};
  displayedLeads.forEach(lead => {
    if (lead.assignments && lead.assignments.length > 0) {
      const exec = lead.assignments[0].user;
      const eId = exec.name || exec.id;
      if (!execDataMap[eId]) execDataMap[eId] = { name: eId, leads: 0, connected: 0, closed: 0, revenue: 0 };
      execDataMap[eId].leads++;
      if (!lead.leadStatus?.startsWith('CLOSED')) {
        execDataMap[eId].revenue += (lead.totalPayment || 0);
      }
      if (lead.callStatus === 'CALL_CONNECTED') execDataMap[eId].connected++;
      if (lead.leadStatus?.startsWith('CLOSED')) execDataMap[eId].closed++;
    }
  });
  const execBarData = Object.values(execDataMap).sort((a,b) => b.leads - a.leads).slice(0, 10);

  // Follow-ups (Active leads only)
  let fuScheduled = 0, fuOverdue = 0, fuNone = 0;
  const today = new Date(); today.setHours(0,0,0,0);
  activeLeads.forEach(lead => {
    if (!lead.nextFollowUpDate) fuNone++;
    else {
      const fu = new Date(lead.nextFollowUpDate); fu.setHours(0,0,0,0);
      if (fu.getTime() >= today.getTime()) fuScheduled++;
      else fuOverdue++;
    }
  });
  const followUpData = [
    { name: 'Scheduled', value: fuScheduled, fill: '#3b82f6' },
    { name: 'Overdue', value: fuOverdue, fill: '#ef4444' },
    { name: 'None', value: fuNone, fill: 'var(--text-muted)' }
  ].filter(d => d.value > 0);

  const paymentData = [
    { name: 'Zero Payment', value: zeroPaymentCount, fill: DONUT_COLORS.ZERO_PAYMENT },
    { name: 'Part Payment', value: partPaymentCount, fill: DONUT_COLORS.PART_PAYMENT },
    { name: 'Full Payment', value: fullPaymentCount, fill: DONUT_COLORS.FULL_PAYMENT }
  ].filter(d => d.value > 0);

  // Time Series (Monthly)
  const monthMap: Record<string,{ month: string; revenue: number; closedLeads: number; }> = {};
  closedLeads.forEach(lead => {
    const d = new Date(lead.createdAt);
    const mStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}`;
    if (!monthMap[mStr]) monthMap[mStr] = { month: mStr, revenue: 0, closedLeads: 0 };
    if (!lead.leadStatus?.startsWith('CLOSED')) {
      monthMap[mStr].revenue += (lead.totalPayment || 0);
    }
    monthMap[mStr].closedLeads++;
  });
  const monthTrendData = Object.values(monthMap).sort((a,b) => a.month.localeCompare(b.month));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: 'var(--font-inter)' }}>
      
      {/* GLOBAL FILTERS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', background: 'var(--card-bg)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <select value={filterWebinar} onChange={e => setFilterWebinar(e.target.value)} style={filterInputStyle}>
            <option value="">All Webinar IDs</option>
            {allWebinars.map(w => <option key={String(w)} value={String(w)}>{String(w)}</option>)}
          </select>

          {!isExecutive && (
            <>
              <select value={filterTeam} onChange={e => { setFilterTeam(e.target.value); setFilterExecutive(''); }} style={filterInputStyle}>
                <option value="">All Teams</option>
                {allTeams.map(t => <option key={String(t)} value={String(t)}>{String(t)}</option>)}
              </select>

              <select value={filterExecutive} onChange={e => setFilterExecutive(e.target.value)} style={filterInputStyle}>
                <option value="">All Executives</option>
                {filteredExecutives.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </>
          )}

          <select value={filterCallStatus} onChange={e => setFilterCallStatus(e.target.value)} style={filterInputStyle}>
            <option value="">All Call Statuses</option>
            {allCallStatuses.map(c => <option key={String(c)} value={String(c)}>{String(c).replace(/_/g, ' ')}</option>)}
          </select>

          <select value={filterPaymentStatus} onChange={e => setFilterPaymentStatus(e.target.value)} style={filterInputStyle}>
            <option value="">All Payment Statuses</option>
            <option value="ZERO_PAY">Zero Pay</option>
            <option value="PART_PAYMENT">Part Payment</option>
            <option value="FULL_PAYMENT">Full Payment</option>
          </select>

          <select value={filterLeadStatus} onChange={e => setFilterLeadStatus(e.target.value)} style={filterInputStyle}>
            <option value="">All Lead Statuses</option>
            {allLeadStatuses.map(s => <option key={String(s)} value={String(s)}>{String(s).replace(/_/g, ' ')}</option>)}
          </select>

          <select value={filterDateRange} onChange={e => handleDateRangeChange(e.target.value)} style={filterInputStyle}>
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="custom">Custom Range...</option>
          </select>

          {filterDateRange === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DatePicker
                selectsRange={true}
                startDate={filterStartDate || undefined}
                endDate={filterEndDate || undefined}
                onChange={(update: [Date | null, Date | null]) => {
                  setFilterStartDate(update[0])
                  setFilterEndDate(update[1])
                }}
                customInput={<CustomDateInput />}
                isClearable={false}
              />
            </div>
          )}

          <button 
            onClick={resetFilters}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', color: 'var(--text-muted)', padding: '8px 12px', fontSize: '0.8rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <RefreshCw size={14} />
            Clear Filters
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '8px', borderRadius: '8px' }}><Users size={20} /></div>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>Total Leads</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalLeadsCount}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', padding: '8px', borderRadius: '8px' }}><Activity size={20} /></div>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>Active Leads</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{activeLeadsCount}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '8px', borderRadius: '8px' }}><CheckCircle2 size={20} /></div>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>Closed Leads</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{closedLeadsCount}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '8px', borderRadius: '8px' }}><BadgeIndianRupee size={20} /></div>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>Total Revenue</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>₹{totalRevenue.toLocaleString()}</div>
          </div>
          
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', padding: '8px', borderRadius: '8px' }}><Phone size={20} /></div>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>Connected Calls</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{callConnected}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', padding: '8px', borderRadius: '8px' }}><PhoneOff size={20} /></div>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>Not Connected</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{callNotConnected}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(148, 163, 184, 0.15)', color: 'var(--text-muted)', padding: '8px', borderRadius: '8px' }}><PhoneForwarded size={20} /></div>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>Untouched Leads</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{callUntouched}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', padding: '8px', borderRadius: '8px' }}><Target size={20} /></div>
              <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>Conversion Rate</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{conversionRate}%</div>
          </div>
        </div>

      {/* LEAD OVERVIEW */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', margin: '0', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>Lead Overview</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={cardStyle}>
            <h4 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '20px' }}>Leads by Webinar ID</h4>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={webinarBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke='var(--text-muted)' fontSize={12} />
                  <YAxis stroke='var(--text-muted)' fontSize={12} />
                  <RechartsTooltip contentStyle={{ background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                  <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={cardStyle}>
            <h4 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '20px' }}>Call Status Distribution</h4>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={callChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={2}>
                    {callChartData.map((entry, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: 'var(--table-header-bg)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={cardStyle}>
            <h4 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '20px' }}>Leads by State</h4>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stateBarData} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke='var(--text-muted)' fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke='var(--text-muted)' fontSize={12} />
                  <RechartsTooltip contentStyle={{ background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                  <Bar dataKey="leads" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={cardStyle}>
            <h4 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '20px' }}>Follow-up Status</h4>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={followUpData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2}>
                    {followUpData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: 'var(--table-header-bg)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* SALES PERFORMANCE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', margin: '0', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>Sales Performance</h2>
        <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>LEAD OWNER</th>
                <th style={{...tableHeaderStyle, textAlign: 'right'}}>Total Leads</th>
                <th style={{...tableHeaderStyle, textAlign: 'right'}}>Connected</th>
                <th style={{...tableHeaderStyle, textAlign: 'right'}}>Closed</th>
                <th style={{...tableHeaderStyle, textAlign: 'right'}}>Conversion %</th>
                <th style={{...tableHeaderStyle, textAlign: 'right'}}>Total Revenue</th>
                <th style={{...tableHeaderStyle, textAlign: 'right'}}>Avg Deal Value</th>
              </tr>
            </thead>
            <tbody>
              {execBarData.map(exec => {
                const conv = exec.leads > 0 ? ((exec.closed / exec.leads) * 100).toFixed(1) : '0.0';
                const avg = exec.closed > 0 ? (exec.revenue / exec.closed).toFixed(0) : '0';
                return (
                  <tr key={exec.name} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={tableCellStyle}>{exec.name}</td>
                    <td style={{...tableCellStyle, textAlign: 'right'}}>{exec.leads}</td>
                    <td style={{...tableCellStyle, textAlign: 'right'}}>{exec.connected}</td>
                    <td style={{...tableCellStyle, textAlign: 'right'}}>{exec.closed}</td>
                    <td style={{...tableCellStyle, textAlign: 'right', color: 'var(--primary)'}}>{conv}%</td>
                    <td style={{...tableCellStyle, textAlign: 'right', color: 'var(--success)', fontWeight: 600}}>₹{exec.revenue.toLocaleString()}</td>
                    <td style={{...tableCellStyle, textAlign: 'right', color: 'var(--text-muted)'}}>₹{Number(avg).toLocaleString()}</td>
                  </tr>
                )
              })}
              {execBarData.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* WEBINAR PERFORMANCE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', margin: '0', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>Webinar Performance</h2>
        <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Webinar ID</th>
                <th style={{...tableHeaderStyle, textAlign: 'right'}}>Total Leads</th>
                <th style={{...tableHeaderStyle, textAlign: 'right'}}>Connected Leads</th>
                <th style={{...tableHeaderStyle, textAlign: 'right'}}>Closed Leads</th>
                <th style={{...tableHeaderStyle, textAlign: 'right'}}>Conversion %</th>
                <th style={{...tableHeaderStyle, textAlign: 'right'}}>Total Revenue</th>
                <th style={{...tableHeaderStyle, textAlign: 'right'}}>Avg Deal Value</th>
              </tr>
            </thead>
            <tbody>
              {webinarBarData.map(w => {
                let connected = 0;
                displayedLeads.forEach(l => {
                  if (l.webinarId === w.name && l.callStatus === 'CALL_CONNECTED') connected++;
                });
                const conv = w.leads > 0 ? ((w.closedLeads / w.leads) * 100).toFixed(1) : '0.0';
                const avg = w.closedLeads > 0 ? (w.revenue / w.closedLeads).toFixed(0) : '0';
                return (
                  <tr key={w.name} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{...tableCellStyle, fontWeight: 500}}>{w.name}</td>
                    <td style={{...tableCellStyle, textAlign: 'right'}}>{w.leads}</td>
                    <td style={{...tableCellStyle, textAlign: 'right'}}>{connected}</td>
                    <td style={{...tableCellStyle, textAlign: 'right'}}>{w.closedLeads}</td>
                    <td style={{...tableCellStyle, textAlign: 'right', color: 'var(--primary)'}}>{conv}%</td>
                    <td style={{...tableCellStyle, textAlign: 'right', color: 'var(--success)', fontWeight: 600}}>₹{w.revenue.toLocaleString()}</td>
                    <td style={{...tableCellStyle, textAlign: 'right', color: 'var(--text-muted)'}}>₹{Number(avg).toLocaleString()}</td>
                  </tr>
                )
              })}
              {webinarBarData.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REVENUE & PAYMENT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', margin: '0', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>Revenue & Payment</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          
          <div style={cardStyle}>
            <h4 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '20px' }}>Revenue by Webinar</h4>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={webinarRevData} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke='var(--text-muted)' fontSize={12} tickFormatter={v => '₹'+v} />
                  <YAxis dataKey="name" type="category" stroke='var(--text-muted)' fontSize={12} />
                  <RechartsTooltip contentStyle={{ background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }} formatter={(v) => ['₹'+(Number(v)).toLocaleString(), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={cardStyle}>
            <h4 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '20px' }}>Revenue by Executive</h4>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={execBarData.filter((e) => e.revenue > 0)} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke='var(--text-muted)' fontSize={12} tickFormatter={v => '₹'+v} />
                  <YAxis dataKey="name" type="category" stroke='var(--text-muted)' fontSize={12} />
                  <RechartsTooltip contentStyle={{ background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }} formatter={(v) => ['₹'+(Number(v)).toLocaleString(), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={cardStyle}>
            <h4 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '20px' }}>Payment Status</h4>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2}>
                    {paymentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: 'var(--table-header-bg)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)' }} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* TRENDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', margin: '0', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>Trends</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={cardStyle}>
            <h4 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '20px' }}>Monthly Revenue (Closed Deals)</h4>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke='var(--text-muted)' fontSize={12} />
                  <YAxis stroke='var(--text-muted)' fontSize={12} tickFormatter={v => '₹'+v} />
                  <RechartsTooltip contentStyle={{ background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }} formatter={(v) => ['₹'+(Number(v)).toLocaleString(), 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={0.3} fill="#10b981" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={cardStyle}>
            <h4 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '20px' }}>Monthly Closed Leads</h4>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke='var(--text-muted)' fontSize={12} />
                  <YAxis stroke='var(--text-muted)' fontSize={12} />
                  <RechartsTooltip contentStyle={{ background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                  <Bar dataKey="closedLeads" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE LEADS TABLE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', margin: '0', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>Active Leads</h2>
        <LeadTable query={leadQuery} initialPage={initialPage||{rows:[],total:0,page:1,size:15,options:{webinars:[],states:[],calls:[]},revision:'analytics'}} leads={activeLeads} setEditingLead={setEditingLead} />
      </div>

      {/* CLOSED LEADS TABLE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.3rem', margin: '0', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>Closed Leads</h2>
        <LeadTable query={leadQuery} initialPage={initialPage||{rows:[],total:0,page:1,size:15,options:{webinars:[],states:[],calls:[]},revision:'analytics'}} leads={closedLeads} setEditingLead={setEditingLead} />
      </div>

      {editingLead && (
        <EditLeadModal
          lead={editingLead}
          updaterDepartment={currentUser?.role === 'EXEC' ? currentUser.department : (leadQuery.sheet === 'RECOVERY' ? 'RECOVERY' : 'SALES')}
          isAdmin={userRole === 'ADMIN'}
          onClose={() => setEditingLead(null)}
          onSaveSuccess={() => {
            if (onUpdate) onUpdate();
            setEditingLead(null);
          }}
          dropdowns={dropdowns}
        />
      )}
    </div>
  )
}

