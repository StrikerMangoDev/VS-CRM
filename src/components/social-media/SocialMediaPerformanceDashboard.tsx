'use client'
import type { ContentView,TaskView,DashboardUser,DateButtonProps } from '@/lib/view-types'

import { useState,useMemo,forwardRef } from 'react'
import {
AreaChart,Area,XAxis,YAxis,CartesianGrid,Tooltip as RechartsTooltip,ResponsiveContainer,
PieChart,Pie,Cell,BarChart,Bar,Legend
} from 'recharts'
import {
Calendar,ChevronDown,Video,CheckCircle2,Clock,
ExternalLink,Trophy,AlertCircle,Send,RotateCcw,RefreshCw
} from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const COLORS = {
  primary: '#3b82f6', // blue
  secondary: '#a855f7', // purple
  success: '#10b981', // green
  warning: '#fbbf24', // yellow
  danger: '#ef4444', // red
  pink: '#ec4899', // pink
  orange: '#f97316',
}

const CustomDateInput = forwardRef<HTMLButtonElement,DateButtonProps>(({ value, onClick }, ref) => (
  <button onClick={onClick} ref={ref} className="perf-filter-btn">
    <Calendar size={14} />
    <span>{value || 'All Time'}</span>
    <ChevronDown size={14} />
  </button>
));
CustomDateInput.displayName = 'CustomDateInput';

