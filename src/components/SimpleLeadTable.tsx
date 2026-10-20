'use client'
import { useInfiniteLeadPage,allMatchingLeads,dateBounds } from '@/hooks/use-lead-page'
import { getLeadSelection } from '@/app/actions/lead-query'
import type { LeadPage,LeadQuery } from '@/lib/lead-query'

import { useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import AddColumnModal from '@/components/AddColumnModal'
import { deleteCustomColumnAction } from '@/app/actions/column'
import { removeLeadFromSheetAction } from '@/app/actions/lead'
import { Trash2 } from 'lucide-react'
import { useConfirm } from '@/providers/ConfirmProvider'

type LeadData = {
  id: string;
  uniqueId: string;
  name: string;
  webinarName: string | null;
  email: string | null;
  state: string | null;
  mobileNumber: string;
  paymentStatus: string;
  totalPayment: number;
  whatsappJoined: boolean;
  leadStatus: string;
  createdAt: string | Date;
  paymentDate?: string | Date | null;
  partPaymentId?: string | null;
  fullPaymentId?: string | null;
  partPaymentAmount?: number | null;
  webinarId?: string | null;
  customData?: string;
  callStatus?: string | null;
  remark1?: string | null;
  remark2?: string | null;
  nextFollowUpDate?: string | Date | null;
}

export default function SimpleLeadTable({ initialPage, isAdmin = false, customColumns = [], sheetName = 'SIMPLE' }: { initialPage: LeadPage, isAdmin?: boolean, customColumns?: import('@prisma/client').CustomColumn[], sheetName?: string }) {
  const [filterWebinar, setFilterWebinar] = useState('')
  const [filterState, setFilterState] = useState('')
  const [filterDateRange, setFilterDateRange] = useState('')
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null)
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null)

  const [filterNow] = useState(()=>new Date())
  const query:LeadQuery={sheet:sheetName==='PART_PAYMENT'?'PART_PAYMENT':'FULL_PAYMENT',webinar:filterWebinar,state:filterState,...dateBounds(filterDateRange,filterStartDate,filterEndDate,filterNow),size:50}
  const [pageData,sentinel]=useInfiniteLeadPage(initialPage,query)
  const leads=pageData.rows
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())

  const handleSelectAll = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked=e.target.checked
    const ids=await getLeadSelection(query)
    if (checked) {
      const newSelected = new Set(selectedLeads)
      ids.forEach(id => newSelected.add(id))
      setSelectedLeads(newSelected)
    } else {
      const newSelected = new Set(selectedLeads)
      ids.forEach(id => newSelected.delete(id))
      setSelectedLeads(newSelected)
    }
  }

  const handleSelectLead = (id: string) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedLeads(newSelected)
  }

  const displayedLeads=leads

  const exportToCSV = async () => {
    const exportLeads=await allMatchingLeads(query)
    const headers = ['Lead ID', 'Name', 'Email', 'Mobile', 'Webinar ID', 'State', 'Call Status', 'Remark 1', 'Remark 2', 'Next Follow Up', sheetName === 'PART_PAYMENT' ? 'Part Payment' : sheetName === 'FULL_PAYMENT' ? 'Full Payment' : 'Total Paid'];
    if (sheetName === 'PART_PAYMENT') {
      headers.push('Part Payment Date');
    }
    const rows = exportLeads.filter(lead => !lead.leadStatus?.startsWith('CLOSED')).map(lead => {
      const baseRow = [
        sheetName === 'PART_PAYMENT' ? (lead.partPaymentId || lead.uniqueId) : sheetName === 'FULL_PAYMENT' ? (lead.fullPaymentId || lead.uniqueId) : lead.uniqueId,
        lead.name,
        lead.email || '-',
        lead.mobileNumber,
        lead.webinarName || '-',
        lead.state || '-',
        lead.callStatus || 'UNTOUCHED',
        lead.remark1 || '-',
        lead.remark2 || '-',
        lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-GB') : '-',
        lead.totalPayment.toString()
      ];
      if (sheetName === 'PART_PAYMENT') {
        baseRow.push(lead.paymentDate ? new Date(lead.paymentDate).toLocaleDateString('en-GB') : '-');
      }
      return baseRow;
    });

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

  const confirm = useConfirm();

  const handleDeleteColumn = async (colId: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Column?',
      message: 'Are you sure you want to delete this column? Data in this column will be lost.',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      const res = await deleteCustomColumnAction(colId);
      if (!res.success) alert(res.error || 'Failed to delete column');
    } catch {
      alert('Failed to delete column');
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    const isConfirmed = await confirm({
      title: 'Remove Lead?',
      message: 'Are you sure you want to remove this lead from this sheet?',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await removeLeadFromSheetAction(leadId, sheetName);
    } catch {
      alert('Failed to remove lead');
    }
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center', background: 'var(--card-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)', position: 'relative', zIndex: 50 }}>
        <select value={filterWebinar} onChange={e => setFilterWebinar(e.target.value)} style={filterInputStyle}>
          <option value="">All Webinars</option>
          {pageData.options.webinars.map(w => (
            <option key={w as string} value={w as string}>{w}</option>
          ))}
        </select>

        <select value={filterState} onChange={e => setFilterState(e.target.value)} style={filterInputStyle}>
          <option value="">All States</option>
          {pageData.options.states.map(s => (
            <option key={s as string} value={s as string}>{s}</option>
          ))}
        </select>

        <select value={filterDateRange} onChange={e => setFilterDateRange(e.target.value)} style={filterInputStyle}>
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
              onChange={(update) => {
                setFilterStartDate(update[0]);
                setFilterEndDate(update[1]);
              }}
              isClearable={true}
              placeholderText="Select Date Range"
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: 'auto' }}>
          <button 
            onClick={() => {
              setFilterWebinar('')
              setFilterState('')
              setFilterDateRange('')
              setFilterStartDate(null)
              setFilterEndDate(null)
            }}
            className="btn"
            style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '8px 16px', fontSize: '0.8rem', height: 'fit-content', alignSelf: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Reset Filters
          </button>

          <button 
            onClick={()=>{void exportToCSV().catch(()=>alert('Failed to export leads'))}}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem', height: 'fit-content', alignSelf: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Export CSV
          </button>
          {isAdmin && <AddColumnModal sheetName={sheetName} />}
        </div>
      </div>

      <div className="table-container" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0 }}>
        <table style={{ width: '100%', minWidth: '1200px', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input type="checkbox" onChange={handleSelectAll} checked={displayedLeads.length > 0 && displayedLeads.every(r => selectedLeads.has(r.id))} style={{ cursor: 'pointer' }} />
              </th>
              <th>Lead ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Webinar ID</th>
              <th>State</th>
              <th>{sheetName === 'PART_PAYMENT' ? 'Part Payment' : sheetName === 'FULL_PAYMENT' ? 'Full Payment' : 'Total Paid'}</th>
              {sheetName === 'PART_PAYMENT' && <th>Part Payment Date</th>}
              {customColumns.map(col => (
                <th key={col.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {col.name}
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteColumn(col.id)} 
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                        title="Delete Column"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {displayedLeads.map((lead: LeadData) => (
              <tr key={lead.id}>
                <td>
                  <input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={() => handleSelectLead(lead.id)} style={{ cursor: 'pointer' }} />
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{sheetName === 'PART_PAYMENT' ? (lead.partPaymentId || lead.uniqueId) : sheetName === 'FULL_PAYMENT' ? (lead.fullPaymentId || lead.uniqueId) : lead.uniqueId}</td>
                <td style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={lead.name}>{lead.name}</td>
                <td style={{ color: 'var(--text-muted)' }}>{lead.email || '-'}</td>
                <td style={{ color: 'var(--text-muted)' }}>{lead.mobileNumber}</td>
                <td style={{ color: 'var(--text-primary)' }}>{lead.webinarId || lead.webinarName || '-'}</td>
                <td style={{ color: 'var(--text-muted)' }}>{lead.state || '-'}</td>
                <td style={{ color: lead.partPaymentAmount ? (lead.partPaymentAmount > 0 ? '#34d399' : 'var(--text-primary)') : 'var(--text-primary)' }}>₹{lead.totalPayment}</td>
                {sheetName === 'PART_PAYMENT' && (
                  <td style={{ color: 'var(--text-primary)' }}>
                    {lead.paymentDate ? (() => {
                      const d = new Date(lead.paymentDate);
                      return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
                    })() : '-'}
                  </td>
                )}
                {customColumns.map(col => {
                  let val = '-'
                  try {
                    const parsed = JSON.parse(lead.customData || '{}')
                    val = parsed[col.name] || '-'
                  } catch {}
                  return <td key={col.id} style={{ color: 'var(--text-primary)' }}>{val}</td>
                })}
                {isAdmin && (
                  <td>
                    <button 
                      onClick={() => handleDeleteLead(lead.id)}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7 + customColumns.length + (isAdmin ? 1 : 0) + (sheetName === 'PART_PAYMENT' ? 1 : 0)} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No leads found.
                </td>
              </tr>
            )}
            <tr ref={sentinel} aria-hidden="true" style={{ height: 0 }} />
          </tbody>
        </table>
      </div>
    </>
  )
}

const filterInputStyle = {
  minWidth: '130px',
  padding: '8px 32px 8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--card-border)',
  background: 'var(--card-bg) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2394a3b8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E") no-repeat right 12px center/14px',
  color: 'var(--text-primary)',
  outline: 'none',
  fontFamily: 'inherit',
  fontSize: '0.8rem',
  cursor: 'pointer',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
}
