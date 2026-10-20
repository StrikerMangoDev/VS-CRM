'use client'
import type { LeadMetrics,DashboardUser,TopPerformer,IssueView,Person,DateButtonProps } from '@/lib/view-types'

import { useState,useMemo,forwardRef,useCallback } from 'react'
import {
XAxis,YAxis,CartesianGrid,Tooltip as RechartsTooltip,ResponsiveContainer,
PieChart,Pie,Cell,BarChart,Bar,Legend
} from 'recharts'
import {
Calendar,ChevronDown,RefreshCw,Target,TrendingUp,Users,DollarSign,Trophy,Phone,MessageSquare,CheckCircle2,AlertCircle,ShieldAlert,CheckSquare,Building2,User,FileText,Laptop,MoreVertical,
IndianRupee,Rocket,AlarmClock,ShieldCheck,PhoneCall,PhoneMissed,MonitorOff,UserRound,Flame,Award,Inbox,AlertTriangle,UserPlus,UserMinus
} from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const COLORS = {
  primary: '#3b82f6', // blue
  secondary: '#a855f7', // purple
  success: '#22c55e', // green
  warning: '#eab308', // yellow
  danger: '#ef4444', // red
  pink: '#ec4899', // pink
}

const formatCurrency = (val: number) => {
  if (val >= 10000000) return `₹ ${(val/10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹ ${(val/100000).toFixed(2)} L`;
  if (val >= 1000) return `₹ ${(val/1000).toFixed(1)} K`;
  return `₹ ${val}`;
};

const CustomDateInput = forwardRef<HTMLButtonElement,DateButtonProps>(({ value, onClick }, ref) => (
  <button onClick={onClick} ref={ref} className="perf-filter-btn">
    <Calendar size={14} />
    <span>{value || 'All Time'}</span>
    <ChevronDown size={14} />
  </button>
));
CustomDateInput.displayName = 'CustomDateInput';

const MetricCard = ({ title, value, icon: Icon, color, trend, trendLabel }: {title:string;value:React.ReactNode;icon:import('lucide-react').LucideIcon;color:string;trend?:number;trendLabel?:string}) => (
    <div className="perf-metric-card" style={{ borderColor: `${color}40`, boxShadow: `0 4px 15px ${color}15` }}>
      <div className="perf-metric-header">
        <div>
          <div className="perf-metric-title">{title}</div>
          <div className="perf-metric-value">{value}</div>
        </div>
        <div className="perf-metric-icon-wrapper" style={{ background: `${color}22`, color: color }}>
          <Icon size={14} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`perf-metric-trend ${trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'neutral'}`}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '−'} {Math.abs(trend)}% <span style={{ color: 'var(--text-muted)' }}>{trendLabel || ''}</span>
        </div>
      )}
    </div>
  )