export default function SocialMediaPerformanceDashboard({ initialContent = [], initialTasks = [], user }: {initialContent?:ContentView[];initialTasks?:TaskView[];user:DashboardUser}) {
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null)
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null)
  const [filterChannel, setFilterChannel] = useState('All')
  const [filterEditor, setFilterEditor] = useState('All')
  const [filterTeam, setFilterTeam] = useState('All')
  const [filterFormat, setFilterFormat] = useState('All')

  // Filter tasks dynamically
  const filteredTasks = useMemo(() => {
    return initialTasks.filter((t) => {
      // Date filter based on assigningDate (it's a string like YYYY-MM-DD or DateTime)
      if (t.assigningDate) {
        const tDate = new Date(t.assigningDate);
        if (filterStartDate && tDate < filterStartDate) return false;
        if (filterEndDate && tDate > filterEndDate) return false;
      }
      
      // Team filter
      if (filterTeam !== 'All' && t.assignedDepartment !== filterTeam) return false;
      
      return true;
    });
  }, [initialTasks, filterStartDate, filterEndDate, filterTeam])

  // Filter content dynamically on client side
  const filteredContent = useMemo(() => {
    return initialContent.filter((c) => {
      // Date filter
      const cDate = new Date(c.createdAt);
      if (filterStartDate && cDate < filterStartDate) return false;
      if (filterEndDate && cDate > filterEndDate) return false;
      
      if (filterChannel !== 'All' && c.channel !== filterChannel) return false;
      if (filterFormat !== 'All' && c.format !== filterFormat) return false;
      
      // Posting Team isolation (only approved with postOnDate or scheduled/published/uploaded)
      const isPostingTeamScope = user.department === 'Posting Team' || filterTeam === 'Posting Team';
      if (isPostingTeamScope) {
        const isPosting = (c.approvalStatus === 'Approved' && c.postOnDate) || ['Scheduled', 'Published', 'Uploaded'].includes(c.uploadingStatus) || Boolean(c.postedById);
        if (!isPosting) return false;
      }

      // Team filter
      if (filterTeam !== 'All') {
        const isGraphics = c.uniqueId?.startsWith('GP-') || c.editor?.department === 'Graphics Team';
        if (filterTeam === 'Graphics Team' && !isGraphics) return false;
        if (filterTeam === 'Editing Team' && isGraphics) return false;
      }
      
      const exec = c.editor;
      
      // Admin/TL Specific Filters
      if (user.isAdmin || user.isTL) {
         if (filterEditor !== 'All' && exec?.id !== filterEditor) return false;
      }
      
      return true;
    });
  }, [initialContent, filterStartDate, filterEndDate, filterChannel, filterEditor, filterTeam, filterFormat, user])

  // Extract unique channels and editors for filters
  const channels = useMemo(() => Array.from(new Set(initialContent.map((c) => c.channel).filter(Boolean))), [initialContent]);
  const formats = useMemo(() => Array.from(new Set(initialContent.map((c) => c.format).filter(Boolean))), [initialContent]);
  const editors = useMemo(() => {
    const uniqueEditors = new Map();
    initialContent.forEach((c) => {
      if (c.editor) {
        uniqueEditors.set(c.editor.id, c.editor.name);
      }
    });
    return Array.from(uniqueEditors.entries()).map(([id, name]) => ({ id, name }));
  }, [initialContent]);

  // Top KPIs
  const totalContent = filteredContent.length;
  const inProgress = filteredContent.filter((c) => ['In Progress', 'Editing', 'Review'].includes(c.status) || (!c.sendTo && c.approvalStatus === 'Pending')).length;
  const pendingApproval = filteredContent.filter((c) => c.sendTo && c.sendTo !== '' && c.approvalStatus === 'Pending').length;
  const approved = filteredContent.filter((c) => c.approvalStatus === 'Approved').length;
  const revision = filteredContent.filter((c) => ['Thumbnail Revision', 'Video Revision', 'Video and Thumbnail Revision'].includes(c.approvalStatus)).length;
  
  const isItemFullyUploaded = (c:ContentView) => {
    const isVideoUploaded = c.uploadingStatus === 'Uploaded' || c.uploadingStatus === 'Published';
    const isPlatformMatched = !c.platform || (Boolean(c.postedOnPlatform) && (c.postedOnPlatform||'').trim().toLowerCase() === c.platform.trim().toLowerCase());
    const isStoryUploaded = c.format !== 'Long Video' || c.storyStatus === 'Uploaded' || c.storyStatus === 'Published';
    return isVideoUploaded && isPlatformMatched && isStoryUploaded;
  };

  const scheduled = filteredContent.filter((c) => c.uploadingStatus === 'Scheduled').length;
  const isPostingTeam = user.department === 'Posting Team' || filterTeam === 'Posting Team';
  const published = isPostingTeam 
    ? filteredContent.filter(isItemFullyUploaded).length
    : filteredContent.filter((c) => c.uploadingStatus === 'Published').length;
  
  const now=new Date(),dateKey=[now.getFullYear(),now.getMonth()+1,now.getDate()].join('-')
  const today=useMemo(()=>{const[y,m,d]=dateKey.split('-').map(Number);return new Date(y,m-1,d,23,59,59,999)},[dateKey]);
  const postingDue = filteredContent.filter((c) => c.postOnDate && new Date(c.postOnDate) <= today && !isItemFullyUploaded(c) && c.uploadingStatus !== 'Scheduled').length;

  // Format Breakdown for Pie Chart
  const formatData = useMemo(() => {
    const counts = filteredContent.reduce<Record<string,number>>((acc, curr) => {
      const format = curr.format || 'Unknown';
      acc[format] = (acc[format] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredContent]);

  // Content Trend over time
  const trendData = useMemo(() => {
    const dates = filteredContent.reduce<Record<string,{ date: string; created: number; approved: number; published: number; }>>((acc, curr) => {
      const date = new Date(curr.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!acc[date]) acc[date] = { date, created: 0, approved: 0, published: 0 };
      acc[date].created += 1;
      if (curr.approvalStatus === 'Approved') acc[date].approved += 1;
      if (curr.uploadingStatus === 'Published') acc[date].published += 1;
      return acc;
    }, {});
    
    return Object.values(dates).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-14); // last 14 days
  }, [filteredContent]);

  // Top Performers (Editors)
  const topPerformers = useMemo(() => {
    const editorStats = filteredContent.reduce<Record<string,{ id: string; name: string; total: number; approved: number; published: number; }>>((acc, curr) => {
      if (!curr.editor) return acc;
      const id = curr.editor.id;
      if (!acc[id]) {
        acc[id] = {
          id,
          name: curr.editor.name,
          total: 0,
          approved: 0,
          published: 0
        };
      }
      acc[id].total += 1;
      if (curr.approvalStatus === 'Approved') acc[id].approved += 1;
      if (curr.uploadingStatus === 'Published') acc[id].published += 1;
      return acc;
    }, {});

    return Object.values(editorStats).sort((a, b) => b.approved - a.approved).slice(0, 5);
  }, [filteredContent]);

  // Channel Breakdown
  const channelData = useMemo(() => {
    const counts = filteredContent.reduce<Record<string,{ name: string; total: number; approved: number; }>>((acc, curr) => {
      const channel = curr.channel || 'Unknown';
      if (!acc[channel]) acc[channel] = { name: channel, total: 0, approved: 0 };
      acc[channel].total += 1;
      if (curr.approvalStatus === 'Approved') acc[channel].approved += 1;
      return acc;
    }, {});
    return Object.values(counts).sort((a, b) => b.total - a.total);
  }, [filteredContent]);

  // Task Analytics Computations
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((d) => d.status === 'Completed').length;
  const pendingTasks = filteredTasks.filter((d) => d.status === 'Pending').length;
  const inProgressTasks = filteredTasks.filter((d) => d.status === 'In Progress').length;
  
  // Posting Trend over time (for Posting Team)
  const postingTrendData = useMemo(() => {
    const dates = filteredContent.reduce<Record<string,{ date: string; published: number; scheduled: number; due: number; }>>((acc, curr) => {
      const targetDate = curr.uploadingDate || curr.postOnDate || curr.createdAt;
      if (!targetDate) return acc;
      const date = new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!acc[date]) acc[date] = { date, published: 0, scheduled: 0, due: 0 };
      if (isItemFullyUploaded(curr)) {
        acc[date].published += 1;
      } else if (curr.uploadingStatus === 'Scheduled') {
        acc[date].scheduled += 1;
      } else {
        acc[date].due += 1;
      }
      return acc;
    }, {});
    
    return Object.values(dates).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-14);
  }, [filteredContent]);

  // Channel Posting Activity
  const channelPostingData = useMemo(() => {
    const counts = filteredContent.reduce<Record<string,{ name: string; published: number; scheduled: number; pending: number; }>>((acc, curr) => {
      const channel = curr.channel || 'Unknown';
      if (!acc[channel]) acc[channel] = { name: channel, published: 0, scheduled: 0, pending: 0 };
      if (isItemFullyUploaded(curr)) {
        acc[channel].published += 1;
      } else if (curr.uploadingStatus === 'Scheduled') {
        acc[channel].scheduled += 1;
      } else {
        acc[channel].pending += 1;
      }
      return acc;
    }, {});
    return Object.values(counts).sort((a, b) => (b.published + b.scheduled + b.pending) - (a.published + a.scheduled + a.pending));
  }, [filteredContent]);

  // Platform Breakdown for Posting Team
  const platformData = useMemo(() => {
    const counts = filteredContent.reduce<Record<string,number>>((acc, curr) => {
      const platform = curr.postedOnPlatform || curr.platform || 'Other';
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredContent]);

  // Posting Status Breakdown
  const postingStatusData = useMemo(() => {
    const pub = filteredContent.filter(isItemFullyUploaded).length;
    const sch = filteredContent.filter((c) => c.uploadingStatus === 'Scheduled').length;
    const due = filteredContent.filter((c) => c.postOnDate && new Date(c.postOnDate) <= today && !isItemFullyUploaded(c) && c.uploadingStatus !== 'Scheduled').length;
    const pending = Math.max(0, filteredContent.length - pub - sch - due);

    const data = [
      { name: 'Published', value: pub, color: 'var(--success)' },
      { name: 'Scheduled', value: sch, color: '#8b5cf6' },
      { name: 'Posting Due', value: due, color: 'var(--danger)' },
      { name: 'Pending Upload', value: pending, color: '#3b82f6' }
    ].filter(item => item.value > 0);

    return data.length > 0 ? data : [{ name: 'No Data', value: 0, color: 'var(--text-muted)' }];
  }, [filteredContent, today]);

  const sourceDeptData = useMemo(() => {
    const counts = filteredTasks.reduce<Record<string,number>>((acc, curr) => {
      const dept = curr.departmentName || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredTasks]);

  const targetTeamData = useMemo(() => {
    const counts = filteredTasks.reduce<Record<string,number>>((acc, curr) => {
      const team = curr.assignedDepartment || 'Unassigned';
      acc[team] = (acc[team] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTasks]);

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  return (
    <div className="perf-dashboard">
      <style dangerouslySetInnerHTML={{__html: `
        .perf-dashboard { color: var(--text-primary); display: flex; flex-direction: column; gap: 24px; }
        .perf-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 20px; }
        .perf-title { margin: 0; font-size: 1.75rem; font-weight: 700; color: var(--text-primary); }
        .perf-subtitle { color: var(--text-muted); font-size: 0.9rem; margin-top: 8px; display: flex; gap: 8px; align-items: center; }
        
        .perf-filters { display: flex; gap: 12px; flex-wrap: wrap; }
        .perf-filter-btn { background: var(--card-bg); border: 1px solid rgba(255,255,255,0.1); color: var(--text-primary); padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .perf-filter-btn:hover { background: var(--table-hover); border-color: var(--card-border); }
        .perf-select { background: var(--card-bg); border: 1px solid rgba(255,255,255,0.1); color: var(--text-primary); padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; outline: none; transition: all 0.2s; -webkit-appearance: none; appearance: none; padding-right: 32px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; }
        .kpi-card { background: var(--card-bg); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden; min-height: 108px; }
        .kpi-label { color: var(--text-muted); font-size: 0.85rem; font-weight: 600; margin-bottom: 8px; padding-right: 48px; line-height: 1.35; word-break: break-word; }
        .kpi-value { font-size: 1.8rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0; }
        .kpi-icon { position: absolute; top: 20px; right: 20px; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        
        .charts-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
        @media (max-width: 1024px) { .charts-grid { grid-template-columns: 1fr; } }
        
        .chart-card { background: var(--card-bg); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; }
        .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .chart-title { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin: 0; }
        
        .leaderboard-row { display: grid; grid-template-columns: 40px 1fr 80px 80px; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .leaderboard-row:last-child { border-bottom: none; }
        
        .date-picker-wrapper .react-datepicker-wrapper { display: block; }
        .date-picker-wrapper .react-datepicker__input-container { display: block; }
      `}}/>

      {/* HEADER & FILTERS */}
      <div className="perf-header">
        <div>
          <h1 className="perf-title">{isPostingTeam ? 'Posting Team Performance' : 'Social Media Dashboard'}</h1>
          <div className="perf-subtitle">
            Welcome back, <strong style={{color: 'var(--text-primary)'}}>{user.name}</strong>
            <span style={{background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, marginLeft: '8px'}}>{user.role}</span>
          </div>
        </div>

        <div className="perf-filters">
          {user.isAdmin && (
            <select 
              className="perf-select" 
              value={filterTeam} 
              onChange={(e) => setFilterTeam(e.target.value)}
            >
              <option value="All">All Teams</option>
              <option value="Editing Team">Editing Team</option>
              <option value="Graphics Team">Graphics Team</option>
              <option value="Posting Team">Posting Team</option>
            </select>
          )}

          <select 
            className="perf-select" 
            value={filterChannel}  
            onChange={(e) => setFilterChannel(e.target.value)}
          >
            <option value="All">All Channels</option>
            {channels.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select 
            className="perf-select" 
            value={filterFormat}  
            onChange={(e) => setFilterFormat(e.target.value)}
          >
            <option value="All">All Formats</option>
            {formats.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>

          {!isPostingTeam && (user.isAdmin || user.isTL) && (
            <select 
              className="perf-select" 
              value={filterEditor} 
              onChange={(e) => setFilterEditor(e.target.value)}
            >
              <option value="All">All Editors</option>
              {editors.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="date-picker-wrapper">
            <DatePicker
              selectsRange={true}
              startDate={filterStartDate}
              endDate={filterEndDate}
              onChange={(update: [Date | null, Date | null]) => {
                const [start, end] = update;
                setFilterStartDate(start);
                setFilterEndDate(end);
              }}
              customInput={<CustomDateInput />}
              placeholderText="All Time"
              dateFormat="MMM d, yyyy"
              isClearable={false}
            />
          </div>

          {(filterStartDate || filterEndDate || filterChannel !== 'All' || filterTeam !== 'All' || filterFormat !== 'All' || filterEditor !== 'All') && (
            <button 
              onClick={() => {
                setFilterStartDate(null);
                setFilterEndDate(null);
                setFilterChannel('All');
                setFilterTeam('All');
                setFilterFormat('All');
                setFilterEditor('All');
              }}
              style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <RotateCcw size={14} /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* KPI CARDS */}
      {isPostingTeam ? (
        <div className="kpi-grid">
          <div className="kpi-card" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
            <div className="kpi-label">Total in Posting Pipeline</div>
            <div className="kpi-value">{filteredContent.length}</div>
            <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: COLORS.primary }}>
              <Send size={18} />
            </div>
          </div>

          <div className="kpi-card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div className="kpi-label">Posting Due</div>
            <div className="kpi-value">{postingDue}</div>
            <div className="kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: COLORS.danger }}>
              <AlertCircle size={18} />
            </div>
          </div>

          <div className="kpi-card" style={{ borderColor: 'rgba(168, 85, 247, 0.2)' }}>
            <div className="kpi-label">Scheduled</div>
            <div className="kpi-value">{scheduled}</div>
            <div className="kpi-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: COLORS.secondary }}>
              <Calendar size={18} />
            </div>
          </div>

          <div className="kpi-card" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <div className="kpi-label">Published / Uploaded</div>
            <div className="kpi-value">{published}</div>
            <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: COLORS.success }}>
              <CheckCircle2 size={18} />
            </div>
          </div>

          <div className="kpi-card" style={{ borderColor: 'rgba(251, 191, 36, 0.2)' }}>
            <div className="kpi-label">Pending Upload</div>
            <div className="kpi-value">{Math.max(0, filteredContent.length - published - scheduled)}</div>
            <div className="kpi-icon" style={{ background: 'rgba(251, 191, 36, 0.1)', color: COLORS.warning }}>
              <Clock size={18} />
            </div>
          </div>
        </div>
      ) : (
        <div className="kpi-grid">
          <div className="kpi-card" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
            <div className="kpi-label">Total Content</div>
            <div className="kpi-value">{totalContent}</div>
            <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: COLORS.primary }}>
              <Video size={18} />
            </div>
          </div>

          <div className="kpi-card" style={{ borderColor: 'rgba(251, 191, 36, 0.2)' }}>
            <div className="kpi-label">In Progress</div>
            <div className="kpi-value">{inProgress}</div>
            <div className="kpi-icon" style={{ background: 'rgba(251, 191, 36, 0.1)', color: COLORS.warning }}>
              <Clock size={18} />
            </div>
          </div>

          <div className="kpi-card" style={{ borderColor: 'rgba(249, 115, 22, 0.2)' }}>
            <div className="kpi-label">Pending Approval</div>
            <div className="kpi-value">{pendingApproval}</div>
            <div className="kpi-icon" style={{ background: 'rgba(249, 115, 22, 0.1)', color: COLORS.orange }}>
              <AlertCircle size={18} />
            </div>
          </div>

          <div className="kpi-card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div className="kpi-label">Revision</div>
            <div className="kpi-value">{revision}</div>
            <div className="kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: COLORS.danger }}>
              <RefreshCw size={18} />
            </div>
          </div>

          <div className="kpi-card" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <div className="kpi-label">Approved</div>
            <div className="kpi-value">{approved}</div>
            <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: COLORS.success }}>
              <CheckCircle2 size={18} />
            </div>
          </div>

          <div className="kpi-card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div className="kpi-label">Posting Due</div>
            <div className="kpi-value">{postingDue}</div>
            <div className="kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: COLORS.danger }}>
              <AlertCircle size={18} />
            </div>
          </div>

          <div className="kpi-card" style={{ borderColor: 'rgba(168, 85, 247, 0.2)' }}>
            <div className="kpi-label">Scheduled</div>
            <div className="kpi-value">{scheduled}</div>
            <div className="kpi-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: COLORS.secondary }}>
              <Calendar size={18} />
            </div>
          </div>

          <div className="kpi-card" style={{ borderColor: 'rgba(236, 72, 153, 0.2)' }}>
            <div className="kpi-label">Published</div>
            <div className="kpi-value">{published}</div>
            <div className="kpi-icon" style={{ background: 'rgba(236, 72, 153, 0.1)', color: COLORS.pink }}>
              <ExternalLink size={18} />
            </div>
          </div>
        </div>
      )}

      {isPostingTeam ? (
        <>
          <div className="charts-grid">
            {/* Posting Trend Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Posting & Publishing Trend (Last 14 Days)</h3>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                {postingTrendData.length > 0 ? (
                  <ResponsiveContainer>
                    <AreaChart data={postingTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPublished" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" stroke='var(--text-muted)' fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke='var(--text-muted)' fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                      />
                      <Legend />
                      <Area type="monotone" name="Published" dataKey="published" stroke={COLORS.success} strokeWidth={2} fillOpacity={1} fill="url(#colorPublished)" />
                      <Area type="monotone" name="Scheduled" dataKey="scheduled" stroke={COLORS.secondary} strokeWidth={2} fillOpacity={1} fill="url(#colorScheduled)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No trend data available</div>
                )}
              </div>
            </div>

            {/* Posting Status Distribution */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Posting Status Breakdown</h3>
              </div>
              <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {postingStatusData.filter(d => d.value > 0).length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={postingStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {postingStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No status data available</div>
                )}
              </div>
            </div>
          </div>

          <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {/* Channel-wise Posting Activity */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Channel Posting Status</h3>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                {channelPostingData.length > 0 ? (
                  <ResponsiveContainer>
                    <BarChart data={channelPostingData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke='var(--text-muted)' fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke='var(--text-muted)' fontSize={12} tickLine={false} axisLine={false} width={100} />
                      <RechartsTooltip 
                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                      />
                      <Legend />
                      <Bar dataKey="published" name="Published" fill={COLORS.success} radius={[0, 4, 4, 0]} barSize={16} />
                      <Bar dataKey="scheduled" name="Scheduled" fill={COLORS.secondary} radius={[0, 4, 4, 0]} barSize={16} />
                      <Bar dataKey="pending" name="Pending" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data available</div>
                )}
              </div>
            </div>

            {/* Platform Breakdown */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Platform Distribution</h3>
              </div>
              <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {platformData.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={platformData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {platformData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No platform data available</div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="charts-grid">
            {/* Trend Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Content Pipeline Trend (Last 14 Days)</h3>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer>
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke='var(--text-muted)' fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke='var(--text-muted)' fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Legend />
                    <Area type="monotone" name="Created" dataKey="created" stroke={COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorCreated)" />
                    <Area type="monotone" name="Approved" dataKey="approved" stroke={COLORS.success} strokeWidth={2} fillOpacity={1} fill="url(#colorApproved)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Format Breakdown */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Format Breakdown</h3>
              </div>
              <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {formatData.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={formatData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {formatData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No data available</div>
                )}
              </div>
            </div>
          </div>

          <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {/* Channel Breakdown */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Channel Activity</h3>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                {channelData.length > 0 ? (
                  <ResponsiveContainer>
                    <BarChart data={channelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke='var(--text-muted)' fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke='var(--text-muted)' fontSize={12} tickLine={false} axisLine={false} width={100} />
                      <RechartsTooltip 
                        contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                      />
                      <Legend />
                      <Bar dataKey="total" name="Total Content" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={20} />
                      <Bar dataKey="approved" name="Approved" fill={COLORS.success} radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data available</div>
                )}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Trophy size={20} color={COLORS.warning} /> Top 5 Editors</h3>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="leaderboard-row" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px', marginBottom: '8px' }}>
                  <div>#</div>
                  <div>Editor</div>
                  <div style={{ textAlign: 'center' }}>Total</div>
                  <div style={{ textAlign: 'center' }}>Approved</div>
                </div>
                
                {topPerformers.length > 0 ? topPerformers.map((perf, idx: number) => (
                  <div key={perf.id} className="leaderboard-row">
                    <div style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', 
                      background: idx === 0 ? 'rgba(251, 191, 36, 0.2)' : idx === 1 ? 'rgba(148, 163, 184, 0.2)' : idx === 2 ? 'rgba(180, 83, 9, 0.2)' : 'rgba(255,255,255,0.05)',
                      color: idx === 0 ? '#fbbf24' : idx === 1 ? 'var(--text-muted)' : idx === 2 ? '#b45309' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{perf.name}</div>
                    <div style={{ textAlign: 'center', fontWeight: 600, color: '#3b82f6' }}>{perf.total}</div>
                    <div style={{ textAlign: 'center', fontWeight: 600, color: 'var(--success)' }}>{perf.approved}</div>
                  </div>
                )) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No performance data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Task Sheet Analytics - Completely hidden for Posting Team */}
      {!isPostingTeam && (
        <>
          <div style={{ width: '100%', height: '1px', background: 'var(--table-hover)', margin: '16px 0' }} />
          <h2 className="perf-title" style={{ fontSize: '1.5rem' }}>Task Sheet Analytics</h2>
          
          {/* Task Analytics KPI */}
          <div className="kpi-grid">
            <div className="kpi-card" style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}>
              <div className="kpi-label">Total Tasks</div>
              <div className="kpi-value">{totalTasks}</div>
              <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: COLORS.primary }}>
                <Video size={18} />
              </div>
            </div>

            <div className="kpi-card" style={{ borderColor: 'rgba(251, 191, 36, 0.2)' }}>
              <div className="kpi-label">Pending Tasks</div>
              <div className="kpi-value">{pendingTasks}</div>
              <div className="kpi-icon" style={{ background: 'rgba(251, 191, 36, 0.1)', color: COLORS.warning }}>
                <AlertCircle size={18} />
              </div>
            </div>

            <div className="kpi-card" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
              <div className="kpi-label">In Progress</div>
              <div className="kpi-value">{inProgressTasks}</div>
              <div className="kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: COLORS.secondary }}>
                <Clock size={18} />
              </div>
            </div>

            <div className="kpi-card" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
              <div className="kpi-label">Completed Tasks</div>
              <div className="kpi-value">{completedTasks}</div>
              <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: COLORS.success }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
          </div>

          <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Tasks by Source Department</h3>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                {sourceDeptData.length > 0 ? (
                  <ResponsiveContainer>
                    <BarChart data={sourceDeptData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke='var(--text-muted)' fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke='var(--text-muted)' fontSize={12} tickLine={false} axisLine={false} width={80} />
                      <RechartsTooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                      <Bar dataKey="value" name="Tasks" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data</div>
                )}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Tasks by Target Team</h3>
              </div>
              <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {targetTeamData.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={targetTeamData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                        {targetTeamData.map((entry, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>No data</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
