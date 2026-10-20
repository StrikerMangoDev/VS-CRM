'use client'

import { useState } from 'react';
import { loginAction } from '../actions/auth';
import MathBackground from '@/components/MathBackground';

const DEMO_ACCOUNTS = [
  // Leadership
  { role: 'Super Admin', category: 'LEADERSHIP', email: 'admin@vscrm.com', badge: 'ADMIN', color: '#3b82f6', desc: 'Full System Access' },
  { role: 'Manager', category: 'LEADERSHIP', email: 'manager@vscrm.com', badge: 'MANAGER', color: '#8b5cf6', desc: 'Social Media & Reports' },
  
  // Sales & Operations
  { role: 'Sales TL', category: 'SALES', email: 'sales-tl@vscrm.com', badge: 'TL', color: '#0ea5e9', desc: 'Sales Team Leader' },
  { role: 'Sales Exec', category: 'SALES', email: 'sales@vscrm.com', badge: 'EXEC', color: 'var(--success)', desc: 'Sales Working Space' },
  { role: 'Recovery Exec', category: 'SALES', email: 'recovery@vscrm.com', badge: 'EXEC', color: '#f59e0b', desc: 'Recovery Working Space' },
  { role: 'Technical Exec', category: 'SALES', email: 'tech@vscrm.com', badge: 'EXEC', color: '#6366f1', desc: 'Tech Working Space & Queue' },

  // Social Media Team
  { role: 'Social Media TL', category: 'SOCIAL', email: 'social-tl@vscrm.com', badge: 'TL', color: '#14b8a6', desc: 'Editing Team Leader' },
  { role: 'Video Editor', category: 'SOCIAL', email: 'editor@vscrm.com', badge: 'EXEC', color: '#ec4899', desc: 'Editor Working Sheet' },
  { role: 'Graphic Designer', category: 'SOCIAL', email: 'graphics@vscrm.com', badge: 'EXEC', color: '#a855f7', desc: 'Graphics Working Sheet' },
  { role: 'Posting Exec', category: 'SOCIAL', email: 'posting@vscrm.com', badge: 'EXEC', color: '#06b6d4', desc: 'Posting Sheet' },
  { role: 'Task Exec', category: 'SOCIAL', email: 'other@vscrm.com', badge: 'EXEC', color: 'var(--text-muted)', desc: 'Other Team (Tasks)' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('ALL')

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    const result = await loginAction(formData)
    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      window.location.href = '/performance'
    }
  }

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('123456')
    setError(null)
  }

  const filteredAccounts = filterCategory === 'ALL' 
    ? DEMO_ACCOUNTS 
    : DEMO_ACCOUNTS.filter(a => a.category === filterCategory)

  const selectedAccount = DEMO_ACCOUNTS.find(a => a.email === email)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: '#070d18', position: 'relative' }}>
      <MathBackground />
      <div className="glass-panel" style={{ 
        position: 'relative',
        zIndex: 10,
        maxWidth: '960px', 
        width: '100%', 
        padding: '32px', 
        borderRadius: '20px', 
        border: '1px solid var(--card-border)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '48px'
      }}>
        {/* Left Column - Login Form */}
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <img 
              src="/logo.png" 
              alt="Logo" 
              style={{ 
                width: '56px', height: '56px', 
                borderRadius: '12px', 
                objectFit: 'contain',
                background: 'var(--text-primary)',
                boxShadow: '0 8px 20px rgba(59, 130, 246, 0.35)',
                marginBottom: '16px'
              }} 
            />
            <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>VS CRM</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>Login to access your dashboard</p>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', marginBottom: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', borderRadius: '10px', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px', fontWeight: 500 }}>Email Address</label>
              <input 
                name="email"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@vscrm.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Password</label>
                <a href="/forgot-password" style={{ color: '#3b82f6', fontSize: '0.875rem', textDecoration: 'none' }}>Forgot Password?</a>
              </div>
              <input 
                name="password"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ 
                padding: '12px', 
                marginTop: '4px',
                fontWeight: 600,
                fontSize: '0.95rem',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {selectedAccount ? `Sign In as ${selectedAccount.role}` : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Vertical Divider for desktop */}
        <div style={{ 
          width: '1px', 
          background: 'var(--table-hover)', 
          margin: '0', 
          display: 'block' 
        }} className="hidden md:block" />

        {/* Right Column - Demo Accounts */}
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>
              DEMO ACCOUNTS
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Click to auto-fill</span>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Roles' },
              { id: 'LEADERSHIP', label: 'Admin / Mgr' },
              { id: 'SALES', label: 'Sales & Tech' },
              { id: 'SOCIAL', label: 'Social Media' }
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.id)}
                style={{
                  background: filterCategory === cat.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  border: filterCategory === cat.id ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.06)',
                  color: filterCategory === cat.id ? '#93c5fd' : 'var(--text-muted)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Accounts Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px', 
            maxHeight: '340px', 
            overflowY: 'auto',
            paddingRight: '6px'
          }}>
            {filteredAccounts.map(item => {
              const isSelected = email === item.email
              return (
                <button
                  key={item.email}
                  type="button"
                  onClick={() => fillDemo(item.email)}
                  title={`Click to fill ${item.email}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    gap: '6px'
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)'
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '4px' }}>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.role}
                    </span>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      fontWeight: 700, 
                      color: item.color, 
                      background: `${item.color}20`, 
                      padding: '2px 6px', 
                      borderRadius: '6px',
                      letterSpacing: '0.5px',
                      flexShrink: 0
                    }}>
                      {item.badge}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                    {item.email}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

