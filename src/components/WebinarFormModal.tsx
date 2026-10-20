'use client'

import React,{ useState } from 'react'
import { createWebinar,updateWebinar } from '@/app/actions/webinar'

type Category = {
  id: string
  code: string
  name: string
}

type Webinar = {
  id: string
  categoryId: string
  name: string
  date: string | Date
  endDate?: string | Date | null
  startTime?: string | null
  endTime?: string | null
  status: string
  description?: string | null
  whatsappGroupUrl: string
  webinarUrl?: string | null
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  categories: Category[]
  editWebinar?: Webinar | null
  dropdowns?: Record<string, string[]>
}

export default function WebinarFormModal({ isOpen, onClose, categories = [], editWebinar = null, dropdowns = {} }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null

  const isEdit = !!editWebinar

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    
    try {
      if (isEdit && editWebinar) {
        await updateWebinar(editWebinar.id, formData)
        onClose()
        alert('Webinar updated successfully')
      } else {
        await createWebinar(formData)
        onClose()
        alert('Webinar created successfully')
      }
    } catch (err) {
      console.error(err)
      setError('Unable to ' + (isEdit ? 'update' : 'create') + ' webinar.')
    } finally {
      setLoading(false)
    }
  }

  const defaultDate = isEdit && editWebinar?.date 
    ? new Date(editWebinar.date).toISOString().split('T')[0] 
    : ''

  const defaultEndDate = isEdit && editWebinar?.endDate 
    ? new Date(editWebinar.endDate).toISOString().split('T')[0] 
    : ''

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--table-header-bg)', width: '100%', maxWidth: '500px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 600 }}>
            {isEdit ? `Edit Webinar — ${editWebinar.id}` : 'Create New Webinar'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
            
            {error && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', borderRadius: '6px', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}

            {isEdit && editWebinar && (
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>Webinar ID</label>
                <input 
                  type="text" 
                  value={editWebinar.id}
                  disabled
                  style={{ width: '100%', padding: '10px', background: 'var(--table-hover)', border: '1px solid #334155', color: 'var(--text-muted)', borderRadius: '6px', outline: 'none', cursor: 'not-allowed' }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>1. Webinar Category *</label>
              <select 
                name="categoryId" 
                required 
                defaultValue={editWebinar?.categoryId || ''}
                style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid #334155', color: 'var(--text-primary)', borderRadius: '6px', outline: 'none' }}
              >
                <option value="" disabled>Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>2. Webinar Name *</label>
              <input 
                name="name" 
                type="text" 
                required 
                placeholder="e.g. Vastu Basic Webinar"
                defaultValue={editWebinar?.name || ''}
                style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid #334155', color: 'var(--text-primary)', borderRadius: '6px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>3. Webinar Starting Date *</label>
                <input 
                  name="date" 
                  type="date" 
                  required 
                  defaultValue={defaultDate}
                  style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid #334155', color: 'var(--text-primary)', borderRadius: '6px', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>Webinar End Date *</label>
                <input 
                  name="endDate" 
                  type="date"
                  required 
                  defaultValue={defaultEndDate}
                  style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid #334155', color: 'var(--text-primary)', borderRadius: '6px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>4. Start Time *</label>
                <input 
                  name="startTime" 
                  type="time" 
                  required 
                  defaultValue={editWebinar?.startTime || ''}
                  style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid #334155', color: 'var(--text-primary)', borderRadius: '6px', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>5. End Time (Optional)</label>
                <input 
                  name="endTime" 
                  type="time" 
                  defaultValue={editWebinar?.endTime || ''}
                  style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid #334155', color: 'var(--text-primary)', borderRadius: '6px', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>6. Status</label>
              <select 
                name="status" 
                defaultValue={editWebinar?.status || 'SCHEDULED'}
                style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid #334155', color: 'var(--text-primary)', borderRadius: '6px', outline: 'none' }}
              >
                {dropdowns['Webinar Status'] && dropdowns['Webinar Status'].length > 0 ? (
                  dropdowns['Webinar Status'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))
                ) : (
                  <>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="LIVE">Live</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>WhatsApp Group Link *</label>
              <input 
                name="whatsappGroupUrl" 
                type="url" 
                required
                placeholder="https://chat.whatsapp.com/..."
                defaultValue={editWebinar?.whatsappGroupUrl || ''}
                style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid #334155', color: 'var(--text-primary)', borderRadius: '6px', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>Webinar Link (Optional)</label>
              <input 
                name="webinarUrl" 
                type="url" 
                placeholder="https://zoom.us/j/..."
                defaultValue={editWebinar?.webinarUrl || ''}
                style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid #334155', color: 'var(--text-primary)', borderRadius: '6px', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>7. Description (Optional)</label>
              <textarea 
                name="description" 
                rows={3}
                defaultValue={editWebinar?.description || ''}
                style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid #334155', color: 'var(--text-primary)', borderRadius: '6px', outline: 'none', resize: 'vertical' }}
              />
            </div>
            
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #475569', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: '8px 16px', background: '#2563eb', border: 'none', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Webinar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
