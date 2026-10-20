'use client'

import React,{ useState } from 'react'
import { createRecording,updateRecording,deleteRecording } from '@/app/actions/webinar'
import { useConfirm } from '@/providers/ConfirmProvider'
import { ExternalLink,Copy,Edit,Trash2 } from 'lucide-react'

type Recording = {
  id: string
  webinarId: string
  title: string
  url: string
  duration?: string | null
  description?: string | null
}

export default function WebinarRecordings({ webinarId, webinarName, recordings }: { webinarId: string, webinarName: string, recordings: Recording[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecording, setEditingRecording] = useState<Recording | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEdit = (rec: Recording) => {
    setEditingRecording(rec)
    setIsModalOpen(true)
  }

  const confirm = useConfirm()

  const handleDelete = async (rec:Recording) => {
    const isConfirmed = await confirm({
      title: 'Delete Recording?',
      message: `Are you sure you want to delete\n"${rec.title}"?\n\nThis action cannot be undone.`,
      type: 'danger'
    })

    if (isConfirmed) {
      try {
        await deleteRecording(webinarId, rec.id)
      } catch (err) {
        console.error(err)
        alert('Unable to delete recording.')
      }
    }
  }

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url)
    alert('Recording link copied')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    
    try {
      if (editingRecording) {
        await updateRecording(webinarId, editingRecording.id, formData)
      } else {
        await createRecording(webinarId, formData)
      }
      setIsModalOpen(false)
      setEditingRecording(null)
      if (!editingRecording) alert('Recording added successfully')
    } catch (err) {
      console.error(err)
      setError('Unable to ' + (editingRecording ? 'update' : 'add') + ' recording. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        setIsModalOpen(false);
        setEditingRecording(null);
      }
    };
    if (isModalOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isModalOpen, loading]);

  return (
    <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Recordings</h3>
        <button 
          onClick={() => { setEditingRecording(null); setIsModalOpen(true); }}
          className="btn" 
          style={{ padding: '4px 12px', background: 'var(--table-hover)', color: 'var(--text-primary)', fontSize: '0.8rem', cursor: 'pointer', border: '1px solid var(--card-border)', borderRadius: '6px' }}
        >
          + Add Recording
        </button>
      </div>
      
      {recordings.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recordings.map(rec => (
            <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--table-hover)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>{rec.title}</div>
                {rec.duration && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>{rec.duration}</div>}
                {rec.description && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>{rec.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <a href={rec.url} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding: '0', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', border: 'none' }} title="Open">
                  <ExternalLink size={14} />
                </a>
                <button onClick={() => handleCopy(rec.url)} className="btn" style={{ padding: '0', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', cursor: 'pointer', border: 'none' }} title="Copy Link">
                  <Copy size={14} />
                </button>
                <button onClick={() => handleEdit(rec)} className="btn" style={{ padding: '0', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--table-hover)', color: 'var(--text-primary)', cursor: 'pointer', border: 'none' }} title="Edit">
                  <Edit size={14} />
                </button>
                <button onClick={() => handleDelete(rec)} className="btn" style={{ padding: '0', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', cursor: 'pointer', border: 'none' }} title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No recordings available for this webinar.</div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--table-header-bg)', width: '100%', maxWidth: '500px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 600 }}>
                {editingRecording ? 'Edit Webinar Recording' : 'Add Webinar Recording'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); setEditingRecording(null); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
                
                {error && (
                  <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', borderRadius: '6px', fontSize: '0.9rem' }}>
                    {error}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>Webinar ID</label>
                  <input 
                    type="text" 
                    value={webinarId}
                    disabled
                    style={{ width: '100%', padding: '10px', background: 'var(--table-hover)', border: '1px solid #334155', color: 'var(--text-muted)', borderRadius: '6px', outline: 'none', cursor: 'not-allowed' }}
                  />
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>Webinar Name: {webinarName}</div>
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>Recording Title *</label>
                  <input 
                    name="title" 
                    type="text" 
                    required 
                    placeholder="e.g. Full Webinar Recording"
                    defaultValue={editingRecording?.title || ''}
                    style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid #334155', color: 'var(--text-primary)', borderRadius: '6px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>Recording URL *</label>
                  <input 
                    name="url" 
                    type="url" 
                    required 
                    placeholder="https://..."
                    defaultValue={editingRecording?.url || ''}
                    style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid #334155', color: 'var(--text-primary)', borderRadius: '6px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>Duration (Optional)</label>
                  <input 
                    name="duration" 
                    type="text" 
                    placeholder="e.g. 01:45:32"
                    defaultValue={editingRecording?.duration || ''}
                    style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid #334155', color: 'var(--text-primary)', borderRadius: '6px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 500 }}>Description (Optional)</label>
                  <textarea 
                    name="description" 
                    rows={3}
                    defaultValue={editingRecording?.description || ''}
                    style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid #334155', color: 'var(--text-primary)', borderRadius: '6px', outline: 'none', resize: 'vertical' }}
                  />
                </div>
                
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setEditingRecording(null); }} 
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
                  {loading ? 'Saving...' : (editingRecording ? 'Save Changes' : 'Add Recording')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
