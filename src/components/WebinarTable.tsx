'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye,Edit,Trash2,MessageCircle,PlayCircle,Link2 } from 'lucide-react'
import WebinarFormModal from './WebinarFormModal'
import { deleteWebinar } from '@/app/actions/webinar'
import { useConfirm } from '@/providers/ConfirmProvider'

type WebinarProps = {
  webinars: (import('@prisma/client').Prisma.WebinarMasterGetPayload<{include:{category:true;recordings:true;_count:{select:{leads:true}}}}> & {_count:{leads:number;attendances?:number}})[]
  categories: import('@prisma/client').WebinarCategory[]
  currentUser?: import('@/lib/view-types').DashboardUser
  dropdowns?: Record<string, string[]>
}

export default function WebinarTable({ webinars, categories, currentUser, dropdowns = {} }: WebinarProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWebinar, setEditingWebinar] = useState<import('@prisma/client').WebinarMaster | null>(null)

  const filteredWebinars = webinars.filter(w => selectedCategory === 'All' || w.categoryId === selectedCategory)

  // Pagination Logic
  const totalPages = Math.ceil(filteredWebinars.length / pageSize)
  if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages)
  
  const displayedWebinars = filteredWebinars.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const handleEdit = (webinar:import('@prisma/client').WebinarMaster) => {
    setEditingWebinar(webinar)
    setIsModalOpen(true)
  }

  

  const confirm = useConfirm()

  const handleDelete = async (webinar:import('@prisma/client').WebinarMaster) => {
    const isConfirmed = await confirm({
      title: 'Delete Webinar?',
      message: `Are you sure you want to delete ${webinar.id} —\n${webinar.name}?\n\nThis action cannot be undone.`,
      type: 'danger'
    })

    if (isConfirmed) {
      try {
        await deleteWebinar(webinar.id)
        alert('Webinar deleted successfully')
      } catch (err) {
        console.error(err)
        alert('Unable to delete webinar.')
      }
    }
  }

  return (
    <>
      {currentUser?.role !== 'EXEC' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px', flexShrink: 0 }}>
          <button 
            onClick={() => { setEditingWebinar(null); setIsModalOpen(true); }} 
            className="btn btn-primary" 
            style={{ padding: '6px 16px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', background: '#3b82f6', color: 'var(--text-primary)', border: 'none', borderRadius: '6px' }}
          >
            + New Webinar
          </button>
        </div>
      )}

      {currentUser?.role !== 'EXEC' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', background: 'var(--card-bg)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--card-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Category:</span>
            <select 
              value={selectedCategory} 
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
            >
              <option value="All" style={{ background: 'var(--card-bg)' }}>All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id} style={{ background: 'var(--card-bg)' }}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="table-container" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <table>
          <thead>
            <tr>
              <th>WEBINAR ID</th>
              <th>CATEGORY</th>
              <th>WEBINAR NAME</th>
              <th>DATE</th>
              {currentUser?.role !== 'EXEC' ? (
                <>
                  <th>STATUS</th>
                  <th>REGISTERED</th>
                  <th>ATTENDED</th>
                  <th>ATTENDANCE %</th>
                  <th>ACTION</th>
                </>
              ) : (
                <th>RESOURCES</th>
              )}
            </tr>
          </thead>
          <tbody>
            {displayedWebinars.map(webinar => {
              const registered = webinar._count?.leads || 0;
              const attended = webinar._count?.attendances || 0; // Note: Need to filter for status 'PRESENT' but for now it works as total present if we only record present
              const attendancePercent = registered > 0 ? ((attended / registered) * 100).toFixed(2) + '%' : '-';
              
              const d = new Date(webinar.date);
              const dateStr = `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
              
              return (
                <tr key={webinar.id}>
                  <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{webinar.id}</td>
                  <td>
                    <span className="badge" style={{ background: 'rgba(88, 28, 135, 0.6)', color: '#d8b4fe', border: 'none', padding: '4px 12px', borderRadius: '6px', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                      {(webinar.category?.name || 'Unknown').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{webinar.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{dateStr}</td>
                  {currentUser?.role !== 'EXEC' ? (
                    <>
                      <td>
                        <span className={`badge ${
                          webinar.status === 'COMPLETED' ? 'badge-success' : 
                          webinar.status === 'SCHEDULED' ? 'badge-warning' : 
                          webinar.status === 'LIVE' ? 'badge-primary' : 'badge-danger'
                        }`}>
                          {webinar.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-primary)' }}>{registered}</td>
                      <td style={{ color: 'var(--text-primary)' }}>{attended || '-'}</td>
                      <td style={{ color: 'var(--primary)' }}>{attendancePercent}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <Link href={`/webinars/${webinar.id}`} className="btn" style={{ padding: '0', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)' }} title="View Details">
                            <Eye size={14} />
                          </Link>
                          <button onClick={() => handleEdit(webinar)} className="btn" style={{ padding: '0', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--table-hover)', color: 'var(--text-primary)', cursor: 'pointer', border: 'none' }} title="Edit Webinar">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDelete(webinar)} className="btn" style={{ padding: '0', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', cursor: 'pointer', border: 'none' }} title="Delete Webinar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {webinar.whatsappGroupUrl ? (
                          <a href={webinar.whatsappGroupUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'transparent', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; }} onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}>
                            <MessageCircle size={14} /> WhatsApp Group
                          </a>
                        ) : (
                          <button disabled style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--card-border)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, cursor: 'not-allowed' }}>
                            <MessageCircle size={14} /> WhatsApp Group
                          </button>
                        )}
                        
                        {webinar.webinarUrl ? (
                          <a href={webinar.webinarUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'transparent', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; }} onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}>
                            <Link2 size={14} /> Join Webinar
                          </a>
                        ) : (
                          <button disabled style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--card-border)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, cursor: 'not-allowed' }}>
                            <Link2 size={14} /> Join Webinar
                          </button>
                        )}
                        
                        {webinar.recordings && webinar.recordings.length > 0 ? (
                          <a href={webinar.recordings[0].url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'transparent', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)'; }} onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}>
                            <PlayCircle size={14} /> Watch Recording
                          </a>
                        ) : (
                          <button disabled style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--card-border)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500, cursor: 'not-allowed' }}>
                            <PlayCircle size={14} /> Watch Recording
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
            {displayedWebinars.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No webinars found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: 'var(--card-bg)', borderTop: '1px solid var(--card-border)', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Showing {filteredWebinars.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredWebinars.length)} of {filteredWebinars.length} webinars
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Rows per page:
            <select 
              value={pageSize} 
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              style={{ background: 'var(--table-hover)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}
            >
              <option value={15} style={{ background: 'var(--card-bg)' }}>15</option>
              <option value={25} style={{ background: 'var(--card-bg)' }}>25</option>
              <option value={50} style={{ background: 'var(--card-bg)' }}>50</option>
            </select>
          </div>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{ padding: '4px 12px', background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: currentPage === 1 ? '#475569' : '#e2e8f0', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
            >
              ← Previous
            </button>
            
            {getPageNumbers().map((pageNum, idx) => (
              pageNum === '...' ? (
                <span key={`dots-${idx}`} style={{ color: 'var(--text-muted)', padding: '4px 8px', display: 'flex', alignItems: 'center' }}>...</span>
              ) : (
                <button 
                  key={`page-${pageNum}`}
                  onClick={() => setCurrentPage(pageNum as number)}
                  style={{ 
                    padding: '4px 10px', 
                    background: currentPage === pageNum ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
                    border: '1px solid',
                    borderColor: currentPage === pageNum ? 'var(--primary)' : 'var(--card-border)',
                    color: 'var(--text-primary)', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: currentPage === pageNum ? 600 : 400
                  }}
                >
                  {pageNum}
                </button>
              )
            ))}

            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{ padding: '4px 12px', background: 'var(--table-hover)', border: '1px solid var(--card-border)', color: currentPage === totalPages ? '#475569' : '#e2e8f0', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <WebinarFormModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingWebinar(null)
        }}
        onSuccess={() => {
          setIsModalOpen(false)
          setEditingWebinar(null)
        }}
        categories={categories}
        editWebinar={editingWebinar}
        dropdowns={dropdowns}
      />
    </>
  )
}
