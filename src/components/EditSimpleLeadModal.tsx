'use client'

import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { updateSimpleLeadAction } from '@/app/actions/lead'

type LeadData = {
  id: string;
  uniqueId: string;
  name: string;
  webinarName: string | null;
  email: string | null;
  state: string | null;
  mobileNumber: string;
  paymentStatus: string;
  totalPayment: number;
  whatsappJoined: boolean;
  leadStatus: string;
  createdAt: string | Date;
  paymentDate?: string | Date | null;
  partPaymentId?: string | null;
  fullPaymentId?: string | null;
  partPaymentAmount?: number | null;
  fullPaymentAmount?: number | null;
  webinarId?: string | null;
  customData?: string;
  callStatus?: string | null;
  remark1?: string | null;
  remark2?: string | null;
  nextFollowUpDate?: string | Date | null;
}

interface EditSimpleLeadModalProps {
  lead: LeadData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLead: Partial<LeadData> & { id: string }) => void;
  sheetName?: string;
  states?: string[];
  webinars?: string[];
  customColumns?: import('@prisma/client').CustomColumn[];
}

export default function EditSimpleLeadModal({
  lead,
  isOpen,
  onClose,
  onSave,
  sheetName = 'PART_PAYMENT',
  states = [],
  webinars = [],
  customColumns = []
}: EditSimpleLeadModalProps) {
  const initialAmount = (
    sheetName === 'PART_PAYMENT' 
      ? ((lead.partPaymentAmount !== null && lead.partPaymentAmount !== undefined && lead.partPaymentAmount > 0) 
          ? lead.partPaymentAmount 
          : (lead.totalPayment || 0))
      : (lead.totalPayment || 0)
  );

  const formatDateForInput = (d: string | Date | null | undefined) => {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [name, setName] = useState(lead.name || '')
  const [mobileNumber, setMobileNumber] = useState(lead.mobileNumber || '')
  const [email, setEmail] = useState(lead.email || '')
  const [amount, setAmount] = useState<number | string>(initialAmount)
  const [state, setState] = useState(lead.state || '')
  const [webinarId, setWebinarId] = useState(lead.webinarId || lead.webinarName || '')
  const [paymentDate, setPaymentDate] = useState(formatDateForInput(lead.paymentDate))
  const [isSaving, setIsSaving] = useState(false)

  // Custom Columns State
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(lead.customData || '{}');
    } catch {
      return {};
    }
  })

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const leadIdDisplay = sheetName === 'PART_PAYMENT' 
    ? (lead.partPaymentId || lead.uniqueId)
    : sheetName === 'FULL_PAYMENT'
      ? (lead.fullPaymentId || lead.uniqueId)
      : lead.uniqueId;

  const amountLabel = sheetName === 'PART_PAYMENT'
    ? 'Part Payment (₹)'
    : sheetName === 'FULL_PAYMENT'
      ? 'Full Payment (₹)'
      : 'Payment Amount (₹)';

  const handleCustomChange = (key: string, val: string) => {
    setCustomValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!mobileNumber.trim()) {
      toast.error('Mobile number is required');
      return;
    }
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount < 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateSimpleLeadAction({
        id: lead.id,
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim() || null,
        amount: numAmount,
        state: state.trim() || null,
        webinarId: webinarId.trim() || null,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        customData: JSON.stringify(customValues)
      });

      if (res.success && res.lead) {
        toast.success('Changes saved');
        onSave({
          id: lead.id,
          name: res.lead.name,
          mobileNumber: res.lead.mobileNumber,
          email: res.lead.email,
          state: res.lead.state,
          totalPayment: res.lead.totalPayment,
          partPaymentAmount: res.lead.partPaymentAmount,
          fullPaymentAmount: res.lead.fullPaymentAmount,
          webinarId: res.lead.webinarId,
          webinarName: res.lead.webinarName,
          paymentDate: res.lead.paymentDate,
          customData: res.lead.customData
        });
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update lead';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      style={modalOverlayStyle} 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-panel" style={modalContentStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--card-border)' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Edit Lead Details
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 600 }}>
                {leadIdDisplay}
              </span>
              {sheetName && (
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}>
                  {sheetName.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '6px' }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>
                  Full Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                  placeholder="e.g. John Doe" 
                  style={inputStyle} 
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Mobile Number <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input 
                  type="tel" 
                  value={mobileNumber} 
                  onChange={e => setMobileNumber(e.target.value)} 
                  required 
                  placeholder="e.g. 9876543210" 
                  style={inputStyle} 
                />
              </div>

              <div>
                <label style={labelStyle}>Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="e.g. john@example.com" 
                  style={inputStyle} 
                />
              </div>

              <div>
                <label style={labelStyle}>
                  {amountLabel} <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>₹</span>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    required 
                    min="0" 
                    step="any" 
                    placeholder="0" 
                    style={{ ...inputStyle, paddingLeft: '24px' }} 
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>State</label>
                <input 
                  list="simple-modal-states" 
                  type="text" 
                  value={state} 
                  onChange={e => setState(e.target.value)} 
                  placeholder="e.g. West Bengal" 
                  style={inputStyle} 
                />
                <datalist id="simple-modal-states">
                  {states.filter(Boolean).map(s => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div>
                <label style={labelStyle}>Webinar ID</label>
                <input 
                  list="simple-modal-webinars" 
                  type="text" 
                  value={webinarId} 
                  onChange={e => setWebinarId(e.target.value)} 
                  placeholder="e.g. VST-004" 
                  style={inputStyle} 
                />
                <datalist id="simple-modal-webinars">
                  {webinars.filter(Boolean).map(w => (
                    <option key={w} value={w} />
                  ))}
                </datalist>
              </div>

              <div>
                <label style={labelStyle}>Payment Date</label>
                <input 
                  type="date" 
                  value={paymentDate} 
                  onChange={e => setPaymentDate(e.target.value)} 
                  style={inputStyle} 
                />
              </div>
            </div>

            {/* Custom columns if defined */}
            {customColumns && customColumns.length > 0 && (
              <div style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Custom Fields
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {customColumns.map(col => (
                    <div key={col.id}>
                      <label style={labelStyle}>{col.name}</label>
                      <input 
                        type={col.type === 'NUMBER' ? 'number' : col.type === 'DATE' ? 'date' : 'text'}
                        value={customValues[col.name] !== undefined ? customValues[col.name] : (customValues[col.id] || '')}
                        onChange={e => handleCustomChange(col.name, e.target.value)}
                        style={inputStyle}
                        placeholder={`Enter ${col.name}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px', borderTop: '1px solid var(--card-border)', background: 'rgba(15, 23, 42, 0.4)' }}>
            <button 
              type="button" 
              onClick={onClose} 
              className="btn" 
              disabled={isSaving}
              style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '8px 16px', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isSaving}
              style={{ padding: '8px 20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  padding: '16px'
};

const modalContentStyle: React.CSSProperties = {
  background: '#131b2e',
  border: '1px solid var(--card-border)',
  borderRadius: '16px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  width: '100%',
  maxWidth: '560px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--card-border)',
  background: 'var(--table-header-bg)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  boxSizing: 'border-box'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};
