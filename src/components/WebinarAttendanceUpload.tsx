'use client'

import { useState,useRef } from 'react'
import { UploadCloud,FileSpreadsheet,CheckCircle,ArrowLeft,AlertTriangle,ClipboardList,Download } from 'lucide-react'
import { uploadAttendanceAction,deleteAttendanceUploadAction } from '@/app/actions/attendance'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/providers/ConfirmProvider'

export default function WebinarAttendanceUpload({ webinars, history }: { webinars: Pick<import('@prisma/client').WebinarMaster,'id'|'name'>[], history: import('@prisma/client').WebinarAttendanceUpload[] }) {
  const router = useRouter()
  const confirm = useConfirm()
  const [webinarId, setWebinarId] = useState('')
  const [webinarDay, setWebinarDay] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [replaceMode, setReplaceMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      if (selected.name.endsWith('.csv') || selected.name.endsWith('.xlsx')) {
        setFile(selected)
        setError('')
      } else {
        setError('Only .CSV and .XLSX files are supported')
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0]
      if (dropped.name.endsWith('.csv') || dropped.name.endsWith('.xlsx')) {
        setFile(dropped)
        setError('')
      } else {
        setError('Only .CSV and .XLSX files are supported')
      }
    }
  }

  const handleUpload = async () => {
    if (!webinarId || !webinarDay || !file) return
    setIsUploading(true)
    setError('')
    setSuccess('')
    
    try {
      const formData = new FormData()
      formData.append('webinarId', webinarId)
      formData.append('webinarDay', webinarDay)
      formData.append('file', file)
      formData.append('replaceExisting', replaceMode.toString())
      
      const res = await uploadAttendanceAction(formData)
      if (res.success) {
        setSuccess(`✓ Attendance Uploaded Successfully! Found ${res.count} records.`)
        setFile(null)
        setWebinarId('')
        setWebinarDay('')
        setReplaceMode(false)
        router.refresh()
      } else {
        if (res.error === 'EXISTS') {
          setReplaceMode(true)
          setError(`⚠️ Attendance for Webinar ${webinarId} - ${webinarDay} has already been uploaded.`)
        } else {
          setError(res.message || 'Upload failed')
        }
      }
    } catch (err) {
      setError((err instanceof Error ? err.message : String(err)) || 'An unexpected error occurred')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <Link href="/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '24px', fontSize: '0.9rem' }}>
        <ArrowLeft size={16} /> Back to Settings
      </Link>
      
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 8px 0' }}>
          <ClipboardList size={28} style={{ color: '#3b82f6' }} /> Webinar Attendance Upload
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Upload agent attendance records for a specific webinar and webinar day.</p>
      </div>

      {/* Form */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)', padding: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Webinar ID</label>
            <select 
              value={webinarId} 
              onChange={e => setWebinarId(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', background: 'var(--table-hover)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
            >
              <option value="">Select Webinar ID</option>
              {webinars.map(w => <option key={w.id} value={w.id}>{w.id} - {w.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Webinar Day</label>
            <select 
              value={webinarDay} 
              onChange={e => setWebinarDay(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', background: 'var(--table-hover)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
            >
              <option value="">Select Day</option>
              <option value="Day 1">Day 1</option>
              <option value="Day 2">Day 2</option>
              <option value="Day 3">Day 3</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Attendance File</label>
          <div 
            onDragOver={e => e.preventDefault()} 
            onDrop={handleDrop}
            style={{ border: '2px dashed rgba(59, 130, 246, 0.5)', borderRadius: '12px', padding: '40px', textAlign: 'center', background: 'rgba(59, 130, 246, 0.05)', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv, .xlsx" style={{ display: 'none' }} />
            <UploadCloud size={48} style={{ color: '#3b82f6', margin: '0 auto 16px auto' }} />
            <div style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 500, marginBottom: '8px' }}>Drag & Drop Attendance File Here</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>or Browse File</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Supported: CSV, XLSX</div>
          </div>
          <div style={{ marginTop: '8px', textAlign: 'right' }}>
            <a href="/dummy-attendance.csv" download style={{ color: 'var(--primary)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Download size={14} /> Download Sample CSV Format
            </a>
          </div>
        </div>

        {file && (
          <div style={{ marginTop: '20px', padding: '16px', background: 'var(--table-hover)', border: '1px solid var(--card-border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FileSpreadsheet size={20} style={{ color: 'var(--success)' }} />
              <span style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{file.name}</span>
            </div>
            <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}>[ Remove File ]</button>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--danger)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertTriangle size={20} />
            <div style={{ flex: 1 }}>{error}</div>
          </div>
        )}
        {success && (
          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: 'var(--success)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <CheckCircle size={20} />
            <div style={{ flex: 1 }}>{success}</div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
          <button style={{ padding: '12px 24px', background: 'var(--table-hover)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => { setFile(null); setWebinarId(''); setWebinarDay(''); setError(''); setSuccess(''); setReplaceMode(false); }}>Cancel</button>
          {replaceMode ? (
             <button disabled={isUploading} onClick={handleUpload} style={{ padding: '12px 24px', background: '#f59e0b', border: 'none', borderRadius: '8px', color: 'black', fontWeight: 600, cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1 }}>
               {isUploading ? 'Replacing...' : 'Replace Existing File'}
             </button>
          ) : (
            <button disabled={!webinarId || !webinarDay || !file || isUploading} onClick={handleUpload} style={{ padding: '12px 24px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'var(--text-primary)', fontWeight: 600, cursor: (!webinarId || !webinarDay || !file || isUploading) ? 'not-allowed' : 'pointer', opacity: (!webinarId || !webinarDay || !file || isUploading) ? 0.5 : 1 }}>
              {isUploading ? 'Uploading...' : 'Upload File'}
            </button>
          )}
        </div>
      </div>

      {/* History Table */}
      <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1.2rem', fontWeight: 600 }}>Attendance Upload History</h3>
      <div style={{ background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--card-border)' }}>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase' }}>Webinar ID</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase' }}>Day</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase' }}>File Name</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase' }}>Uploaded By</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {history.length > 0 ? history.map((item, i) => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--card-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <td style={{ padding: '16px', color: 'var(--text-primary)' }}>{item.webinarId}</td>
                <td style={{ padding: '16px', color: 'var(--text-primary)' }}>{item.webinarDay}</td>
                <td style={{ padding: '16px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileSpreadsheet size={16} /> {item.uploadedFile}
                </td>
                <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{item.uploadedBy}</td>
                <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{new Date(item.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td style={{ padding: '16px', color: 'var(--success)' }}>{item.status}</td>
                <td style={{ padding: '16px' }}>
                  <button onClick={async () => {
                    const isConfirmed = await confirm({
                      title: 'Delete Upload?',
                      message: 'Are you sure you want to delete this upload?',
                      type: 'danger'
                    })
                    if (isConfirmed) {
                      await deleteAttendanceUploadAction(item.id)
                      router.refresh()
                    }
                  }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                    View / Replace
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No upload history found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
