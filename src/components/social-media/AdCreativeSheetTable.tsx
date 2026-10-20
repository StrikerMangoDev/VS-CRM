'use client'
import { usePageNumber } from '@/hooks/use-lead-page'
import { useEditableRows } from '@/hooks/use-editable-rows'

import React,{ useState,useMemo } from 'react'
import {
Plus,
Search,
Filter,
Download,
ExternalLink,
CheckCircle2,
Clock,
AlertCircle,
X,
Trash2,User,
Video,
ShieldCheck,
Sparkles,RotateCcw,
Pencil,
ChevronLeft,
ChevronRight,
ChevronsLeft,
ChevronsRight
} from 'lucide-react'
import {
createAdCreativeRecordAction,
updateAdCreativeRecordAction,
deleteAdCreativeRecordAction
} from '@/app/actions/adCreative'
import { useConfirm } from '@/providers/ConfirmProvider'
import DriveUploadButton from '@/components/DriveUploadButton'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export const FOR_OPTIONS = [
  'Vastu Shikhar',
  'Vastu Wheels',
  'Ai telemate',
  'Consultancy'
] as const;

export const STATUS_OPTIONS = [
  'pending',
  'Inprogres',
  'Complete'
] as const;

export const APPROVAL_OPTIONS = [
  'Pending',
  'Approved',
  'Rejected'
] as const;

export const USE_STATUS_OPTIONS = [
  'pending',
  'utilize'
] as const;

interface EditorUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

interface AdCreativeItem {
  id: string;
  creativeId?: string | null;
  mediaType?: string;
  videoName: string;
  forTarget: string;
  editorId: string | null;
  editorName: string | null;
  editor?: EditorUser | null;
  videoLink: string | null;
  status: string;
  completedDate: string | null;
  remark: string | null;
  approval: string;
  useStatus: string;
  utilizeDate: string | null;
  createdAt: Date | string;
}

interface Props {
  initialRecords: AdCreativeItem[];
  editors: EditorUser[];
  canApprove: boolean;
  currentUser: import('@/lib/view-types').DashboardUser | null;
  isWorkingSheet?: boolean;
  initialMediaType?: 'Video' | 'Graphics';
}

