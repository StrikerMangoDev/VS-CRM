'use client'

import React,{ useState,useRef } from 'react'
import { UploadCloud,Loader2,Check } from 'lucide-react'
import { getDriveUploadUrlAction } from '@/app/actions/drive'

interface DriveUploadButtonProps {
  onUploadComplete: (fileUrl: string) => void
  disabled?: boolean
  label?: string
}

export default function DriveUploadButton({ onUploadComplete, disabled = false, label = 'Upload' }: DriveUploadButtonProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    if (!uploading && !disabled) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const maxSize = 2 * 1024 * 1024 * 1024 // 2 GB
      const minSize = 1024 // 1 KB
      if (file.size > maxSize || file.size < minSize) {
        alert('File size must be between 1 KB and 2 GB.')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      uploadFile(file)
    }
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    setProgress(0)
    setDone(false)

    try {
      // 1. Get resumable upload URL from server
      const initResult = await getDriveUploadUrlAction(file.name, file.type, file.size, '')
      
      if (!initResult.success || !initResult.uploadUrl) {
        alert(`Failed to initialize upload: ${initResult.error || 'Unknown error'}`)
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      const uploadUrl = initResult.uploadUrl

      // 2. Upload file directly to Google Drive
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl, true)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100))
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const response = JSON.parse(xhr.responseText)
            if (response.webViewLink) {
              onUploadComplete(response.webViewLink)
              setDone(true)
              setTimeout(() => setDone(false), 2000)
            } else {
              alert('Upload succeeded but no link was returned.')
            }
          } catch {
            alert('Upload succeeded but failed to parse response.')
          }
        } else {
          alert(`Upload failed (${xhr.status}): Could not upload file to Google Drive.`)
        }
        setUploading(false)
        setProgress(0)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }

      xhr.onerror = () => {
        alert('Network error occurred during upload. Please check your connection and try again.')
        setUploading(false)
        setProgress(0)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }

      xhr.send(file)
    } catch (err) {
      alert(`Unexpected error: ${(err instanceof Error ? err.message : String(err))}`)
      setUploading(false)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || uploading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid var(--card-border)',
          background: done ? 'rgba(16, 185, 129, 0.15)' : uploading ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)',
          color: done ? '#34d399' : '#60a5fa',
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: disabled || uploading ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          whiteSpace: 'nowrap',
          transition: 'all 0.2s',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0
        }}
      >
        {/* Progress bar background */}
        {uploading && (
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress}%`,
            background: 'rgba(59, 130, 246, 0.15)',
            transition: 'width 0.3s ease',
            borderRadius: '8px'
          }} />
        )}
        <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {uploading ? (
            <>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              {progress}%
            </>
          ) : done ? (
            <>
              <Check size={14} />
              Done
            </>
          ) : (
            <>
              <UploadCloud size={14} />
              {label}
            </>
          )}
        </span>
      </button>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
