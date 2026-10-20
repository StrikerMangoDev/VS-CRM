'use client'

import React,{ useState,useMemo } from 'react'
import { Plus,Search,Edit2,Calendar,MessageCircle,Share2,HelpCircle,FileText,ChevronLeft,ChevronRight } from 'lucide-react'
import { upsertPostingDailyTaskAction } from '@/app/actions/postingDailyTask'

export default function PostingDailyTaskTable({ initialData, currentUser }: { initialData: (import('@prisma/client').PostingDailyTask & {user?:Pick<import('@prisma/client').User,'name'>})[], currentUser: import('@/lib/view-types').DashboardUser }) {
  const [data, setData] = useState(initialData)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<import('@prisma/client').PostingDailyTask | null>(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSelected = new Set(selectedTasks)
      paginatedData.forEach(r => newSelected.add(r.id))
      setSelectedTasks(newSelected)
    } else {
      const newSelected = new Set(selectedTasks)
      paginatedData.forEach(r => newSelected.delete(r.id))
      setSelectedTasks(newSelected)
    }
  }

  const handleSelectTask = (id: string) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedTasks(newSelected)
  }

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    polls: 0,
    quizzes: 0,
    communityPosts: 0,
    commentsReply: 0,
    captionsFound: 0
  })

  const handleOpenModal = (record?:import('@prisma/client').PostingDailyTask) => {
    if (record) {
      setEditingRecord(record)
      setFormData({
        date: new Date(record.date).toISOString().split('T')[0],
        polls: record.polls,
        quizzes: record.quizzes,
        communityPosts: record.communityPosts,
        commentsReply: record.commentsReply,
        captionsFound: record.captionsFound
      })
    } else {
      setEditingRecord(null)
      setFormData({
        date: new Date().toISOString().split('T')[0],
        polls: 0,
        quizzes: 0,
        communityPosts: 0,
        commentsReply: 0,
        captionsFound: 0
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        id: editingRecord?.id
      }
      
      const res = await upsertPostingDailyTaskAction(payload)
      
      if (editingRecord) {
        setData(data.map(d => d.id === res.id ? { ...res, user: d.user } : d))
      } else {
        setData([{ ...res, user: { name: currentUser.name } }, ...data])
      }
      
      setIsModalOpen(false)
    } catch (error) {
      console.error('Error saving task:', error)
      alert('Failed to save task')
    }
  }

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const dateStr = new Date(item.date).toLocaleDateString('en-GB')
      const userName = item.user?.name || ''
      return dateStr.toLowerCase().includes(searchTerm.toLowerCase()) || 
             userName.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [data, searchTerm])

  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} color='var(--text-muted)' style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by Date or User..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '0.875rem'
            }}
          />
        </div>
        <button
          onClick={() => handleOpenModal()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#3b82f6',
            color: 'var(--text-primary)',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <Plus size={16} />
          Add Daily Task
        </button>
      </div>

      {/* Table */}
      <div style={{
        flex: 1,
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)' }}>
                <th style={{ padding: '16px', width: '40px' }}>
                  <input type="checkbox" onChange={handleSelectAll} checked={paginatedData.length > 0 && paginatedData.every(r => selectedTasks.has(r.id))} style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>DATE</th>
                <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>USER</th>
                <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>POLLS</th>
                <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>QUIZZES</th>
                <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>COMMUNITY POSTS</th>
                <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>COMMENTS REPLY</th>
                <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>CAPTIONS FOUND</th>
                <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', width: '80px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No tasks found
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{ padding: '16px' }}>
                      <input type="checkbox" checked={selectedTasks.has(row.id)} onChange={() => handleSelectTask(row.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} color='var(--text-muted)' />
                        {new Date(row.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>{row.user?.name}</td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HelpCircle size={14} color="#60a5fa" />
                        {row.polls}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <HelpCircle size={14} color="#a78bfa" />
                        {row.quizzes}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Share2 size={14} color="#34d399" />
                        {row.communityPosts}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MessageCircle size={14} color="#f472b6" />
                        {row.commentsReply}
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={14} color="#fbbf24" />
                        {row.captionsFound}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {(currentUser.role === 'ADMIN' || currentUser.id === row.userId) && (
                        <button
                          onClick={() => handleOpenModal(row)}
                          style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            color: 'var(--primary)',
                            padding: '6px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          title="Edit Task"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '12px 16px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'var(--card-bg)'
        }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Showing {filteredData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} records
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  outline: 'none',
                  fontSize: '0.875rem'
                }}
              >
                {[10, 25, 50, 100].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 10px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  color: currentPage === 1 ? '#475569' : 'var(--text-primary)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                <ChevronLeft size={16} style={{ marginRight: '4px' }} /> Prev
              </button>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                background: 'var(--table-hover)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 600
              }}>
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 10px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  color: currentPage === totalPages ? '#475569' : 'var(--text-primary)',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Next <ChevronRight size={16} style={{ marginLeft: '4px' }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--table-header-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ margin: '0 0 24px 0', color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 600 }}>
              {editingRecord ? 'Edit Daily Task' : 'Add Daily Task'}
            </h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                  disabled={!!editingRecord}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Polls</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.polls}
                    onChange={(e) => setFormData({ ...formData, polls: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Quizzes</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.quizzes}
                    onChange={(e) => setFormData({ ...formData, quizzes: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Community Posts</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.communityPosts}
                    onChange={(e) => setFormData({ ...formData, communityPosts: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Comments Reply</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.commentsReply}
                    onChange={(e) => setFormData({ ...formData, commentsReply: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Captions Found</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.captionsFound}
                  onChange={(e) => setFormData({ ...formData, captionsFound: parseInt(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '10px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '10px 16px',
                    background: 'transparent',
                    border: '1px solid var(--card-border)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 16px',
                    background: '#3b82f6',
                    border: 'none',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
