'use client'

import { useState } from 'react';
import { loginAction } from '../actions/auth';
import MathBackground from '@/components/MathBackground';

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    const result = await loginAction(formData)
    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      window.location.href = '/performance'
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: '#070d18', position: 'relative' }}>
      <MathBackground />
      <div className="glass-panel" style={{ 
        position: 'relative',
        zIndex: 10,
        maxWidth: '440px', 
        width: '100%', 
        padding: '36px 32px', 
        borderRadius: '20px', 
        border: '1px solid var(--card-border)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
      }}>
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
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '6px' }}>Login to access your dashboard</p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', marginBottom: '20px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', borderRadius: '10px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
              marginTop: '6px',
              fontWeight: 600,
              fontSize: '0.95rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%'
            }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}
