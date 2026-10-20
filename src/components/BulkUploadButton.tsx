'use client'

import { useState,useRef } from 'react'
import { bulkUploadChunkAction } from '@/app/actions/lead'
import type { CustomColumn } from '@prisma/client'
import Papa from 'papaparse'

export default function BulkUploadButton({ 
  defaultPaymentStatus = 'NO_PAYMENT',
  baseColumns = ['Name', 'Mobile', 'Email', 'Webinar ID', 'State', 'Total Paid']
}: { 
  defaultPaymentStatus?: string,
  baseColumns?: string[],
  customColumns?: CustomColumn[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStats, setUploadStats] = useState({ success: 0, duplicate: 0, error: 0, total: 0 })
  const [showSummary, setShowSummary] = useState(false)
  
  const expectedColumns = [...baseColumns]
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDownloadTemplate = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const header = expectedColumns.join(',')
    const dummyRow = expectedColumns.map(() => '').join(',')
    const csvContent = `${header}\n${dummyRow}`
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `bulk_upload_template_${defaultPaymentStatus.toLowerCase()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      alert("Please select a file.")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadStats({ success: 0, duplicate: 0, error: 0, total: 0 })
    setShowSummary(false)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: async (results) => {
        const rows = results.data as Record<string, string>[]
        const actualHeaders = results.meta.fields || []
        
        const expectedHeaders = expectedColumns.map(h => h.trim().toLowerCase())
        const missing = expectedHeaders.filter((h) => !actualHeaders.includes(h))
        const extra = actualHeaders.filter((h) => !expectedHeaders.includes(h) && h !== '')
        
        if (missing.length > 0 || extra.length > 0) {
          alert(`Format Error: Uploaded file does not match the required template format.\nMissing: ${missing.join(', ')}\nExtra: ${extra.join(', ')}`)
          setIsUploading(false)
          return
        }

        // Pre-validate all dates
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          const rawPaymentDate = row['payment date'] || row['paymentdate'] || row['payment_date']
          
          if (rawPaymentDate && rawPaymentDate.trim() !== '') {
            const dateRegex = /^\d{2}-\d{2}-\d{4}$/
            if (!dateRegex.test(rawPaymentDate.trim())) {
              alert(`Format Error: Invalid Date Format at row ${i + 2}. Expected DD-MM-YYYY but got "${rawPaymentDate}". Please fix before uploading.`)
              setIsUploading(false)
              return
            }
          }
        }

        // Pre-validate all mobile numbers (only numbers allowed, no text)
        const invalidMobileRows: string[] = []
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          const rawMobile = row['mobile'] || row['mobilenumber'] || row['mobile number'] || row['phone']
          
          if (!rawMobile || rawMobile.trim() === '') {
            if (invalidMobileRows.length < 5) {
              invalidMobileRows.push(`Row ${i + 2}: [Missing / Blank]`)
            }
            continue
          }

          let str = rawMobile.trim()
          if (/^\d+(\.\d+)?[eE]\+\d+$/.test(str)) {
            const n = Number(str)
            if (!isNaN(n)) str = BigInt(Math.round(n)).toString()
          }
          if (/^\d+\.0+$/.test(str)) {
            str = str.split('.')[0]
          }

          const hasLetters = /[a-zA-Z]/.test(str)
          const isValidPhone = /^\+?[0-9\s\-]+$/.test(str)
          const digits = str.replace(/\D/g, '')

          if (hasLetters || !isValidPhone || digits.length < 7) {
            if (invalidMobileRows.length < 5) {
              invalidMobileRows.push(`Row ${i + 2}: "${rawMobile}"`)
            }
          }
        }

        if (invalidMobileRows.length > 0) {
          alert(`Format Error: Mobile column me sirf numbers allow hain, text nahi.\n\nInvalid rows found:\n${invalidMobileRows.join('\n')}${invalidMobileRows.length >= 5 ? '\n...and more' : ''}\n\nKripya mobile column me sirf valid number daalkar dobara upload karein.`)
          setIsUploading(false)
          return
        }

        // Clean mobile number formatting in rows before sending to server
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          const key = ['mobile', 'mobilenumber', 'mobile number', 'phone'].find(k => row[k] !== undefined)
          if (key && row[key]) {
            let str = row[key].trim()
            if (/^\d+(\.\d+)?[eE]\+\d+$/.test(str)) {
              const n = Number(str)
              if (!isNaN(n)) str = BigInt(Math.round(n)).toString()
            }
            if (/^\d+\.0+$/.test(str)) {
              str = str.split('.')[0]
            }
            row[key] = str.replace(/[\s\-]/g, '')
          }
        }

        const totalRows = rows.length
        if (totalRows === 0) {
          alert("The uploaded file is empty.")
          setIsUploading(false)
          return
        }

        setUploadStats(prev => ({ ...prev, total: totalRows }))

        const chunkSize = 50
        let totalSuccess = 0
        let totalDuplicate = 0
        let totalError = 0

        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize)
          
          try {
            const result = await bulkUploadChunkAction(chunk, defaultPaymentStatus, JSON.stringify(expectedColumns))
            totalSuccess += result.successCount
            totalDuplicate += result.duplicateCount
            totalError += result.errorCount
          } catch (error) {
            console.error("Error uploading chunk:", error)
            totalError += chunk.length
          }

          const currentProgress = Math.min(Math.round(((i + chunk.length) / totalRows) * 100), 100)
          setUploadProgress(currentProgress)
          setUploadStats({ success: totalSuccess, duplicate: totalDuplicate, error: totalError, total: totalRows })
        }

        setIsUploading(false)
        setShowSummary(true)
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`)
        setIsUploading(false)
      }
    })
  }

  const handleClose = () => {
    setIsOpen(false)
    setShowSummary(false)
    setUploadProgress(0)
    setIsUploading(false)
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn" style={{ background: 'var(--table-hover)', color: 'var(--foreground)' }}>
        Bulk Upload
      </button>

      {isOpen && (
        <div style={modalOverlayStyle}>
          <div className="glass-panel" style={modalContentStyle}>
            <h2 style={modalHeaderStyle}>{showSummary ? 'Upload Complete' : 'Bulk Upload Leads'}</h2>
            
            {!showSummary ? (
              <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Select CSV File</label>
                  <input 
                    ref={fileInputRef}
                    name="file" 
                    type="file" 
                    accept=".csv"
                    required 
                    disabled={isUploading}
                    style={{ ...inputStyle, padding: '8px' }} 
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Required Columns: {expectedColumns.join(', ')}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#60a5fa', marginTop: '3px' }}>
                    * Mobile column me sirf numbers allow hain (text/letters accept nahi honge).
                  </p>
                  <a 
                    href="#" 
                    onClick={handleDownloadTemplate}
                    style={{ display: 'inline-block', fontSize: '0.75rem', color: '#3b82f6', marginTop: '8px', textDecoration: 'none', cursor: 'pointer', opacity: isUploading ? 0.5 : 1, pointerEvents: isUploading ? 'none' : 'auto' }}
                  >
                    Download Dummy Template CSV
                  </a>
                </div>

                {isUploading && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Uploading...</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{uploadProgress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--table-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s ease' }}></div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                      Please do not close this window until the upload is complete.
                    </p>
                  </div>
                )}
                
                <div style={modalActionRowStyle}>
                  <button 
                    type="button" 
                    onClick={handleClose} 
                    className="btn" 
                    style={{ background: 'transparent', color: 'var(--text-muted)' }}
                    disabled={isUploading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Leads'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'var(--table-hover)', padding: '16px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                  <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Total Rows Processed: <strong>{uploadStats.total}</strong></p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--success)' }}>{uploadStats.success}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Successfully Uploaded</div>
                    </div>
                    <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '12px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#eab308' }}>{uploadStats.duplicate}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Skipped (Duplicates)</div>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--danger)' }}>{uploadStats.error}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Failed (Errors)</div>
                    </div>
                  </div>
                </div>
                <div style={modalActionRowStyle}>
                  <button 
                    type="button" 
                    onClick={handleClose} 
                    className="btn btn-primary"
                  >
                    Close & View Leads
                  </button>
                </div>
              </div>
            )}
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