export default function PerformanceDashboard({ initialLeads = [], user, topPerformers = [], issues = [] }: {initialLeads?:LeadMetrics[];user:DashboardUser;topPerformers?:TopPerformer[];issues?:IssueView[]}) {
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null)
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null)
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterExecutive, setFilterExecutive] = useState('')
  const [filterWebinar, setFilterWebinar] = useState('')

  // Filter leads dynamically on client side
  const filteredLeads = useMemo(() => {
    return initialLeads.filter((l) => {
      const exec = l.assignments?.[0]?.user;
      
      // Admin/TL Specific Filters
      if (user.isAdmin) {
         if (filterDepartment && exec?.department !== filterDepartment) return false;
      }
      if (user.isAdmin || user.isTL) {
         if (filterExecutive && exec?.id !== filterExecutive) return false;
      }

      if (filterWebinar && l.webinarId !== filterWebinar) return false;
      
      return true;
    });
  }, [initialLeads, filterDepartment, filterExecutive, filterWebinar, user])

  // Top KPIs
  const isLeadInDateRange = useCallback((l:LeadMetrics, dateField: string | Date | null) => {
    if (filterStartDate || filterEndDate) {
      if (!dateField) return false;
      const cDate = new Date(dateField);
      if (filterStartDate) { const s = new Date(filterStartDate); s.setHours(0,0,0,0); if (cDate < s) return false; }
      if (filterEndDate) { const e = new Date(filterEndDate); e.setHours(23,59,59,999); if (cDate > e) return false; }
    }
    const exec = l.assignments?.[0]?.user;
    if (user.isAdmin && filterDepartment && exec?.department !== filterDepartment) return false;
    if ((user.isAdmin || user.isTL) && filterExecutive && exec?.id !== filterExecutive) return false;
    if (filterWebinar && l.webinarId !== filterWebinar) return false;
    return true;
  },[filterStartDate,filterEndDate,filterDepartment,filterExecutive,filterWebinar,user.isAdmin,user.isTL]);

  const totalLeads = filteredLeads.length;
  
  const activeLeads = filteredLeads.filter((l) => {
    const isClosed = l.leadStatus?.startsWith('CLOSED') || l.fullPaymentAmount > 0;
    if (isClosed) return false;
    return l.leadStatus === 'IN_PROGRESS' || (l.callStatus && l.callStatus !== 'UNTOUCHED');
  }).length;
  
  const closedLeads = initialLeads.filter((l) => {
    const isClosed = l.leadStatus?.startsWith('CLOSED') || l.fullPaymentAmount > 0;
    if (!isClosed) return false;
    return isLeadInDateRange(l, l.updateStatusDate || l.updatedAt);
  }).length;
  
  const paidClosedLeads = initialLeads.filter((l) => {
    const isPaid = l.leadStatus === 'CLOSED_FULL_PAYMENT' || l.paymentStatus === 'FULL_PAYMENT' || l.fullPaymentAmount > 0;
    if (!isPaid) return false;
    return isLeadInDateRange(l, l.updateStatusDate || l.updatedAt);
  }).length;
  
  const convertedLeads = initialLeads.filter((l) => {
    const isConverted = (l.totalPayment || 0) >= 1000;
    if (!isConverted) return false;
    return isLeadInDateRange(l, l.updateStatusDate || l.updatedAt);
  }).length;
  
  const totalRevenue = initialLeads.reduce((sum: number, l) => {
    if (!isLeadInDateRange(l, l.updateStatusDate || l.updatedAt)) return sum;
    return sum + (l.leadStatus?.startsWith('CLOSED') ? 0 : (l.totalPayment || l.salesAmount || 0));
  }, 0);
  
  const totalRecovery = initialLeads.reduce((sum: number, l) => {
    if (!isLeadInDateRange(l, l.updateStatusDate || l.updatedAt)) return sum;
    return sum + (l.recoveryAmount || 0);
  }, 0);
  
  const pendingRecovery = initialLeads.reduce((sum: number, l) => {
    if (!isLeadInDateRange(l, l.updateStatusDate || l.updatedAt)) return sum;
    if (l.paymentStatus === 'PART_PAYMENT') {
      const payable = l.salesAmount || 15999;
      const paid = l.totalPayment || 0;
      const pending = payable - paid;
      return sum + (pending > 0 ? pending : 0);
    }
    return sum;
  }, 0);

  let connectedCalls = 0;
  let notConnected = 0;

  initialLeads.forEach((l) => {
    if (l.callRecords && l.callRecords.length > 0) {
      const dialerCallsToday = l.callRecords.filter((r) => isLeadInDateRange(l, r.createdAt)).reduce((sum: number, r) => sum + (r.count ?? 1), 0);
      if (dialerCallsToday > 0) {
        const status = (l.callStatus || '').toUpperCase();
        if (status === 'CALL_CONNECTED' || status === 'CONNECTED' || (status.includes('CONNECTED') && !status.includes('NOT'))) {
          connectedCalls += dialerCallsToday;
        } else {
          notConnected += dialerCallsToday;
        }
      }
    } else if (l.currentModuleId === 'EXTRA_DIALER' && isLeadInDateRange(l, l.updatedAt || l.createdAt)) {
      const status = (l.callStatus || '').toUpperCase();
      if (status === 'CALL_CONNECTED' || status === 'CONNECTED' || (status.includes('CONNECTED') && !status.includes('NOT'))) {
        connectedCalls += 1;
      } else if (status === 'CALL_NOT_CONNECTED' || status === 'NOT_CONNECTED' || status.includes('NOT')) {
        notConnected += 1;
      }
    }
  });
  
  const totalCalls = connectedCalls + notConnected;
  
  const overallClosed = filteredLeads.filter((l) => l.leadStatus?.startsWith('CLOSED') || l.fullPaymentAmount > 0).length;
  const untouchedLeads = totalLeads - activeLeads - overallClosed;
  const conversionRate = totalLeads ? ((convertedLeads / totalLeads) * 100).toFixed(2) : '0.00';
  
  const followUpsDue = initialLeads.filter((l) => {
    if (!l.nextFollowUpDate || new Date(l.nextFollowUpDate) > new Date() || l.leadStatus?.startsWith('CLOSED')) return false;
    return isLeadInDateRange(l, l.nextFollowUpDate);
  }).length;
  
  const assignedLeads = filteredLeads.filter((l) => {
    const relevantAssignments = l.assignments ? l.assignments.filter((a) => a.user?.department !== 'TECHNICAL') : [];
    return relevantAssignments.length > 0;
  }).length;
  const unassignedLeads = filteredLeads.filter((l) => {
    const relevantAssignments = l.assignments ? l.assignments.filter((a) => a.user?.department !== 'TECHNICAL') : [];
    return relevantAssignments.length === 0;
  }).length;

  // Technical specific metrics
  const whatsappPending = filteredLeads.filter((l) => !l.whatsappJoined).length;
  const whatsappJoined = filteredLeads.filter((l) => l.whatsappJoined).length;
  const welcomePending = filteredLeads.filter((l) => l.paymentStatus === 'FULL_PAYMENT' && !l.enrollmentCompleted).length;
  const welcomeDone = filteredLeads.filter((l) => l.paymentStatus === 'FULL_PAYMENT' && l.enrollmentCompleted).length;
  const lmsPending = filteredLeads.filter((l) => (l.totalPayment || 0) >= 8000 && (!l.accessStatus || l.accessStatus.toLowerCase() === 'pending')).length;
  const lmsGiven = filteredLeads.filter((l) => (l.totalPayment || 0) >= 8000 && l.accessStatus && l.accessStatus.toLowerCase() !== 'pending').length;

  const technicalTasksData = [
    { name: 'WhatsApp', Pending: whatsappPending, Done: whatsappJoined },
    { name: 'Welcome', Pending: welcomePending, Done: welcomeDone },
    { name: 'Access', Pending: lmsPending, Done: lmsGiven }
  ];

  // Issue Table specific metrics
  const totalIssues = issues.length;
  const pendingIssues = issues.filter((i) => i.issueStatus?.value?.trim().toUpperCase() !== 'SOLVED').length;
  const resolvedIssues = issues.filter((i) => i.issueStatus?.value?.trim().toUpperCase() === 'SOLVED').length;

  const technicalCasesData = [
    { name: 'Pending', value: pendingIssues, color: '#f59e0b' },
    { name: 'Resolved', value: resolvedIssues, color: '#3b82f6' }
  ];

  const issueTypesMap: Record<string, number> = {};
  issues.forEach((i) => {
    const type = i.issueType?.value || 'Unknown';
    issueTypesMap[type] = (issueTypesMap[type] || 0) + 1;
  });
  const issueTypesData = Object.entries(issueTypesMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Executive Aggregations
  const execStats = useMemo(() => {
    const map: Record<string,{id:string;name:string;department:string;leads:number;connected:number;closed:number;revenue:number;recovery:number;notConnected?:number;paidClosed?:number;converted?:number}> = {};
    initialLeads.forEach((l) => {
      const exec = l.assignments?.[0]?.user;
      if (!exec) return;
      if (user.isAdmin && filterDepartment && exec.department !== filterDepartment) return;
      if ((user.isAdmin || user.isTL) && filterExecutive && exec.id !== filterExecutive) return;
      if (filterWebinar && l.webinarId !== filterWebinar) return;

      if (!map[exec.id]) {
        map[exec.id] = { 
          id: exec.id,
          name: exec.name, 
          department: exec.department,
          leads: 0, connected: 0, closed: 0,
          revenue: 0, recovery: 0
        };
      }
      
      const isAssignedInRange = (() => {
        if (!filterStartDate && !filterEndDate) return true;
        const cDate = new Date(l.createdAt);
        if (filterStartDate) { const s = new Date(filterStartDate); s.setHours(0,0,0,0); if (cDate < s) return false; }
        if (filterEndDate) { const e = new Date(filterEndDate); e.setHours(23,59,59,999); if (cDate > e) return false; }
        return true;
      })();
      if (isAssignedInRange) map[exec.id].leads++;
      
      const isActionInRange = (() => {
        const d = l.updateStatusDate || l.updatedAt;
        if (!filterStartDate && !filterEndDate) return true;
        if (!d) return false;
        const actDate = new Date(d);
        if (filterStartDate) { const s = new Date(filterStartDate); s.setHours(0,0,0,0); if (actDate < s) return false; }
        if (filterEndDate) { const e = new Date(filterEndDate); e.setHours(23,59,59,999); if (actDate > e) return false; }
        return true;
      })();
      
      let conn = 0;
      let notConn = 0;
      if (l.callRecords && l.callRecords.length > 0) {
        const dialerCallsToday = l.callRecords.filter((r) => isLeadInDateRange(l, r.createdAt)).reduce((sum: number, r) => sum + (r.count ?? 1), 0);
        if (dialerCallsToday > 0) {
          const status = (l.callStatus || '').toUpperCase();
          if (status === 'CALL_CONNECTED' || status === 'CONNECTED' || (status.includes('CONNECTED') && !status.includes('NOT'))) {
            conn += dialerCallsToday;
          } else {
            notConn += dialerCallsToday;
          }
        }
      } else if (l.currentModuleId === 'EXTRA_DIALER' && isLeadInDateRange(l, l.updatedAt || l.createdAt)) {
        const status = (l.callStatus || '').toUpperCase();
        if (status === 'CALL_CONNECTED' || status === 'CONNECTED' || (status.includes('CONNECTED') && !status.includes('NOT'))) {
          conn += 1;
        } else if (status === 'CALL_NOT_CONNECTED' || status === 'NOT_CONNECTED' || status.includes('NOT')) {
          notConn += 1;
        }
      }
      map[exec.id].connected += conn;
      map[exec.id].notConnected = (map[exec.id].notConnected || 0) + notConn;

      if (isActionInRange) {
        if (l.leadStatus?.startsWith('CLOSED') || l.fullPaymentAmount > 0) map[exec.id].closed++;
        const isPaid = l.leadStatus === 'CLOSED_FULL_PAYMENT' || l.paymentStatus === 'FULL_PAYMENT' || l.fullPaymentAmount > 0;
        if (isPaid) map[exec.id].paidClosed = (map[exec.id].paidClosed || 0) + 1;
        const isConverted = (l.totalPayment || 0) >= 1000;
        if (isConverted) map[exec.id].converted = (map[exec.id].converted || 0) + 1;
        map[exec.id].revenue += (l.leadStatus?.startsWith('CLOSED') ? 0 : (l.totalPayment || l.salesAmount || 0));
        map[exec.id].recovery += (l.recoveryAmount || 0);
      }
    });
    
    return Object.values(map).map(p => ({
      ...p,
      conversion: p.leads ? Number((((p.converted || 0) / p.leads) * 100).toFixed(1)) : 0,
      revStr: formatCurrency(p.revenue),
      recStr: formatCurrency(p.recovery)
    })).sort((a, b) => b.revenue - a.revenue || b.recovery - a.recovery); // Default sort by rev then rec
  }, [initialLeads,filterDepartment,filterExecutive,filterWebinar,filterStartDate,filterEndDate,user.isAdmin,user.isTL,isLeadInDateRange]);

  const topSalesPerformer = execStats.find(e => e.department === 'SALES') || null;
  const topRecoveryPerformer = execStats.find(e => e.department === 'RECOVERY') || null;

  

  // Unique values for filters
  const uniqueExecs = useMemo(() => {
    const ids = new Set();
    const list: Person[] = [];
    initialLeads.forEach((l) => {
      const exec = l.assignments?.[0]?.user;
      if (exec && !ids.has(exec.id)) {
        if (!user.isAdmin && exec.department !== user.department) return;
        ids.add(exec.id);
        list.push(exec);
      }
    });
    return list;
  }, [initialLeads, user]);

  const uniqueWebinars = useMemo(() => {
    const list = new Set<string>();
    initialLeads.forEach((l) => {
      if (l.webinarId) list.add(l.webinarId);
    });
    return Array.from(list);
  }, [initialLeads]);

  return (
    <div className="sales-dashboard-container" style={{ maxWidth: '1600px', margin: '0 auto', background: 'transparent', padding: '24px', borderRadius: '16px' }}>
      
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Performance Dashboard</h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Welcome back, <b style={{ color: 'var(--text-primary)' }}>{user.name}</b> 
            <span style={{ margin: '0 8px', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>{user.role}</span>
            <span style={{ background: 'var(--table-hover)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 }}>{user.department === 'ALL' ? 'ALL TEAMS' : user.department}</span>
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            {user.isAdmin && (
              <div style={{ position: 'relative' }}>
                <select 
                  className="perf-filter-btn" 
                  value={filterDepartment} 
                  onChange={e => setFilterDepartment(e.target.value)}
                  style={{ appearance: 'none', paddingRight: '28px', paddingLeft: '32px' }}
                >
                  <option value="">All Teams</option>
                  <option value="SALES">Sales</option>
                  <option value="RECOVERY">Recovery</option>
                  <option value="TECHNICAL">Technical</option>
                </select>
                <Building2 size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
              </div>
            )}
            {(user.isAdmin || user.isTL) && (
              <div style={{ position: 'relative' }}>
                <select 
                  className="perf-filter-btn" 
                  value={filterExecutive} 
                  onChange={e => setFilterExecutive(e.target.value)}
                  style={{ appearance: 'none', paddingRight: '28px', paddingLeft: '32px' }}
                >
                  <option value="">All Executives</option>
                  {uniqueExecs.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <select 
                className="perf-filter-btn" 
                value={filterWebinar} 
                onChange={e => setFilterWebinar(e.target.value)}
                style={{ appearance: 'none', paddingRight: '28px', paddingLeft: '32px' }}
              >
                <option value="">All Webinars</option>
                {uniqueWebinars.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              <FileText size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            </div>
            <DatePicker
              selectsRange={true}
              startDate={filterStartDate || undefined}
              endDate={filterEndDate || undefined}
              onChange={(update) => { setFilterStartDate(update[0]); setFilterEndDate(update[1]); }}
              customInput={<CustomDateInput />}
              dateFormat="MMM d, yyyy"
            />
            {(filterDepartment || filterExecutive || filterWebinar || filterStartDate || filterEndDate) && (
              <button 
                onClick={() => {
                  setFilterDepartment('');
                  setFilterExecutive('');
                  setFilterWebinar('');
                  setFilterStartDate(null);
                  setFilterEndDate(null);
                }}
                className="perf-filter-btn"
                style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Reset Filters"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* KPI GRID */}
      {user.department === 'TECHNICAL' ? (
        <>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Onboarding Pipeline</h3>
          <div className="perf-metric-grid">
            <MetricCard title="Total Leads" value={totalLeads} icon={UserRound} color={COLORS.primary} trend={0} />
            <MetricCard title="WhatsApp Pending" value={whatsappPending} icon={AlertTriangle} color={COLORS.danger} trend={0} />
            <MetricCard title="WhatsApp Joined" value={whatsappJoined} icon={MessageSquare} color={COLORS.success} trend={0} />
            <MetricCard title="Welcome Pending" value={welcomePending} icon={AlarmClock} color={COLORS.warning} trend={0} />
            <MetricCard title="Welcome Done" value={welcomeDone} icon={PhoneCall} color={COLORS.success} trend={0} />
            <MetricCard title="Access Pending" value={lmsPending} icon={ShieldAlert} color={COLORS.pink} trend={0} />
            <MetricCard title="Access Given" value={lmsGiven} icon={ShieldCheck} color={COLORS.primary} trend={0} />
          </div>

          <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Issue Tracking</h3>
          <div className="perf-metric-grid">
            <MetricCard title="Total Issues" value={totalIssues} icon={AlertCircle} color={COLORS.secondary} trend={0} />
            <MetricCard title="Pending Issues" value={pendingIssues} icon={AlertTriangle} color={COLORS.warning} trend={0} />
            <MetricCard title="Resolved Issues" value={resolvedIssues} icon={CheckCircle2} color={COLORS.success} trend={0} />
          </div>
        </>
      ) : (
        <div className="perf-metric-grid">
            <MetricCard title="Total Leads" value={totalLeads} icon={UserRound} color={COLORS.primary} trend={12.5} trendLabel="from last 30 days" />
            {(user.isAdmin || user.department === 'SALES') && (
              <>
                <MetricCard title="Active Leads" value={activeLeads} icon={Flame} color={COLORS.warning} trend={11.3} />
                <MetricCard title="Closed Leads" value={closedLeads} icon={Award} color={COLORS.success} trend={100} />
                <MetricCard title="Paid & Closed" value={paidClosedLeads} icon={CheckCircle2} color={COLORS.success} trend={0} />
                <MetricCard title="Converted Leads" value={convertedLeads} icon={Target} color={COLORS.pink} trend={0} />
              </>
            )}
            
            {user.role !== 'EXEC' && (
              <>
                <MetricCard title="Assigned Leads" value={assignedLeads} icon={UserPlus} color={COLORS.primary} trend={0} />
                <MetricCard title="Unassigned Leads" value={unassignedLeads} icon={UserMinus} color={COLORS.danger} trend={0} />
              </>
            )}
            {(user.isAdmin || user.department === 'SALES') && (
              <MetricCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={IndianRupee} color={COLORS.secondary} trend={8.7} />
            )}
            
            {(user.isAdmin || user.department === 'RECOVERY') && (
              <>
                <MetricCard title="Total Recovery" value={formatCurrency(totalRecovery)} icon={ShieldCheck} color={COLORS.secondary} trend={10.5} />
                <MetricCard title="Pending Recovery" value={formatCurrency(pendingRecovery)} icon={AlertTriangle} color={COLORS.danger} trend={-2.1} />
              </>
            )}
            
            <MetricCard title="Total Calls" value={totalCalls} icon={Phone} color={COLORS.primary} trend={0} />
            <MetricCard title="Connected Calls" value={connectedCalls} icon={PhoneCall} color={COLORS.success} trend={25} />
            <MetricCard title="Not Connected" value={notConnected} icon={PhoneMissed} color={COLORS.danger} trend={0} />
            <MetricCard title="Untouched Leads" value={untouchedLeads} icon={Inbox} color={COLORS.primary} trend={-5.8} />
            
            {(user.isAdmin || user.department === 'SALES') && (
              <MetricCard title="Conversion Rate" value={`${conversionRate}%`} icon={Rocket} color={COLORS.primary} trend={0.18} />
            )}
            
            <MetricCard title="Follow-ups Due" value={followUpsDue} icon={AlarmClock} color={COLORS.warning} trend={-33.3} />
            
            {(user.isAdmin) && (
              <MetricCard title="Pending Queries" value={pendingIssues} icon={MonitorOff} color={COLORS.pink} trend={0} />
            )}
        </div>
      )}

      {/* MY PERFORMANCE (EXEC ONLY) */}
      {user.role === 'EXEC' && (
        <div style={{ display: 'grid', gridTemplateColumns: user.department === 'SALES' && topPerformers.length > 0 ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr', gap: '24px', marginBottom: '24px' }}>
          
          <div className="perf-top-performer sales" style={{ maxWidth: '400px', margin: user.department === 'SALES' && topPerformers.length > 0 ? '0 0 0 auto' : '0 auto', width: '100%' }}>
            <div className="perf-tp-header" style={{ justifyContent: 'center' }}>
              <h3 style={{ fontSize: '1.1rem' }}>My Performance</h3>
            </div>
            <div className="perf-tp-name" style={{ marginTop: '20px' }}>{user.name}</div>
            <div className="perf-tp-dept-pill sales">{user.department}</div>
            
            {user.department === 'TECHNICAL' ? (
              <>
                <div className="perf-tp-stat-row">
                  <div className="perf-tp-stat-icon blue"><Users /></div>
                  <div className="perf-tp-stat-label">Total Assigned</div>
                  <div className="perf-tp-stat-dots"></div>
                  <div className="perf-tp-stat-value">{totalLeads}</div>
                </div>
                <div className="perf-tp-stat-row">
                  <div className="perf-tp-stat-icon green"><Phone /></div>
                  <div className="perf-tp-stat-label">Welcome Calls Done</div>
                  <div className="perf-tp-stat-dots"></div>
                  <div className="perf-tp-stat-value">{welcomeDone}</div>
                </div>
                <div className="perf-tp-stat-row">
                  <div className="perf-tp-stat-icon purple"><CheckSquare /></div>
                  <div className="perf-tp-stat-label">Access Given</div>
                  <div className="perf-tp-stat-dots"></div>
                  <div className="perf-tp-stat-value">{lmsGiven}</div>
                </div>
              </>
            ) : (
              <>
                <div className="perf-tp-stat-row">
                  <div className="perf-tp-stat-icon blue"><Users /></div>
                  <div className="perf-tp-stat-label">Total Leads</div>
                  <div className="perf-tp-stat-dots"></div>
                  <div className="perf-tp-stat-value">{totalLeads}</div>
                </div>
                <div className="perf-tp-stat-row">
                  <div className="perf-tp-stat-icon green"><Phone /></div>
                  <div className="perf-tp-stat-label">Connected</div>
                  <div className="perf-tp-stat-dots"></div>
                  <div className="perf-tp-stat-value">{connectedCalls}</div>
                </div>
                <div className="perf-tp-stat-row">
                  <div className="perf-tp-stat-icon purple"><CheckSquare /></div>
                  <div className="perf-tp-stat-label">Closed</div>
                  <div className="perf-tp-stat-dots"></div>
                  <div className="perf-tp-stat-value">{closedLeads}</div>
                </div>
                <div className="perf-tp-stat-row">
                  <div className="perf-tp-stat-icon" style={{ background: '#ec489915', color: '#ec4899' }}><Target /></div>
                  <div className="perf-tp-stat-label">Converted</div>
                  <div className="perf-tp-stat-dots"></div>
                  <div className="perf-tp-stat-value">{convertedLeads}</div>
                </div>
                {(user.department === 'SALES' || user.department === 'RECOVERY') && (
                  <div className="perf-tp-stat-row">
                    <div className="perf-tp-stat-icon blue"><DollarSign /></div>
                    <div className="perf-tp-stat-label">Revenue</div>
                    <div className="perf-tp-stat-dots"></div>
                    <div className="perf-tp-stat-value">{formatCurrency(totalRevenue)}</div>
                  </div>
                )}
                {(user.department === 'SALES' || user.department === 'RECOVERY') && (
                  <div className="perf-tp-stat-row">
                    <div className="perf-tp-stat-icon blue"><Target /></div>
                    <div className="perf-tp-stat-label">Conversion</div>
                    <div className="perf-tp-stat-dots"></div>
                    <div className="perf-tp-stat-value">{conversionRate}%</div>
                  </div>
                )}
              </>
            )}

            <div className="perf-tp-message-box sales">
              <div className="perf-tp-message-icon"><TrendingUp size={14} /></div>
              Keep pushing, you&apos;re doing great!
            </div>
          </div>

          {/* TOP 3 PERFORMERS (SALES EXEC ONLY) */}
          {user.department === 'SALES' && topPerformers.length > 0 && (
            <div className="perf-top-performer sales" style={{ maxWidth: '400px', margin: '0 auto 0 0', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="perf-tp-header" style={{ justifyContent: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Trophy size={16} color="#fbbf24" /> Top 3 Performers</h3>
              </div>
              
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                {topPerformers.map((p, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'var(--card-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                    <div className={`rank-badge rank-${i + 1}`} style={{ width: '32px', height: '32px', fontSize: '1rem', marginRight: '16px' }}>
                      #{i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem' }}>{p.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>{p.closed} conversions • {p.conversion}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MID SECTION: TOP PERFORMER + LEADERBOARD (ADMIN/TL ONLY) */}
      {user.role !== 'EXEC' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2.5fr', gap: '24px', marginBottom: '24px' }}>
        
        {/* Top Performer Card - Sales */}
        <div className="perf-top-performer sales">
          <div className="perf-tp-header">
            <h3>Top Sales</h3>
            <div className="perf-tp-menu"><MoreVertical size={16} /></div>
          </div>
          {topSalesPerformer ? (
            <>
              <div className="perf-tp-trophy-container">
                <Trophy size={80} color="#fbbf24" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.6))' }} />
                <div className="perf-tp-badge">RANK #1</div>
              </div>
              <div className="perf-tp-name">{topSalesPerformer.name}</div>
              <div className="perf-tp-dept-pill sales">{topSalesPerformer.department}</div>
              
              <div className="perf-tp-stat-row">
                <div className="perf-tp-stat-icon blue"><Users /></div>
                <div className="perf-tp-stat-label">Leads</div>
                <div className="perf-tp-stat-dots"></div>
                <div className="perf-tp-stat-value">{topSalesPerformer.leads}</div>
              </div>
              <div className="perf-tp-stat-row">
                <div className="perf-tp-stat-icon green"><Phone /></div>
                <div className="perf-tp-stat-label">Connected</div>
                <div className="perf-tp-stat-dots"></div>
                <div className="perf-tp-stat-value">{topSalesPerformer.connected}</div>
              </div>
              <div className="perf-tp-stat-row">
                <div className="perf-tp-stat-icon purple"><CheckSquare /></div>
                <div className="perf-tp-stat-label">Closed</div>
                <div className="perf-tp-stat-dots"></div>
                <div className="perf-tp-stat-value">{topSalesPerformer.closed}</div>
              </div>
              <div className="perf-tp-stat-row">
                <div className="perf-tp-stat-icon blue"><DollarSign /></div>
                <div className="perf-tp-stat-label">Revenue</div>
                <div className="perf-tp-stat-dots"></div>
                <div className="perf-tp-stat-value">{topSalesPerformer.revStr}</div>
              </div>
              <div className="perf-tp-stat-row">
                <div className="perf-tp-stat-icon blue"><Target /></div>
                <div className="perf-tp-stat-label">Conversion</div>
                <div className="perf-tp-stat-dots"></div>
                <div className="perf-tp-stat-value">{topSalesPerformer.conversion}%</div>
              </div>

              <div className="perf-tp-message-box sales">
                <div className="perf-tp-message-icon"><TrendingUp size={14} /></div>
                Keep up the great work!
              </div>
            </>
          ) : (
             <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>No Data Available</div>
          )}
        </div>

        {/* Top Performer Card - Recovery */}
        <div className="perf-top-performer recovery">
          <div className="perf-tp-header">
            <h3>Top Recovery</h3>
            <div className="perf-tp-menu"><MoreVertical size={16} /></div>
          </div>
          {topRecoveryPerformer ? (
            <>
              <div className="perf-tp-trophy-container">
                <Trophy size={80} color="#fbbf24" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.6))' }} />
                <div className="perf-tp-badge">RANK #1</div>
              </div>
              <div className="perf-tp-name">{topRecoveryPerformer.name}</div>
              <div className="perf-tp-dept-pill recovery">{topRecoveryPerformer.department}</div>
              
              <div className="perf-tp-stat-row">
                <div className="perf-tp-stat-icon purple"><Users /></div>
                <div className="perf-tp-stat-label">Leads</div>
                <div className="perf-tp-stat-dots"></div>
                <div className="perf-tp-stat-value">{topRecoveryPerformer.leads}</div>
              </div>
              <div className="perf-tp-stat-row">
                <div className="perf-tp-stat-icon green"><Phone /></div>
                <div className="perf-tp-stat-label">Connected</div>
                <div className="perf-tp-stat-dots"></div>
                <div className="perf-tp-stat-value">{topRecoveryPerformer.connected}</div>
              </div>
              <div className="perf-tp-stat-row">
                <div className="perf-tp-stat-icon purple"><CheckSquare /></div>
                <div className="perf-tp-stat-label">Closed</div>
                <div className="perf-tp-stat-dots"></div>
                <div className="perf-tp-stat-value">{topRecoveryPerformer.closed}</div>
              </div>
              <div className="perf-tp-stat-row">
                <div className="perf-tp-stat-icon purple"><ShieldAlert /></div>
                <div className="perf-tp-stat-label">Recovery</div>
                <div className="perf-tp-stat-dots"></div>
                <div className="perf-tp-stat-value">{topRecoveryPerformer.recStr}</div>
              </div>
              <div className="perf-tp-stat-row">
                <div className="perf-tp-stat-icon purple"><Target /></div>
                <div className="perf-tp-stat-label">Conversion</div>
                <div className="perf-tp-stat-dots"></div>
                <div className="perf-tp-stat-value">{topRecoveryPerformer.conversion}%</div>
              </div>

              <div className="perf-tp-message-box recovery">
                <div className="perf-tp-message-icon recovery-icon"><TrendingUp size={14} /></div>
                Great performance!
              </div>
            </>
          ) : (
             <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>No Data Available</div>
          )}
        </div>

        {/* Top 5 Leaderboard Table */}
        <div className="dept-perf-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={16} color="#fbbf24" /> Top 5 Performers
            </h3>
            <button className="perf-filter-btn">View All</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 8px', fontWeight: 500 }}>#</th>
                  <th style={{ padding: '12px 8px', fontWeight: 500 }}>Executive</th>
                  <th style={{ padding: '12px 8px', fontWeight: 500 }}>Team</th>
                  <th style={{ padding: '12px 8px', fontWeight: 500 }}>Total Leads</th>
                  <th style={{ padding: '12px 8px', fontWeight: 500 }}>Connected Calls</th>
                  <th style={{ padding: '12px 8px', fontWeight: 500 }}>Closed Leads</th>
                  <th style={{ padding: '12px 8px', fontWeight: 500 }}>Revenue</th>
                  <th style={{ padding: '12px 8px', fontWeight: 500 }}>Recovery</th>
                  <th style={{ padding: '12px 8px', fontWeight: 500 }}>Conversion %</th>
                </tr>
              </thead>
              <tbody>
                {execStats.slice(0, 5).map((e, i: number) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <div className={`rank-badge ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other'}`}>
                        {i + 1}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', color: 'var(--text-primary)', fontWeight: 500 }}>{e.name}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{e.department}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{e.leads}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--success)' }}>{e.connected}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--success)' }}>{e.closed}</td>
                    <td style={{ padding: '12px 8px', color: '#3b82f6' }}>{e.revStr}</td>
                    <td style={{ padding: '12px 8px', color: '#a855f7' }}>{e.recStr}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{e.conversion}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* CHARTS GRID (2x2) */}
      {user.department !== 'TECHNICAL' && (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '24px' }}>
          
          {/* Leads by Sales Executive */}
          {(user.isAdmin || user.department === 'SALES') && (
            <div className="premium-chart-card">
              <div className="premium-chart-header">
                <div className="premium-chart-title">
                  <div className="premium-chart-icon blue"><Users size={16} /></div>
                  Leads by Sales Executive
                </div>
              </div>
              <div className="premium-chart-body">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={execStats.filter(e => e.department === 'SALES')} margin={{ top: 30, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                    <XAxis dataKey="name" stroke='var(--text-muted)' fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke='var(--text-muted)' fontSize={10} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'var(--card-border)' }} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }} />
                    <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} label={{ position: 'top', fill: '#f8fafc', fontSize: 14, fontWeight: 700 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="premium-chart-footer">
                <div className="premium-chart-footer-left">
                  <div className="premium-chart-icon blue" style={{ width: 24, height: 24 }}><Users size={12} /></div>
                  Total Leads <span className="premium-chart-footer-val">{execStats.filter(e => e.department === 'SALES').reduce((sum, e) => sum + e.leads, 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Leads by Recovery Executive */}
          {(user.isAdmin || user.department === 'RECOVERY') && (
            <div className="premium-chart-card">
              <div className="premium-chart-header">
                <div className="premium-chart-title">
                  <div className="premium-chart-icon blue"><Users size={16} /></div>
                  Leads by Recovery Executive
                </div>
              </div>
              <div className="premium-chart-body">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={execStats.filter(e => e.department === 'RECOVERY')} margin={{ top: 30, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                    <XAxis dataKey="name" stroke='var(--text-muted)' fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke='var(--text-muted)' fontSize={10} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'var(--card-border)' }} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }} />
                    <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} label={{ position: 'top', fill: '#f8fafc', fontSize: 14, fontWeight: 700 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="premium-chart-footer">
                <div className="premium-chart-footer-left">
                  <div className="premium-chart-icon blue" style={{ width: 24, height: 24 }}><Users size={12} /></div>
                  Total Leads <span className="premium-chart-footer-val">{execStats.filter(e => e.department === 'RECOVERY').reduce((sum, e) => sum + e.leads, 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Leads by Technical Executive */}
          {(user.isAdmin || user.department === 'TECHNICAL') && (
            <div className="premium-chart-card">
              <div className="premium-chart-header">
                <div className="premium-chart-title">
                  <div className="premium-chart-icon blue"><Users size={16} /></div>
                  Leads by Technical Executive
                </div>
              </div>
              <div className="premium-chart-body">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={execStats.filter(e => e.department === 'TECHNICAL')} margin={{ top: 30, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                    <XAxis dataKey="name" stroke='var(--text-muted)' fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke='var(--text-muted)' fontSize={10} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'var(--card-border)' }} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }} />
                    <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} label={{ position: 'top', fill: '#f8fafc', fontSize: 14, fontWeight: 700 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="premium-chart-footer">
                <div className="premium-chart-footer-left">
                  <div className="premium-chart-icon blue" style={{ width: 24, height: 24 }}><Users size={12} /></div>
                  Total Leads <span className="premium-chart-footer-val">{execStats.filter(e => e.department === 'TECHNICAL').reduce((sum, e) => sum + e.leads, 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Revenue by Sales Executive */}
          {(user.isAdmin || user.department === 'SALES') && (
            <div className="premium-chart-card">
              <div className="premium-chart-header">
                <div className="premium-chart-title">
                  <div className="premium-chart-icon green"><DollarSign size={16} /></div>
                  Revenue by Sales Executive
                </div>
              </div>
              <div className="premium-chart-body">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={execStats.filter(e => e.department === 'SALES')} margin={{ top: 30, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                    <XAxis dataKey="name" stroke='var(--text-muted)' fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke='var(--text-muted)' fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                    <RechartsTooltip cursor={{ fill: 'var(--card-border)' }} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }} formatter={(val) => formatCurrency(Number(val))} />
                    <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={40} label={{ position: 'top', fill: '#f8fafc', fontSize: 12, fontWeight: 700, formatter: (val) => `₹${(Number(val || 0)/1000).toFixed(1)} K` }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="premium-chart-footer">
                <div className="premium-chart-footer-left">
                  <div className="premium-chart-icon green" style={{ width: 24, height: 24 }}><DollarSign size={12} /></div>
                  Total Revenue <span className="premium-chart-footer-val">{formatCurrency(execStats.filter(e => e.department === 'SALES').reduce((sum, e) => sum + e.revenue, 0))}</span>
                </div>
              </div>
            </div>
          )}

          {/* Revenue by Recovery Executive */}
          {(user.isAdmin || user.department === 'RECOVERY') && (
            <div className="premium-chart-card">
              <div className="premium-chart-header">
                <div className="premium-chart-title">
                  <div className="premium-chart-icon green"><DollarSign size={16} /></div>
                  Revenue by Recovery Executive
                </div>
              </div>
              <div className="premium-chart-body">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={execStats.filter(e => e.department === 'RECOVERY')} margin={{ top: 30, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                    <XAxis dataKey="name" stroke='var(--text-muted)' fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke='var(--text-muted)' fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                    <RechartsTooltip cursor={{ fill: 'var(--card-border)' }} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }} formatter={(val) => formatCurrency(Number(val))} />
                    <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={40} label={{ position: 'top', fill: '#f8fafc', fontSize: 12, fontWeight: 700, formatter: (val) => `₹${(Number(val || 0)/1000).toFixed(1)} K` }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="premium-chart-footer">
                <div className="premium-chart-footer-left">
                  <div className="premium-chart-icon green" style={{ width: 24, height: 24 }}><DollarSign size={12} /></div>
                  Total Revenue <span className="premium-chart-footer-val">{formatCurrency(execStats.filter(e => e.department === 'RECOVERY').reduce((sum, e) => sum + e.revenue, 0))}</span>
                </div>
              </div>
            </div>
          )}



        {/* Call Status Distribution */}
        <div className="premium-chart-card">
          <div className="premium-chart-header">
            <div className="premium-chart-title">
              <div className="premium-chart-icon green"><Phone size={16} /></div>
              Call Status Distribution
            </div>
          </div>
          <div className="premium-donut-body">
            <div style={{ width: '160px', height: '160px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: 'Connected', value: connectedCalls, color: 'var(--success)' },
                    { name: 'Untouched', value: untouchedLeads, color: '#f59e0b' }
                  ]} cx="50%" cy="50%" innerRadius={55} outerRadius={75} dataKey="value" stroke="none" cornerRadius={4}>
                    {[{color: 'var(--success)'}, {color: '#f59e0b'}].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalLeads}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total Calls</div>
              </div>
            </div>
            <div className="premium-donut-legends">
              <div className="premium-donut-legend">
                <div className="premium-donut-dot" style={{ background: '#22c55e' }}></div>
                Connected <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{connectedCalls} ({(connectedCalls/totalLeads*100 || 0).toFixed(1)}%)</span>
                <div className="premium-donut-pct" style={{ color: 'var(--success)' }}>{(connectedCalls/totalLeads*100 || 0).toFixed(1)}%</div>
              </div>
              <div className="premium-donut-legend">
                <div className="premium-donut-dot" style={{ background: '#f59e0b' }}></div>
                Untouched <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{untouchedLeads} ({(untouchedLeads/totalLeads*100 || 0).toFixed(1)}%)</span>
                <div className="premium-donut-pct" style={{ color: '#f59e0b' }}>{(untouchedLeads/totalLeads*100 || 0).toFixed(1)}%</div>
              </div>
            </div>
          </div>
          <div className="premium-chart-footer" style={{ marginTop: 'auto' }}>
            <div className="premium-chart-footer-left" style={{ flex: 1, display: 'flex', justifyContent: 'space-between', paddingRight: '20px', borderRight: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="premium-chart-icon green" style={{ width: 24, height: 24 }}><TrendingUp size={12} /></div>
                Connection Rate
              </div>
              <div className="premium-chart-footer-val">{(connectedCalls/totalLeads*100 || 0).toFixed(1)}%</div>
            </div>
            <div className="premium-chart-footer-left" style={{ flex: 1, display: 'flex', justifyContent: 'space-between', paddingLeft: '20px' }}>
              Total Calls <div className="premium-chart-footer-val">{totalLeads}</div>
            </div>
          </div>
        </div>

        {/* Lead Status Distribution */}
        {(user.isAdmin || user.department === 'SALES') && (
          <div className="premium-chart-card">
            <div className="premium-chart-header">
              <div className="premium-chart-title">
                <div className="premium-chart-icon purple"><Target size={16} /></div>
                Lead Status Distribution
              </div>
            </div>
            <div className="premium-donut-body">
              <div style={{ width: '160px', height: '160px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name: 'Active', value: activeLeads, color: '#a855f7' },
                      { name: 'Closed', value: closedLeads, color: '#3b82f6' }
                    ]} cx="50%" cy="50%" innerRadius={55} outerRadius={75} dataKey="value" stroke="none" cornerRadius={4}>
                      {[{color: '#a855f7'}, {color: '#3b82f6'}].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalLeads}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total Leads</div>
                </div>
              </div>
              <div className="premium-donut-legends">
                <div className="premium-donut-legend">
                  <div className="premium-donut-dot" style={{ background: '#a855f7' }}></div>
                  Active <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{activeLeads} ({(activeLeads/totalLeads*100 || 0).toFixed(1)}%)</span>
                  <div className="premium-donut-pct" style={{ color: '#a855f7' }}>{(activeLeads/totalLeads*100 || 0).toFixed(1)}%</div>
                </div>
                <div className="premium-donut-legend">
                  <div className="premium-donut-dot" style={{ background: '#3b82f6' }}></div>
                  Closed <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{closedLeads} ({(closedLeads/totalLeads*100 || 0).toFixed(1)}%)</span>
                  <div className="premium-donut-pct" style={{ color: '#3b82f6' }}>{(closedLeads/totalLeads*100 || 0).toFixed(1)}%</div>
                </div>
              </div>
            </div>
            <div className="premium-chart-footer" style={{ marginTop: 'auto' }}>
              <div className="premium-chart-footer-left" style={{ flex: 1, display: 'flex', justifyContent: 'space-between', paddingRight: '20px', borderRight: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="premium-chart-icon purple" style={{ width: 24, height: 24 }}><TrendingUp size={12} /></div>
                  Closure Rate
                </div>
                <div className="premium-chart-footer-val">{(closedLeads/totalLeads*100 || 0).toFixed(1)}%</div>
              </div>
              <div className="premium-chart-footer-left" style={{ flex: 1, display: 'flex', justifyContent: 'space-between', paddingLeft: '20px' }}>
                Total Leads <div className="premium-chart-footer-val">{totalLeads}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* TECHNICAL CHARTS GRID */}
      {user.department === 'TECHNICAL' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          
          {/* Technical Progress */}
          <div className="premium-chart-card">
            <div className="premium-chart-header">
              <div className="premium-chart-title">
                <div className="premium-chart-icon blue"><CheckSquare size={16} /></div>
                Technical Progress
              </div>
            </div>
            <div className="premium-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={technicalTasksData} margin={{ top: 30, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                  <XAxis dataKey="name" stroke='var(--text-muted)' fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke='var(--text-muted)' fontSize={10} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{ fill: 'var(--card-border)' }} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Pending" fill='var(--text-muted)' radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Done" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="premium-chart-footer">
              <div className="premium-chart-footer-left">
                Track completion of technical onboarding steps
              </div>
            </div>
          </div>

          {/* Issue Types */}
          <div className="premium-chart-card">
            <div className="premium-chart-header">
              <div className="premium-chart-title">
                <div className="premium-chart-icon pink"><AlertCircle size={16} /></div>
                Issue Types
              </div>
            </div>
            <div className="premium-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issueTypesData} margin={{ top: 30, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIssue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                  <XAxis dataKey="name" stroke='var(--text-muted)' fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
                  <YAxis stroke='var(--text-muted)' fontSize={10} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{ fill: 'var(--card-border)' }} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }} />
                  <Bar dataKey="count" name="Count" fill="url(#colorIssue)" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#f8fafc', fontSize: 11, fontWeight: 600 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="premium-chart-footer">
              <div className="premium-chart-footer-left">
                Distribution of issue categories
              </div>
            </div>
          </div>

          {/* Cases Overview */}
          <div className="premium-chart-card">
            <div className="premium-chart-header">
              <div className="premium-chart-title">
                <div className="premium-chart-icon purple"><MonitorOff size={16} /></div>
                Issue Cases Overview
              </div>
            </div>
            <div className="premium-chart-body" style={{ position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={technicalCasesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {technicalCasesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', marginTop: '10px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{totalIssues}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total Issues</div>
              </div>
            </div>
            <div className="premium-chart-footer">
               <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }}></div>
                    Pending ({pendingIssues})
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }}></div>
                    Resolved ({resolvedIssues})
                  </div>
               </div>
            </div>
          </div>

        </div>
      )}

      {/* BOTTOM ROW (Team Performance) */}
      {(user.isAdmin) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          
          <div className="dept-perf-card">
            <div className="dept-perf-header">
              <div style={{ width: 24, height: 24, borderRadius: 4, background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={12} color="#60a5fa" /></div>
              Sales Team
            </div>
            <div className="dept-perf-stats">
              <div className="dept-perf-stat">
                <div className="dept-perf-stat-label">Total Leads</div>
                <div className="dept-perf-stat-val">{filteredLeads.filter((l) => l.assignments?.[0]?.user?.department === 'SALES').length}</div>
              </div>
              <div className="dept-perf-stat">
                <div className="dept-perf-stat-label">Closed Leads</div>
                <div className="dept-perf-stat-val">{initialLeads.filter((l) => l.assignments?.[0]?.user?.department === 'SALES' && l.leadStatus?.startsWith('CLOSED') && isLeadInDateRange(l, l.updateStatusDate || l.updatedAt)).length}</div>
              </div>
              <div className="dept-perf-stat">
                <div className="dept-perf-stat-label">Revenue</div>
                <div className="dept-perf-stat-val">{formatCurrency(initialLeads.filter((l) => l.assignments?.[0]?.user?.department === 'SALES' && isLeadInDateRange(l, l.updateStatusDate || l.updatedAt)).reduce((s:number, l) => s+(l.leadStatus?.startsWith('CLOSED') ? 0 : (l.totalPayment||0)), 0))}</div>
              </div>
              <div className="dept-perf-stat">
                <div className="dept-perf-stat-label">Conversion</div>
                <div className="dept-perf-stat-val">
                  {filteredLeads.filter((l) => l.assignments?.[0]?.user?.department === 'SALES').length > 0 ? 
                    ((initialLeads.filter((l) => l.assignments?.[0]?.user?.department === 'SALES' && (l.leadStatus === 'CLOSED_FULL_PAYMENT' || l.paymentStatus === 'FULL_PAYMENT' || l.fullPaymentAmount > 0) && isLeadInDateRange(l, l.updateStatusDate || l.updatedAt)).length / filteredLeads.filter((l) => l.assignments?.[0]?.user?.department === 'SALES').length) * 100).toFixed(0) + '%' 
                    : '0%'}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 'auto' }}>
              <button style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer' }}>View Details →</button>
            </div>
          </div>

          <div className="dept-perf-card">
            <div className="dept-perf-header">
              <div style={{ width: 24, height: 24, borderRadius: 4, background: '#4c1d95', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldAlert size={12} color="#a855f7" /></div>
              Recovery Team
            </div>
            <div className="dept-perf-stats">
              <div className="dept-perf-stat">
                <div className="dept-perf-stat-label">Total Leads</div>
                <div className="dept-perf-stat-val">{filteredLeads.filter((l) => l.assignments?.[0]?.user?.department === 'RECOVERY').length}</div>
              </div>
              <div className="dept-perf-stat">
                <div className="dept-perf-stat-label">Closed Leads</div>
                <div className="dept-perf-stat-val">{initialLeads.filter((l) => l.assignments?.[0]?.user?.department === 'RECOVERY' && l.leadStatus?.startsWith('CLOSED') && isLeadInDateRange(l, l.updateStatusDate || l.updatedAt)).length}</div>
              </div>
              <div className="dept-perf-stat">
                <div className="dept-perf-stat-label">Recovery</div>
                <div className="dept-perf-stat-val">{formatCurrency(initialLeads.filter((l) => l.assignments?.[0]?.user?.department === 'RECOVERY' && isLeadInDateRange(l, l.updateStatusDate || l.updatedAt)).reduce((s:number, l) => s+(l.recoveryAmount||0), 0))}</div>
              </div>
              <div className="dept-perf-stat">
                <div className="dept-perf-stat-label">Conversion</div>
                <div className="dept-perf-stat-val">
                  {filteredLeads.filter((l) => l.assignments?.[0]?.user?.department === 'RECOVERY').length > 0 ? 
                    ((initialLeads.filter((l) => l.assignments?.[0]?.user?.department === 'RECOVERY' && (l.leadStatus === 'CLOSED_FULL_PAYMENT' || l.paymentStatus === 'FULL_PAYMENT' || l.fullPaymentAmount > 0) && isLeadInDateRange(l, l.updateStatusDate || l.updatedAt)).length / filteredLeads.filter((l) => l.assignments?.[0]?.user?.department === 'RECOVERY').length) * 100).toFixed(1) + '%' 
                    : '0%'}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 'auto' }}>
              <button style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer' }}>View Details →</button>
            </div>
          </div>

          <div className="dept-perf-card">
            <div className="dept-perf-header">
              <div style={{ width: 24, height: 24, borderRadius: 4, background: '#7f1d1d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Laptop size={12} color="#ef4444" /></div>
              Technical Team
            </div>
            <div className="dept-perf-stats">
              <div className="dept-perf-stat">
                <div className="dept-perf-stat-label">Total Leads</div>
                <div className="dept-perf-stat-val">{filteredLeads.filter((l) => l.assignments?.[0]?.user?.department === 'TECHNICAL').length}</div>
              </div>
              <div className="dept-perf-stat">
                <div className="dept-perf-stat-label">Closed Leads</div>
                <div className="dept-perf-stat-val">{initialLeads.filter((l) => l.assignments?.[0]?.user?.department === 'TECHNICAL' && l.leadStatus?.startsWith('CLOSED') && isLeadInDateRange(l, l.updateStatusDate || l.updatedAt)).length}</div>
              </div>
              <div className="dept-perf-stat">
                <div className="dept-perf-stat-label">Pending Cases</div>
                <div className="dept-perf-stat-val">{initialLeads.filter((l) => l.assignments?.[0]?.user?.department === 'TECHNICAL' && !l.leadStatus?.startsWith('CLOSED') && isLeadInDateRange(l, l.updatedAt)).length}</div>
              </div>
              <div className="dept-perf-stat">
                <div className="dept-perf-stat-label">Resolution</div>
                <div className="dept-perf-stat-val">
                  {filteredLeads.filter((l) => l.assignments?.[0]?.user?.department === 'TECHNICAL').length > 0 ? 
                    ((filteredLeads.filter((l) => l.assignments?.[0]?.user?.department === 'TECHNICAL' && l.leadStatus?.startsWith('CLOSED')).length / filteredLeads.filter((l) => l.assignments?.[0]?.user?.department === 'TECHNICAL').length) * 100).toFixed(0) + '%' 
                    : '0%'}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 'auto' }}>
              <button style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer' }}>View Details →</button>
            </div>
          </div>
          
        </div>
      )}
    </div>
  )
}
