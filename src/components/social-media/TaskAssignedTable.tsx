'use client'
import { useEditableRows } from '@/hooks/use-editable-rows';
import type { PublicUser } from '@/lib/public-user';


import React,{ useState,useMemo } from 'react';
import { Search,Plus,Edit2,Trash2,Link as LinkIcon,CheckCircle2,Clock,LayoutDashboard,AlertCircle,Check,RotateCcw } from 'lucide-react';
import { createTask,updateTask,deleteTask,takeTask } from '@/app/actions/task';
import type { TaskRecord } from '@prisma/client';
import { useConfirm } from '@/providers/ConfirmProvider';
import DriveUploadButton from '@/components/DriveUploadButton';
import { useRouter } from 'next/navigation';

export default function TaskAssignedTable({ 
  initialData, 
  currentUserId, 
  currentUserRole,
  users 
}: { 
  initialData: (TaskRecord & { assignedTo?: Pick<PublicUser,'id'|'name'|'email'|'role'|'department'> | null })[];
  currentUserId: string;
  currentUserRole: string;
  users: Pick<PublicUser,'id'|'name'|'email'|'role'|'department'>[];
}) {
  useRouter();
  const [data, setData]=useEditableRows(initialData);



  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSelected = new Set(selectedTasks);
      filteredData.forEach(r => newSelected.add(r.id));
      setSelectedTasks(newSelected);
    } else {
      const newSelected = new Set(selectedTasks);
      filteredData.forEach(r => newSelected.delete(r.id));
      setSelectedTasks(newSelected);
    }
  };

  const handleSelectTask = (id: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedTasks(newSelected);
  };


  const isRestrictedUser = users.find(u => u.id === currentUserId)?.department === 'Editing Team' || users.find(u => u.id === currentUserId)?.department === 'Graphics Team';
  const isManager = currentUserRole === 'MANAGER' || currentUserRole === 'ADMIN';

  const [viewMode, setViewMode] = useState<string>(isRestrictedUser ? 'MY_TASKS' : 'ALL_TASKS');
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [taskToApprove, setTaskToApprove] = useState<typeof initialData[number] | null>(null);

  const [formData, setFormData] = useState({
    departmentName: '',
    assigningDate: '',
    requirementDate: '',
    platform: '',
    topic: '',
    requirementPurpose: '',
    referenceFile: '',
    format: '',
    size: '',
    assignedToId: '',
    assignedDepartment: '',
    videoLink: '',
    graphicsCount: '1',
    remark: '',
    status: 'Pending'
  });

  const baseFilteredData = useMemo(() => {
    let result = data.filter(item => 
      item.uniqueId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.departmentName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (isRestrictedUser) {
      if (viewMode === 'MY_TASKS') {
        result = result.filter(item => item.assignedToId === currentUserId);
      } else if (viewMode === 'NEW_TASKS') {
        result = result.filter(item => !item.assignedToId && item.assignedDepartment);
      }
    } else if (isManager) {
      if (viewMode === 'EDITING_TEAM') {
        result = result.filter(item => item.assignedDepartment === 'Editing Team');
      } else if (viewMode === 'GRAPHICS_TEAM') {
        result = result.filter(item => item.assignedDepartment === 'Graphics Team');
      } else if (viewMode === 'NEW_TASKS') {
        result = result.filter(item => !item.assignedToId && item.assignedDepartment);
      }
    }
    
    return result;
  }, [data, searchTerm, viewMode, currentUserId, isRestrictedUser, isManager]);

  const newTasksCount = useMemo(() => {
    return data.filter(item => !item.assignedToId && item.assignedDepartment).length;
  }, [data]);

  const filteredData=baseFilteredData.filter(item=>showCompleted?item.status==='Completed':item.status!=='Completed')


  const handleOpenModal = (item?:typeof initialData[number]) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        departmentName: item.departmentName || '',
        assigningDate: item.assigningDate || '',
        requirementDate: item.requirementDate || '',
        platform: item.platform || '',
        topic: item.topic || '',
        requirementPurpose: item.requirementPurpose || '',
        referenceFile: item.referenceFile || '',
        format: item.format || '',
        size: item.size || '',
        assignedToId: item.assignedToId || '',
        assignedDepartment: item.assignedDepartment || '',
        videoLink: item.videoLink || '',
        graphicsCount: item.graphicsCount || '1',
        remark: item.remark || '',
        status: item.status || 'Pending'
      });
    } else {
      setEditingId(null);
      setFormData({
        departmentName: '',
        assigningDate: new Date().toISOString().split('T')[0],
        requirementDate: '',
        platform: '',
        topic: '',
        requirementPurpose: '',
        referenceFile: '',
        format: '',
        size: '',
        assignedToId: '',
        assignedDepartment: '',
        videoLink: '',
        graphicsCount: '1',
        remark: '',
        status: 'Pending'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (editingId) {
      const res = await updateTask(editingId, formData);
      if (res.success && res.data) {
        setData(data.map(d => d.id === editingId ? { ...d, ...res.data, assignedTo: users.find(u => u.id === res.data.assignedToId) } : d));
        handleCloseModal();
      } else {
        alert(res.error);
      }
    } else {
      const res = await createTask(formData);
      if (res.success && res.data) {
        setData([{ ...res.data, assignedTo: users.find(u => u.id === res.data.assignedToId) }, ...data]);
        handleCloseModal();
      } else {
        alert(res.error);
      }
    }
    setIsSubmitting(false);
  };

  const confirm = useConfirm()

  const handleTakeTask = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Take Task?',
      message: 'Are you sure you want to take this task?',
      type: 'info'
    })
    if (isConfirmed) {
      const res = await takeTask(id, currentUserId);
      if (res.success && res.data) {
        setData(data.map(d => d.id === id ? { ...d, assignedToId: currentUserId, assignedTo: users.find(u => u.id === currentUserId) } : d));
      } else {
        alert(res.error);
      }
    }
  };

  const handleApprove = (item:typeof initialData[number]) => {
    setTaskToApprove(item);
  };

  const handleConfirmApprove = async () => {
    if (!taskToApprove) return;
    try {
      const res = await updateTask(taskToApprove.id, { ...taskToApprove, status: 'Completed' });
      if (res.success && res.data) {
        setData(data.map(d => d.id === taskToApprove.id ? { ...d, status: 'Completed' } : d));
        setTaskToApprove(null);
      } else {
        alert(res.error);
      }
    } catch (error) {
      console.error('Failed to approve task:', error);
    }
  };

  const handleRequestRevision = async (item:typeof initialData[number]) => {
    const isConfirmed = await confirm({
      title: 'Request Revision?',
      message: 'Are you sure you want to request a revision for this task?',
      type: 'warning'
    });
    if (isConfirmed) {
      const res = await updateTask(item.id, { ...item, status: 'Revision' });
      if (res.success && res.data) {
        setData(data.map(d => d.id === item.id ? { ...d, status: 'Revision' } : d));
      } else {
        alert(res.error);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Task?',
      message: 'Are you sure you want to delete this task?',
      type: 'danger'
    })
    if (isConfirmed) {
      const res = await deleteTask(id);
      if (res.success) {
        setData(data.filter(d => d.id !== id));
      } else {
        alert(res.error);
      }
    }
  };

  const thStyle = { padding: '16px', textAlign: 'left' as const, color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '1px solid var(--card-border)', whiteSpace: 'nowrap' as const };
  const tdStyle = { padding: '16px', color: 'var(--text-primary)', fontSize: '0.9rem', borderBottom: '1px solid var(--card-border)', whiteSpace: 'nowrap' as const };

  // Analytics computations
  const totalTasks = baseFilteredData.length;
  const completedTasks = baseFilteredData.filter(d => d.status === 'Completed').length;
  const pendingTasks = baseFilteredData.filter(d => d.status === 'Pending').length;
  const inProgressTasks = baseFilteredData.filter(d => d.status === 'In Progress').length;
  
  useMemo(() => {
    const counts = filteredData.reduce<Record<string,number>>((acc, curr) => {
      const dept = curr.departmentName || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  useMemo(() => {
    const counts = filteredData.reduce<Record<string,number>>((acc, curr) => {
      const team = curr.assignedDepartment || 'Unassigned';
      acc[team] = (acc[team] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Analytics Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Total Tasks</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalTasks}</div>
          <div style={{ position: 'absolute', top: '20px', right: '20px', width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LayoutDashboard size={18} />
          </div>
        </div>
        <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Pending</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{pendingTasks}</div>
          <div style={{ position: 'absolute', top: '20px', right: '20px', width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={18} />
          </div>
        </div>
        <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>In Progress</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{inProgressTasks}</div>
          <div style={{ position: 'absolute', top: '20px', right: '20px', width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={18} />
          </div>
        </div>
        <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Completed</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{completedTasks}</div>
          <div style={{ position: 'absolute', top: '20px', right: '20px', width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>


      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'var(--table-hover)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '8px 12px 8px 36px', borderRadius: '8px', fontSize: '0.9rem' }}
            />
          </div>
          {isRestrictedUser && (
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '4px' }}>
              <button 
                onClick={() => setViewMode('MY_TASKS')}
                style={{ background: viewMode === 'MY_TASKS' ? '#3b82f6' : 'transparent', color: viewMode === 'MY_TASKS' ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                My Tasks
              </button>
              <button 
                onClick={() => setViewMode('NEW_TASKS')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: viewMode === 'NEW_TASKS' ? '#3b82f6' : 'transparent', color: viewMode === 'NEW_TASKS' ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                New Tasks
                {newTasksCount > 0 && (
                  <span style={{ background: viewMode === 'NEW_TASKS' ? 'var(--text-primary)' : '#3b82f6', color: viewMode === 'NEW_TASKS' ? '#3b82f6' : 'var(--text-primary)', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                    {newTasksCount}
                  </span>
                )}
              </button>
            </div>
          )}
          {!isRestrictedUser && isManager && (
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '4px' }}>
              <button 
                onClick={() => setViewMode('ALL_TASKS')}
                style={{ background: viewMode === 'ALL_TASKS' ? '#3b82f6' : 'transparent', color: viewMode === 'ALL_TASKS' ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                All Tasks
              </button>
              <button 
                onClick={() => setViewMode('NEW_TASKS')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: viewMode === 'NEW_TASKS' ? '#3b82f6' : 'transparent', color: viewMode === 'NEW_TASKS' ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                New Tasks
                {newTasksCount > 0 && (
                  <span style={{ background: viewMode === 'NEW_TASKS' ? 'var(--text-primary)' : '#3b82f6', color: viewMode === 'NEW_TASKS' ? '#3b82f6' : 'var(--text-primary)', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                    {newTasksCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setViewMode('EDITING_TEAM')}
                style={{ background: viewMode === 'EDITING_TEAM' ? '#3b82f6' : 'transparent', color: viewMode === 'EDITING_TEAM' ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Editing Team
              </button>
              <button 
                onClick={() => setViewMode('GRAPHICS_TEAM')}
                style={{ background: viewMode === 'GRAPHICS_TEAM' ? '#3b82f6' : 'transparent', color: viewMode === 'GRAPHICS_TEAM' ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Graphics Team
              </button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setShowCompleted(!showCompleted)}
            style={{ background: showCompleted ? '#10b981' : 'transparent', color: showCompleted ? 'var(--text-primary)' : '#10b981', border: '1px solid #10b981', padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <CheckCircle2 size={16} /> {showCompleted ? 'Active Tasks' : 'Completed Tasks'}
          </button>
          {(currentUserRole === 'ADMIN' || currentUserRole === 'MANAGER' || (currentUserRole === 'EXEC' && users.find(u => u.id === currentUserId)?.department === 'Other Team')) && (
            <button 
              onClick={() => handleOpenModal()}
              style={{ background: '#3b82f6', color: 'var(--text-primary)', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <Plus size={16} /> Add Task
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ width: '100%', overflowX: 'auto', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1500px' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '40px' }}>
                <input type="checkbox" onChange={handleSelectAll} checked={filteredData.length > 0 && filteredData.every(r => selectedTasks.has(r.id))} style={{ cursor: 'pointer' }} />
              </th>
              <th style={{ ...thStyle, width: '90px' }}>Unique ID</th>
              <th style={thStyle}>Department</th>
              <th style={thStyle}>Assigning Date</th>
              <th style={thStyle}>Requirement Date</th>
              <th style={thStyle}>Platform</th>
              <th style={thStyle}>Topic</th>
              <th style={thStyle}>Requirement Purpose</th>
              <th style={thStyle}>Reference File</th>
              <th style={thStyle}>Format</th>
              <th style={thStyle}>Size</th>
              <th style={thStyle}>File Link</th>
              <th style={thStyle}>Graphics Count</th>
              <th style={thStyle}>Remark</th>
              <th style={thStyle}>Assigned To</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, width: '100px', position: 'sticky', right: 0, background: 'var(--card-bg)', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={13} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No tasks found.
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} style={{ transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={tdStyle}>
                    <input type="checkbox" checked={selectedTasks.has(item.id)} onChange={() => handleSelectTask(item.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--primary)', fontWeight: 600 }}>{item.uniqueId}</td>
                  <td style={tdStyle}>{item.departmentName}</td>
                  <td style={tdStyle}>{item.assigningDate || '-'}</td>
                  <td style={tdStyle}>{item.requirementDate || '-'}</td>
                  <td style={tdStyle}>{item.platform || '-'}</td>
                  <td style={{ ...tdStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>{item.topic || '-'}</span>
                      {item.status === 'Revision' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#f97316', background: 'rgba(249, 115, 22, 0.1)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                          <AlertCircle size={12} /> Revision Needed
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.requirementPurpose || '-'}</td>
                  <td style={tdStyle}>
                    {item.referenceFile ? (
                      <a href={item.referenceFile} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <LinkIcon size={14} /> View Link
                      </a>
                    ) : '-'}
                  </td>
                  <td style={tdStyle}>{item.format || '-'}</td>
                  <td style={tdStyle}>{item.size || '-'}</td>
                  <td style={tdStyle}>
                    {item.videoLink ? (
                      <a href={item.videoLink} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                        Link
                      </a>
                    ) : '-'}
                  </td>
                  <td style={tdStyle}>{item.graphicsCount || '-'}</td>
                  <td style={{ ...tdStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.remark || '-'}</td>
                  <td style={tdStyle}>
                    {item.assignedTo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                          {item.assignedTo.name.charAt(0).toUpperCase()}
                        </div>
                        {item.assignedTo.name}
                      </div>
                    ) : item.assignedDepartment ? (
                      <span style={{ color: 'var(--text-muted)' }}>{item.assignedDepartment}</span>
                    ) : '-'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '6px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      background: item.status === 'Submitted' ? 'rgba(16, 185, 129, 0.1)' : item.status === 'Revision' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                      color: item.status === 'Submitted' ? '#10b981' : item.status === 'Revision' ? '#f97316' : '#fbbf24'
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, position: 'sticky', right: 0, background: 'var(--card-bg)', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(!item.assignedToId && item.assignedDepartment) && (
                        <button onClick={() => handleTakeTask(item.id)} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                          Take Task
                        </button>
                      )}
                      {(item.status === 'Submitted' && (currentUserRole === 'ADMIN' || currentUserRole === 'MANAGER' || users.find(u => u.id === currentUserId)?.department === 'Other Team')) && (
                        <>
                          <button onClick={() => handleApprove(item)} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: 'none', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Approve Task">
                            <Check size={16} />
                          </button>
                          <button onClick={() => handleRequestRevision(item)} style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', border: 'none', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Request Revision">
                            <RotateCcw size={16} />
                          </button>
                        </>
                      )}
                      {(currentUserRole === 'ADMIN' || currentUserRole === 'MANAGER' || users.find(u => u.id === currentUserId)?.department === 'Other Team' || currentUserId === item.assignedToId || !item.assignedToId) && (
                        <button onClick={() => handleOpenModal(item)} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', border: 'none', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Edit2 size={16} />
                        </button>
                      )}
                      {!(users.find(u => u.id === currentUserId)?.department === 'Editing Team' || users.find(u => u.id === currentUserId)?.department === 'Graphics Team') && (
                        <button onClick={() => handleDelete(item.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--table-header-bg)' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem' }}>{editingId ? 'Edit Task' : 'Add New Task'}</h2>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                Close
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '24px' }}>
              <form onSubmit={handleSubmit}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Department Name *</label>
                  <select required disabled={isRestrictedUser} value={formData.departmentName} onChange={e => setFormData({...formData, departmentName: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: isRestrictedUser ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)', color: isRestrictedUser ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    <option value="">Select Department...</option>
                    <option value="Hr">Hr</option>
                    <option value="Content">Content</option>
                    <option value="E-com">E-com</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Topic</label>
                  <input type="text" disabled={isRestrictedUser} value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: isRestrictedUser ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)', color: isRestrictedUser ? 'var(--text-muted)' : 'var(--text-primary)' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Assigning Date</label>
                  <input type="date" disabled={isRestrictedUser} value={formData.assigningDate} onChange={e => setFormData({...formData, assigningDate: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: isRestrictedUser ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)', color: isRestrictedUser ? 'var(--text-muted)' : 'var(--text-primary)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Requirement Date</label>
                  <input type="date" disabled={isRestrictedUser} value={formData.requirementDate} onChange={e => setFormData({...formData, requirementDate: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: isRestrictedUser ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)', color: isRestrictedUser ? 'var(--text-muted)' : 'var(--text-primary)' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Platform</label>
                  <input type="text" disabled={isRestrictedUser} value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: isRestrictedUser ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)', color: isRestrictedUser ? 'var(--text-muted)' : 'var(--text-primary)' }} placeholder="e.g. YouTube, Instagram..." />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Format</label>
                  <input type="text" disabled={isRestrictedUser} value={formData.format} onChange={e => setFormData({...formData, format: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: isRestrictedUser ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)', color: isRestrictedUser ? 'var(--text-muted)' : 'var(--text-primary)' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Size</label>
                  <input type="text" disabled={isRestrictedUser} value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: isRestrictedUser ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)', color: isRestrictedUser ? 'var(--text-muted)' : 'var(--text-primary)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Assigned To (Team)</label>
                  <select disabled={isRestrictedUser} value={formData.assignedDepartment} onChange={e => setFormData({...formData, assignedDepartment: e.target.value, assignedToId: ''})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: isRestrictedUser ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)', color: isRestrictedUser ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    <option value="">Select Team...</option>
                    <option value="Editing Team">Editing Team</option>
                    <option value="Graphics Team">Graphics Team</option>
                  </select>
                </div>
              </div>

              {(currentUserRole === 'ADMIN' || currentUserRole === 'MANAGER') && formData.assignedDepartment && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Assigned To (Executive)</label>
                  <select value={formData.assignedToId} onChange={e => setFormData({...formData, assignedToId: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' }}>
                    <option value="">Unassigned (Team Queue)</option>
                    {users.filter(u => u.department === formData.assignedDepartment).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reference File / Content Link</label>
                <input type="text" disabled={isRestrictedUser} value={formData.referenceFile} onChange={e => setFormData({...formData, referenceFile: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: isRestrictedUser ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)', color: isRestrictedUser ? 'var(--text-muted)' : 'var(--text-primary)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Requirement Purpose</label>
                <textarea disabled={isRestrictedUser} value={formData.requirementPurpose} onChange={e => setFormData({...formData, requirementPurpose: e.target.value})} rows={3} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: isRestrictedUser ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)', color: isRestrictedUser ? 'var(--text-muted)' : 'var(--text-primary)', resize: 'vertical' }} />
              </div>

              {(editingId && (isRestrictedUser || currentUserRole === 'ADMIN')) && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.5fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>File Link</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="text" value={formData.videoLink} onChange={e => setFormData({...formData, videoLink: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', flex: 1 }} placeholder="https://..." />
                        <DriveUploadButton onUploadComplete={(url) => setFormData({...formData, videoLink: url})} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Graphics Count</label>
                      <input type="text" value={formData.graphicsCount} onChange={e => setFormData({...formData, graphicsCount: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' }} placeholder="e.g. 5" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Remark</label>
                      <input type="text" value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '30px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status (Submit)</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' }}>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Submitted">Submitted</option>
                      {formData.status === 'Revision' && <option value="Revision">Revision</option>}
                    </select>
                  </div>
                </>
              )}


              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={handleCloseModal} style={{ padding: '10px 20px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '10px 20px', borderRadius: '8px', background: '#3b82f6', border: 'none', color: 'var(--text-primary)', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Saving...' : 'Save Task'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {taskToApprove && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)', fontSize: '1.25rem' }}>Approve Task</h3>
            <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 8px 0', fontWeight: 600 }}>
                File Link
              </p>
              {taskToApprove.videoLink ? (
                <a href={taskToApprove.videoLink} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontSize: '0.9rem', textDecoration: 'none', wordBreak: 'break-all' }}>
                  {taskToApprove.videoLink}
                </a>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No link provided</span>
              )}
            </div>
            <p style={{ color: 'var(--text-primary)', fontSize: '1rem', margin: '0 0 24px 0' }}>
              Are you sure you want to approve this task?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setTaskToApprove(null)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                No
              </button>
              <button onClick={handleConfirmApprove} style={{ padding: '8px 16px', borderRadius: '8px', background: '#10b981', border: 'none', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
