'use client'

import { useState } from 'react'
import { sendResetOtp } from '../actions/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<{type: 'error' | 'success', msg: string, url?: string} | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    setStatus(null)
    const result = await sendResetOtp(formData)
    
    if (result?.error) {
      setStatus({ type: 'error', msg: result.error })
    } else if (result?.success) {
      setStatus({ type: 'success', msg: 'OTP has been sent to your email address.', url: result.previewUrl || undefined })
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>Forgot Password</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Enter your email to receive an OTP</p>
        </div>

        {status && (
          <div style={{ 
            padding: '12px', 
            marginBottom: '16px', 
            background: status.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)', 
            color: status.type === 'error' ? '#f87171' : '#34d399', 
            borderRadius: '8px', 
            fontSize: '0.875rem' 
          }}>
            {status.msg}
            {status.url && (
              <div style={{ marginTop: '8px' }}>
                <a href={status.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                  [Dev Only] Click here to view OTP Email
                </a>
              </div>
            )}
          </div>
        )}

        {status?.type === 'success' ? (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <a href={`/reset-password?email=${encodeURIComponent(email)}`} className="btn btn-primary" style={{ padding: '12px 24px', display: 'inline-block', textDecoration: 'none' }}>
              Proceed to Reset Password
            </a>
          </div>
        ) : (
          <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Email Address</label>
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
                  borderRadius: '8px',
                  border: '1px solid var(--card-border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '12px', marginTop: '8px', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a href="/login" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}>
            &larr; Back to Login
          </a>
        </div>
      </div>
    </div>
  )
}
