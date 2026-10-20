'use client'

import React,{ useState,useEffect,useCallback } from 'react'
import { updateLeadCompleteAction } from '@/app/actions/lead'
import { MessageSquare,Send,Check } from 'lucide-react'
import { getWhatsAppTemplatesAction,updateLeadWhatsAppTemplateAction } from '@/app/actions/whatsappTemplate'

export default function EditLeadModal({ 
  lead, 
  onClose, 
  isAdmin = false,
  updaterDepartment = 'SALES',
  dropdowns = {},
  onSaveSuccess
}: { 
  lead: Pick<import('@prisma/client').Lead,'id'|'name'|'uniqueId'|'mobileNumber'> & Partial<{[K in keyof import('@prisma/client').Lead]: import('@prisma/client').Lead[K] extends Date|null ? import('@prisma/client').Lead[K]|string : import('@prisma/client').Lead[K]|null} >, 
  onClose: () => void, 
  webinars?: (string|import('@prisma/client').WebinarMaster)[],
  executives?: import('@/lib/view-types').Person[],
  states?: string[],
  isAdmin?: boolean,
  updaterDepartment?: string,
  dropdowns?: Record<string, string[]>,
  onSaveSuccess: (updatedLead: Partial<import('@prisma/client').Lead>&{id:string}) => void
}) {
  const defaultFormData = {
    callStatus: lead.callStatus || 'UNTOUCHED',
    nextFollowUpDate: lead.nextFollowUpDate ? (function() {
      const d = new Date(lead.nextFollowUpDate);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    })() : '',
    remark1: lead.remark1 || '',
    remark2: lead.remark2 || '',
    amount1: lead.amount1 || '',
    amount2: lead.amount2 || '',
    amount3: lead.amount3 || '',
    discount: lead.discount || '',
    leadStatus: lead.leadStatus || 'IN_PROGRESS'
  }
  
  const [formData, setFormData] = useState(defaultFormData)
  const [initialFormData, ] = useState(defaultFormData)
  
  // WhatsApp Template in Modal (Sales & Recovery Departments)
  const isSalesDept = updaterDepartment === 'SALES' || updaterDepartment === 'Sales Department' || updaterDepartment === 'RECOVERY' || isAdmin
  const [whatsappTemplates, setWhatsappTemplates] = useState<import('@prisma/client').WhatsAppTemplate[]>([])
  const [selectedTemplateName, setSelectedTemplateName] = useState(lead.whatsappTemplate || '')
  const [whatsappSentAt, setWhatsappSentAt] = useState<string | Date | null>(lead.whatsappSentAt || null)

  useEffect(() => {
    if (isSalesDept) {
      getWhatsAppTemplatesAction().then(res => {
        if (res.success && res.templates) {
          setWhatsappTemplates(res.templates)
        }
      }).catch(err => console.error(err))
    }
  }, [isSalesDept])

  const personalizeMessage = (templateText: string) => {
    if (!templateText) return ''
    return templateText
      .replace(/\{name\}/g, lead.name || '')
      .replace(/\{mobile\}/g, lead.mobileNumber || '')
      .replace(/\{email\}/g, lead.email || '')
      .replace(/\{webinarId\}/g, lead.webinarId || '')
      .replace(/\{state\}/g, lead.state || '')
      .replace(/\{amount\}/g, lead.partPaymentAmount ? `₹${lead.partPaymentAmount}` : (lead.totalPayment ? `₹${lead.totalPayment}` : ''));
  }

  const activeTemplate = whatsappTemplates.find((t) => t.name === selectedTemplateName)
  const activeModalMessage = activeTemplate ? personalizeMessage(activeTemplate.message) : ''

  const handleSendWhatsAppModal = async () => {
    if (!activeTemplate) return;

    let phone = (lead.mobileNumber || '').replace(/\D/g, '');
    if (!phone) {
      alert(`Lead "${lead.name}" does not have a valid mobile number.`);
      return;
    }
    if (phone.length === 10) {
      phone = '91' + phone;
    }

    const finalMsg = activeModalMessage;
    const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(finalMsg)}`;

    window.open(waUrl, '_blank');

    try {
      const nowIso = new Date().toISOString();
      await updateLeadWhatsAppTemplateAction(lead.id, selectedTemplateName, true);
      setWhatsappSentAt(nowIso);
    } catch (e) {
      console.error(e);
    }
  }

  const [isSaving, setIsSaving] = useState(false)
  const [showConfirmClose, setShowConfirmClose] = useState(false)

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData)

  const handleCloseRequest = useCallback(() => {
    if (isDirty) {
      setShowConfirmClose(true)
    } else {
      onClose()
    }
  },[isDirty,onClose])

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseRequest();
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [handleCloseRequest])

  const totalAmount = (Number(formData.amount1) || 0) + (Number(formData.amount2) || 0) + (Number(formData.amount3) || 0) 

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      await updateLeadCompleteAction(lead.id, {
        callStatus: formData.callStatus,
        nextFollowUpDate: formData.nextFollowUpDate ? new Date(formData.nextFollowUpDate) : null,
        remark1: formData.remark1,
        remark2: formData.remark2,
        amount1: formData.amount1 ? Number(formData.amount1) : null,
        amount2: formData.amount2 ? Number(formData.amount2) : null,
        amount3: formData.amount3 ? Number(formData.amount3) : null,
        discount: formData.discount ? Number(formData.discount) : null,
        totalPayment: (lead.partPaymentAmount || 0) + (lead.fullPaymentAmount || 0) + (Number(formData.amount1) || 0) + (Number(formData.amount2) || 0) + (Number(formData.amount3) || 0),
        updaterDepartment,
        leadStatus: formData.leadStatus,
        whatsappTemplate: selectedTemplateName || null
      })
      
      // Show success message
      alert('Lead updated successfully.')
      
      // Update local state and close
      onSaveSuccess({
        ...formData,
        id: lead.id,
        whatsappTemplate: selectedTemplateName || null,
        whatsappSentAt: whatsappSentAt ? new Date(whatsappSentAt) : null,
        nextFollowUpDate: formData.nextFollowUpDate ? new Date(formData.nextFollowUpDate) : null,
        amount1: formData.amount1 ? Number(formData.amount1) : null,
        amount2: formData.amount2 ? Number(formData.amount2) : null,
        amount3: formData.amount3 ? Number(formData.amount3) : null,
        discount: formData.discount ? Number(formData.discount) : null,
        totalPayment: (lead.partPaymentAmount || 0) + (lead.fullPaymentAmount || 0) + (Number(formData.amount1) || 0) + (Number(formData.amount2) || 0) + (Number(formData.amount3) || 0)
      })
    } catch (err) {
      console.error(err)
      alert('Failed to save changes.')
    } finally {
      setIsSaving(false)
    }
  }

  // --- STYLING (Compact & No-Scroll Focus) ---
  
  const inputStyle = {
    width: '100%',
    padding: '6px 10px',
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    color: 'var(--text-primary)',
    borderRadius: '4px',
    fontSize: '0.85rem',
    height: '34px',
    outline: 'none',
    boxSizing: 'border-box' as const
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginBottom: '4px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.02em'
  }

  const readOnlyTextStyle = {
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    fontWeight: 500,
    lineHeight: '1.4'
  }

  const sectionStyle = {
    marginBottom: '16px',
    padding: '12px 16px',
    background: 'var(--table-hover)',
    border: '1px solid var(--card-border)',
    borderRadius: '8px'
  }

  const sectionTitleStyle = {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--primary)',
    marginBottom: '12px',
    paddingBottom: '4px',
    borderBottom: '1px solid var(--card-border)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  }

  const grid2Col = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px 16px',
    alignItems: 'start'
  }

  const grid3Col = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px 16px',
    alignItems: 'start'
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '100%', // Prevent overflow beyond the 20px padding
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--card-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--card-bg)',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>View / Edit Lead</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{lead.uniqueId}</span>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ color: 'var(--text-primary)' }}>{lead.name}</span>
              {lead.leadStatus && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    padding: '2px 6px', 
                    borderRadius: '8px',
                    background: lead.leadStatus?.startsWith('CLOSED') ? 'rgba(52, 211, 153, 0.15)' : 'rgba(96, 165, 250, 0.15)',
                    color: lead.leadStatus?.startsWith('CLOSED') ? '#34d399' : '#60a5fa'
                  }}>
                    {lead.leadStatus.replace(/_/g, ' ')}
                  </span>
                </>
              )}
            </div>
          </div>
          <button 
            onClick={handleCloseRequest}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', fontSize: '1.2rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Content Area - MinHeight 0 fixes flexbox overflow issues */}
        <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <form id="editLeadForm" onSubmit={handleSave}>
            
            {/* 1. LEAD & WEBINAR */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>1. LEAD & WEBINAR</div>
              <div style={{...grid2Col, marginBottom: '12px'}}>
                <div>
                  <label style={labelStyle}>Name</label>
                  <div style={readOnlyTextStyle}>{lead.name}</div>
                </div>
                <div>
                  <label style={labelStyle}>Mobile</label>
                  <div style={readOnlyTextStyle}>{lead.mobileNumber}</div>
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <div style={readOnlyTextStyle}>{lead.email || '-'}</div>
                </div>
                <div>
                  <label style={labelStyle}>State</label>
                  <div style={readOnlyTextStyle}>{lead.state || '-'}</div>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Webinar ID</label>
                <div style={readOnlyTextStyle}>
                  {lead.webinarId ? `${lead.webinarId} — ${lead.webinarName || ''}` : '- No Webinar -'}
                </div>
              </div>
            </div>

            {/* 2. FOLLOW-UP & COMMUNICATION */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>2. FOLLOW-UP & COMMUNICATION</div>
              <div style={{...grid2Col, marginBottom: '12px'}}>
                <div>
                  <label style={labelStyle}>Call Status</label>
                  <select name="callStatus" value={formData.callStatus} onChange={handleChange} style={inputStyle}>
                    {dropdowns['Call Status'] && dropdowns['Call Status'].length > 0 ? (
                      dropdowns['Call Status'].map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))
                    ) : (
                      <>
                        <option value="UNTOUCHED">Untouched</option>
                        <option value="CALL_CONNECTED">Call Connected</option>
                        <option value="CALL_NOT_CONNECTED">Call Not Connected</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Next Follow Up</label>
                  <input type="datetime-local" name="nextFollowUpDate" value={formData.nextFollowUpDate} onChange={handleChange} style={{ ...inputStyle, colorScheme: 'dark' }} />
                </div>
              </div>
              
              <div style={grid2Col}>
                <div>
                  <label style={labelStyle}>Remark 1</label>
                  <textarea name="remark1" value={formData.remark1} onChange={handleChange} style={{ ...inputStyle, height: '50px', minHeight: '50px', resize: 'vertical' }} placeholder="Enter remark..." />
                </div>
                <div>
                  <label style={labelStyle}>Remark 2</label>
                  <textarea name="remark2" value={formData.remark2} onChange={handleChange} style={{ ...inputStyle, height: '50px', minHeight: '50px', resize: 'vertical' }} placeholder="Enter remark..." />
                </div>
              </div>

              {/* WhatsApp Message Template in Modal (Sales & Recovery Departments) */}
              {isSalesDept && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80' }}>
                      <MessageSquare size={14} /> WhatsApp Template
                    </label>
                    {whatsappSentAt && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={12} /> Last Sent: {new Date(whatsappSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select
                      value={selectedTemplateName}
                      onChange={(e) => setSelectedTemplateName(e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                    >
                      <option value="">-- Select WhatsApp Template --</option>
                      {whatsappTemplates.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>

                    {selectedTemplateName && (
                      <button
                        type="button"
                        onClick={handleSendWhatsAppModal}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#22c55e',
                          color: 'var(--text-primary)',
                          border: 'none',
                          padding: '7px 16px',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                        }}
                      >
                        <Send size={14} /> Send WhatsApp
                      </button>
                    )}
                  </div>

                  {selectedTemplateName && activeModalMessage && (
                    <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                      <div style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700, marginBottom: '4px' }}>
                        Message Preview:
                      </div>
                      {activeModalMessage}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. PAYMENT & ASSIGNMENT */}
            <div style={sectionStyle}>
              <div style={sectionTitleStyle}>3. PAYMENT & ASSIGNMENT</div>
              <div style={grid3Col}>
                <div>
                  <label style={labelStyle}>Amount 1 (₹)</label>
                  <input type="number" name="amount1" value={formData.amount1} onChange={handleChange} style={inputStyle} placeholder="0" />
                </div>
                <div>
                  <label style={labelStyle}>Amount 2 (₹)</label>
                  <input type="number" name="amount2" value={formData.amount2} onChange={handleChange} style={inputStyle} placeholder="0" />
                </div>
                <div>
                  <label style={labelStyle}>Amount 3 (₹)</label>
                  <input type="number" name="amount3" value={formData.amount3} onChange={handleChange} style={inputStyle} placeholder="0" />
                </div>
                
                <div>
                  <label style={labelStyle}>Discount (₹)</label>
                  <input type="number" name="discount" value={formData.discount} onChange={handleChange} style={inputStyle} placeholder="0" />
                </div>
                <div>
                  <label style={labelStyle}>Total Amount</label>
                  <div style={{ ...readOnlyTextStyle, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>₹{totalAmount}</div>
                </div>
                <div>
                  <label style={labelStyle}>Lead Status</label>
                  <select name="leadStatus" value={formData.leadStatus} onChange={handleChange} style={inputStyle}>
                    {dropdowns['Lead Status'] && dropdowns['Lead Status'].length > 0 ? (
                      dropdowns['Lead Status'].map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))
                    ) : (
                      <>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="CLOSED">Closed</option>
                        <option value="CLOSED_FULL_PAYMENT">Full Payment Done (Close)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          background: 'var(--card-bg)',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px',
          height: '68px',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <button 
            type="button" 
            onClick={handleCloseRequest}
            style={{ 
              background: 'var(--table-hover)', 
              color: 'var(--text-secondary)', 
              padding: '0 20px', 
              height: '40px',
              borderRadius: '6px',
              border: '1px solid var(--card-border)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="editLeadForm"
            className="btn btn-primary"
            style={{ 
              padding: '0 24px', 
              height: '40px', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog Overlay */}
      {showConfirmClose && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          borderRadius: '12px'
        }}>
          <div style={{
            background: 'var(--table-header-bg)',
            border: '1px solid var(--card-border)',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '12px' }}>Unsaved Changes</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.5 }}>
              You have unsaved changes. Discard them?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowConfirmClose(false)}
                style={{ 
                  background: 'var(--table-hover)', 
                  border: '1px solid var(--card-border)', 
                  color: 'var(--text-secondary)', 
                  padding: '8px 16px', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Keep Editing
              </button>
              <button 
                onClick={onClose}
                style={{ 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  border: '1px solid rgba(239, 68, 68, 0.3)', 
                  color: 'var(--danger)', 
                  padding: '8px 16px', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
