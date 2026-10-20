'use client'

import { useState } from 'react';
import { Trophy,AlertTriangle,AlertCircle,Phone,Video,IndianRupee } from 'lucide-react';

export default function IncentiveTable({ data, config }: { data: {id:string;name:string;email:string;webinarDays:number;callingMins:number;revenue:number;totalAchievement:number;status:string;incentiveAmount:number}[], config: import('@prisma/client').IncentiveConfiguration }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredData = data.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PIP': return 'rgba(239, 68, 68, 0.1)';
      case 'NO INCENTIVE': return 'rgba(245, 158, 11, 0.1)';
      case 'ACHIEVED': return 'rgba(16, 185, 129, 0.1)';
      default: return 'rgba(148, 163, 184, 0.1)';
    }
  }

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'PIP': return '#ef4444';
      case 'NO INCENTIVE': return '#f59e0b';
      case 'ACHIEVED': return '#10b981';
      default: return 'var(--text-muted)';
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Trophy size={32} style={{ color: 'var(--success)' }} />
            Incentive Analytics
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem' }}>
            Monthly performance and incentive payouts for the Sales Team.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <input 
            type="text" 
            placeholder="Search executive..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '10px 16px',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              outline: 'none',
              width: '250px'
            }}
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IndianRupee size={24} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Payout</div>
            <div style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700 }}>
              ₹{data.reduce((acc, curr) => acc + curr.incentiveAmount, 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={24} style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Achievers</div>
            <div style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700 }}>
              {data.filter(d => d.status === 'ACHIEVED').length}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In PIP</div>
            <div style={{ color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700 }}>
              {data.filter(d => d.status === 'PIP').length}
            </div>
          </div>
        </div>

      </div>

      {/* Main Table */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--card-border)' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Executive</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Webinar</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calling</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Achievement</th>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payout</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((exec, idx) => (
                <tr key={exec.id} style={{ borderBottom: '1px solid var(--card-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.95rem' }}>{exec.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{exec.email}</div>
                  </td>
                  
                  {/* Webinar Progress */}
                  <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Video size={14} style={{ color: '#8b5cf6' }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{exec.webinarDays} / {config.webinarTarget} days</span>
                    </div>
                    <div style={{ width: '100%', background: 'var(--table-hover)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (exec.webinarDays / config.webinarTarget) * 100)}%`, background: '#8b5cf6', height: '100%', borderRadius: '3px' }}></div>
                    </div>
                  </td>
                  
                  {/* Calling Progress */}
                  <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Phone size={14} style={{ color: '#0ea5e9' }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{exec.callingMins} / {config.callingTarget} mins</span>
                    </div>
                    <div style={{ width: '100%', background: 'var(--table-hover)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (exec.callingMins / config.callingTarget) * 100)}%`, background: '#0ea5e9', height: '100%', borderRadius: '3px' }}></div>
                    </div>
                  </td>
                  
                  {/* Revenue Progress */}
                  <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <IndianRupee size={14} style={{ color: 'var(--success)' }} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>₹{exec.revenue.toLocaleString()}</span>
                    </div>
                    <div style={{ width: '100%', background: 'var(--table-hover)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (exec.revenue / config.revenueTarget) * 100)}%`, background: '#10b981', height: '100%', borderRadius: '3px' }}></div>
                    </div>
                  </td>
                  
                  {/* Total Achievement */}
                  <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{exec.totalAchievement.toFixed(1)}%</div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '6px', 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      background: getStatusColor(exec.status),
                      color: getStatusTextColor(exec.status),
                      border: `1px solid ${getStatusColor(exec.status).replace('0.1', '0.2')}`
                    }}>
                      {exec.status}
                    </span>
                  </td>

                  {/* Payout */}
                  <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: exec.incentiveAmount > 0 ? '#10b981' : 'var(--text-muted)' }}>
                      ₹{exec.incentiveAmount.toLocaleString()}
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <AlertCircle size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>No executives found matching your search.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
