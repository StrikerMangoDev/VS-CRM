'use client'
import type { LeadMetrics,IssueView,Person,DashboardUser,AttendanceUser,DateButtonProps } from '@/lib/view-types';

import React,{ useState,useMemo } from 'react';
import { Download,ChevronDown,User,FileText,ArrowUpDown,RefreshCw } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import TeamAttendanceReport from './TeamAttendanceReport';

interface SalesReportProps {
  leads: LeadMetrics[];
  issues?: IssueView[]; // added
  executives: Person[];
  currentUser: DashboardUser;
  teamAttendanceData?: AttendanceUser[];
}

type TabType = 'SALES' | 'RECOVERY' | 'TECHNICAL' | 'TEAM_ATTENDANCE';

const CustomDateInput = React.forwardRef<HTMLButtonElement,DateButtonProps>(({ value, onClick }, ref) => (
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
      {value || "Select Date Range"}
    </button>
  ));
CustomDateInput.displayName = 'CustomDateInput';

export default function SalesReport({ leads, issues = [], executives, teamAttendanceData = [] }: SalesReportProps) {
  const [activeTab, setActiveTab] = useState<TabType>('SALES');
  const [filterExecutive, setFilterExecutive] = useState('');
  const [filterWebinar, setFilterWebinar] = useState('');
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const [sortField, setSortField] = useState('revenue'); // default for SALES/RECOVERY
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

  const uniqueWebinars = useMemo(() => {
    const list = new Set<string>();
    leads.forEach(l => {
      if (l.webinar?.name) list.add(l.webinar.name);
    });
    return Array.from(list);
  }, [leads]);

  // Filter leads (for SALES and RECOVERY)
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const exec = l.assignments?.[0]?.user;
      if (!exec) return false;
      if (exec.department !== activeTab) return false;
      if (filterExecutive && exec.id !== filterExecutive) return false;
      if (filterWebinar && l.webinar?.name !== filterWebinar) return false;
      return true;
    });
  }, [leads, activeTab, filterExecutive, filterWebinar]);

  // Filter issues (for TECHNICAL)
  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      const exec = i.leadOwner;
      if (!exec) return false;
      if (exec.department !== activeTab) return false;
      if (filterExecutive && exec.id !== filterExecutive) return false;
      
      if (filterStartDate) {
        const d = new Date(i.updatedAt || i.createdAt);
        const start = new Date(filterStartDate);
        start.setHours(0,0,0,0);
        if (d < start) return false;
      }
      if (filterEndDate) {
        const d = new Date(i.updatedAt || i.createdAt);
        const end = new Date(filterEndDate);
        end.setHours(23,59,59,999);
        if (d > end) return false;
      }
      return true;
    });
  }, [issues, activeTab, filterExecutive, filterStartDate, filterEndDate]);

  // Aggregate stats per executive
  const execStats = useMemo(() => {
    const isDateInRange = (dateField: string | Date | null) => {
      if (!filterStartDate && !filterEndDate) return true;
      if (!dateField) return false;
      const d = new Date(dateField);
      if (filterStartDate) {
        const s = new Date(filterStartDate);
        s.setHours(0,0,0,0);
        if (d < s) return false;
      }
      if (filterEndDate) {
        const e = new Date(filterEndDate);
        e.setHours(23,59,59,999);
        if (d > e) return false;
      }
      return true;
    };

    const counters = {totalIssues:0,pending:0,resolved:0,dailyPaidCalls:0,welcomeCalls:0,accessGiven:0,totalLeads:0,totalCalls:0,connected:0,notConnected:0,fullPayment:0,revenue:0};
    const map: Record<string,{id:string;name:string;department:string}&typeof counters> = {};
    
    // Initialize map with all executives of the active department
    executives.forEach(exec => {
      if (exec.department === activeTab) {
        const matchExec = !filterExecutive || filterExecutive === exec.id;
        if (matchExec) {
          if (activeTab === 'TECHNICAL') {
            map[exec.id] = {
              ...counters,
              id: exec.id,
              name: exec.name,
              department: exec.department,
              totalIssues: 0,
              pending: 0,
              resolved: 0,
              dailyPaidCalls: 0,
              welcomeCalls: 0,
              accessGiven: 0
            };
          } else {
            map[exec.id] = {
              ...counters,
              id: exec.id,
              name: exec.name,
              department: exec.department,
              totalLeads: 0,
              totalCalls: 0,
              connected: 0,
              notConnected: 0,

              fullPayment: 0,
              revenue: 0
            };
          }
        }
      }
    });

    if (activeTab === 'TECHNICAL') {
      filteredIssues.forEach(i => {
        const exec = i.leadOwner;
        if (!exec || !map[exec.id]) return;
        
        map[exec.id].totalIssues++;
        
        const statusValue = i.issueStatus?.value?.toLowerCase() || '';
        if (statusValue.includes('resolv') || statusValue.includes('clos') || statusValue.includes('done') || statusValue.includes('fixed')) {
          map[exec.id].resolved++;
        } else if (i.issueStatusId) {
          map[exec.id].pending++; // Has some other status, considered pending
        } else {
          map[exec.id].pending++; // No status
        }
      });

      filteredLeads.forEach(l => {
        const exec = l.assignments?.[0]?.user;
        if (!exec || !map[exec.id]) return;

        if (l.whatsappJoined === true) map[exec.id].dailyPaidCalls++;
        if (l.enrollmentCompleted === true) map[exec.id].welcomeCalls++;
        if (l.accessStatus && l.accessStatus !== 'Pending') map[exec.id].accessGiven++;
      });
    } else {
      filteredLeads.forEach(l => {
        const exec = l.assignments?.[0]?.user;
        if (!exec || !map[exec.id]) return;
        
        if (isDateInRange(l.createdAt)) {
          map[exec.id].totalLeads++;
        }
        
        let conn = 0;
        let notConn = 0;
        if (l.callRecords) {
          const dialerCallsToday = l.callRecords.filter((r) => isDateInRange(r.createdAt)).reduce((sum: number, r) => sum + (r.count ?? 1), 0);
          if (dialerCallsToday > 0) {
            const manualNotConn = l.auditLogs ? l.auditLogs.filter((a) => a.newValue === 'CALL_NOT_CONNECTED' && isDateInRange(a.createdAt)).reduce((sum: number, a) => sum + (a.count ?? 1), 0) : 0;
            notConn = Math.min(dialerCallsToday, manualNotConn);
            conn = dialerCallsToday - notConn;
          }
        }
        map[exec.id].connected += conn;
        map[exec.id].notConnected += notConn;
        map[exec.id].totalCalls += (conn + notConn);
        
        if (isDateInRange(l.updateStatusDate || l.updatedAt || l.createdAt)) {
          if (activeTab === 'RECOVERY') {
            const recovered = (Number(l.amount1) || 0) + (Number(l.amount2) || 0) + (Number(l.amount3) || 0);
            if (!l.leadStatus?.startsWith('CLOSED')) {
              map[exec.id].revenue += recovered;
            }
            if (l.paymentStatus === 'FULL_PAYMENT' || recovered > 0) {
              map[exec.id].fullPayment++;
            }
          } else {
            const totalPayment = l.totalPayment || l.salesAmount || 0;
            if (!l.leadStatus?.startsWith('CLOSED')) {
              map[exec.id].revenue += totalPayment;
            }
            if (l.paymentStatus === 'FULL_PAYMENT' || totalPayment > 8000 || l.fullPaymentAmount > 0) {
              map[exec.id].fullPayment++;
            }
          }
        }
      });
    }

    const data = Object.values(map);
    
    // Sort
    data.sort((a, b) => {
      let valA = a[sortField as keyof typeof a] || 0;
      let valB = b[sortField as keyof typeof b] || 0;
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [filteredLeads, filteredIssues, executives, activeTab, filterExecutive, sortField, sortDir,filterStartDate,filterEndDate]);

  const totals = useMemo(() => {
    if (activeTab === 'TECHNICAL') {
      return execStats.reduce((acc, row) => {
        acc.totalIssues += row.totalIssues;
        acc.pending += row.pending;
        acc.resolved += row.resolved;
        acc.dailyPaidCalls += row.dailyPaidCalls;
        acc.welcomeCalls += row.welcomeCalls;
        acc.accessGiven += row.accessGiven;
        return acc;
      }, { totalIssues: 0, pending: 0, resolved: 0, dailyPaidCalls: 0, welcomeCalls: 0, accessGiven: 0,totalLeads:0,totalCalls:0,connected:0,notConnected:0,fullPayment:0,revenue:0 });
    } else {
      return execStats.reduce((acc, row) => {
        acc.totalLeads += row.totalLeads;
        acc.totalCalls += row.totalCalls;
        acc.connected += row.connected;
        acc.notConnected += row.notConnected;

        acc.fullPayment += row.fullPayment;
        acc.revenue += row.revenue;
        return acc;
      }, { totalIssues:0,pending:0,resolved:0,dailyPaidCalls:0,welcomeCalls:0,accessGiven:0,totalLeads: 0, totalCalls: 0, connected: 0, notConnected: 0, fullPayment: 0, revenue: 0 });
    }
  }, [execStats, activeTab]);

  const formatCurrency = (amt: number) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const exportToCSV = () => {
    let headers: string[] = [];
    let rows: (string|number|undefined)[][] = [];

    if (activeTab === 'TECHNICAL') {
      headers = ['Name', 'Department', 'Total Issues', 'Pending', 'Resolved / In Progress', 'Daily Paid Calls', 'Welcome Calls', 'Access Given'];
      rows = execStats.map((row) => [
        row.name, row.department, row.totalIssues, row.pending, row.resolved, row.dailyPaidCalls, row.welcomeCalls, row.accessGiven
      ]);
      rows.push(['TOTAL', '', totals.totalIssues, totals.pending, totals.resolved, totals.dailyPaidCalls, totals.welcomeCalls, totals.accessGiven]);
    } else {
      headers = [
        'Name', 'Department', 'Total Leads', 'Total Calls', 'Connected', 'Not Connected',
        'Full Payment', 'Total Revenue'
      ];
      rows = execStats.map((row) => [
        row.name, row.department, row.totalLeads, row.totalCalls, row.connected, row.notConnected,
        row.fullPayment, row.revenue
      ]);
      rows.push(['TOTAL', '', totals.totalLeads, totals.totalCalls, totals.connected, totals.notConnected, totals.fullPayment, totals.revenue]);
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTab.toLowerCase()}_performance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--card-border)' }}>
        {['SALES', 'RECOVERY', 'TECHNICAL', 'TEAM_ATTENDANCE'].map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab as TabType);
              setFilterExecutive('');
              setSortField(tab === 'TECHNICAL' ? 'totalIssues' : 'revenue');
            }}
            style={{
              padding: '12px 24px',
              background: activeTab === tab ? 'rgba(59,130,246,0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === tab ? '#3b82f6' : 'var(--text-muted)',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '0.9rem'
            }}
          >
            {tab === 'TEAM_ATTENDANCE' ? 'Team Webinar Attendance' : tab.charAt(0) + tab.slice(1).toLowerCase() + ' Report'}
          </button>
        ))}
      </div>

      {activeTab === 'TEAM_ATTENDANCE' ? (
        <TeamAttendanceReport data={teamAttendanceData} executives={executives} />
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} Performance Report</h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Comprehensive performance report for {activeTab.toLowerCase()} executives
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative' }}>
            <select 
              value={filterExecutive} 
              onChange={e => setFilterExecutive(e.target.value)}
              style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', padding: '8px 28px 8px 32px', borderRadius: '6px', fontSize: '0.75rem', appearance: 'none' }}
            >
              <option value="" style={{ background: 'var(--card-bg)' }}>All Executives</option>
              {executives.filter(e => e.department === activeTab).map(e => <option key={e.id} value={e.id} style={{ background: 'var(--card-bg)' }}>{e.name}</option>)}
            </select>
            <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
          </div>

          {activeTab !== 'TECHNICAL' && (
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
          )}

          <DatePicker
            selectsRange={true}
            startDate={filterStartDate || undefined}
            endDate={filterEndDate || undefined}
            onChange={(update) => { setFilterStartDate(update[0]); setFilterEndDate(update[1]); }}
            customInput={<CustomDateInput />}
            dateFormat="MMM d, yyyy"
          />

          {(filterExecutive || filterWebinar || filterStartDate || filterEndDate) && (
            <button 
              onClick={() => {
                setFilterExecutive('');
                setFilterWebinar('');
                setFilterStartDate(null);
                setFilterEndDate(null);
              }}
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

      <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>NAME</th>
              
              {activeTab === 'TECHNICAL' ? (
                <>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('totalIssues')}>
                    TOTAL ISSUES <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('pending')}>
                    PENDING <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('resolved')}>
                    RESOLVED / IN PROGRESS <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('dailyPaidCalls')}>
                    DAILY PAID CALLS <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('welcomeCalls')}>
                    WELCOME CALLS <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('accessGiven')}>
                    ACCESS GIVEN <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                </>
              ) : (
                <>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('totalLeads')}>
                    TOTAL LEADS <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('totalCalls')}>
                    TOTAL CALLS <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('connected')}>
                    CONNECTED <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('notConnected')}>
                    NOT CONNECTED <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>

                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('fullPayment')}>
                    FULL PAYMENT <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('revenue')}>
                    TOTAL REVENUE <ArrowUpDown size={12} style={{ display: 'inline', marginLeft: '4px' }} />
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {execStats.map((row) => (
              <tr key={row.id} style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
                <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>{row.name}</td>
                
                {activeTab === 'TECHNICAL' ? (
                  <>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', textAlign: 'right' }}>{row.totalIssues}</td>
                    <td style={{ padding: '12px 16px', color: '#fca5a5', textAlign: 'right' }}>{row.pending}</td>
                    <td style={{ padding: '12px 16px', color: '#86efac', textAlign: 'right' }}>{row.resolved}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--primary)', textAlign: 'right', fontWeight: 500 }}>{row.dailyPaidCalls}</td>
                    <td style={{ padding: '12px 16px', color: '#6ee7b7', textAlign: 'right', fontWeight: 500 }}>{row.welcomeCalls}</td>
                    <td style={{ padding: '12px 16px', color: '#fcd34d', textAlign: 'right', fontWeight: 500 }}>{row.accessGiven}</td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', textAlign: 'right' }}>{row.totalLeads}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--primary)', textAlign: 'right', fontWeight: 500 }}>{row.totalCalls}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', textAlign: 'right' }}>{row.connected}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', textAlign: 'right' }}>{row.notConnected}</td>

                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', textAlign: 'right' }}>{row.fullPayment}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--success)', fontWeight: 600, textAlign: 'right' }}>{formatCurrency(row.revenue)}</td>
                  </>
                )}
              </tr>
            ))}
            
            {/* TOTALS ROW */}
            {execStats.length > 0 && (
              <tr style={{ background: 'rgba(59, 130, 246, 0.05)', borderTop: '2px solid rgba(59, 130, 246, 0.3)' }}>
                <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 700 }}>TOTAL</td>
                
                {activeTab === 'TECHNICAL' ? (
                  <>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>{totals.totalIssues}</td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>{totals.pending}</td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>{totals.resolved}</td>
                    <td style={{ padding: '16px', color: 'var(--primary)', fontWeight: 700, textAlign: 'right' }}>{totals.dailyPaidCalls}</td>
                    <td style={{ padding: '16px', color: 'var(--success)', fontWeight: 700, textAlign: 'right' }}>{totals.welcomeCalls}</td>
                    <td style={{ padding: '16px', color: 'var(--warning)', fontWeight: 700, textAlign: 'right' }}>{totals.accessGiven}</td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>{totals.totalLeads}</td>
                    <td style={{ padding: '16px', color: 'var(--primary)', fontWeight: 700, textAlign: 'right' }}>{totals.totalCalls}</td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>{totals.connected}</td>
                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>{totals.notConnected}</td>

                    <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>{totals.fullPayment}</td>
                    <td style={{ padding: '16px', color: 'var(--success)', fontWeight: 700, fontSize: '1.1rem', textAlign: 'right' }}>{formatCurrency(totals.revenue)}</td>
                  </>
                )}
              </tr>
            )}
          </tbody>
        </table>
        
        {execStats.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No data found for the selected department.
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
