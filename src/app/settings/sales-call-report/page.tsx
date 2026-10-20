'use client'

import React,{ useState,useEffect } from 'react'
import { getSalesCallReportAction,SalesCallReportRow } from '@/app/actions/reports'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Calendar,PhoneCall,PhoneForwarded,AlarmClock,Clock,Phone,PhoneOff,CheckCircle,CircleDashed,User,Hash,RefreshCw,ChevronDown } from 'lucide-react'

const CustomDateInput = React.forwardRef<HTMLButtonElement,import('@/lib/view-types').DateButtonProps>(({ value, onClick }, ref) => (
  <button 
    onClick={onClick} 
    ref={ref}
    className="dashboard-filter-btn"
    style={{ background: '#131b2f', border: '1px solid rgba(51, 65, 85, 0.5)', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontSize: '14px', cursor: 'pointer' }}
  >
    <Calendar size={16} className="text-slate-400" />
    <span>{value || 'Select Date'}</span>
    <ChevronDown size={14} className="text-slate-400 ml-2" />
  </button>
));
CustomDateInput.displayName = 'CustomDateInput';

export default function SalesCallReportPage() {
  const [reportData, setReportData] = useState<SalesCallReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  useEffect(() => {
    let active=true
    getSalesCallReportAction(selectedDate.toISOString()).then(data=>{if(active)setReportData(data)}).catch(error=>console.error('Failed to fetch report:',error)).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  }, [selectedDate])

  

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  return (
    <div className="flex flex-col h-full bg-[#0b1121] text-slate-200">
      <div className="p-6 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PhoneCall className="text-indigo-400" />
            Sales Call Report
          </h1>
          <p className="text-slate-400 text-sm mt-1">Daily calling performance and follow-up metrics</p>
        </div>
        
        <div>
          <DatePicker
            selected={selectedDate}
            onChange={(date: Date | null) => date && (setLoading(true),setSelectedDate(date))}
            dateFormat="MMM d, yyyy"
            customInput={<CustomDateInput />}
            maxDate={new Date()}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="bg-[#131b2f] rounded-xl border border-slate-700/50 flex flex-col shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              Loading report...
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No sales executives found or no data available.
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)' }}>
                    <th className="px-4 py-3 text-[13px] font-semibold text-slate-300" style={{ textTransform: 'none', letterSpacing: 'normal', color: 'var(--text-secondary)', background: 'rgba(26, 35, 58, 1)' }}>
                      <div className="flex items-center gap-1.5">
                        <Hash size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-[13px] font-semibold text-slate-300" style={{ textTransform: 'none', letterSpacing: 'normal', color: 'var(--text-secondary)', background: 'rgba(26, 35, 58, 1)' }}>
                      <div className="flex items-center gap-1.5">
                        <User size={14} style={{ color: 'var(--text-muted)' }} />
                        Executive Name
                      </div>
                    </th>
                    <th className="px-4 py-3 text-[13px] font-semibold text-slate-300" style={{ textTransform: 'none', letterSpacing: 'normal', color: 'var(--text-secondary)', background: 'rgba(26, 35, 58, 1)' }}>
                      <div className="flex items-center gap-1.5">
                        <PhoneCall size={14} style={{ color: 'var(--primary)' }} />
                        Total Calls
                      </div>
                    </th>
                    <th className="px-4 py-3 text-[13px] font-semibold text-slate-300" style={{ textTransform: 'none', letterSpacing: 'normal', color: 'var(--text-secondary)', background: 'rgba(26, 35, 58, 1)' }}>
                      <div className="flex items-center gap-1.5">
                        <Phone size={14} style={{ color: 'var(--success)' }} />
                        Connected
                      </div>
                    </th>
                    <th className="px-4 py-3 text-[13px] font-semibold text-slate-300" style={{ textTransform: 'none', letterSpacing: 'normal', color: 'var(--text-secondary)', background: 'rgba(26, 35, 58, 1)' }}>
                      <div className="flex items-center gap-1.5">
                        <PhoneOff size={14} style={{ color: '#fb7185' }} />
                        Not Connected
                      </div>
                    </th>
                    <th className="px-4 py-3 text-[13px] font-semibold text-slate-300" style={{ textTransform: 'none', letterSpacing: 'normal', color: 'var(--text-secondary)', background: 'rgba(26, 35, 58, 1)' }}>
                      <div className="flex items-center gap-1.5">
                        <CircleDashed size={14} style={{ color: 'var(--warning)' }} />
                        Untouched
                      </div>
                    </th>
                    <th className="px-4 py-3 text-[13px] font-semibold text-slate-300" style={{ textTransform: 'none', letterSpacing: 'normal', color: 'var(--text-secondary)', background: 'rgba(26, 35, 58, 1)' }}>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle size={14} style={{ color: 'var(--primary)' }} />
                        Closed
                      </div>
                    </th>
                    <th className="px-4 py-3 text-[13px] font-semibold text-slate-300" style={{ textTransform: 'none', letterSpacing: 'normal', color: 'var(--text-secondary)', background: 'rgba(26, 35, 58, 1)' }}>
                      <div className="flex items-center gap-1.5">
                        <PhoneForwarded size={14} style={{ color: '#22d3ee' }} />
                        Follow-ups Today
                      </div>
                    </th>
                    <th className="px-4 py-3 text-[13px] font-semibold text-slate-300" style={{ textTransform: 'none', letterSpacing: 'normal', color: 'var(--text-secondary)', background: 'rgba(26, 35, 58, 1)' }}>
                      <div className="flex items-center gap-1.5">
                        <AlarmClock size={14} style={{ color: '#f472b6' }} />
                        Due Follow-ups
                      </div>
                    </th>
                    <th className="px-4 py-3 text-[13px] font-semibold text-slate-300" style={{ textTransform: 'none', letterSpacing: 'normal', color: 'var(--text-secondary)', background: 'rgba(26, 35, 58, 1)' }}>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                        Avg Call Duration
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr 
                      key={row.userId} 
                      style={{ 
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(15, 21, 35, 0.5)',
                        borderBottom: '1px solid rgba(51, 65, 85, 0.5)'
                      }}
                      className="hover:bg-[#1a233a] transition-colors"
                    >
                      <td className="px-4 py-3 text-[13px] font-medium text-slate-500 pl-5">{idx + 1}</td>
                      <td className="px-4 py-3 text-[13px] font-medium text-slate-200">{row.executiveName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold min-w-[32px]" style={{ background: 'rgba(59, 130, 246, 0.25)', color: 'var(--primary)' }}>
                          {row.totalCalls}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold min-w-[32px]" style={{ background: 'rgba(16, 185, 129, 0.25)', color: 'var(--success)' }}>
                          {row.callConnected}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold min-w-[32px]" style={{ background: 'rgba(244, 63, 94, 0.25)', color: '#fb7185' }}>
                          {row.callNotConnected}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold min-w-[32px]" style={{ background: 'rgba(245, 158, 11, 0.25)', color: 'var(--warning)' }}>
                          {row.totalUntouched}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold min-w-[32px]" style={{ background: 'rgba(168, 85, 247, 0.25)', color: 'var(--primary)' }}>
                          {row.totalClosed}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold min-w-[32px]" style={{ background: 'rgba(6, 182, 212, 0.25)', color: '#22d3ee' }}>
                          {row.followUpsToday}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold min-w-[32px]" style={{ background: row.dueFollowUps > 0 ? 'rgba(236, 72, 153, 0.25)' : 'rgba(148, 163, 184, 0.25)', color: row.dueFollowUps > 0 ? '#f472b6' : 'var(--text-muted)' }}>
                          {row.dueFollowUps}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center px-3 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(148, 163, 184, 0.25)', color: 'var(--text-secondary)' }}>
                          {formatDuration(row.averageCallingTimeSeconds)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="px-5 py-3 text-xs text-slate-400" style={{ background: '#131b2f', borderTop: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                Showing {reportData.length} executives &bull; Data for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={12} />
                Last updated: Just now
              </div>
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
