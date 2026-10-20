'use client'

import { useState,useEffect } from 'react'
import { createLeadAction } from '@/app/actions/lead'
import { getWebinarOptionsAction } from '@/app/actions/webinar'
import toast from 'react-hot-toast'

export default function NewLeadButton({ defaultPaymentStatus = 'NO_PAYMENT' }: { defaultPaymentStatus?: string; dropdowns?: Record<string, string[]> }) {
  const [isOpen, setIsOpen] = useState(false)
  const [webinars, setWebinars] = useState<{id: string, name: string}[]>([])

  useEffect(() => {
    if (isOpen) {
      getWebinarOptionsAction().then(setWebinars).catch(console.error)
    }
  }, [isOpen])

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-primary">
        + New Lead
      </button>

      {isOpen && (
        <div style={modalOverlayStyle}>
          <div className="glass-panel" style={modalContentStyle}>
            <h2 style={modalHeaderStyle}>Create New Master Entry</h2>
            
            <form action={async (formData) => {
              try {
                await createLeadAction(formData)
                toast.success('Lead created successfully')
                setIsOpen(false)
              } catch(e) {
                toast.error((e instanceof Error ? e.message : String(e)) || 'Failed to create lead')
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="hidden" name="paymentStatus" value={defaultPaymentStatus} />
              
              <div>
                <label style={labelStyle}>Full Name</label>
                <input name="name" type="text" placeholder="e.g. John Doe" required style={inputStyle} />
              </div>
              
              <div>
                <label style={labelStyle}>Webinar ID</label>
                <select name="webinarId" style={inputStyle} required>
                  <option value="">Select Webinar</option>
                  {webinars.map(w => (
                    <option key={w.id} value={w.id}>{w.id} - {w.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={labelStyle}>Email Address</label>
                <input name="email" type="email" placeholder="e.g. john@example.com" style={inputStyle} required />
              </div>

              <div>
                <label style={labelStyle}>State</label>
                <input name="state" type="text" placeholder="e.g. Maharashtra" style={inputStyle} required />
              </div>

              <div>
                <label style={labelStyle}>Mobile Number</label>
                <input 
                  name="mobileNumber" 
                  type="tel" 
                  pattern="[0-9\+\s\-]+" 
                  title="Only numbers are allowed" 
                  placeholder="e.g. 9876543210" 
                  required 
                  style={inputStyle} 
                />
              </div>

              {defaultPaymentStatus === 'PART_PAYMENT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={labelStyle}>Part Payment</label>
                  <select name="totalPayment" style={inputStyle} required>
                    <option value="">Select Amount</option>
                    <option value="4000">4000</option>
                    <option value="8000">8000</option>
                  </select>
                </div>
              )}
              {defaultPaymentStatus === 'FULL_PAYMENT' && (
                <div>
                  <label style={labelStyle}>Full Payment</label>
                  <select name="totalPayment" style={inputStyle} required defaultValue="15999">
                    <option value="15999">15999</option>
                  </select>
                </div>
              )}

              <div style={modalActionRowStyle}>
                <button type="button" onClick={() => setIsOpen(false)} className="btn" style={{ background: 'transparent', color: 'var(--text-muted)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid var(--card-border)',
  background: 'var(--card-bg)',
  color: 'var(--foreground)',
  outline: 'none',
  fontFamily: 'inherit'
}

const labelStyle = {
  display: 'block',
  color: 'var(--text-muted)',
  fontSize: '0.875rem',
  marginBottom: '8px'
}

const modalOverlayStyle = {
  position: 'fixed' as const, 
  inset: 0, 
  zIndex: 9999, 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.6)', 
  backdropFilter: 'blur(4px)'
}

const modalContentStyle = {
  width: '100%', 
  maxWidth: '500px', 
}

const modalHeaderStyle = {
  color: 'var(--foreground)', 
  marginBottom: '1.5rem', 
  fontSize: '1.25rem', 
  fontWeight: 600
}

const modalActionRowStyle = {
  display: 'flex', 
  gap: '12px', 
  justifyContent: 'flex-end', 
  marginTop: '16px', 
  borderTop: '1px solid var(--card-border)', 
  paddingTop: '16px'
}
