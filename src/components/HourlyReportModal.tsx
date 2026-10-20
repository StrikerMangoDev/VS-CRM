'use client'

import { useState,useEffect } from 'react'
import { X,Calendar as CalendarIcon,User } from 'lucide-react'
import { BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip as RechartsTooltip,ResponsiveContainer,Legend } from 'recharts'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { getHourlyLoginReportAction } from '@/app/actions/reports'
import { toast } from 'react-hot-toast'

export default function HourlyReportModal({ 
  onClose, 
  uniqueCallers, 
  initialUser 
}: { 
  onClose: () => void, 
  uniqueCallers: string[], 
  initialUser: string 
}) {
  const [reportDate, setReportDate] = useState<Date | null>(new Date())
  const [reportUser, setReportUser] = useState<string>(initialUser === 'ALL' ? (uniqueCallers[0] || '') : initialUser)
  const [loading, setLoading] = useState(Boolean(initialUser==='ALL'?uniqueCallers[0]:initialUser))
  const [data, setData] = useState<Awaited<ReturnType<typeof getHourlyLoginReportAction>>>({ hourlyData: [], loginData: null, userName: '' })

  const fetchReport = async () => {
    if (!reportDate || !reportUser) {
      toast.error('Please select both User and Date')
      return
    }
    setLoading(true)
    try {
      const dateStr = `${reportDate.getFullYear()}-${String(reportDate.getMonth() + 1).padStart(2, '0')}-${String(reportDate.getDate()).padStart(2, '0')}`
      const res = await getHourlyLoginReportAction(reportUser, dateStr)
      setData(res)
    } catch (e) {
      toast.error((e instanceof Error ? e.message : String(e)) || 'Error fetching report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{
    const user=initialUser==='ALL'?(uniqueCallers[0]||''):initialUser
    if(!user)return
    const date=new Date(),key=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-')
    let active=true
    getHourlyLoginReportAction(user,key).then(result=>{if(active)setData(result)}).catch(error=>toast.error(error instanceof Error?error.message:'Unable to load report')).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[initialUser,uniqueCallers])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: 'var(--card-bg)', width: '100%', maxWidth: '1000px',
        maxHeight: '90vh', borderRadius: '16px', border: '1px solid var(--card-border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '50%'
            }}>
              <X size={24} />
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Hourly & Login Report</h2>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Hourly Report Card */}
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '24px' }}>
              Hourly Report {reportDate ? `(${reportDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})` : ''}
            </h3>
            
            {loading ? (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : (
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.hourlyData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                    <XAxis dataKey="hourLabel" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                      contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="connected" name="Connected" stackId="a" fill="var(--primary)" barSize={40} />
                    <Bar dataKey="notConnected" name="Not Connected" stackId="a" fill="#64748b" barSize={40} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Login Report Filters Card */}
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px' }}>
              Login Report
            </h3>
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>User *</label>
                <div style={{ position: 'relative', width: '250px' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <select 
                    value={reportUser}
                    onChange={e => setReportUser(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 36px', borderRadius: '8px',
                      border: '1px solid var(--card-border)', background: 'var(--card-bg)',
                      color: 'var(--text-primary)', outline: 'none', fontSize: '0.9rem',
                      appearance: 'none', WebkitAppearance: 'none'
                    }}
                  >
                    {uniqueCallers.map(caller => (
                      <option key={caller} value={caller}>{caller}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date *</label>
                <div style={{ position: 'relative', width: '250px' }}>
                  <CalendarIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                  <DatePicker 
                    selected={reportDate}
                    onChange={(date: Date | null) => setReportDate(date)}
                    dateFormat="dd/MM/yyyy"
                    className="call-history-datepicker"
                    wrapperClassName="date-picker-wrapper"
                    // Inline styles applied globally in CallHistoryClient
                  />
                </div>
              </div>

              <button 
                onClick={fetchReport}
                disabled={loading}
                style={{
                  padding: '10px 24px', background: 'var(--primary)', color: 'white',
                  borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 500, fontSize: '0.9rem'
                }}
              >
                Go
              </button>
            </div>

            {/* Login Data Summary if available */}
            {data.loginData && (
              <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px', display: 'flex', gap: '24px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>First Login</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {new Date(data.loginData.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {data.loginData.endTime && (
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last Logout</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {new Date(data.loginData.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Active Hours</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {(data.loginData.totalActiveSeconds / 3600).toFixed(1)} hrs
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  )
}