function AdCreativeSheetTable({ 
  initialRecords, 
  editors, 
  canApprove, 
  currentUser,
  isWorkingSheet = false,
  initialMediaType
}: Props) {
  const isEditingTeam = currentUser?.department === 'Editing Team' || (currentUser?.department && currentUser.department.toLowerCase().includes('edit'));
  const isGraphicsTeam = currentUser?.department === 'Graphics Team' || (currentUser?.department && currentUser.department.toLowerCase().includes('graphic'));
  const isManagerOrAdmin = canApprove || currentUser?.role === 'MANAGER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  // Enforce Video for Editing Team, Graphics for Graphics Team (unless Manager/Admin)
  const defaultDataType: 'Video' | 'Graphics' = (isEditingTeam && !isManagerOrAdmin) 
    ? 'Video' 
    : (isGraphicsTeam && !isManagerOrAdmin) 
      ? 'Graphics' 
      : (initialMediaType || 'Video');

  useRouter();
  const [records, setRecords]=useEditableRows(initialRecords)
  


  const [dataType, setDataType] = useState<'Video' | 'Graphics'>(defaultDataType);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFor, setSelectedFor] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedApproval, setSelectedApproval] = useState<string>('ALL');
  const [selectedUseStatus, setSelectedUseStatus] = useState<string>('ALL');

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage,setCurrentPage]=usePageNumber(JSON.stringify([searchQuery,selectedFor,selectedStatus,selectedApproval,selectedUseStatus,dataType,itemsPerPage]))

  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSelected = new Set(selectedRecords);
      paginatedRecords.forEach(r => newSelected.add(r.id));
      setSelectedRecords(newSelected);
    } else {
      const newSelected = new Set(selectedRecords);
      paginatedRecords.forEach(r => newSelected.delete(r.id));
      setSelectedRecords(newSelected);
    }
  };

  const handleSelectRecord = (id: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedRecords(newSelected);
  };

  // Modal State for New Entry
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newVideoName, setNewVideoName] = useState('');
  const [newForTarget, setNewForTarget] = useState<string>('Vastu Shikhar');
  const [newEditorId, setNewEditorId] = useState<string>('');
  const [newVideoLink, setNewVideoLink] = useState('');
  const [newStatus, setNewStatus] = useState<string>('pending');
  const [newRemark, setNewRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, ] = useState<string | null>(null);

  // Modal State for Manager Edit (Approval & Use Status Only)
  const [editingItem, setEditingItem] = useState<AdCreativeItem | null>(null);
  const [editApproval, setEditApproval] = useState<string>('Pending');
  const [editUseStatus, setEditUseStatus] = useState<string>('pending');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEditModal = (item: AdCreativeItem) => {
    setEditingItem(item);
    setEditApproval(item.approval || 'Pending');
    setEditUseStatus(item.useStatus || 'pending');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSavingEdit(true);

    const today = getTodayStr();
    const willUtilize = editUseStatus === 'utilize';
    const newUtilizeDate = willUtilize ? (editingItem.utilizeDate || today) : null;

    // Optimistic update
    setRecords(prev => prev.map(r => {
      if (r.id === editingItem.id) {
        return {
          ...r,
          approval: editApproval,
          useStatus: editUseStatus,
          utilizeDate: newUtilizeDate
        };
      }
      return r;
    }));

    try {
      const res = await updateAdCreativeRecordAction(editingItem.id, {
        approval: editApproval,
        useStatus: editUseStatus,
        utilizeDate: newUtilizeDate
      });

      if (res.error) {
        showToast(`❌ ${res.error}`);
        setRecords(initialRecords);
      } else {
        showToast('✅ Approval & Use Status updated successfully!');
        setEditingItem(null);
      }
    } catch (err) {
      showToast(`❌ ${(err instanceof Error ? err.message : String(err))}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openAddModal = () => {
    // If current user is logged in, default editor to them
    if (currentUser?.id) {
      setNewEditorId(currentUser.id);
    } else {
      setNewEditorId('');
    }
    setNewVideoName('');
    setNewForTarget('Vastu Shikhar');
    setNewVideoLink('');
    setNewStatus('pending');
    setNewRemark('');
    setIsAddModalOpen(true);
  };

  const showToast = (msg: string) => {
    if (msg.startsWith('❌')) {
      toast.error(msg.replace('❌ ', '').replace('❌', '').trim());
    } else {
      toast.success(msg.replace('✅ ', '').replace('✅', '').replace('🗑️ ', '').replace('🗑️', '').replace('🔄 ', '').replace('🔄', '').trim());
    }
  };

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleBulkUtilize = async () => {
    if (selectedRecords.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to mark ${selectedRecords.size} item(s) as utilized?`)) return;

    setIsSubmitting(true);
    const today = getTodayStr();
    let successCount = 0;
    
    try {
      const promises = Array.from(selectedRecords).map(id => 
        updateAdCreativeRecordAction(id, { useStatus: 'utilize', utilizeDate: today })
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(res => {
        if (!res.error) successCount++;
      });
      
      if (successCount > 0) {
        showToast(`✅ Successfully marked ${successCount} item(s) as utilized.`);
        setRecords(prev => prev.map(r => 
          selectedRecords.has(r.id) ? { ...r, useStatus: 'utilize', utilizeDate: today } : r
        ));
      } else {
        showToast('❌ Failed to update items.');
      }
    } catch (err) {
      showToast(`❌ Error bulk updating: ${(err instanceof Error ? err.message : String(err))}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Active filters check & Reset handler
  const hasActiveFilters = Boolean(
    searchQuery.trim() || 
    selectedFor !== 'ALL' || 
    selectedStatus !== 'ALL' || 
    selectedApproval !== 'ALL' || 
    selectedUseStatus !== 'ALL'
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedFor('ALL');
    setSelectedStatus('ALL');
    setSelectedApproval('ALL');
    setSelectedUseStatus('ALL');
    showToast('🔄 Filters have been reset');
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Filter by Video Data vs Graphics Data
      const recordType = r.mediaType || 'Video';
      if (recordType !== dataType) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.videoName?.toLowerCase().includes(q);
        const matchEditor = (r.editorName || r.editor?.name || '').toLowerCase().includes(q);
        const matchRemark = r.remark?.toLowerCase().includes(q);
        const matchFor = r.forTarget?.toLowerCase().includes(q);
        if (!matchName && !matchEditor && !matchRemark && !matchFor) return false;
      }

      // For filter
      if (selectedFor !== 'ALL' && r.forTarget !== selectedFor) return false;

      // Status filter
      if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;

      // Approval filter
      if (selectedApproval !== 'ALL' && r.approval !== selectedApproval) return false;

      // Use status filter
      if (selectedUseStatus !== 'ALL' && r.useStatus !== selectedUseStatus) return false;

      // Strict scope: non-managers ONLY ever see their own profile data
      if (!isManagerOrAdmin && currentUser?.id) {
        const isMine = r.editorId === currentUser.id || (r.editorName && currentUser.name && r.editorName.toLowerCase() === currentUser.name.toLowerCase());
        if (!isMine) return false;
      }

      return true;
    });
  }, [records, dataType, searchQuery, selectedFor, selectedStatus, selectedApproval, selectedUseStatus, isManagerOrAdmin, currentUser]);



  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));

  const paginatedRecords=filteredRecords.slice((currentPage-1)*itemsPerPage,currentPage*itemsPerPage)


  // Metrics (specific to selected Video Data / Graphics Data and user scope)
  const metrics = useMemo(() => {
    let list = records.filter(r => (r.mediaType || 'Video') === dataType);
    if (!isManagerOrAdmin && currentUser?.id) {
      list = list.filter(r => r.editorId === currentUser.id || (r.editorName && currentUser.name && r.editorName.toLowerCase() === currentUser.name.toLowerCase()));
    }
    const total = list.length;
    const completed = list.filter(r => r.status === 'Complete').length;
    const inProgress = list.filter(r => r.status === 'Inprogres').length;
    const pendingApproval = list.filter(r => r.approval === 'Pending').length;
    const approved = list.filter(r => r.approval === 'Approved').length;
    const utilized = list.filter(r => r.useStatus === 'utilize').length;
    return { total, completed, inProgress, pendingApproval, approved, utilized };
  }, [records, dataType, isManagerOrAdmin, currentUser]);

  // Field change handler
  const handleFieldChange = async (id: string, field: keyof AdCreativeItem, value:string|null) => {
    // Optimistic state update
    const today = getTodayStr();
    let updatedCompletedDate: string | null | undefined;
    let updatedUtilizeDate: string | null | undefined;
    
    let isRevisionResend = false;
    if (field === 'status' && value === 'Resend for approval (Revised)') {
      isRevisionResend = true;
      value = 'Complete';
    }

    setRecords(prev => prev.map(item => {
      if (item.id === id) {
        const next = { ...item, [field]: value };
        if (field === 'status' && value === 'Complete' && !item.completedDate) {
          next.completedDate = today;
          updatedCompletedDate = today;
        }
        if (field === 'useStatus' && value === 'utilize' && !item.utilizeDate) {
          next.utilizeDate = today;
          updatedUtilizeDate = today;
        }
        if (field === 'editorId') {
          const ed = editors.find(e => e.id === value);
          next.editorName = ed ? ed.name : null;
          next.editor = ed || null;
        }
        if (isRevisionResend) {
          next.approval = 'Pending';
        }
        return next;
      }
      return item;
    }));

    // Server update
    const payload: Partial<import('@prisma/client').Prisma.AdCreativeRecordUncheckedCreateInput> = { [field]: value };
    if (updatedCompletedDate !== undefined) payload.completedDate = updatedCompletedDate;
    if (updatedUtilizeDate !== undefined) payload.utilizeDate = updatedUtilizeDate;
    if (isRevisionResend) payload.approval = 'Pending';

    try {
      const res = await updateAdCreativeRecordAction(id, payload);
      if (res.error) {
        showToast(`❌ Error: ${res.error}`);
        // Revert on error
        setRecords(initialRecords);
      }
    } catch (err) {
      showToast(`❌ Error: ${(err instanceof Error ? err.message : String(err))}`);
    }
  };

  // Add Record Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoName.trim()) {
      showToast('❌ Video Name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createAdCreativeRecordAction({
        mediaType: dataType,
        videoName: newVideoName,
        forTarget: newForTarget,
        editorId: newEditorId || undefined,
        videoLink: newVideoLink,
        status: newStatus,
        remark: newRemark
      });

      if (res.error) {
        showToast(`❌ ${res.error}`);
      } else if (res.record) {
        setRecords(prev => [res.record, ...prev]);
        setIsAddModalOpen(false);
        setNewVideoName('');
        setNewForTarget('Vastu Shikhar');
        setNewEditorId('');
        setNewVideoLink('');
        setNewStatus('pending');
        setNewRemark('');
        showToast('✅ Ad Creative record created successfully!');
      }
    } catch (err) {
      showToast(`❌ ${(err instanceof Error ? err.message : String(err))}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirm = useConfirm();

  // Delete Record
  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Creative?',
      message: `Are you sure you want to delete "${name}"?`,
      type: 'danger'
    });
    if (!isConfirmed) return;
    setRecords(prev => prev.filter(r => r.id !== id));
    try {
      const res = await deleteAdCreativeRecordAction(id);
      if (res.error) {
        showToast(`❌ ${res.error}`);
        setRecords(initialRecords);
      } else {
        showToast('🗑️ Record deleted successfully.');
      }
    } catch (err) {
      showToast(`❌ ${(err instanceof Error ? err.message : String(err))}`);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Video Name',
      'For',
      'Editor Name',
      'Video Link',
      'Status',
      'Date',
      'Remark',
      'Approval',
      'Use Status',
      'Utilize Date'
    ];

    const rows = filteredRecords.map(r => [
      r.creativeId || '-',
      r.videoName || '',
      r.forTarget || '',
      r.editorName || r.editor?.name || '',
      r.videoLink || '',
      r.status || '',
      r.completedDate || '',
      r.remark || '',
      r.approval || '',
      r.useStatus || '',
      r.utilizeDate || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ad_Creative_Sheet_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Complete':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'Inprogres':
        return { bg: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', border: 'rgba(59, 130, 246, 0.3)' };
      default:
        return { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', border: 'rgba(245, 158, 11, 0.3)' };
    }
  };

  const getApprovalBadgeStyle = (approval: string) => {
    switch (approval) {
      case 'Approved':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'Rejected':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', border: 'rgba(239, 68, 68, 0.3)' };
      case 'Revision':
        return { bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316', border: 'rgba(249, 115, 22, 0.3)' };
      default:
        return { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', border: 'rgba(245, 158, 11, 0.3)' };
    }
  };

  const getUseStatusBadgeStyle = (useStatus: string) => {
    switch (useStatus) {
      case 'utilize':
        return { bg: 'rgba(168, 85, 247, 0.15)', color: 'var(--primary)', border: 'rgba(168, 85, 247, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', color: 'var(--text-muted)', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: 0 }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: 'var(--table-header-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          color: 'var(--text-primary)',
          padding: '12px 20px',
          borderRadius: '10px',
          fontSize: '0.9rem',
          fontWeight: 600,
          animation: 'fadeIn 0.2s ease'
        }}>
          {toastMessage}
        </div>
      )}

      {/* Top Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '10px'
      }}>
        {[
          { label: 'Total Creatives', value: metrics.total, color: 'var(--primary)', icon: Video, bg: 'rgba(56, 189, 248, 0.12)' },
          { label: 'Completed', value: metrics.completed, color: 'var(--success)', icon: CheckCircle2, bg: 'rgba(52, 211, 153, 0.12)' },
          { label: 'In Progress', value: metrics.inProgress, color: 'var(--primary)', icon: Clock, bg: 'rgba(96, 165, 250, 0.12)' },
          { label: 'Pending Approval', value: metrics.pendingApproval, color: 'var(--warning)', icon: AlertCircle, bg: 'rgba(251, 191, 36, 0.12)' },
          { label: 'Approved (Mgr)', value: metrics.approved, color: 'var(--success)', icon: ShieldCheck, bg: 'rgba(16, 185, 129, 0.12)' },
          { label: 'Utilized', value: metrics.utilized, color: 'var(--primary)', icon: Sparkles, bg: 'rgba(192, 132, 252, 0.12)' },
        ].map((m, idx) => {
          const Icon = m.icon;
          return (
            <div 
              key={idx}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '12px',
                padding: '11px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 4px 14px -2px rgba(0, 0, 0, 0.3)',
                transition: 'transform 0.15s, border-color 0.15s'
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: m.bg,
                color: m.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={18} />
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {m.label}
                </div>
                <div style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800, marginTop: '1px' }}>
                  {m.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Bar: Modern 2-Tier Layout */}
      <div style={{
        background: 'var(--table-header-bg)',
        borderRadius: '14px',
        border: '1px solid var(--card-border)',
        padding: '12px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Row 1: Search Box & Right Controls (Switcher + Add Button) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '420px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={`Search ${dataType === 'Video' ? 'video' : 'graphics'}, editor, remark...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                padding: '9px 14px 9px 38px',
                borderRadius: '10px',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
                transition: 'border 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = '1px solid #3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Right: Media Switcher (Video vs Graphics) & Add Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isManagerOrAdmin ? (
              <div style={{
                display: 'flex',
                background: 'var(--card-bg)',
                borderRadius: '10px',
                padding: '3px',
                border: '1px solid var(--card-border)'
              }}>
                <button 
                  type="button"
                  onClick={() => setDataType('Video')}
                  style={{ 
                    padding: '7px 18px', 
                    borderRadius: '8px',
                    background: dataType === 'Video' ? '#3b82f6' : 'transparent', 
                    color: dataType === 'Video' ? 'var(--text-primary)' : 'var(--text-muted)', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontSize: '0.85rem', 
                    fontWeight: 700, 
                    transition: 'all 0.2s' 
                  }}
                >
                  Video Data
                </button>
                <button 
                  type="button"
                  onClick={() => setDataType('Graphics')}
                  style={{ 
                    padding: '7px 18px', 
                    borderRadius: '8px',
                    background: dataType === 'Graphics' ? '#3b82f6' : 'transparent', 
                    color: dataType === 'Graphics' ? 'var(--text-primary)' : 'var(--text-muted)', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontSize: '0.85rem', 
                    fontWeight: 700, 
                    transition: 'all 0.2s' 
                  }}
                >
                  Graphics Data
                </button>
              </div>
            ) : (
              <div style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: 'var(--primary)',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Video size={16} />
                <span>{dataType === 'Video' ? 'Video Data' : 'Graphics Data'}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                color: 'var(--success)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                padding: '7px 18px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)'}
            >
              <Download size={16} />
              Export
            </button>

            {selectedRecords.size > 0 && !Array.from(selectedRecords).some(id => records.find(r => r.id === id)?.approval === 'Pending') && (
              <button
                type="button"
                onClick={handleBulkUtilize}
                disabled={isSubmitting}
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--success)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  padding: '7px 18px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  opacity: isSubmitting ? 0.7 : 1
                }}
                onMouseOver={(e) => { if (!isSubmitting) e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)' }}
                onMouseOut={(e) => { if (!isSubmitting) e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)' }}
              >
                <Sparkles size={16} />
                {isSubmitting ? 'Updating...' : `Utilize (${selectedRecords.size})`}
              </button>
            )}

            {isWorkingSheet && (
              <button
                type="button"
                onClick={openAddModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#3b82f6',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
                onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
              >
                <Plus size={16} /> Add {dataType === 'Video' ? 'Video' : 'Graphics'} Creative
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Filter Toolbar Strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
              <Filter size={13} /> Filter:
            </span>

            {/* Filter: For */}
            <select
              value={selectedFor}
              onChange={(e) => setSelectedFor(e.target.value)}
              style={{
                background: selectedFor !== 'ALL' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: selectedFor !== 'ALL' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                padding: '7px 12px',
                borderRadius: '8px',
                color: selectedFor !== 'ALL' ? '#93c5fd' : 'var(--text-primary)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: 600
              }}
            >
              <option value="ALL">All &quot;For&quot; Targets</option>
              {FOR_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>

            {/* Filter: Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                background: selectedStatus !== 'ALL' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: selectedStatus !== 'ALL' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                padding: '7px 12px',
                borderRadius: '8px',
                color: selectedStatus !== 'ALL' ? '#93c5fd' : 'var(--text-primary)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: 600
              }}
            >
              <option value="ALL">All Status</option>
              <option value="pending">Pending</option>
              <option value="Inprogres">In Progress</option>
              <option value="Complete">Complete</option>
            </select>

            {/* Filter: Approval */}
            <select
              value={selectedApproval}
              onChange={(e) => setSelectedApproval(e.target.value)}
              style={{
                background: selectedApproval !== 'ALL' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: selectedApproval !== 'ALL' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                padding: '7px 12px',
                borderRadius: '8px',
                color: selectedApproval !== 'ALL' ? '#93c5fd' : 'var(--text-primary)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: 600
              }}
            >
              <option value="ALL">All Approvals</option>
              <option value="Pending">Approval: Pending</option>
              <option value="Approved">Approval: Approved</option>
              <option value="Rejected">Approval: Rejected</option>
              <option value="Revision">Approval: Revision</option>
            </select>

            {/* Filter: Use Status */}
            <select
              value={selectedUseStatus}
              onChange={(e) => setSelectedUseStatus(e.target.value)}
              style={{
                background: selectedUseStatus !== 'ALL' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: selectedUseStatus !== 'ALL' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                padding: '7px 12px',
                borderRadius: '8px',
                color: selectedUseStatus !== 'ALL' ? '#93c5fd' : 'var(--text-primary)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: 600
              }}
            >
              <option value="ALL">All Use Status</option>
              <option value="pending">Use: Pending</option>
              <option value="utilize">Use: Utilize</option>
            </select>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: 'var(--danger)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
                title="Reset all filters"
              >
                <RotateCcw size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* User Active Scope Indicator */}
          {!isManagerOrAdmin && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              color: 'var(--primary)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}>
              <User size={13} />
              <span>{currentUser?.name || 'User'} (My Space)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--table-header-bg)',
        borderRadius: '16px',
        border: '1px solid var(--card-border)',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1160px' }}>
            <thead>
              <tr style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)' }}>
                <th style={{ padding: '13px 12px', width: '40px' }}>
                  <input type="checkbox" onChange={handleSelectAll} checked={paginatedRecords.length > 0 && paginatedRecords.every(r => selectedRecords.has(r.id))} style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ padding: '13px 12px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  ID
                </th>
                <th style={{ padding: '13px 12px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {dataType === 'Video' ? 'Video Name' : 'Graphics Name'}
                </th>
                <th style={{ padding: '13px 12px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  For
                </th>
                <th style={{ padding: '13px 12px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {dataType === 'Video' ? 'Editor Name' : 'Designer / Editor'}
                </th>
                <th style={{ padding: '13px 12px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {dataType === 'Video' ? 'Video Link' : 'Graphics Link'}
                </th>
                <th style={{ padding: '13px 12px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Status
                </th>
                <th style={{ padding: '13px 12px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Date (Complete)
                </th>
                <th style={{ padding: '13px 12px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Remark
                </th>
                <th style={{ padding: '13px 12px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Approval (Mgr)
                </th>
                <th style={{ padding: '13px 12px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Use Status
                </th>
                <th style={{ padding: '13px 12px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Utilize Date
                </th>
                <th style={{ padding: '13px 12px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'center' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: '36px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)'
                      }}>
                        <Video size={22} />
                      </div>
                      <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        No {dataType === 'Video' ? 'Video' : 'Graphics'} Creatives Found
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.4 }}>
                        {isWorkingSheet 
                          ? `You haven't submitted any ${dataType === 'Video' ? 'video' : 'graphics'} creatives yet. Click "+ Add ${dataType === 'Video' ? 'Video' : 'Graphics'} Creative" to add your first entry.`
                          : `No ${dataType === 'Video' ? 'video' : 'graphics'} creatives have been submitted yet. Entries created by the team will appear here for manager review.`}
                      </div>
                      {isWorkingSheet && (
                        <button
                          type="button"
                          onClick={openAddModal}
                          style={{
                            marginTop: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#3b82f6',
                            border: 'none',
                            padding: '9px 18px',
                            borderRadius: '10px',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)'
                          }}
                        >
                          <Plus size={15} /> Add {dataType === 'Video' ? 'Video' : 'Graphics'} Creative
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item, idx) => {
                  const statusStyle = getStatusBadgeStyle(item.status);
                  const approvalStyle = getApprovalBadgeStyle(item.approval);
                  const useStatusStyle = getUseStatusBadgeStyle(item.useStatus);

                  return (
                    <tr 
                      key={item.id} 
                      style={{ 
                        borderBottom: '1px solid var(--card-border)',
                        background: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <input type="checkbox" checked={selectedRecords.has(item.id)} onChange={() => handleSelectRecord(item.id)} style={{ cursor: 'pointer' }} />
                      </td>
                      {/* ID */}
                      <td style={{ padding: '10px 12px', minWidth: '100px', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                        {item.creativeId || '-'}
                      </td>
                      {/* 1. Video Name */}
                      <td style={{ padding: '10px 12px', minWidth: '170px' }}>
                        {isWorkingSheet ? (
                          <input
                            type="text"
                            defaultValue={item.videoName}
                            onBlur={(e) => {
                              if (e.target.value !== item.videoName) {
                                handleFieldChange(item.id, 'videoName', e.target.value);
                              }
                            }}
                            style={{
                              width: '100%',
                              background: 'transparent',
                              border: '1px solid transparent',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              outline: 'none'
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                            }}
                            onMouseOut={(e) => {
                              if (document.activeElement !== e.currentTarget) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.border = '1px solid transparent';
                              }
                            }}
                          />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                              {item.videoName}
                            </span>
                            {item.approval === 'Revision' && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#f97316', background: 'rgba(249, 115, 22, 0.1)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                                <AlertCircle size={12} /> Revision Needed
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 2. For */}
                      <td style={{ padding: '10px 12px', minWidth: '120px' }}>
                        {isWorkingSheet ? (
                          <select
                            value={item.forTarget}
                            onChange={(e) => handleFieldChange(item.id, 'forTarget', e.target.value)}
                            style={{
                              background: 'var(--table-hover)',
                              border: '1px solid var(--card-border)',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              color: 'var(--primary)',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            {FOR_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            background: 'rgba(59, 130, 246, 0.12)',
                            color: 'var(--primary)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            border: '1px solid rgba(59, 130, 246, 0.25)'
                          }}>
                            {item.forTarget}
                          </span>
                        )}
                      </td>

                      {/* 3. Editor Name */}
                      <td style={{ padding: '10px 12px', minWidth: '130px' }}>
                        <span style={{
                          display: 'inline-block',
                          color: 'var(--primary)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          background: 'rgba(59, 130, 246, 0.1)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(59, 130, 246, 0.2)'
                        }}>
                          {item.editorName || item.editor?.name || currentUser?.name || '-'}
                        </span>
                      </td>

                      {/* 4. Video Link */}
                      <td style={{ padding: '10px 12px', minWidth: '120px' }}>
                        {isWorkingSheet ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="text"
                              placeholder="https://..."
                              defaultValue={item.videoLink || ''}
                              onBlur={(e) => {
                                if (e.target.value !== (item.videoLink || '')) {
                                  handleFieldChange(item.id, 'videoLink', e.target.value);
                                }
                              }}
                              style={{
                                flex: 1,
                                background: 'transparent',
                                border: '1px solid transparent',
                                padding: '6px 8px',
                                borderRadius: '6px',
                                color: 'var(--primary)',
                                fontSize: '0.85rem',
                                outline: 'none'
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                              }}
                            />
                            {item.videoLink && (
                              <a
                                href={item.videoLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open Video Link"
                                style={{
                                  color: 'var(--primary)',
                                  background: 'rgba(56, 189, 248, 0.1)',
                                  padding: '6px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                            <DriveUploadButton onUploadComplete={(url) => handleFieldChange(item.id, 'videoLink', url)} label="↑" />
                          </div>
                        ) : (
                          item.videoLink ? (
                            <a
                              href={item.videoLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: 'var(--primary)',
                                textDecoration: 'none',
                                fontSize: '0.82rem',
                                background: 'rgba(56, 189, 248, 0.1)',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid rgba(56, 189, 248, 0.25)',
                                maxWidth: '220px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              title={item.videoLink}
                            >
                              <ExternalLink size={13} style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Open Link
                              </span>
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                          )
                        )}
                      </td>

                      {/* 5. Status */}
                      <td style={{ padding: '10px 12px', minWidth: '110px' }}>
                        {isWorkingSheet ? (
                          <select
                            value={item.status}
                            onChange={(e) => handleFieldChange(item.id, 'status', e.target.value)}
                            style={{
                              background: statusStyle.bg,
                              color: statusStyle.color,
                              border: `1px solid ${statusStyle.border}`,
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="pending">pending</option>
                            <option value="Inprogres">Inprogres</option>
                            <option value="Complete">Complete</option>
                            {item.approval === 'Revision' && (
                              <option value="Resend for approval (Revised)">Resend for approval (Revised)</option>
                            )}
                          </select>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            border: `1px solid ${statusStyle.border}`,
                            fontSize: '0.82rem',
                            fontWeight: 700
                          }}>
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* 6. Date (Complete Date - Auto Filled) */}
                      <td style={{ padding: '10px 12px', minWidth: '115px' }}>
                        {isWorkingSheet ? (
                          <input
                            type="date"
                            value={item.completedDate || ''}
                            onChange={(e) => handleFieldChange(item.id, 'completedDate', e.target.value || null)}
                            style={{
                              background: item.completedDate ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                              border: `1px solid ${item.completedDate ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                              borderRadius: '6px',
                              padding: '6px 8px',
                              color: item.completedDate ? '#34d399' : 'var(--text-muted)',
                              fontSize: '0.82rem',
                              fontWeight: item.completedDate ? 600 : 400,
                              outline: 'none'
                            }}
                          />
                        ) : (
                          <span style={{ color: item.completedDate ? '#34d399' : 'var(--text-muted)', fontSize: '0.82rem', fontWeight: item.completedDate ? 600 : 400 }}>
                            {item.completedDate || '-'}
                          </span>
                        )}
                      </td>

                      {/* 7. Remark */}
                      <td style={{ padding: '10px 12px', minWidth: '140px' }}>
                        {isWorkingSheet ? (
                          <input
                            type="text"
                            placeholder="Add remark..."
                            defaultValue={item.remark || ''}
                            onBlur={(e) => {
                              if (e.target.value !== (item.remark || '')) {
                                handleFieldChange(item.id, 'remark', e.target.value);
                              }
                            }}
                            style={{
                              width: '100%',
                              background: 'transparent',
                              border: '1px solid transparent',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              fontSize: '0.85rem',
                              outline: 'none'
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                            }}
                          />
                        ) : (
                          <span style={{ color: item.remark ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {item.remark || '-'}
                          </span>
                        )}
                      </td>

                      {/* 8. Approval (Mgr) */}
                      <td style={{ padding: '10px 12px', minWidth: '120px' }}>
                        <span
                          title={canApprove ? "Click 'Edit' in Action to change Approval" : undefined}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: approvalStyle.bg,
                            color: approvalStyle.color,
                            border: `1px solid ${approvalStyle.border}`,
                            fontSize: '0.82rem',
                            fontWeight: 700
                          }}
                        >
                          {item.approval}
                        </span>
                      </td>

                      {/* 9. Use Status */}
                      <td style={{ padding: '10px 12px', minWidth: '110px' }}>
                        <span
                          title={canApprove ? "Click 'Edit' in Action to change Use Status" : undefined}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: useStatusStyle.bg,
                            color: useStatusStyle.color,
                            border: `1px solid ${useStatusStyle.border}`,
                            fontSize: '0.82rem',
                            fontWeight: 700
                          }}
                        >
                          {item.useStatus}
                        </span>
                      </td>

                      {/* 10. Utilize Date (Auto Filled) */}
                      <td style={{ padding: '10px 12px', minWidth: '110px' }}>
                        <span style={{ color: item.utilizeDate ? '#c084fc' : 'var(--text-muted)', fontSize: '0.82rem', fontWeight: item.utilizeDate ? 600 : 400 }}>
                          {item.utilizeDate || '-'}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '10px 12px', textAlign: 'center', minWidth: '100px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          {/* Manager Edit Option: Allows editing Approval (Mgr) & Use Status ONLY */}
                          {canApprove && (
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title="Edit Approval (Mgr) & Use Status"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                transition: 'all 0.15s'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.28)';
                                e.currentTarget.style.color = '#93c5fd';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                                e.currentTarget.style.color = '#60a5fa';
                              }}
                            >
                              <Pencil size={13} />
                              <span>Edit</span>
                            </button>
                          )}

                          {/* Delete Record */}
                          {(canApprove || item.editorId === currentUser?.id) ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id, item.videoName)}
                              title="Delete Record"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '6px',
                                transition: 'color 0.2s'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                              onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            !canApprove && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Seamless Integrated Footer for Pagination */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '12px 18px',
          background: 'var(--card-bg)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {/* Left: Info & Rows per page selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {filteredRecords.length === 0 ? (
                'Showing 0 of 0 records'
              ) : (
                <>
                  Showing <strong style={{ color: 'var(--text-primary)' }}>{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</strong> of{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>{filteredRecords.length}</strong> records
                </>
              )}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="adCreativeRowsPerPageSelect" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>
                Rows per page:
              </label>
              <select
                id="adCreativeRowsPerPageSelect"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Right: Page Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* First Page */}
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              title="First Page"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
                background: currentPage <= 1 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                color: currentPage <= 1 ? '#475569' : '#60a5fa',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <ChevronsLeft size={16} />
            </button>

            {/* Previous Page */}
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              title="Previous Page"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
                background: currentPage <= 1 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                color: currentPage <= 1 ? '#475569' : '#60a5fa',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <ChevronLeft size={15} />
              <span>Prev</span>
            </button>

            {/* Page Indicator */}
            <span style={{
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              padding: '5px 10px',
              background: 'var(--table-hover)',
              borderRadius: '8px',
              border: '1px solid var(--card-border)'
            }}>
              Page {currentPage} of {totalPages}
            </span>

            {/* Next Page */}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              title="Next Page"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
                background: currentPage >= totalPages ? 'rgba(0, 0, 0, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                color: currentPage >= totalPages ? '#475569' : '#60a5fa',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <span>Next</span>
              <ChevronRight size={15} />
            </button>

            {/* Last Page */}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Last Page"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
                background: currentPage >= totalPages ? 'rgba(0, 0, 0, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                color: currentPage >= totalPages ? '#475569' : '#60a5fa',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Add New Creative Modal */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={() => setIsAddModalOpen(false)}
        >
          <div 
            style={{
              background: 'var(--table-header-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '16px',
              padding: '28px',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>
                  Add New {dataType === 'Video' ? 'Video' : 'Graphics'} Creative
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Enter the details for the new {dataType.toLowerCase()} creative.
                </p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Video/Graphics Name */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  {dataType === 'Video' ? 'Video Name' : 'Graphics Name'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={dataType === 'Video' ? 'e.g. Vastu Reel Ep 04 - Main Door' : 'e.g. Vastu Banner 1080x1080 - Main Door'}
                  value={newVideoName}
                  onChange={(e) => setNewVideoName(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--table-hover)',
                    border: '1px solid var(--card-border)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Grid: For & Editor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    For Target *
                  </label>
                  <select
                    value={newForTarget}
                    onChange={(e) => setNewForTarget(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--table-hover)',
                      border: '1px solid var(--card-border)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {FOR_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    {dataType === 'Video' ? 'Editor Name' : 'Designer / Editor'}
                  </label>
                  {(!isManagerOrAdmin || isWorkingSheet) ? (
                    <div style={{
                      width: '100%',
                      background: 'var(--table-hover)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      color: 'var(--primary)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <User size={15} style={{ color: 'var(--primary)' }} />
                      <span>{currentUser?.name || 'Current User'}</span>
                    </div>
                  ) : (
                    <select
                      value={newEditorId}
                      onChange={(e) => setNewEditorId(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--table-hover)',
                        border: '1px solid var(--card-border)',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">-- Select {dataType === 'Video' ? 'Editor' : 'Designer'} --</option>
                      {currentUser?.id && !editors.some(e => e.id === currentUser.id) && (
                        <option value={currentUser.id}>{currentUser.name} (You)</option>
                      )}
                      {editors.map(ed => (
                        <option key={ed.id} value={ed.id}>
                          {ed.name}{ed.id === currentUser?.id ? ' (You)' : ''} ({ed.role} - {ed.department})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Video/Graphics Link */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  {dataType === 'Video' ? 'Video Link (Drive / Dropbox / Preview URL)' : 'Graphics Link (Canva / Drive / Figma URL)'}
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={newVideoLink}
                  onChange={(e) => setNewVideoLink(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--table-hover)',
                    border: '1px solid var(--card-border)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <DriveUploadButton onUploadComplete={(url) => setNewVideoLink(url)} />
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Initial Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--table-hover)',
                    border: '1px solid var(--card-border)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="pending">pending</option>
                  <option value="Inprogres">Inprogres</option>
                  <option value="Complete">Complete (will auto-set completed date to today)</option>
                </select>
              </div>

              {/* Remark */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Remark
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional notes or instructions..."
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--table-hover)',
                    border: '1px solid var(--card-border)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--card-border)',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#3b82f6',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                >
                  <Plus size={16} />
                  <span>{isSubmitting ? 'Adding...' : 'Add Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manager Edit Modal: Only Approval (Mgr) & Use Status can be edited */}
      {editingItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--table-header-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--card-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.2)'
            }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Pencil size={18} style={{ color: 'var(--primary)' }} />
                  <span>Edit Approval & Use Status</span>
                </h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Manager can edit Approval (Mgr) and Use Status only
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Read-only Summary Info */}
            <div style={{
              padding: '16px 24px',
              background: 'var(--card-bg)',
              borderBottom: '1px solid var(--card-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Creative Name:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.88rem' }}>{editingItem.videoName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>For Target:</span>
                <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem' }}>{editingItem.forTarget}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Creator / Editor:</span>
                <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{editingItem.editorName || editingItem.editor?.name || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Creative Status:</span>
                <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>{editingItem.status}</span>
              </div>
              {editingItem.completedDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Complete Date:</span>
                  <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>{editingItem.completedDate}</span>
                </div>
              )}
            </div>

            {/* Modal Form: Only 2 editable fields */}
            <form onSubmit={handleSaveEdit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Field 1: Approval (Mgr) */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                  Approval (Mgr) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  value={editApproval}
                  onChange={(e) => setEditApproval(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--table-hover)',
                    border: '1px solid var(--card-border)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    color: editApproval === 'Approved' ? '#34d399' : editApproval === 'Rejected' ? '#f87171' : '#fbbf24',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Pending" style={{ background: 'var(--table-header-bg)', color: 'var(--warning)' }}>Pending</option>
                  <option value="Approved" style={{ background: 'var(--table-header-bg)', color: 'var(--success)' }}>Approved</option>
                  <option value="Rejected" style={{ background: 'var(--table-header-bg)', color: 'var(--danger)' }}>Rejected</option>
                  <option value="Revision" style={{ background: 'var(--table-header-bg)', color: '#f97316' }}>Revision</option>
                </select>
              </div>

              {/* Field 2: Use Status */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                  Use Status <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  value={editUseStatus}
                  onChange={(e) => setEditUseStatus(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--table-hover)',
                    border: '1px solid var(--card-border)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    color: editUseStatus === 'utilize' ? '#c084fc' : 'var(--text-muted)',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="pending" style={{ background: 'var(--table-header-bg)', color: 'var(--text-muted)' }}>pending</option>
                  <option value="utilize" style={{ background: 'var(--table-header-bg)', color: 'var(--primary)' }}>utilize</option>
                </select>
                <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  {editUseStatus === 'utilize' 
                    ? `⚡ Utilize Date will be set automatically to today (${getTodayStr()}).` 
                    : '⏳ Creative is not yet utilized.'}
                </p>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--card-border)',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#3b82f6',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: isSavingEdit ? 'not-allowed' : 'pointer',
                    opacity: isSavingEdit ? 0.7 : 1
                  }}
                >
                  <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default React.memo(AdCreativeSheetTable);
