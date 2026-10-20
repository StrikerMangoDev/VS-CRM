'use client'
import { useInfinitePage,dateBounds } from '@/hooks/use-lead-page'
import { useEditableRows } from '@/hooks/use-editable-rows'
import { getCallPage } from '@/app/actions/lead-query'
import type { CallPage } from '@/lib/call-query'

import { useState,Suspense } from 'react'
import { Search,Phone,Clock,Calendar as CalendarIcon,RefreshCcw,User,ChevronDown,X } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useRouter,useSearchParams } from 'next/navigation'
import { fetchCallRecordingAction } from '@/app/actions/call'
import { toast } from 'react-hot-toast'

function CallHistoryContent({ initialPage, isAdmin }: { initialPage: CallPage, isAdmin: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')
  
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    startParam ? new Date(startParam) : null,
    endParam ? new Date(endParam) : null
  ])
  const [startDate, endDate] = dateRange

  const [selectedCaller, setSelectedCaller] = useState<string>('ALL')
  const [pageData,sentinel]=useInfinitePage(initialPage,{mode:'HISTORY' as const,search:searchTerm,caller:selectedCaller,...dateBounds('custom',startDate,endDate||startDate),size:50},getCallPage)
  const [calls,setCalls]=useEditableRows(pageData.rows)
  const [fetchingId, setFetchingId] = useState<string | null>(null)


  const uniqueCallers=pageData.callers

  const handleDateChange = (update: [Date | null, Date | null]) => {
    setDateRange(update)
    const [start, end] = update
    
    if (start && end) {
      const sYear = start.getFullYear();
      const sMonth = String(start.getMonth() + 1).padStart(2, '0');
      const sDay = String(start.getDate()).padStart(2, '0');
      
      const eYear = end.getFullYear();
      const eMonth = String(end.getMonth() + 1).padStart(2, '0');
      const eDay = String(end.getDate()).padStart(2, '0');
      
      router.push(`?start=${sYear}-${sMonth}-${sDay}&end=${eYear}-${eMonth}-${eDay}`)
    } else if (start && !end) {
      // Just one date selected so far, do not trigger search yet (user is picking range)
    } else {
      router.push('?')
    }
  }

  const handleReset = () => {
    setDateRange([null, null])
    setSearchTerm('')
    setSelectedCaller('ALL')
    router.push('?')
  }

  const hasActiveFilters = startDate || endDate || searchTerm || selectedCaller !== 'ALL'

  const handleFetchRecording = async (refId: string, id: string) => {
    if (!refId) {
      toast.error('No reference ID available to fetch recording.');
      return;
    }
    setFetchingId(id)
    try {
      const res = await fetchCallRecordingAction(refId)
      if (res.error) {
        toast.error(res.error)
      } else if (res.success && res.url) {
        toast.success('Recording fetched successfully!')
        setCalls(prev => prev.map(c => c.id === id ? { ...c, recordingUrl: res.url } : c))
      }
    } catch {
      toast.error('An error occurred while fetching recording.')
    } finally {
      setFetchingId(null)
    }
  }

  const filteredCalls=calls

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const getStatusColor = (status: string) => {
    switch(status?.toUpperCase()) {
      case 'COMPLETED': return '#10b981' // emerald-500
      case 'MISSED': return '#f43f5e' // rose-500
      case 'NO-ANSWER': return '#f59e0b' // amber-500
      case 'FAILED': return '#ef4444' // red-500
      default: return '#6b7280' // gray-500
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--card-bg)', borderRadius: '12px', padding: '20px', border: '1px solid var(--card-border)' }}>
      <style>{`
        .call-history-datepicker {
          width: 100%; padding: 8px 12px 8px 36px !important; border-radius: 8px !important;
          border: 1px solid var(--card-border) !important; background: rgba(0,0,0,0.2) !important;
          color: var(--text-primary) !important; outline: none !important; font-size: 0.9rem !important;
          transition: all 0.2s ease;
          cursor: pointer !important;
        }
        .call-history-datepicker:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important;
        }
        .react-datepicker {
          background-color: #1e1e2d !important;
          border: 1px solid var(--card-border) !important;
          border-radius: 12px !important;
          font-family: inherit !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5) !important;
          overflow: hidden;
        }
        .react-datepicker__header {
          background-color: rgba(0, 0, 0, 0.2) !important;
          border-bottom: 1px solid var(--card-border) !important;
          padding-top: 12px !important;
        }
        .react-datepicker__current-month {
          color: var(--text-primary) !important;
          font-weight: 600 !important;
          font-size: 1rem !important;
          padding-bottom: 8px !important;
        }
        .react-datepicker__day-name {
          color: var(--text-muted) !important;
          font-weight: 500 !important;
        }
        .react-datepicker__day {
          color: var(--text-secondary) !important;
          border-radius: 6px !important;
        }
        .react-datepicker__day:hover {
          background-color: rgba(99, 102, 241, 0.2) !important;
          color: var(--text-primary) !important;
        }
        .react-datepicker__day--selected, .react-datepicker__day--keyboard-selected, 
        .react-datepicker__day--in-range, .react-datepicker__day--in-selecting-range {
          background-color: var(--primary) !important;
          color: white !important;
          font-weight: 600 !important;
        }
        .react-datepicker__day--in-range:not(.react-datepicker__day--range-start):not(.react-datepicker__day--range-end) {
          background-color: rgba(99, 102, 241, 0.3) !important;
          color: var(--text-primary) !important;
        }
        .react-datepicker__day--outside-month {
          color: var(--text-muted) !important;
          opacity: 0.5;
        }
        .react-datepicker__navigation-icon::before {
          border-color: var(--text-muted) !important;
        }
        .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
          border-color: var(--text-primary) !important;
        }
        .react-datepicker-popper[data-placement^=bottom] .react-datepicker__triangle::before,
        .react-datepicker-popper[data-placement^=bottom] .react-datepicker__triangle::after {
          border-bottom-color: #1e1e2d !important;
        }
        .react-datepicker-popper[data-placement^=top] .react-datepicker__triangle::before,
        .react-datepicker-popper[data-placement^=top] .react-datepicker__triangle::after {
          border-top-color: #1e1e2d !important;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
          Call Logs
          <span style={{ background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 500 }}>
            {pageData.total}
          </span>
        </h2>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
            <div style={{ position: 'relative', width: '200px' }}>
              <CalendarIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
            <DatePicker 
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateChange}
              placeholderText="Filter by Date Range..."
              isClearable
              dateFormat="dd MMM yyyy"
              className="call-history-datepicker"
              wrapperClassName="date-picker-wrapper"
            />
          </div>

          {isAdmin && uniqueCallers.length > 0 && (
            <div style={{ position: 'relative', width: '180px' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <select 
                value={selectedCaller}
                onChange={e => setSelectedCaller(e.target.value)}
                style={{
                  width: '100%', padding: '8px 36px', borderRadius: '8px',
                  border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)',
                  color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem',
                  appearance: 'none', WebkitAppearance: 'none'
                }}
              >
                <option value="ALL">All Callers</option>
                {uniqueCallers.map(caller => (
                  <option key={caller as string} value={caller as string}>{caller as string}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            </div>
          )}

          <div style={{ position: 'relative', width: '300px', flexGrow: 1, maxWidth: '400px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search lead ID, number, or caller..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px',
                border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)',
                color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem'
              }}
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleReset}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s', height: '100%', minHeight: '38px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            >
              <X size={16} /> Reset
            </button>
          )}
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'var(--background)', position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>DATE & TIME</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>LEAD ID</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>LEAD INFO</th>
              {isAdmin && (
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>CALLER</th>
              )}
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>STATUS</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>DURATION</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>RECORDING</th>
            </tr>
          </thead>
          <tbody>
            {pageData.total === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No call records found.
                </td>
              </tr>
            ) : (
              filteredCalls.map(call => (
                <tr key={call.id} style={{ borderBottom: '1px solid var(--table-border)', background: 'transparent' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {new Date(call.createdAt).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', hour12: true
                    })}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#d8b4fe', fontSize: '0.9rem', fontWeight: 600 }}>
                    <span style={{ background: '#3b0764', padding: '2px 8px', borderRadius: '4px' }}>
                      {call.lead?.uniqueId || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500 }}>{call.lead?.name || '-'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Phone size={12} /> {call.lead?.mobileNumber || '-'}
                    </div>
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {call.user?.name || '-'}
                    </td>
                  )}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      color: getStatusColor(call.status), 
                      background: `${getStatusColor(call.status)}20`,
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600
                    }}>
                      {call.status || 'UNKNOWN'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} color="var(--text-muted)" />
                      {formatDuration(call.duration)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {call.recordingUrl ? (
                      <audio controls src={call.recordingUrl} style={{ height: '32px', width: '200px' }} />
                    ) : (
                      <button
                        onClick={() => handleFetchRecording(call.smartfloRefId, call.id)}
                        disabled={fetchingId === call.id}
                        style={{
                          background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none',
                          padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 500,
                          cursor: fetchingId === call.id ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        <RefreshCcw size={14} className={fetchingId === call.id ? "animate-spin" : ""} />
                        {fetchingId === call.id ? 'Fetching...' : 'Fetch Recording'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
            <tr ref={sentinel} aria-hidden="true" style={{height:0}} />
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function CallHistoryClient(props: { initialPage: CallPage, isAdmin: boolean }) {
  return (
    <Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-muted)' }}>Loading...</div>}>
      <CallHistoryContent {...props} />
    </Suspense>
  )
}
