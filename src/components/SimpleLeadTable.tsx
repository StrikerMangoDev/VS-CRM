'use client'
import { useLeadPage,usePageNumber,allMatchingLeads,dateBounds } from '@/hooks/use-lead-page'
import { getLeadSelection } from '@/app/actions/lead-query'
import type { LeadPage,LeadQuery } from '@/lib/lead-query'

import React, { useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import AddColumnModal from '@/components/AddColumnModal'
import { deleteCustomColumnAction } from '@/app/actions/column'
import { removeLeadFromSheetAction } from '@/app/actions/lead'
import { Search, X, Trash2, Pencil } from 'lucide-react'
import { useConfirm } from '@/providers/ConfirmProvider'
import EditSimpleLeadModal from '@/components/EditSimpleLeadModal'
import { useRouter } from 'next/navigation'

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
  fullPaymentAmount?: number | null;
  webinarId?: string | null;
  customData?: string;
  callStatus?: string | null;
  remark1?: string | null;
  remark2?: string | null;
  nextFollowUpDate?: string | Date | null;
}

export default function SimpleLeadTable({ 
  initialPage, 
  isAdmin = false, 
  userRole = '', 
  customColumns = [], 
  sheetName = 'SIMPLE' 
}: { 
  initialPage: LeadPage, 
  isAdmin?: boolean, 
  userRole?: string, 
  customColumns?: import('@prisma/client').CustomColumn[], 
  sheetName?: string 
}) {
  const router = useRouter()
  const [editingLead, setEditingLead] = useState<LeadData | null>(null)
  const [overrides, setOverrides] = useState<Record<string, Partial<LeadData>>>({})
  const canEditLead = isAdmin || userRole === 'TL' || userRole === 'ADMIN' || userRole === 'MANAGER'

  const [searchQuery, setSearchQuery] = useState('')
  const [filterWebinar, setFilterWebinar] = useState('')
  const [filterState, setFilterState] = useState('')
  const [filterDateRange, setFilterDateRange] = useState('')
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null)
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null)

  const [pageSize, setPageSize] = useState(15)
  const [filterNow] = useState(()=>new Date())
  const queryFilters: LeadQuery = {
    sheet: sheetName === 'PART_PAYMENT' ? 'PART_PAYMENT' : 'FULL_PAYMENT',
    search: searchQuery.trim() || undefined,
    webinar: filterWebinar,
    state: filterState,
    ...dateBounds(filterDateRange, filterStartDate, filterEndDate, filterNow),
  }
  const [requestedPage, setRequestedPage] = usePageNumber(JSON.stringify({ ...queryFilters, size: pageSize }))
  const query = { ...queryFilters, page: requestedPage, size: pageSize }
  const { rows: leads, setRows, ...pageData } = useLeadPage(initialPage, query)
  const totalPages = Math.ceil(pageData.total / pageSize)
  const currentPage = Math.min(requestedPage, Math.max(1, totalPages))
  const setCurrentPage = (next: number | ((page: number) => number)) => setRequestedPage(typeof next === 'function' ? next(currentPage) : next)

  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())

  const handleSelectAll = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked=e.target.checked
    const ids=await getLeadSelection(queryFilters)
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

  const displayedLeads = leads.map(l => overrides[l.id] ? { ...l, ...overrides[l.id] } : l)
  const [isExporting, setIsExporting] = useState(false)

  const exportToCSV = async () => {
    try {
      setIsExporting(true)
      const exportLeads = await allMatchingLeads(queryFilters)
      if (exportLeads.length === 0) {
        alert('No leads found to export matching the current filters.')
        return
      }
      const headers = [
        'Lead ID',
        'Name',
        'Email',
        'Mobile',
        'Webinar ID',
        'State',
        sheetName === 'PART_PAYMENT' ? 'Part Payment' : sheetName === 'FULL_PAYMENT' ? 'Full Payment' : 'Total Paid'
      ];
      if (sheetName === 'PART_PAYMENT') {
        headers.push('Part Payment Date');
      }
      headers.push('Call Status', 'Remark 1', 'Remark 2', 'Next Follow Up', 'Lead Owner', 'Lead Status');
      customColumns.forEach(col => {
        headers.push(col.name);
      });

      const rows = exportLeads.map(lead => {
        const baseRow = [
          sheetName === 'PART_PAYMENT' ? (lead.partPaymentId || lead.uniqueId) : sheetName === 'FULL_PAYMENT' ? (lead.fullPaymentId || lead.uniqueId) : lead.uniqueId,
          lead.name,
          lead.email || '-',
          lead.mobileNumber,
          lead.webinarId || lead.webinarName || '-',
          lead.state || '-',
          (sheetName === 'PART_PAYMENT' 
            ? ((lead.partPaymentAmount !== null && lead.partPaymentAmount !== undefined && lead.partPaymentAmount > 0) 
                ? lead.partPaymentAmount 
                : (lead.totalPayment || 0))
            : (lead.totalPayment || 0)).toString()
        ];
        if (sheetName === 'PART_PAYMENT') {
          const dateStr = lead.paymentDate ? (() => {
            const d = new Date(lead.paymentDate);
            return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
          })() : '-';
          baseRow.push(dateStr);
        }
        baseRow.push(
          lead.callStatus || 'UNTOUCHED',
          lead.remark1 || '-',
          lead.remark2 || '-',
          lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-GB') : '-',
          lead.assignments && lead.assignments.filter((a) => a.user.department !== 'TECHNICAL').length > 0
            ? lead.assignments.filter((a) => a.user.department !== 'TECHNICAL').map((a) => `${a.user.name} (${a.user.department})`).join('; ')
            : 'Unassigned',
          lead.leadStatus === 'CLOSED_FULL_PAYMENT' ? 'Full Payment Done (Close)' : lead.leadStatus?.startsWith('CLOSED') ? 'Closed Lead' : (lead.leadStatus || 'In Progress')
        );
        customColumns.forEach(col => {
          let val = '-';
          try {
            const parsed = JSON.parse(lead.customData || '{}');
            val = parsed[col.name] || parsed[col.id] || '-';
          } catch {}
          baseRow.push(val);
        });
        return baseRow;
      });

      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sheetName.toLowerCase().replace(/_/g, '-')}_leads_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Failed to export leads');
    } finally {
      setIsExporting(false);
    }
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
        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', minWidth: '260px', padding: '0 10px', height: '36px' }}>
          <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0, marginRight: '8px' }} />
          <input 
            type="text" 
            placeholder="Search by ID, Name, Mobile, Email..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', width: '100%', fontFamily: 'inherit' }} 
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex' }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

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
              setSearchQuery('')
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
            onClick={() => void exportToCSV()}
            disabled={isExporting}
            className="btn btn-primary"
            style={{ 
              padding: '8px 16px', 
              fontSize: '0.8rem', 
              height: 'fit-content', 
              alignSelf: 'center', 
              whiteSpace: 'nowrap', 
              flexShrink: 0,
              opacity: isExporting ? 0.7 : 1,
              cursor: isExporting ? 'not-allowed' : 'pointer'
            }}
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
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
              {(isAdmin || canEditLead) && <th>Actions</th>}
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
                <td style={{ color: sheetName === 'PART_PAYMENT' ? ((lead.partPaymentAmount && lead.partPaymentAmount > 0) ? '#34d399' : 'var(--text-primary)') : (lead.totalPayment > 0 ? '#34d399' : 'var(--text-primary)') }}>
                  ₹{sheetName === 'PART_PAYMENT' 
                    ? ((lead.partPaymentAmount !== null && lead.partPaymentAmount !== undefined && lead.partPaymentAmount > 0) 
                        ? lead.partPaymentAmount 
                        : lead.totalPayment) 
                    : lead.totalPayment}
                </td>
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
                {(isAdmin || canEditLead) && (
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {canEditLead && (
                        <button 
                          onClick={() => setEditingLead(lead)}
                          style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                          onMouseOut={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                          title="Edit Lead"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteLead(lead.id)}
                          style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                          onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                          title="Delete Lead"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7 + customColumns.length + ((isAdmin || canEditLead) ? 1 : 0) + (sheetName === 'PART_PAYMENT' ? 1 : 0)} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: 'var(--card-bg)', borderTop: '1px solid var(--card-border)', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', flexShrink: 0, marginTop: '8px' }}>
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

      {editingLead && (
        <EditSimpleLeadModal
          lead={editingLead}
          isOpen={true}
          onClose={() => setEditingLead(null)}
          onSave={(updatedLead) => {
            setOverrides(prev => ({
              ...prev,
              [updatedLead.id]: {
                ...(prev[updatedLead.id] || {}),
                ...updatedLead
              }
            }))
            router.refresh()
          }}
          sheetName={sheetName}
          states={pageData.options.states as string[]}
          webinars={pageData.options.webinars as string[]}
          customColumns={customColumns}
        />
      )}
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
