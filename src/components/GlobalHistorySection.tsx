'use client'

import { useState,useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import { getAllHistoryAction } from '@/app/actions/lead'
import { format } from 'date-fns'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

export default function GlobalHistorySection({ currentUser }: { currentUser?: import('@/lib/view-types').DashboardUser }) {
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getAllHistoryAction>>>([])
  const [isLoading, setIsLoading] = useState(true)

  const [filterWebinar, setFilterWebinar] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterExecutive, setFilterExecutive] = useState('')
  const [filterDateRange, setFilterDateRange] = useState('')
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null)
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const uniqueWebinars = Array.from(new Set(history.map(h => h.lead?.webinarId || h.lead?.webinarName).filter(Boolean)))
  const uniqueTeams = Array.from(new Set(history.map(h => h.userTeam).filter(Boolean)))
  
  const executivesToDisplay = filterTeam 
    ? history.filter(h => h.userTeam === filterTeam).map(h => h.userName)
    : history.map(h => h.userName)
  const uniqueExecutives = Array.from(new Set(executivesToDisplay)).filter(Boolean)

  const filteredHistory = history.filter(h => {
    if (currentUser && currentUser.role === 'EXEC') {
      if (h.userName !== currentUser.name) return false;
    }
    
    let matches = true
    
    if (filterWebinar) {
      const wId = h.lead?.webinarId || h.lead?.webinarName || ''
      if (wId !== filterWebinar) matches = false
    }
    
    if (filterTeam && h.userTeam !== filterTeam) matches = false
    
    if (filterExecutive && h.userName !== filterExecutive) matches = false
    
    if (filterDateRange) {
      if (filterDateRange === 'custom') {
        if (filterStartDate) {
          const start = new Date(filterStartDate);
          start.setHours(0, 0, 0, 0);
          const hDate = new Date(h.createdAt);
          if (hDate < start) matches = false;
        }
        if (filterEndDate) {
          const end = new Date(filterEndDate);
          end.setHours(23, 59, 59, 999);
          const hDate = new Date(h.createdAt);
          if (hDate > end) matches = false;
        }
      } else {
        const now = new Date()
        let start = null
        let end = null
        
        if (filterDateRange === 'today') {
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        } else if (filterDateRange === 'yesterday') {
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999)
        } else if (filterDateRange === 'last7') {
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
          end = new Date()
        } else if (filterDateRange === 'last30') {
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
          end = new Date()
        } else if (filterDateRange === 'thisMonth') {
          start = new Date(now.getFullYear(), now.getMonth(), 1)
          end = new Date()
        } else if (filterDateRange === 'lastMonth') {
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
        }
        
        if (start && end) {
          const hDate = new Date(h.createdAt)
          if (hDate < start || hDate > end) matches = false;
        }
      }
    }
    
    return matches
  })

  useEffect(() => {
    getAllHistoryAction()
      .then(data => setHistory(data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false))
  }, [])

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
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      borderRadius: '12px',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}>
      {/* Header */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid var(--card-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--card-bg)',
        borderTopLeftRadius: '12px',
        borderTopRightRadius: '12px'
      }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 600 }}>
            {currentUser?.role === 'EXEC' ? 'My Change History' : 'Global Change History'}
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {currentUser?.role === 'EXEC' ? 'Showing your recent lead updates' : 'Showing all recent lead updates'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--card-border)', display: 'flex', gap: '12px', flexWrap: 'wrap', background: 'var(--table-hover)' }}>
        <select 
          value={filterWebinar} 
          onChange={e => setFilterWebinar(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '6px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer', minWidth: '150px' }}
        >
          <option value="">All Webinars</option>
          {uniqueWebinars.map((w) => (
            <option key={w} value={w||''}>{w}</option>
          ))}
        </select>

        {currentUser?.role !== 'EXEC' && (
          <>
            <select 
              value={filterTeam} 
              onChange={e => { setFilterTeam(e.target.value); setFilterExecutive(''); }}
              style={{ padding: '8px 12px', borderRadius: '6px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer', minWidth: '150px' }}
            >
              <option value="">All Teams</option>
              {uniqueTeams.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select 
              value={filterExecutive} 
              onChange={e => setFilterExecutive(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer', minWidth: '150px' }}
            >
              <option value="">All Executives</option>
              {uniqueExecutives.map((ex) => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </>
        )}

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
            style={{ padding: '8px 12px', borderRadius: '6px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none', cursor: 'pointer', minWidth: '160px' }}
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
                inline
                monthsShown={2}
                dateFormat="dd/MM/yyyy"
              />
            </div>
          )}
        </div>

        {(filterWebinar || filterTeam || filterExecutive || filterDateRange) && (
          <button
            onClick={() => {
              setFilterWebinar('')
              setFilterTeam('')
              setFilterExecutive('')
              setFilterDateRange('')
              setFilterStartDate(null)
              setFilterEndDate(null)
              setIsCalendarOpen(false)
            }}
            title="Reset Filters"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--danger)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginLeft: 'auto'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading history...</div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No change history found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Date & Time</th>
                  <th style={thStyle}>Lead</th>
                  <th style={thStyle}>Changed By</th>
                  <th style={thStyle}>Field</th>
                  <th style={thStyle}>Old Value</th>
                  <th style={thStyle}>New Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((h) => (
                  <tr key={h.id} style={{ transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
                    <td style={tdStyle}>{format(new Date(h.createdAt), 'dd MMM yyyy, hh:mm a')}</td>
                    <td style={tdStyle}>
                      <div style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{h.lead?.uniqueId || h.leadId}</div>
                      <div style={{ color: 'var(--text-primary)', marginTop: '2px', fontWeight: 500 }}>{h.lead?.name || 'Deleted Lead'}</div>
                    </td>
                    <td style={tdStyle}>
                      <div>{h.userName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {h.userTeam} | {h.userRole} {h.lead?.webinarId ? `| ${h.lead.webinarId}` : ''}
                      </div>
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
          </div>
        )}
      </div>
    </div>
  )
}
