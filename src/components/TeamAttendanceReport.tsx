'use client'

import React,{ useState,useMemo } from 'react';
import { Download,ChevronDown,User,FileText,RefreshCw,Users,CheckCircle,BarChart2 } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

interface TeamAttendanceProps {
  data: import('@/lib/view-types').AttendanceUser[];
  executives: import('@/lib/view-types').Person[];
}

export default function TeamAttendanceReport({ data = [], executives = [] }: TeamAttendanceProps) {
  const [filterTeam, setFilterTeam] = useState('');
  const [filterExecutive, setFilterExecutive] = useState('');
  const [filterWebinar, setFilterWebinar] = useState('');
  
  const uniqueWebinars = useMemo(() => {
    return Array.from(new Set(data.map(d => d.webinarId)));
  }, [data]);

  const uniqueTeams = useMemo(() => {
    return Array.from(new Set(executives.map(e => e.department).filter(Boolean)));
  }, [executives]);

  const filteredData = useMemo(() => {
    return data.filter(d => {
      if (filterTeam && d.department !== filterTeam) return false;
      if (filterExecutive && d.userId !== filterExecutive) return false;
      if (filterWebinar && d.webinarId !== filterWebinar) return false;
      return true;
    });
  }, [data, filterTeam, filterExecutive, filterWebinar]);

  // Summaries
  const totalMembers = Array.from(new Set(filteredData.map(d => d.userId))).length;
  const totalAttendance = filteredData.reduce((sum, d) => sum + d.totalAttendance, 0);
  const avgAttendance = totalMembers > 0 ? (totalAttendance / totalMembers).toFixed(1) : '0';
  const fullAttendance = filteredData.filter(d => d.totalAttendance === 3).length;

  const CustomDateInput = React.forwardRef<HTMLButtonElement,import('@/lib/view-types').DateButtonProps>(({ value, onClick }, ref) => (
    <button 
      onClick={onClick} 
      ref={ref}
      style={{
        background: 'transparent',
        border: '1px solid var(--card-border)',
        color: 'var(--text-secondary)',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '0.75rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        minWidth: '180px',
        justifyContent: 'center'
      }}
    >
      {value || "Select Month"}
    </button>
  ));
  CustomDateInput.displayName = 'CustomDateInput';

  const exportToCSV = () => {
    const headers = ['Team Member', 'Email ID', 'Team', 'Webinar ID', 'Day 1', 'Day 2', 'Day 3', 'Total Attendance'];
    const rows = filteredData.map(d => [
      d.name,
      d.email,
      d.department,
      d.webinarId,
      d.days.includes('Day 1') ? 'Yes' : 'No',
      d.days.includes('Day 2') ? 'Yes' : 'No',
      d.days.includes('Day 3') ? 'Yes' : 'No',
      d.totalAttendance
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `team_attendance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Team Webinar Attendance Report</h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Comprehensive webinar attendance report for internal team members
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative' }}>
            <select 
              value={filterTeam} 
              onChange={e => { setFilterTeam(e.target.value); setFilterExecutive(''); }}
              style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', padding: '8px 28px 8px 32px', borderRadius: '6px', fontSize: '0.75rem', appearance: 'none' }}
            >
              <option value="" style={{ background: 'var(--card-bg)' }}>All Teams</option>
              {uniqueTeams.map(t => <option key={t} value={t} style={{ background: 'var(--card-bg)' }}>{t}</option>)}
            </select>
            <Users size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ position: 'relative' }}>
            <select 
              value={filterExecutive} 
              onChange={e => setFilterExecutive(e.target.value)}
              style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', padding: '8px 28px 8px 32px', borderRadius: '6px', fontSize: '0.75rem', appearance: 'none' }}
            >
              <option value="" style={{ background: 'var(--card-bg)' }}>All Team Members</option>
              {executives.filter(e => !filterTeam || e.department === filterTeam).map(e => <option key={e.id} value={e.id} style={{ background: 'var(--card-bg)' }}>{e.name}</option>)}
            </select>
            <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ position: 'relative' }}>
            <select 
              value={filterWebinar} 
              onChange={e => setFilterWebinar(e.target.value)}
              style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', padding: '8px 28px 8px 32px', borderRadius: '6px', fontSize: '0.75rem', appearance: 'none' }}
            >
              <option value="" style={{ background: 'var(--card-bg)' }}>All Webinars</option>
              {uniqueWebinars.map(w => <option key={w} value={w} style={{ background: 'var(--card-bg)' }}>{w}</option>)}
            </select>
            <FileText size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
          </div>

          {(filterTeam || filterExecutive || filterWebinar) && (
            <button 
              onClick={() => { setFilterTeam(''); setFilterExecutive(''); setFilterWebinar(''); }}
              style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Reset Filters"
            >
              <RefreshCw size={14} />
            </button>
          )}

          <button 
            onClick={exportToCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary)', color: 'var(--text-primary)', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '20px', borderRadius: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="#3b82f6" /> Total Team Members
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: '1.8rem', fontWeight: 700 }}>{totalMembers}</div>
        </div>
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '20px', borderRadius: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} color="#10b981" /> Total Attendance
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: '1.8rem', fontWeight: 700 }}>{totalAttendance} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Days</span></div>
        </div>
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '20px', borderRadius: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={16} color="#f59e0b" /> Average Attendance
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: '1.8rem', fontWeight: 700 }}>{avgAttendance} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Days</span></div>
        </div>
        <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '20px', borderRadius: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} color="#8b5cf6" /> Full Attendance
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: '1.8rem', fontWeight: 700 }}>{fullAttendance} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Members</span></div>
        </div>
      </div>

      <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1 }}>
            <tr style={{ background: 'var(--table-hover)', borderBottom: '1px solid var(--card-border)' }}>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>TEAM MEMBER</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>EMAIL ID</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>TEAM</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>WEBINAR ID</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textAlign: 'center' }}>DAY 1</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textAlign: 'center' }}>DAY 2</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textAlign: 'center' }}>DAY 3</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textAlign: 'right' }}>TOTAL ATTENDANCE</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, i) => (
              <tr key={row.id} style={{ borderBottom: '1px solid var(--card-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 500 }}>{row.name}</td>
                <td style={{ padding: '16px', color: 'var(--primary)' }}>{row.email}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                    {row.department}
                  </span>
                </td>
                <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{row.webinarId}</td>
                <td style={{ padding: '16px', textAlign: 'center', color: row.days.includes('Day 1') ? '#10b981' : '#ef4444' }}>
                  {row.days.includes('Day 1') ? '✓' : '✕'}
                </td>
                <td style={{ padding: '16px', textAlign: 'center', color: row.days.includes('Day 2') ? '#10b981' : '#ef4444' }}>
                  {row.days.includes('Day 2') ? '✓' : '✕'}
                </td>
                <td style={{ padding: '16px', textAlign: 'center', color: row.days.includes('Day 3') ? '#10b981' : '#ef4444' }}>
                  {row.days.includes('Day 3') ? '✓' : '✕'}
                </td>
                <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>
                  {row.totalAttendance} {row.totalAttendance === 1 ? 'Day' : 'Days'}
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No team attendance data found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
