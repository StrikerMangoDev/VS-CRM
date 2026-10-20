'use client'

import React,{ useState,useRef,useEffect,useCallback } from 'react'
import { listDriveFilesAction,deleteDriveFileAction,bulkDeleteDriveFilesAction } from '@/app/actions/drive'
import { UploadCloud,File,FileText,Image as ImageIcon,Trash2,ExternalLink,Loader2,RefreshCcw,LayoutGrid,List as ListIcon,X } from 'lucide-react'
import { useConfirm } from '@/providers/ConfirmProvider'
import toast from 'react-hot-toast'

const ThumbnailImage = ({ src, fallback, alt }: { src: string, fallback: React.ReactNode, alt: string }) => {
  const [error, setError] = useState(false);
  if (error) return <>{fallback}</>;
  return <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setError(true)} />;
};

export default function FileManager() {
  const [files, setFiles] = useState<NonNullable<Awaited<ReturnType<typeof listDriveFilesAction>>['files']>>([])
  const [loading, setLoading] = useState(true)
  
  // Upload states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  
  // View states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [errorState, setErrorState] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const confirm = useConfirm()

  const loadFiles=useCallback(()=>listDriveFilesAction().then(res=>{
    if(res.success)setFiles(res.files||[]);else setErrorState(res.error||'Failed to fetch files')
  }).catch(error=>setErrorState(error instanceof Error?error.message:String(error))).finally(()=>setLoading(false)),[])
  const fetchFiles=()=>{setLoading(true);setErrorState('');setSelectedIds([]);return loadFiles()}
  useEffect(()=>{void loadFiles()},[loadFiles])

  // Drag & Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0])
    }
  }

  // Upload Logic using XMLHttpRequest for progress
  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)
    setErrorState('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/drive/upload', true)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(percentComplete)
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          if (response.success) {
            setFiles(prev => [response.file, ...prev])
            setIsUploadModalOpen(false)
            toast.success('File uploaded successfully')
          } else {
            setErrorState(response.error || 'Upload failed')
            toast.error(response.error || 'Upload failed')
          }
        } else {
          setErrorState('Upload failed with status ' + xhr.status)
        }
        setUploading(false)
        setUploadProgress(0)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }

      xhr.onerror = () => {
        setErrorState('Network error occurred during upload')
        setUploading(false)
        setUploadProgress(0)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }

      xhr.send(formData)
    } catch (err) {
      setErrorState((err instanceof Error ? err.message : String(err)))
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Selection Logic
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }
  
  const selectAll = () => {
    if (selectedIds.length === files.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(files.map(f => f.id))
    }
  }

  // Deletion Logic
  const handleDelete = async (fileId: string, fileName: string) => {
    const isConfirmed = await confirm({
      title: 'Delete File?',
      message: `Are you sure you want to delete "${fileName}" from Google Drive? This action cannot be undone.`,
      type: 'danger'
    })
    
    if (isConfirmed) {
      try {
        const res = await deleteDriveFileAction(fileId)
        if (res.success) {
          setFiles(prev => prev.filter(f => f.id !== fileId))
          setSelectedIds(prev => prev.filter(id => id !== fileId))
          toast.success('File deleted successfully')
        } else {
          setErrorState(res.error || 'Failed to delete file')
          toast.error(res.error || 'Failed to delete file')
        }
      } catch (err) {
        setErrorState((err instanceof Error ? err.message : String(err)))
      }
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return

    const isConfirmed = await confirm({
      title: 'Delete Multiple Files?',
      message: `Are you sure you want to delete ${selectedIds.length} files from Google Drive?`,
      type: 'danger'
    })
    
    if (isConfirmed) {
      try {
        const res = await bulkDeleteDriveFilesAction(selectedIds)
        if (res.success) {
          setFiles(prev => prev.filter(f => !selectedIds.includes(f.id)))
          setSelectedIds([])
          toast.success('Files deleted successfully')
        } else {
          setErrorState(res.error || 'Failed to delete files')
          toast.error(res.error || 'Failed to delete files')
        }
      } catch (err) {
        setErrorState((err instanceof Error ? err.message : String(err)))
      }
    }
  }

  const formatFileSize = (bytes: string) => {
    if (!bytes) return 'Unknown size'
    const b = parseInt(bytes)
    if (b < 1024) return b + ' B'
    else if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
    else return (b / 1048576).toFixed(1) + ' MB'
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return <ImageIcon size={24} color="#3b82f6" />
    if (mimeType.includes('pdf')) return <FileText size={24} color="#ef4444" />
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileText size={24} color="#22c55e" />
    return <File size={24} color='var(--text-muted)' />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>File Manager</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Upload and manage files securely on Google Drive.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          
          {/* View Toggles */}
          <div style={{ display: 'flex', background: 'var(--table-hover)', borderRadius: '8px', padding: '4px' }}>
            <button 
              onClick={() => setViewMode('grid')}
              style={{ background: viewMode === 'grid' ? 'rgba(59,130,246,0.2)' : 'transparent', color: viewMode === 'grid' ? '#3b82f6' : 'var(--text-muted)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              style={{ background: viewMode === 'list' ? 'rgba(59,130,246,0.2)' : 'transparent', color: viewMode === 'list' ? '#3b82f6' : 'var(--text-muted)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ListIcon size={18} />
            </button>
          </div>

          <button 
            onClick={fetchFiles}
            disabled={loading}
            style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          
          <button 
            onClick={() => window.location.href = '/api/drive/auth'}
            style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '8px 20px', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            Authenticate Google Drive
          </button>
          
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            style={{ background: '#3b82f6', color: 'var(--text-primary)', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
          >
            <UploadCloud size={18} /> Upload File
          </button>
        </div>
      </div>

      {errorState && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          {errorState}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedIds.length} files selected</span>
            <button onClick={selectAll} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}>
              {selectedIds.length === files.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <button 
            onClick={handleBulkDelete}
            style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 500 }}
          >
            <Trash2 size={16} /> Delete Selected
          </button>
        </div>
      )}

      {/* File List / Grid */}
      <div style={{ flex: 1, background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)', overflow: 'hidden' }}>
        
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={24} className="animate-spin" />
            Loading files...
          </div>
        ) : files.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No files found in this folder.
          </div>
        ) : viewMode === 'grid' ? (
          // GRID VIEW
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', padding: '24px' }}>
            {files.map(file => {
              const isSelected = selectedIds.includes(file.id);
              return (
                <div 
                  key={file.id} 
                  style={{ 
                    background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)', 
                    border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.05)'}`, 
                    borderRadius: '12px', 
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseOver={e => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseOut={e => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                >
                  <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleSelection(file.id)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingLeft: '24px' }}>
                    <div style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '8px', background: 'var(--table-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {(file.hasThumbnail && file.thumbnailLink) ? (
                        <ThumbnailImage src={file.thumbnailLink} alt={file.name} fallback={getFileIcon(file.mimeType)} />
                      ) : (
                        getFileIcon(file.mimeType)
                      )}
                    </div>
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <h4 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.name}>
                        {file.name}
                      </h4>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{new Date(file.createdTime).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  {/* Metadata Tags */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingLeft: '24px' }}>
                    {file.appProperties?.uploadedBy && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        {file.appProperties.uploadedBy} {file.appProperties.uploaderEmail ? `(${file.appProperties.uploaderEmail})` : ''}
                      </span>
                    )}
                    {file.appProperties?.fileType && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--primary)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                        {file.appProperties.fileType}
                      </span>
                    )}
                    {file.appProperties?.channel && (
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        {file.appProperties.channel}
                      </span>
                    )}
                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--table-hover)', color: 'var(--text-muted)' }} title={file.id}>
                      ID: {file.id?.slice(0, 8)}...
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <a 
                      href={file.webViewLink||undefined} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none' }}
                    >
                      <ExternalLink size={14} /> Open
                    </a>
                    <button 
                      onClick={() => handleDelete(file.id, file.name)}
                      style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Delete File"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          // LIST VIEW
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--table-hover)', borderBottom: '1px solid var(--card-border)' }}>
                  <th style={{ padding: '16px 24px', width: '40px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === files.length && files.length > 0}
                      onChange={selectAll}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.9rem' }}>File Name</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.9rem' }}>Uploaded By</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.9rem' }}>Type</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.9rem' }}>Channel</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.9rem' }}>Size</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.9rem' }}>Date Added</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.9rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => {
                  const isSelected = selectedIds.includes(file.id);
                  return (
                    <tr 
                      key={file.id} 
                      style={{ 
                        borderBottom: '1px solid var(--card-border)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: '16px 24px' }}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleSelection(file.id)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--table-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {(file.hasThumbnail && file.thumbnailLink) ? (
                              <ThumbnailImage src={file.thumbnailLink} alt={file.name} fallback={getFileIcon(file.mimeType)} />
                            ) : (
                              getFileIcon(file.mimeType)
                            )}
                          </div>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.95rem' }}>{file.name}</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }} title={file.id}>ID: {file.id?.slice(0, 8)}...</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {file.appProperties?.uploadedBy ? (
                          <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                            {file.appProperties.uploadedBy} {file.appProperties.uploaderEmail ? `(${file.appProperties.uploaderEmail})` : ''}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {file.appProperties?.fileType ? (
                          <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--primary)' }}>{file.appProperties.fileType}</span>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {file.appProperties?.channel ? (
                          <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>{file.appProperties.channel}</span>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{formatFileSize(file.size)}</td>
                      <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{new Date(file.createdTime).toLocaleDateString()}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <a 
                            href={file.webViewLink||undefined} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ padding: '6px 12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <ExternalLink size={14} /> Open
                          </a>
                          <button 
                            onClick={() => handleDelete(file.id, file.name)}
                            style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Delete File"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '24px'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '16px',
            width: '100%', maxWidth: '600px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--card-border)' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>Upload File</h2>
              {!uploading && (
                <button 
                  onClick={() => setIsUploadModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                >
                  <X size={20} />
                </button>
              )}
            </div>
            
            <div style={{ padding: '32px 24px' }}>
              <div 
                onDragEnter={!uploading ? handleDrag : undefined}
                onDragLeave={!uploading ? handleDrag : undefined}
                onDragOver={!uploading ? handleDrag : undefined}
                onDrop={!uploading ? handleDrop : undefined}
                style={{ 
                  border: `2px dashed ${dragActive ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`, 
                  background: dragActive ? 'rgba(59, 130, 246, 0.05)' : 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '16px', 
                  padding: '48px', 
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  opacity: uploading ? 0.7 : 1,
                  pointerEvents: uploading ? 'none' : 'auto'
                }}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleChange}
                  style={{ display: 'none' }}
                />
                
                {uploading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
                    <Loader2 size={40} color="#3b82f6" className="animate-spin" />
                    <div>
                      <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 8px 0', fontWeight: 500 }}>Uploading...</h3>
                      <p style={{ color: 'var(--text-muted)', margin: 0 }}>Please wait while your file is securely transferred.</p>
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{ width: '100%', maxWidth: '300px', background: 'var(--table-hover)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${uploadProgress}%`, 
                        height: '100%', 
                        background: '#3b82f6', 
                        transition: 'width 0.2s ease-out' 
                      }} />
                    </div>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{uploadProgress}%</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                      <UploadCloud size={32} />
                    </div>
                    <div>
                      <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 8px 0', fontWeight: 500 }}>Drag and drop your file here</h3>
                      <p style={{ color: 'var(--text-muted)', margin: 0 }}>or click to browse from your computer</p>
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      style={{ background: '#3b82f6', color: 'var(--text-primary)', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 500, fontSize: '0.95rem', cursor: 'pointer', marginTop: '8px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                    >
                      Select File
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
