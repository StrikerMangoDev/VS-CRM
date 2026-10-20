'use client'

import { useState,Suspense } from 'react'
import { useRouter,useSearchParams } from 'next/navigation'
import { resetPassword } from '../actions/auth'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams=useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email')||'')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<{type: 'error' | 'success', msg: string} | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', msg: 'Passwords do not match.' })
      return
    }

    setLoading(true)
    setStatus(null)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('otp', otp)
    formData.append('newPassword', newPassword)

    const result = await resetPassword(formData)
    
    if (result?.error) {
      setStatus({ type: 'error', msg: result.error })
      setLoading(false)
    } else if (result?.success) {
      setStatus({ type: 'success', msg: 'Password reset successful! Redirecting to login...' })
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>Reset Password</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Enter your OTP and new password</p>
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
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Email Address</label>
            <input 
              name="email"
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@vscrm.com"
              required
              readOnly={!!email}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
                background: email ? 'rgba(0, 0, 0, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                color: email ? 'var(--text-muted)' : 'var(--text-primary)',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>6-Digit OTP</label>
            <input 
              name="otp"
              type="text" 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                outline: 'none',
                fontFamily: 'inherit',
                letterSpacing: '2px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>New Password</label>
            <input 
              name="newPassword"
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
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

          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '8px' }}>Confirm New Password</label>
            <input 
              name="confirmPassword"
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
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
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <a href="/login" style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none' }}>
            &larr; Back to Login
          </a>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage(){return <Suspense fallback={null}><ResetPasswordForm/></Suspense>}
