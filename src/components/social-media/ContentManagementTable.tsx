'use client';
import { usePageNumber } from '@/hooks/use-lead-page';

import React,{ useState,useEffect,useMemo,useCallback } from 'react';
import { Search,Plus,Edit,Trash2,Eye,ExternalLink,CheckCircle2,Clock,XCircle,AlertCircle,Video,Calendar,Layers,ChevronLeft,ChevronRight,ChevronsLeft,ChevronsRight,Loader2,Briefcase } from 'lucide-react';
import { getContentRecords,createContentRecord,updateContentRecord,deleteContentRecord,getUsersForDropdowns,takeThumbnailTaskAction } from '@/app/actions/content';
import { getSocialMediaChannelsAction } from '@/app/actions/socialMediaChannel';
import { useConfirm } from '@/providers/ConfirmProvider';
import DriveUploadButton from '@/components/DriveUploadButton';

interface ContentManagementTableProps {
  channel: string;
  isWorkingSheet?: boolean;
  isThumbnailSheet?: boolean;
  isGraphicsSheet?: boolean;
  isPostingSheet?: boolean;
  currentUserId?: string;
  currentUserRole?: string;
}

export default function ContentManagementTable({ channel, isWorkingSheet = false, isThumbnailSheet = false, isGraphicsSheet = false, isPostingSheet = false, currentUserId, currentUserRole }: ContentManagementTableProps) {
  const isManagerWorkspace = !isWorkingSheet && !isThumbnailSheet && !isGraphicsSheet && !isPostingSheet;
  const canEditOrAdd = isWorkingSheet || isThumbnailSheet || isGraphicsSheet || isPostingSheet || currentUserRole === 'ADMIN' || currentUserRole === 'MANAGER';
  const [data, setData] = useState<import('@/lib/view-types').ContentView[]>([]);
  const [users, setUsers] = useState<Pick<import('@/lib/public-user').PublicUser,'id'|'name'|'role'|'department'|'mainDepartment'>[]>([]);
  const [dynamicChannelsList, setDynamicChannelsList] = useState<import('@prisma/client').SocialMediaChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<import('@/lib/view-types').ContentView | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, ] = useState('All');
  const [filterEditor, setFilterEditor] = useState('All');
  const [filterFormat, setFilterFormat] = useState('All');
  const [filterAppStatus, setFilterAppStatus] = useState('All');
  const [preferredDataType,setDataType] = useState<'Video' | 'Graphics'>('Video');
  const currentUserDepartment=users.find(u=>u.id===currentUserId)?.department
  const dataType=currentUserDepartment==='Graphics Team'?'Graphics':currentUserDepartment==='Editing Team'?'Video':preferredDataType
  const [isViewingApproved, setIsViewingApproved] = useState(false);
  const [isViewingUploaded, setIsViewingUploaded] = useState(false);
  
  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage,setCurrentPage]=usePageNumber(JSON.stringify([searchTerm,filterStatus,dataType,isViewingApproved,isViewingUploaded,filterEditor,filterFormat,filterAppStatus,itemsPerPage]))

  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const newSelected = new Set(selectedRecords);
      paginatedData.forEach(r => newSelected.add(r.id));
      setSelectedRecords(newSelected);
    } else {
      const newSelected = new Set(selectedRecords);
      paginatedData.forEach(r => newSelected.delete(r.id));
      setSelectedRecords(newSelected);
    }
  };

  const handleSelectRecord = (id: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedRecords(newSelected);
  };


  
  // Form State
  const initialFormState = {
    topic: '', platform: 'YouTube', channel: channel === 'ALL' ? 'VS Channel' : channel, format: 'Long Video', status: 'Pending', doneDate: '', remark: '',
    videoLink: '', thumbnail: '', thumbnailCount: '0', graphicsCount: '0', sendTo: '', approvalStatus: 'Pending', approvalDate: '', approvedById: '',
    postOnDate: '', postedById: '', postedOnPlatform: '', uploadingStatus: 'Pending', uploadingDate: '', 
    scheduleVideo: false, uploadingTime: '', storyStatus: 'Pending', editorId: currentUserId || '', 
    graphicDesignerId: currentUserId || '', thumbnailDoneDate: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isManagerRestricted = currentUserRole === 'MANAGER';

  const fetchData=useCallback(()=>getContentRecords(channel).then(res=>{if(res.data)setData(res.data)}).catch(error=>console.error('Unable to load content:',error)).finally(()=>setIsLoading(false)),[channel])
  function fetchUsers(){return getUsersForDropdowns().then(res=>{if(res.data)setUsers(res.data)}).catch(error=>console.error('Unable to load users:',error))}

  useEffect(() => {
    fetchData();
    fetchUsers();
    getSocialMediaChannelsAction().then(res => {
      if (res.channels) setDynamicChannelsList(res.channels);
    });

    // Auto-refresh data every 10 seconds in the background
    const interval = setInterval(() => {
      fetchData();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchData]);




  const handleOpenModal = (record:import('@/lib/view-types').ContentView | null = null) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        ...record,
        topic: record.topic || '',
        platform: record.platform || 'YouTube',
        channel: record.channel || (channel === 'ALL' ? '' : channel),
        format: record.format || 'Long Video',
        status: record.status || 'Pending',
        remark: record.remark || '',
        videoLink: record.videoLink || '',
        thumbnail: record.thumbnail || '',
        thumbnailCount: record.thumbnailCount !== null ? String(record.thumbnailCount) : '0',
        graphicsCount: record.graphicsCount !== null ? String(record.graphicsCount) : '0',
        sendTo: record.sendTo || '',
        approvalStatus: record.approvalStatus || 'Pending',
        approvedById: record.approvedById || '',
        postedById: record.postedById || '',
        postedOnPlatform: record.postedOnPlatform || '',
        uploadingStatus: record.uploadingStatus || 'Pending',
        scheduleVideo: record.scheduleVideo || false,
        uploadingTime: record.uploadingTime || '',
        storyStatus: record.storyStatus || 'Pending',
        editorId: record.editorId || '',
        graphicDesignerId: record.graphicDesignerId || '',
        doneDate: record.doneDate ? new Date(new Date(record.doneDate).getTime() - new Date(record.doneDate).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
        approvalDate: record.approvalDate ? new Date(record.approvalDate).toISOString().split('T')[0] : '',
        postOnDate: record.postOnDate ? new Date(record.postOnDate).toISOString().split('T')[0] : '',
        uploadingDate: record.uploadingDate ? new Date(record.uploadingDate).toISOString().split('T')[0] : '',
        thumbnailDoneDate: record.thumbnailDoneDate ? new Date(new Date(record.thumbnailDoneDate).getTime() - new Date(record.thumbnailDoneDate).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : (isThumbnailSheet ? new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''),
      });
    } else {
      setEditingRecord(null);
      const now = new Date();
      const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setFormData({ 
        ...initialFormState, 
        editorId: (isGraphicsSheet || currentUserDepartment === 'Graphics Team') ? '' : (currentUserId || ''), 
        graphicDesignerId: (isGraphicsSheet || currentUserDepartment === 'Graphics Team') ? (currentUserId || '') : '', 
        doneDate: localNow, 
        thumbnailDoneDate: isThumbnailSheet ? localNow : '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setFormData(initialFormState);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (formData.uploadingStatus === 'Scheduled') {
      const now = new Date();
      const nowISOString = now.toISOString().split('T')[0];
      const nowTimeStr = now.toTimeString().split(' ')[0].substring(0, 5);
      
      if (!formData.uploadingDate || formData.uploadingDate < nowISOString) {
        alert("Scheduled date cannot be in the past.");
        setIsSubmitting(false);
        return;
      }
      
      if (formData.uploadingDate === nowISOString && (!formData.uploadingTime || formData.uploadingTime <= nowTimeStr)) {
        alert("Scheduled time cannot be in the past.");
        setIsSubmitting(false);
        return;
      }
    }
    
    if (editingRecord) {
      const res = await updateContentRecord(editingRecord.id, formData);
      if (res.success) {
        await fetchData();
        handleCloseModal();
      } else {
        alert(res.error);
      }
    } else {
      const payload = { ...formData };
      if (isGraphicsSheet) {
        payload.format = 'Graphics Task';
      }
      const res = await createContentRecord(formData.channel || channel, payload);
      if (res.success) {
        await fetchData();
        handleCloseModal();
      } else {
        alert(res.error);
      }
    }
    setIsSubmitting(false);
  };

  const confirm = useConfirm();

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Record?',
      message: 'Are you sure you want to delete this record?',
      type: 'danger'
    });
    if (isConfirmed) {
      const res = await deleteContentRecord(id);
      if (res.success) {
        await fetchData();
      } else {
        alert(res.error);
      }
    }
  };

  const baseData = useMemo(() => {
    const currentUser = users.find(u => u.id === currentUserId);
    const currentUserDepartment = currentUser?.department;

    return data.filter((item) => {
      // Enforce Executive isolation across ALL sheets
      if (currentUserRole === 'EXEC' && currentUserDepartment !== 'Posting Team' && currentUserDepartment !== 'Thumbnail Team') {
        if (isThumbnailSheet && currentUserDepartment === 'Graphics Team') {
          if (item.graphicDesignerId !== currentUserId) return false;
        } else {
          if (currentUserDepartment === 'Editing Team') {
            if (item.editorId !== currentUserId) return false;
          } else if (currentUserDepartment === 'Graphics Team') {
            if (item.graphicDesignerId !== currentUserId) return false;
          } else {
            if (item.editorId !== currentUserId && item.graphicDesignerId !== currentUserId) return false;
          }
        }
      }

      // Enforce TL isolation based on department data format
      if (currentUserRole === 'TL' && currentUserDepartment) {
        if (currentUserDepartment === 'Editing Team') {
          const isVideo = ['Long Video', 'Short / Reel'].includes(item.format);
          if (!isVideo) return false;
        } else if (currentUserDepartment === 'Graphics Team') {
          const isGraphics = ['Post', 'Carousel', 'Story', 'Graphics Task'].includes(item.format);
          if (!isGraphics) return false;
        }
      }

      // Enforce working sheet isolation
      if (isWorkingSheet) {
        const isGraphics = ['Post', 'Carousel', 'Carousels', 'Story', 'Community Post', 'Banners', 'Logo', 'Graphics Task'].includes(item.format);
        if (isGraphics) return false;

        if (isViewingApproved) return item.approvalStatus === 'Approved';
        if (item.approvalStatus === 'Video Revision' || item.approvalStatus === 'Video and Thumbnail Revision') return true;
        return item.approvalStatus !== 'Approved';
      }

      // Enforce Thumbnail Sheet isolation
      if (isThumbnailSheet) {
        if (isViewingApproved) return item.approvalStatus === 'Approved';
        if (item.approvalStatus === 'Thumbnail Revision' || item.approvalStatus === 'Video and Thumbnail Revision') return true;
        if (item.sendTo !== 'Send for thumbnail') return false;
        return item.approvalStatus !== 'Approved';
      }

      if (isGraphicsSheet) {
        if (item.format !== 'Graphics Task') return false;
        if (isViewingApproved) return item.approvalStatus === 'Approved';
        return item.approvalStatus !== 'Approved';
      }

      // Enforce Posting Sheet isolation
      if (isPostingSheet) {
        const isVideoUploaded = item.uploadingStatus === 'Uploaded' || item.uploadingStatus === 'Published';
        const isPlatformMatched = !item.platform || (Boolean(item.postedOnPlatform) && (item.postedOnPlatform||'').trim().toLowerCase() === item.platform.trim().toLowerCase());
        const isStoryUploaded = item.format !== 'Long Video' || item.storyStatus === 'Uploaded' || item.storyStatus === 'Published';
        const isUploadedStatus = isVideoUploaded && isPlatformMatched && isStoryUploaded;

        if (isViewingUploaded) return isUploadedStatus;
        return item.approvalStatus === 'Approved' && item.postOnDate && !isUploadedStatus;
      }

      // Enforce Channel Sheet isolation (hide drafts/in-progress)
      if (!isWorkingSheet && !isThumbnailSheet && !isGraphicsSheet && !isPostingSheet) {
        return item.sendTo === 'Send for approval' || item.sendTo === 'Resend for approval (Revised)' || item.sendTo === 'Send for thumbnail';
      }
      return true;
    });
  }, [data, isWorkingSheet, isThumbnailSheet, isGraphicsSheet, isPostingSheet, currentUserId, isViewingApproved, isViewingUploaded, users, currentUserRole]);

  // Filtered Data
  const filteredData = useMemo(() => {
    return baseData.filter((item) => {
      const matchesSearch = 
        item.uniqueId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.editor?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
      
      // Filter by Data Type (Video vs Graphics) on channel/posting pages
      let matchesDataType = true;
      if (!isWorkingSheet && !isThumbnailSheet && !isGraphicsSheet) {
        const isVideo = ['Long Video', 'Short / Reel'].includes(item.format);
        const isGraphics = ['Post', 'Carousel', 'Carousels', 'Story', 'Community Post', 'Banners', 'Logo', 'Graphics Task'].includes(item.format);
        matchesDataType = dataType === 'Video' ? isVideo : isGraphics;
      }
      
      const matchesEditor = filterEditor === 'All' || item.editor?.name === filterEditor;
      const matchesFormat = filterFormat === 'All' || item.format === filterFormat;
      const matchesAppStatus = filterAppStatus === 'All' || item.approvalStatus === filterAppStatus;
      
      return matchesSearch && matchesStatus && matchesDataType && matchesEditor && matchesFormat && matchesAppStatus;
    });
  }, [baseData, searchTerm, filterStatus, dataType, isWorkingSheet, isThumbnailSheet, isGraphicsSheet, filterEditor, filterFormat, filterAppStatus]);

  const filteredBaseDataForOptions = useMemo(() => {
    return baseData.filter(item => {
      if (!isWorkingSheet && !isThumbnailSheet && !isGraphicsSheet) {
        const isVideo = ['Long Video', 'Short / Reel'].includes(item.format);
        const isGraphics = ['Post', 'Carousel', 'Carousels', 'Story', 'Community Post', 'Banners', 'Logo', 'Graphics Task'].includes(item.format);
        return dataType === 'Video' ? isVideo : isGraphics;
      }
      return true;
    });
  }, [baseData, dataType, isWorkingSheet, isThumbnailSheet, isGraphicsSheet]);

  const uniqueEditors = useMemo(() => Array.from(new Set(filteredBaseDataForOptions.map(d => d.editor?.name).filter(Boolean))), [filteredBaseDataForOptions]);
  const uniqueFormats = useMemo(() => Array.from(new Set(filteredBaseDataForOptions.map(d => d.format).filter(Boolean))), [filteredBaseDataForOptions]);
  const uniqueAppStatuses = useMemo(() => {
    const statuses = new Set(filteredBaseDataForOptions.map(d => d.approvalStatus).filter(Boolean));
    statuses.add('Pending');
    statuses.add('Approved');
    statuses.add('Rejected');
    statuses.add('Thumbnail Revision');
    statuses.add('Video Revision');
    statuses.add('Video and Thumbnail Revision');
    return Array.from(statuses);
  }, [filteredBaseDataForOptions]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

  const paginatedData=filteredData.slice((currentPage-1)*itemsPerPage,currentPage*itemsPerPage)


  // Summary Metrics
  const metrics = useMemo(() => {
    let dataForMetrics = baseData;
    
    // If we have Video/Graphics toggle (Channel pages or Posting sheet)
    if (!isWorkingSheet && !isThumbnailSheet && !isGraphicsSheet) {
      dataForMetrics = baseData.filter(item => {
        const isVideo = ['Long Video', 'Short / Reel'].includes(item.format);
        const isGraphics = ['Post', 'Carousel', 'Carousels', 'Story', 'Community Post', 'Banners', 'Logo', 'Graphics Task'].includes(item.format);
        return dataType === 'Video' ? isVideo : isGraphics;
      });
    }

    return {
      total: dataForMetrics.length,
      inProgress: dataForMetrics.filter(d => ['In Progress', 'Editing', 'Review'].includes(d.status) || (!d.sendTo && d.approvalStatus === 'Pending')).length,
      pendingApproval: dataForMetrics.filter(d => 
        d.sendTo && d.sendTo !== '' && d.approvalStatus === 'Pending'
      ).length,
      approved: dataForMetrics.filter(d => d.approvalStatus === 'Approved').length,
      scheduled: dataForMetrics.filter(d => d.uploadingStatus === 'Scheduled').length,
      revision: dataForMetrics.filter(d => 
        ['Thumbnail Revision', 'Video Revision', 'Video and Thumbnail Revision'].includes(d.approvalStatus)
      ).length,
      published: dataForMetrics.filter(d => d.uploadingStatus === 'Published').length,
      storyPublished: dataForMetrics.filter(d => d.storyStatus === 'Published' || d.storyStatus === 'Uploaded').length,
      postingDue: dataForMetrics.filter(d => {
        if (!d.postOnDate) return false;
        if (d.uploadingStatus !== 'Pending') return false;
        const postDate = new Date(d.postOnDate);
        const today = new Date();
        postDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        return postDate <= today;
      }).length,
    };
  }, [baseData, isWorkingSheet, isThumbnailSheet, isGraphicsSheet, dataType]);

  const StatusBadge = ({ status }: { status: string }) => {
    let color = 'var(--text-muted)'; let bg = 'rgba(148, 163, 184, 0.1)';
    if (status === 'Approved' || status === 'Published' || status === 'Completed') { color = '#10b981'; bg = 'rgba(16, 185, 129, 0.1)'; }
    if (status === 'Pending' || status === 'Not Started') { color = '#fbbf24'; bg = 'rgba(251, 191, 36, 0.1)'; }
    if (status === 'In Progress' || status === 'Editing' || status === 'Uploading' || status === 'Submit' || status === 'Submit for thumbnail') { color = '#3b82f6'; bg = 'rgba(59, 130, 246, 0.1)'; }
    if (status === 'Rejected' || status === 'Failed') { color = '#ef4444'; bg = 'rgba(239, 68, 68, 0.1)'; }
    if (status === 'Thumbnail Revision' || status === 'Video Revision' || status === 'Video and Thumbnail Revision') { color = '#f97316'; bg = 'rgba(249, 115, 22, 0.1)'; }
    if (status === 'Scheduled' || status === 'Ready to Upload') { color = '#8b5cf6'; bg = 'rgba(139, 92, 246, 0.1)'; }

    return <span style={{ background: bg, color, padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{status}</span>;
  };

  const thStyle = { padding: '12px 16px', textAlign: 'left' as const, borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' as const, background: 'var(--card-bg)' };
  const tdStyle = { padding: '12px 16px', borderBottom: '1px solid var(--card-border)', fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' as const, background: 'var(--card-bg)' };
  
  const stickyLeft = { position: 'sticky' as const, left: 0, zIndex: 10, borderRight: '1px solid var(--card-border)' };
  const stickyLeft2 = { position: 'sticky' as const, left: '90px', zIndex: 10, borderRight: '1px solid var(--card-border)' };
  
  const stickyRight = { position: 'sticky' as const, right: 0, zIndex: 10, borderLeft: '2px solid rgba(255,255,255,0.1)', boxShadow: '-4px 0 10px rgba(0,0,0,0.1)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', flex: 1, minHeight: 0 }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Total Content', value: metrics.total, icon: <Video size={16} />, color: '#3b82f6' },
            ...(isPostingSheet ? [
              { label: 'Story Published', value: metrics.storyPublished, icon: <Layers size={16} />, color: '#f43f5e' }
            ] : [
              { label: 'Pending Approval', value: metrics.pendingApproval, icon: <AlertCircle size={16} />, color: '#f97316' }
            ]),
            { label: 'Approved', value: metrics.approved, icon: <CheckCircle2 size={16} />, color: 'var(--success)' },
            { label: 'Posting Due', value: metrics.postingDue, icon: <Clock size={16} />, color: 'var(--danger)' },
            ...(isPostingSheet ? [
              { label: 'Scheduled', value: metrics.scheduled, icon: <Calendar size={16} />, color: '#8b5cf6' }
            ] : [
              { label: 'Revision', value: metrics.revision, icon: <AlertCircle size={16} />, color: '#f97316' }
            ]),
            { label: 'Published', value: metrics.published, icon: <ExternalLink size={16} />, color: '#ec4899' },
          ].map((m, i) => (
            <div key={i} style={{ background: 'var(--table-hover)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: m.color }}>
                {m.icon}
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{m.label}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{m.value}</div>
            </div>
          ))}
        </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'var(--table-hover)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by ID, Topic, or Editor..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '8px 12px 8px 36px', borderRadius: '8px', fontSize: '0.9rem' }}
            />
          </div>
          
          <select value={filterEditor} onChange={e => setFilterEditor(e.target.value)} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}>
            <option value="All">All Editors</option>
            {uniqueEditors.map(ed => <option key={ed as string} value={ed as string}>{ed as string}</option>)}
          </select>
          
          <select value={filterFormat} onChange={e => setFilterFormat(e.target.value)} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}>
            <option value="All">All Formats</option>
            {uniqueFormats.map(f => <option key={f as string} value={f as string}>{f as string}</option>)}
          </select>

          <select value={filterAppStatus} onChange={e => setFilterAppStatus(e.target.value)} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}>
            <option value="All">All App. Status</option>
            {uniqueAppStatuses.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {(!isWorkingSheet && !isThumbnailSheet && !isGraphicsSheet) && (
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
              {currentUserDepartment !== 'Graphics Team' && (
                <button 
                  onClick={() => setDataType('Video')}
                  style={{ padding: '8px 16px', background: dataType === 'Video' ? '#3b82f6' : 'transparent', color: dataType === 'Video' ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'background 0.2s' }}
                >
                  Video Data
                </button>
              )}
              {currentUserDepartment !== 'Editing Team' && (
                <button 
                  onClick={() => setDataType('Graphics')}
                  style={{ padding: '8px 16px', background: dataType === 'Graphics' ? '#3b82f6' : 'transparent', color: dataType === 'Graphics' ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'background 0.2s' }}
                >
                  Graphics Data
                </button>
              )}
            </div>
          )}
          {/* Uploaded Data Toggle */}
          {isPostingSheet && (
            <button 
              onClick={() => setIsViewingUploaded(!isViewingUploaded)}
              style={{ background: isViewingUploaded ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', color: isViewingUploaded ? '#10b981' : 'var(--text-primary)', border: `1px solid ${isViewingUploaded ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255,255,255,0.1)'}`, padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <CheckCircle2 size={16} /> {isViewingUploaded ? 'Back to Pending Uploads' : 'Uploaded Data'}
            </button>
          )}
          {/* Approved Work Toggle */}
          {(isWorkingSheet || isGraphicsSheet || isThumbnailSheet) && (
            <button 
              onClick={() => setIsViewingApproved(!isViewingApproved)}
              style={{ background: isViewingApproved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', color: isViewingApproved ? '#10b981' : 'var(--text-primary)', border: `1px solid ${isViewingApproved ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255,255,255,0.1)'}`, padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <CheckCircle2 size={16} /> {isViewingApproved ? 'Back to Working Sheet' : 'Approved Work'}
            </button>
          )}
          
          {(canEditOrAdd && !isPostingSheet) && (
            <button 
            onClick={() => handleOpenModal()}
            style={{ background: '#3b82f6', color: 'var(--text-primary)', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <Plus size={16} /> Add Content
          </button>
        )}
      </div>
      </div>
      {/* Table Container Card */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', width: '100%', background: 'var(--table-header-bg)', borderRadius: '16px', border: '1px solid var(--card-border)', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.35)' }}>
        <div style={{ flex: 1, overflow: 'auto', width: '100%', position: 'relative' }}>
          {isLoading ? (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--card-bg)',
              backdropFilter: 'blur(16px)',
              gap: '24px'
            }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'var(--card-bg)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--card-border)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}>
                <Loader2 
                  size={40} 
                  color="#60a5fa" 
                  style={{ animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite' }} 
                />
                <div style={{
                  position: 'absolute',
                  inset: '-2px',
                  borderRadius: '50%',
                  border: '2px solid transparent',
                  borderTopColor: 'rgba(96, 165, 250, 0.5)',
                  animation: 'spin 2s linear infinite',
                  opacity: 0.7
                }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 600, margin: 0, letterSpacing: '0.025em' }}>
                  Loading workspace
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>
                  Preparing your data...
                </p>
              </div>
              <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isPostingSheet ? '1000px' : '2200px' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, ...stickyLeft, width: '40px' }}>
                  <input type="checkbox" onChange={handleSelectAll} checked={paginatedData.length > 0 && paginatedData.every(r => selectedRecords.has(r.id))} style={{ cursor: 'pointer' }} />
                </th>
                <th style={{ ...thStyle, ...stickyLeft, width: '90px' }}>Unique ID</th>
                {!isThumbnailSheet && !isGraphicsSheet && <th style={{ ...thStyle, ...stickyLeft2, width: '120px' }}>{dataType === 'Graphics' ? 'Graphic Editor' : 'Video Editor'}</th>}
                <th style={thStyle}>Platform</th>
                <th style={thStyle}>Channel</th>
                <th style={thStyle}>Format</th>
                {!isGraphicsSheet && (
                  <th style={thStyle}>
                    {(!isWorkingSheet && !isThumbnailSheet && dataType === 'Graphics') ? 'File Link (URL)' : 'Video Link'}
                  </th>
                )}
                
                {(!isWorkingSheet && !isThumbnailSheet && !isGraphicsSheet && dataType !== 'Graphics') && <th style={thStyle}>Thumbnail Link</th>}
                {(isThumbnailSheet || (isManagerWorkspace && dataType !== 'Graphics')) && <th style={thStyle}>Thumbnail Count</th>}
                {isThumbnailSheet && <th style={thStyle}>Thumbnail</th>}
                {isThumbnailSheet && <th style={thStyle}>Thumbnail Done Date</th>}
                {(isManagerWorkspace && dataType === 'Graphics') && <th style={thStyle}>Graphics Count</th>}
                
                {(!isWorkingSheet && !isGraphicsSheet && !isPostingSheet) && <th style={thStyle}>Approval Status</th>}
                {isPostingSheet && !isViewingUploaded && <th style={thStyle}>Post On Date</th>}
                {isPostingSheet && isViewingUploaded && <th style={thStyle}>Posted On Platform</th>}
                {isPostingSheet && isViewingUploaded && <th style={thStyle}>Uploading Date</th>}
                
                <th style={{ ...thStyle, minWidth: '250px' }}>Topic</th>
                {!isPostingSheet && <th style={thStyle}>Remark</th>}
                
                {/* Moved Thumbnail and Approval Status headers above */}

                {isGraphicsSheet && (
                  <>
                    <th style={thStyle}>Done Date</th>
                    <th style={thStyle}>File Link (URL)</th>
                    <th style={thStyle}>Graphics Count</th>
                    <th style={thStyle}>Approval Status</th>
                    <th style={thStyle}>Approval Date</th>
                    <th style={thStyle}>Approved By</th>
                    <th style={thStyle}>Uploading Status</th>
                    <th style={thStyle}>Post By</th>
                    <th style={thStyle}>Post On Date</th>
                    <th style={thStyle}>Uploading Date</th>
                    <th style={thStyle}>Uploading Time</th>
                  </>
                )}

                {(!isWorkingSheet && !isThumbnailSheet && !isGraphicsSheet) && (
                  <>
                    {!isPostingSheet && <th style={thStyle}>Approval Date</th>}
                    {!isPostingSheet && <th style={thStyle}>Approved By</th>}
                    {!isPostingSheet && <th style={thStyle}>Post On Date</th>}
                    {!isPostingSheet && <th style={thStyle}>Post By</th>}
                    {!isPostingSheet && <th style={thStyle}>Uploading Status</th>}
                    {!isPostingSheet && <th style={thStyle}>Uploading Date</th>}
                    {!isPostingSheet && <th style={thStyle}>Uploading Time</th>}
                  </>
                )}
                
                {(!isGraphicsSheet && !isPostingSheet) && <th style={thStyle}>Done Date</th>}
                {!isPostingSheet && <th style={thStyle}>Send To</th>}
                {isPostingSheet && <th style={{ ...thStyle, minWidth: '130px' }}>Story</th>}
                <th style={{ ...thStyle, ...stickyRight, width: '100px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={isWorkingSheet ? 9 : (isThumbnailSheet ? 11 : (isPostingSheet ? 11 : 21))} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No content records found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => (
                  <tr key={row.id} style={{ transition: 'background 0.2s', cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, ...stickyLeft }}>
                      <input type="checkbox" checked={selectedRecords.has(row.id)} onChange={() => handleSelectRecord(row.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ ...tdStyle, ...stickyLeft, fontWeight: 700, color: 'var(--primary)' }}>{row.uniqueId}</td>
                  {(!isThumbnailSheet && !isGraphicsSheet) && (
                    <td style={{ ...tdStyle, ...stickyLeft2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                          {row.editor?.name?.[0] || '?'}
                        </div>
                        <span>{row.editor?.name || 'Unassigned'}</span>
                      </div>
                    </td>
                  )}
                  <td style={tdStyle}>{row.platform}</td>
                  <td style={tdStyle}>{row.channel}</td>
                  <td style={tdStyle}>{row.format}</td>
                  {!isGraphicsSheet && (
                    <td style={tdStyle}>
                      {row.videoLink ? <a href={row.videoLink} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}><ExternalLink size={14} /> View</a> : '-'}
                    </td>
                  )}
                  
                  {(!isWorkingSheet && !isThumbnailSheet && !isGraphicsSheet && dataType !== 'Graphics') && (
                    <td style={tdStyle}>{row.thumbnail ? <a href={row.thumbnail} target="_blank" rel="noopener noreferrer" style={{ color: '#ec4899', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}><Eye size={14} /> Preview</a> : '-'}</td>
                  )}
                  {(isThumbnailSheet || (isManagerWorkspace && dataType !== 'Graphics')) && (
                    <td style={tdStyle}>{row.thumbnailCount || '-'}</td>
                  )}
                  {isThumbnailSheet && (
                    <td style={tdStyle}>{row.thumbnail ? <a href={row.thumbnail} target="_blank" rel="noopener noreferrer" style={{ color: '#ec4899', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}><Eye size={14} /> Preview</a> : '-'}</td>
                  )}
                  {isThumbnailSheet && (
                    <td style={tdStyle}>{row.thumbnailDoneDate ? new Date(row.thumbnailDoneDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</td>
                  )}
                  {(isManagerWorkspace && dataType === 'Graphics') && (
                    <td style={tdStyle}>{row.graphicsCount || '-'}</td>
                  )}

                  {(!isWorkingSheet && !isGraphicsSheet && !isPostingSheet) && (
                    <td style={tdStyle}><StatusBadge status={row.approvalStatus} /></td>
                  )}
                  {(isPostingSheet && !isViewingUploaded) && (
                    <td style={tdStyle}>{row.postOnDate ? new Date(row.postOnDate).toLocaleDateString('en-GB') : '-'}</td>
                  )}
                  {(isPostingSheet && isViewingUploaded) && (
                    <td style={tdStyle}>{row.postedOnPlatform || '-'}</td>
                  )}
                  {(isPostingSheet && isViewingUploaded) && (
                    <td style={tdStyle}>{row.uploadingDate ? new Date(row.uploadingDate).toLocaleDateString('en-GB') : '-'}</td>
                  )}

                  <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: '250px', fontWeight: 500 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {row.topic}
                      {(row.approvalStatus === 'Thumbnail Revision' || row.approvalStatus === 'Video Revision' || row.approvalStatus === 'Video and Thumbnail Revision') && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#f97316', background: 'rgba(249, 115, 22, 0.1)', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                          <AlertCircle size={12} /> Revision Needed
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {!isPostingSheet && <td style={{ ...tdStyle, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.remark||undefined}>{row.remark || '-'}</td>}
                  
                  {/* Moved Thumbnail and Approval Status cells above */}

                  {isGraphicsSheet && (
                    <>
                      <td style={tdStyle}>{row.doneDate ? new Date(row.doneDate).toLocaleDateString() : '-'}</td>
                      <td style={tdStyle}>
                        {row.videoLink ? <a href={row.videoLink} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}><ExternalLink size={14} /> View</a> : '-'}
                      </td>
                      <td style={tdStyle}>{row.graphicsCount || '-'}</td>
                      <td style={tdStyle}><StatusBadge status={row.approvalStatus} /></td>
                      <td style={tdStyle}>{row.approvalDate ? new Date(row.approvalDate).toLocaleDateString() : '-'}</td>
                      <td style={tdStyle}>{row.approver?.name || '-'}</td>
                      <td style={tdStyle}><StatusBadge status={row.uploadingStatus} /></td>
                      <td style={tdStyle}>{row.postedBy?.name || '-'}</td>
                      <td style={tdStyle}>{row.postOnDate ? new Date(row.postOnDate).toLocaleDateString() : '-'}</td>
                      <td style={tdStyle}>{row.uploadingDate ? new Date(row.uploadingDate).toLocaleDateString() : '-'}</td>
                      <td style={tdStyle}>{row.uploadingTime || '-'}</td>
                    </>
                  )}

                  {(!isWorkingSheet && !isThumbnailSheet && !isGraphicsSheet) && (
                    <>
                      {!isPostingSheet && <td style={tdStyle}>{row.approvalDate ? new Date(row.approvalDate).toLocaleDateString() : '-'}</td>}
                      {!isPostingSheet && <td style={tdStyle}>{row.approver?.name || '-'}</td>}
                      {!isPostingSheet && <td style={tdStyle}>{row.postOnDate ? new Date(row.postOnDate).toLocaleDateString() : '-'}</td>}
                      {!isPostingSheet && <td style={tdStyle}>{row.postedBy?.name || '-'}</td>}
                      {!isPostingSheet && <td style={tdStyle}><StatusBadge status={row.uploadingStatus} /></td>}
                      {!isPostingSheet && <td style={tdStyle}>{row.uploadingDate ? new Date(row.uploadingDate).toLocaleDateString() : '-'}</td>}
                      {!isPostingSheet && <td style={tdStyle}>{row.uploadingTime || '-'}</td>}
                    </>
                  )}
                  
                  {(!isGraphicsSheet && !isPostingSheet) && <td style={tdStyle}>{row.doneDate ? new Date(row.doneDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</td>}
                  {!isPostingSheet && (
                    <td style={tdStyle}>
                      {row.sendTo ? <span style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>{row.sendTo}</span> : '-'}
                    </td>
                  )}

                  {isPostingSheet && (
                    <td style={tdStyle}>
                      {row.format === 'Long Video' ? (
                        <select
                          value={row.storyStatus || 'Pending'}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            setData((prev) => prev.map(item => item.id === row.id ? { ...item, storyStatus: newStatus } : item));
                            try {
                              await updateContentRecord(row.id, { ...row, storyStatus: newStatus });
                            } catch (err) {
                              console.error('Error updating story status:', err);
                            }
                          }}
                          style={{
                            background: (row.storyStatus === 'Published' || row.storyStatus === 'Uploaded') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                            color: (row.storyStatus === 'Published' || row.storyStatus === 'Uploaded') ? '#10b981' : '#fbbf24',
                            border: `1px solid ${(row.storyStatus === 'Published' || row.storyStatus === 'Uploaded') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="Pending" style={{ background: 'var(--card-bg)', color: 'var(--warning)' }}>Pending</option>
                          <option value="Published" style={{ background: 'var(--card-bg)', color: 'var(--success)' }}>Published</option>
                          <option value="Uploaded" style={{ background: 'var(--card-bg)', color: 'var(--success)' }}>Uploaded</option>
                        </select>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                  )}

                  <td style={{ ...tdStyle, ...stickyRight, textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      {isThumbnailSheet && !row.graphicDesignerId && (
                        <button 
                          onClick={async () => {
                            if (await confirm({ title: 'Confirm', message: 'Are you sure you want to take this task?' })) {
                              const res = await takeThumbnailTaskAction(row.id);
                              if (res.success) {
                                fetchData();
                              } else {
                                alert(res.error);
                              }
                            }
                          }}
                          style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Take Task"
                        >
                          <Briefcase size={12} /> Take Task
                        </button>
                      )}
                      {isThumbnailSheet && row.graphicDesignerId && (
                        <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                          {row.graphicDesignerId === currentUserId ? 'Taken by you' : `Taken by ${row.graphicDesigner?.name || 'Unknown'}`}
                        </span>
                      )}
                      {canEditOrAdd && !isViewingApproved && (!isViewingUploaded || isPostingSheet) && (!isThumbnailSheet || (isThumbnailSheet && (row.graphicDesignerId === currentUserId || currentUserRole !== 'EXEC'))) && (
                        <button onClick={() => handleOpenModal(row)} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Edit"><Edit size={14} /></button>
                      )}
                      {(canEditOrAdd && !isWorkingSheet && !isPostingSheet && !isViewingApproved && !isViewingUploaded) && (!isThumbnailSheet || (isThumbnailSheet && (row.graphicDesignerId === currentUserId || currentUserRole !== 'EXEC'))) && (
                        <button onClick={() => handleDelete(row.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Delete"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        )}
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
            {filteredData.length === 0 ? (
              'Showing 0 of 0 records'
            ) : (
              <>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{Math.min(currentPage * itemsPerPage, filteredData.length)}</strong> of{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{filteredData.length}</strong> records
              </>
            )}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="rowsPerPageSelect" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Rows per page:
            </label>
            <select
              id="rowsPerPageSelect"
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
                padding: '6px 12px',
                fontSize: '0.85rem',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              background: currentPage <= 1 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(59, 130, 246, 0.15)',
              color: currentPage <= 1 ? '#475569' : '#60a5fa',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <ChevronLeft size={16} />
            <span>Prev</span>
          </button>

          {/* Page Indicator */}
          <span style={{
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontWeight: 600,
            padding: '6px 12px',
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
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--card-border)',
              background: currentPage >= totalPages ? 'rgba(0, 0, 0, 0.2)' : 'rgba(59, 130, 246, 0.15)',
              color: currentPage >= totalPages ? '#475569' : '#60a5fa',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <span>Next</span>
            <ChevronRight size={16} />
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--table-header-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', width: '90%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 600 }}>
                {editingRecord ? `Edit Content (${editingRecord.uniqueId})` : 'Add New Content'}
              </h2>
              <button onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><XCircle size={24} /></button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <form id="contentForm" onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* 1. Editor Name */}
                {(!isGraphicsSheet && !isPostingSheet) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Editor Name</label>
                    <select 
                      value={formData.editorId} 
                      onChange={(e) => setFormData({...formData, editorId: e.target.value})} 
                      disabled={isWorkingSheet || isThumbnailSheet || isManagerRestricted}
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', opacity: (isWorkingSheet || isThumbnailSheet || isManagerRestricted) ? 0.7 : 1, cursor: (isWorkingSheet || isThumbnailSheet || isManagerRestricted) ? 'not-allowed' : 'pointer' }}
                    >
                      <option value="">Select Editor...</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.mainDepartment})</option>)}
                    </select>
                  </div>
                )}

                {/* 2. Topic */}
                {(!isThumbnailSheet && !isPostingSheet) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Topic *</label>
                    <input disabled={isManagerRestricted} required={!isThumbnailSheet} type="text" value={formData.topic} onChange={(e) => setFormData({...formData, topic: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' , opacity: isManagerRestricted ? 0.7 : 1, cursor: isManagerRestricted ? 'not-allowed' : 'pointer' }} placeholder="e.g. Vastu Tips for Home" />
                  </div>
                )}

                {/* 3. Platform */}
                {!isThumbnailSheet && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: isPostingSheet ? 'span 2' : undefined }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Platform</label>
                    {isPostingSheet ? (
                      <input 
                        type="text" 
                        disabled 
                        readOnly 
                        value={formData.platform || ''} 
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', opacity: 0.7, cursor: 'not-allowed' }} 
                      />
                    ) : (
                      <select disabled={isManagerRestricted} value={formData.platform} onChange={(e) => setFormData({...formData, platform: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' , opacity: isManagerRestricted ? 0.7 : 1, cursor: isManagerRestricted ? 'not-allowed' : 'pointer' }}>
                        <option value="YouTube">YouTube</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Insta FB and YT (ALL)">Insta FB and YT (ALL)</option>
                        <option value="Insta FB">Insta FB</option>
                        <option value="Insta YT">Insta YT</option>
                        <option value="YT FB">YT FB</option>
                        <option value="Other">Other</option>
                      </select>
                    )}
                  </div>
                )}

                {/* 3b. Channel */}
                {(!isThumbnailSheet && !isPostingSheet) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Channel</label>
                    <select disabled={isManagerRestricted} value={formData.channel} onChange={(e) => setFormData({...formData, channel: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' , opacity: isManagerRestricted ? 0.7 : 1, cursor: isManagerRestricted ? 'not-allowed' : 'pointer' }}>
                      <option value="VS Channel">VS Channel</option>
                      <option value="LVS Channel">LVS Channel</option>
                      <option value="Malyam Channel">Malyam Channel</option>
                      <option value="AI Telmate">AI Telmate</option>
                      <option value="Vedic Code">Vedic Code</option>
                      <option value="Occult Sage">Occult Sage</option>
                      {dynamicChannelsList.map((dc) => (
                        <option key={dc.id} value={dc.name}>{dc.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 4. Format */}
                {(!isThumbnailSheet && !isPostingSheet) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Format</label>
                    <select disabled={isManagerRestricted} value={formData.format} onChange={(e) => setFormData({...formData, format: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' , opacity: isManagerRestricted ? 0.7 : 1, cursor: isManagerRestricted ? 'not-allowed' : 'pointer' }}>
                      <option value="Long Video">Long Video</option>
                      <option value="Short / Reel">Short / Reel</option>
                      <option value="Post">Post</option>
                      <option value="Story">Story</option>
                      <option value="Carousels">Carousels</option>
                      <option value="Community Post">Community Post</option>
                      <option value="Banners">Banners</option>
                      <option value="Logo">Logo</option>
                      <option value="Graphics Task">Graphics Task</option>
                      <option value="Carousel">Carousel</option>
                    </select>
                  </div>
                )}

                {/* 6. Done Date */}
                {(!isThumbnailSheet && !isPostingSheet) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Done Date</label>
                    <input disabled={true} type="datetime-local" value={formData.doneDate} onChange={(e) => setFormData({...formData, doneDate: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' , opacity: 0.7, cursor: 'not-allowed' }} />
                  </div>
                )}

                {/* 7. Video Link / File Link */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {(isGraphicsSheet || ['Post', 'Carousel', 'Carousels', 'Story', 'Community Post', 'Banners', 'Logo', 'Graphics Task'].includes(formData.format)) ? 'File Link (URL)' : 'Video Link (URL)'}
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input disabled={isPostingSheet || isThumbnailSheet || isManagerRestricted} type="url" value={formData.videoLink} onChange={(e) => setFormData({...formData, videoLink: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', flex: 1, opacity: (isManagerRestricted || isThumbnailSheet || isPostingSheet) ? 0.7 : 1, cursor: (isManagerRestricted || isThumbnailSheet || isPostingSheet) ? 'not-allowed' : 'pointer' }} placeholder="https://..." />
                    <DriveUploadButton disabled={isPostingSheet || isThumbnailSheet || isManagerRestricted} onUploadComplete={(url) => setFormData({...formData, videoLink: url})} />
                  </div>
                </div>
                
                {(isGraphicsSheet || isManagerWorkspace) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Graphics Count</label>
                    <input disabled={isManagerRestricted} type="text" value={formData.graphicsCount || ''} onChange={(e) => setFormData({...formData, graphicsCount: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', opacity: isManagerRestricted ? 0.7 : 1, cursor: isManagerRestricted ? 'not-allowed' : 'pointer' }} placeholder="e.g. 1" />
                  </div>
                )}

                {(!isWorkingSheet && !isGraphicsSheet && !['Post', 'Carousel', 'Carousels', 'Story', 'Community Post', 'Banners', 'Logo', 'Graphics Task'].includes(formData.format)) && (
                  <>
                    {/* 8. Thumbnail Link */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Thumbnail URL {isThumbnailSheet && '*'}</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input required={isThumbnailSheet} disabled={isPostingSheet || isManagerRestricted} type="url" value={formData.thumbnail || ''} onChange={(e) => setFormData({...formData, thumbnail: e.target.value, thumbnailCount: (!formData.thumbnailCount || formData.thumbnailCount === '0') && e.target.value.trim() !== '' ? '1' : formData.thumbnailCount})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', flex: 1, opacity: (isManagerRestricted || isPostingSheet) ? 0.7 : 1, cursor: (isManagerRestricted || isPostingSheet) ? 'not-allowed' : 'pointer' }} placeholder="https://..." />
                        <DriveUploadButton disabled={isPostingSheet || isManagerRestricted} onUploadComplete={(url) => setFormData({...formData, thumbnail: url, thumbnailCount: (!formData.thumbnailCount || formData.thumbnailCount === '0') && url.trim() !== '' ? '1' : formData.thumbnailCount})} label="Upload" />
                      </div>
                    </div>
                    
                    {/* 8.1 Thumbnail Count */}
                    {(isThumbnailSheet || isManagerWorkspace) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Thumbnail Count</label>
                        <input disabled={isManagerRestricted} type="text" value={formData.thumbnailCount || ''} onChange={(e) => setFormData({...formData, thumbnailCount: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', opacity: isManagerRestricted ? 0.7 : 1, cursor: isManagerRestricted ? 'not-allowed' : 'pointer' }} placeholder="e.g. 2" />
                      </div>
                    )}
                    
                    {/* 8.2 Thumbnail Done Date */}
                    {isThumbnailSheet && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Thumbnail Done Date</label>
                        <input disabled={true} type="datetime-local" value={formData.thumbnailDoneDate || ''} onChange={(e) => setFormData({...formData, thumbnailDoneDate: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', opacity: 0.7, cursor: 'not-allowed' }} />
                      </div>
                    )}

                  </>
                )}

                {(!isWorkingSheet && !isGraphicsSheet && !isThumbnailSheet && !isPostingSheet) && (
                  <>
                    <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }}></div>
                    
                    {/* 9. Approval Status */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Approval Status</label>
                      <select 
                        value={formData.approvalStatus} 
                        onChange={(e) => {
                          const val = e.target.value;
                          const updates: Partial<typeof formData> = { approvalStatus: val };
                          if (val === 'Approved' || val === 'Rejected' || val === 'Thumbnail Revision' || val === 'Video Revision' || val === 'Video and Thumbnail Revision') {
                            updates.approvedById = currentUserId || '';
                            updates.approvalDate = new Date().toISOString().split('T')[0];
                          } else if (val === 'Pending') {
                            updates.approvedById = '';
                            updates.approvalDate = '';
                          }
                          setFormData({...formData, ...updates});
                        }} 
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' }}
                      >
                        <option value="Pending">Pending</option>
                        {formData.sendTo !== 'Send for thumbnail' && <option value="Approved">Approved</option>}
                        <option value="Rejected">Rejected</option>
                        {formData.sendTo !== 'Send for thumbnail' && <option value="Thumbnail Revision">Thumbnail Revision</option>}
                        <option value="Video Revision">Video Revision</option>
                        {formData.sendTo !== 'Send for thumbnail' && <option value="Video and Thumbnail Revision">Video and Thumbnail Revision</option>}
                      </select>
                    </div>

                    {/* 9b. Approval Date */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Approval Date</label>
                      <input disabled type="date" value={formData.approvalDate} onChange={(e) => setFormData({...formData, approvalDate: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', opacity: 0.7, cursor: 'not-allowed' }} />
                    </div>

                    {/* 10. Approved By */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Approved By</label>
                      <select disabled value={formData.approvedById} onChange={(e) => setFormData({...formData, approvedById: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', opacity: 0.7, cursor: 'not-allowed' }}>
                        <option value="">Select Approver...</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>

                    {/* 13. Post On Date */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Post On Date</label>
                      <input disabled={formData.sendTo === 'Send for thumbnail'} type="date" value={formData.postOnDate} onChange={(e) => setFormData({...formData, postOnDate: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', opacity: formData.sendTo === 'Send for thumbnail' ? 0.7 : 1, cursor: formData.sendTo === 'Send for thumbnail' ? 'not-allowed' : 'pointer' }} />
                    </div>

                  </>
                )}

                {isPostingSheet && (
                  <>
                    <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }}></div>
                    
                    {/* 11. Uploading Status */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Uploading Status</label>
                      <select disabled={isManagerRestricted}
                        value={formData.uploadingStatus} 
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          const updates: Partial<typeof formData> = { uploadingStatus: newStatus };
                          if (newStatus === 'Uploaded') {
                            const now = new Date();
                            updates.uploadingDate = now.toISOString().split('T')[0];
                            updates.uploadingTime = now.toTimeString().split(' ')[0].substring(0, 5);
                            updates.postedById = currentUserId;
                          } else if (newStatus === 'Scheduled') {
                            updates.postedById = currentUserId;
                          }
                          setFormData({...formData, ...updates});
                        }} 
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' , opacity: isManagerRestricted ? 0.7 : 1, cursor: isManagerRestricted ? 'not-allowed' : 'pointer' }}>
                        <option value="Pending">Pending</option>
                        <option value="Uploaded">Uploaded</option>
                        <option value="Scheduled">Scheduled</option>
                      </select>
                    </div>

                    {/* 12. Post By */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Post By</label>
                      <select disabled value={formData.postedById || ''} onChange={(e) => setFormData({...formData, postedById: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', opacity: 0.7, cursor: 'not-allowed' }}>
                        <option value="">Select Uploader...</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>

                    {/* Posted On Platform */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Posted On Platform</label>
                      <select value={formData.postedOnPlatform || ''} onChange={(e) => setFormData({...formData, postedOnPlatform: e.target.value})} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' , opacity: isManagerRestricted ? 0.7 : 1, cursor: isManagerRestricted ? 'not-allowed' : 'pointer' }}>
                        <option value="">Select Option</option>
                        <option value="YouTube">YouTube</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Insta FB and YT (ALL)">Insta FB and YT (ALL)</option>
                        <option value="Insta FB">Insta FB</option>
                        <option value="Insta YT">Insta YT</option>
                        <option value="YT FB">YT FB</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* 14. Uploading Date */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Uploading Date</label>
                      <input 
                        type="date" 
                        disabled={formData.uploadingStatus === 'Uploaded'}
                        min={formData.uploadingStatus === 'Scheduled' ? new Date().toISOString().split('T')[0] : undefined}
                        value={formData.uploadingDate || ''} 
                        onChange={(e) => setFormData({...formData, uploadingDate: e.target.value})} 
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' , opacity: (isManagerRestricted || formData.uploadingStatus === 'Uploaded') ? 0.7 : 1, cursor: (isManagerRestricted || formData.uploadingStatus === 'Uploaded') ? 'not-allowed' : 'pointer' }} 
                      />
                    </div>

                    {/* 16. Uploading Time */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Uploading Time</label>
                      <input 
                        type="time" 
                        disabled={formData.uploadingStatus === 'Uploaded'} 
                        value={formData.uploadingTime || ''} 
                        onChange={(e) => setFormData({...formData, uploadingTime: e.target.value})} 
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', opacity: formData.uploadingStatus === 'Uploaded' ? 0.7 : 1, cursor: formData.uploadingStatus === 'Uploaded' ? 'not-allowed' : 'pointer' }} 
                      />
                    </div>

                    {/* Story Status */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Story</label>
                      <select 
                        value={formData.storyStatus || 'Pending'} 
                        onChange={(e) => setFormData({...formData, storyStatus: e.target.value})} 
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', cursor: 'pointer' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Published">Published</option>
                        <option value="Uploaded">Uploaded</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 17. Send To */}
                {!isPostingSheet && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Send To</label>
                    <select disabled={isManagerRestricted} value={formData.sendTo} onChange={(e) => {
                      const val = e.target.value;
                      const updates: Partial<typeof formData> = { sendTo: val };
                      if (val === 'Resend for approval (Revised)' || val === 'Both Revised (Send to Manager)') {
                        updates.sendTo = 'Resend for approval (Revised)';
                        updates.approvalStatus = 'Pending';
                      } else if (val === 'Video Revised (Send to Thumbnail)') {
                        updates.approvalStatus = 'Thumbnail Revision';
                        updates.sendTo = 'Send for thumbnail';
                      } else if (val === 'Thumbnail Revised (Send to Editor)') {
                        updates.approvalStatus = 'Video Revision';
                        updates.sendTo = 'Send for approval';
                      }
                      setFormData({...formData, ...updates});
                    }} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)' , opacity: isManagerRestricted ? 0.7 : 1, cursor: isManagerRestricted ? 'not-allowed' : 'pointer' }}>
                      <option value="">Pending</option>
                      <option value="Send for approval">Send for approval</option>
                      
                      {(formData.approvalStatus === 'Video Revision' || formData.approvalStatus === 'Thumbnail Revision') && (
                        <option value="Resend for approval (Revised)">Resend for approval (Revised)</option>
                      )}
                      
                      {formData.approvalStatus === 'Video and Thumbnail Revision' && (
                        <>
                          <option value="Video Revised (Send to Thumbnail)">Video Revised (Send to Thumbnail)</option>
                          <option value="Thumbnail Revised (Send to Editor)">Thumbnail Revised (Send to Editor)</option>
                          <option value="Both Revised (Send to Manager)">Both Revised (Send to Manager)</option>
                        </>
                      )}
                      
                      {!isGraphicsSheet && <option value="Send for thumbnail">Send for thumbnail</option>}
                    </select>
                  </div>
                )}

                {/* 18. Remark */}
                {(!isThumbnailSheet && !isPostingSheet) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Remark</label>
                    <textarea value={formData.remark} onChange={(e) => setFormData({...formData, remark: e.target.value})} rows={3} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', resize: 'vertical' , opacity: 1, cursor: 'text' }} placeholder="Add any comments here..."></textarea>
                  </div>
                )}

              </form>
            </div>

            <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={handleCloseModal} style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--card-border)', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" form="contentForm" disabled={isSubmitting} style={{ background: '#3b82f6', color: 'var(--text-primary)', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                {isSubmitting ? 'Saving...' : 'Save Content'}
              </button>
            </div>
        </div>
      </div>
      )}
    </div>
  );
}
