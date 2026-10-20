'use client'

import { useState } from 'react'
import { addCustomColumnAction } from '@/app/actions/column'
import { Plus } from 'lucide-react'

export default function AddColumnModal({ sheetName }: { sheetName: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('TEXT')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await addCustomColumnAction({ name, type, departmentTarget: sheetName })
    
    setLoading(false)
    if (res.success) {
      setIsOpen(false)
      setName('')
      setType('TEXT')
    } else {
      setError(res.error || 'Failed to add column')
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="btn"
        title="Add Column"
        style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', padding: 0 }}
      >
        <Plus size={18} />
      </button>

      {isOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{ width: '400px', padding: '24px', position: 'relative' }}>
            <h2 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '20px', fontSize: '1.25rem' }}>Add Custom Column</h2>
            
            {error && <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Column Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Instagram Handle"
                  required
                  style={{ 
                    width: '100%', padding: '10px 12px', borderRadius: '8px', 
                    background: 'var(--card-bg)', border: '1px solid var(--card-border)', 
                    color: 'var(--text-primary)', outline: 'none' 
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Data Type</label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  style={{ 
                    width: '100%', padding: '10px 12px', borderRadius: '8px', 
                    background: 'var(--card-bg)', border: '1px solid var(--card-border)', 
                    color: 'var(--text-primary)', outline: 'none' 
                  }}
                >
                  <option value="TEXT">Text (Short / Links)</option>
                  <option value="NUMBER">Number</option>
                  <option value="DATE">Date</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" onClick={() => setIsOpen(false)} style={{
                  padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--card-border)',
                  background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500
                }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} style={{
                  padding: '10px 16px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'var(--text-primary)', cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem', fontWeight: 500, opacity: loading ? 0.7 : 1
                }}>
                  {loading ? 'Adding...' : 'Add Column'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
