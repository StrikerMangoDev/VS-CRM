'use client'
import type { LeadMetrics,Person,DateButtonProps } from '@/lib/view-types'

import { useState,useMemo,forwardRef } from 'react'
import {
AreaChart,Area,XAxis,YAxis,CartesianGrid,Tooltip as RechartsTooltip,ResponsiveContainer,
PieChart,Pie,Cell,BarChart,Bar
} from 'recharts'
import {
Calendar,ChevronDown,RefreshCw,Briefcase,
Target,TrendingUp,Users,DollarSign,Clock,Trophy,CheckCircle2,Zap
} from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

// Color Constants matching the image
const COLORS = {
  primary: '#0ea5e9', // cyan
  secondary: '#a855f7', // purple
  success: '#10b981', // emerald
  warning: '#f59e0b', // amber
  danger: '#ef4444', // red
  pink: '#ec4899', // pink
}

const gradientStyle = (color1: string, color2: string) => ({
  background: `linear-gradient(135deg, ${color1}22, ${color2}22)`,
  border: `1px solid ${color1}44`,
  boxShadow: `inset 0 0 20px ${color1}11`,
})

const CustomDateInput = forwardRef<HTMLButtonElement,DateButtonProps>(({ value, onClick }, ref) => (
  <button 
    onClick={onClick} 
    ref={ref}
    className="dashboard-filter-btn"
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Calendar size={14} />
      <span>{value || 'All Time'}</span>
    </div>
    <ChevronDown size={14} />
  </button>
));
CustomDateInput.displayName = 'CustomDateInput';

const MetricCard = ({ title, value, trend, trendUp, icon: Icon, colorClass, gradient }: {title:string;value:React.ReactNode;trend?:string;trendUp?:boolean;icon:import('lucide-react').LucideIcon;colorClass?:string;gradient?:React.CSSProperties}) => (
    <div className={`metric-card ${colorClass}`} style={gradient}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div className="metric-icon">
          <Icon size={20} />
        </div>
      </div>
      <div>
        <div className="metric-title">{title}</div>
        <div className="metric-value">{value}</div>
        <div className={`metric-trend ${trendUp ? 'up' : 'down'}`}>
          <span style={{ fontSize: '10px', marginRight: '4px' }}>{trendUp ? '▲' : '▼'}</span>
          {trend} vs May-Jun
        </div>
      </div>
    </div>
  )

export default function SalesPerformanceDashboard({ leads = [] }: {leads?:LeadMetrics[];users?:Person[];assignments?:import('@prisma/client').Assignment[]}) {
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null)
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null)
  const [filterTeam, setFilterTeam] = useState('')
  const [filterManager, setFilterManager] = useState('')

  // -------------------------------------------------------------
  // REAL DATA AGGREGATION
  // -------------------------------------------------------------
  
  // Base KPIs
  const totalRevenue = useMemo(() => leads.reduce((sum: number, l) => sum + (l.leadStatus?.startsWith('CLOSED') ? 0 : (l.totalPayment || 0)), 0), [leads])
  const dealsWonLeads = useMemo(() => leads.filter((l) => l.fullPaymentAmount > 0), [leads])
  const dealsWon = dealsWonLeads.length
  const totalLeads = leads.length
  const conversionRate = totalLeads ? ((dealsWon / totalLeads) * 100).toFixed(2) : '0.00'
  const avgDealValue = dealsWon ? (totalRevenue / dealsWon).toFixed(0) : '0'
  
  // Sales Cycle Estimate (Avg days between creation and payment)
  const salesCycle = useMemo(() => {
    if (dealsWon === 0) return '0 Days';
    let totalDays = 0;
    let validCount = 0;
    dealsWonLeads.forEach((l) => {
      if (l.paymentDate && l.createdAt) {
        const diffTime = Math.abs(new Date(l.paymentDate).getTime() - new Date(l.createdAt).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalDays += diffDays;
        validCount++;
      }
    });
    return validCount > 0 ? `${Math.round(totalDays / validCount)} Days` : 'N/A';
  }, [dealsWonLeads, dealsWon]);

  // Top Performers Aggregation
  const topPerformers = useMemo(() => {
    const execMap: Record<string, { name: string, rev: number, deals: number }> = {};
    leads.forEach((l) => {
      const exec = l.assignments?.[0]?.user;
      if (exec) {
        if (!execMap[exec.id]) {
          execMap[exec.id] = { name: exec.name, rev: 0, deals: 0 };
        }
        if (!l.leadStatus?.startsWith('CLOSED')) {
          execMap[exec.id].rev += (l.totalPayment || 0);
        }
        if (l.fullPaymentAmount > 0) execMap[exec.id].deals += 1;
      }
    });
    
    return Object.values(execMap)
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 5)
      .map((p, i) => ({
        ...p,
        rank: i + 1,
        revStr: p.rev >= 100000 ? `${(p.rev / 100000).toFixed(1)} L` : `₹ ${p.rev.toLocaleString('en-IN')}`
      }));
  }, [leads]);

  const topPerformer = topPerformers.length > 0 ? topPerformers[0] : { name: 'N/A', revStr: '0', deals: 0, rank: 1 };

  // Revenue By Team (Donut)
  const pieData = useMemo(() => {
    const teamMap: Record<string, number> = {};
    leads.forEach((l) => {
      const exec = l.assignments?.[0]?.user;
      if (exec) {
        const teamName = exec.subTeam || exec.department || 'Unassigned';
        if (!l.leadStatus?.startsWith('CLOSED')) {
          teamMap[teamName] = (teamMap[teamName] || 0) + (l.totalPayment || 0);
        }
      }
    });
    
    const colors = [COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, COLORS.danger];
    const data = Object.entries(teamMap)
      .filter(([, val]) => val > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => {
        return { name, value, color: colors[i % colors.length] };
      });
      
    const total = data.reduce((sum, item) => sum + item.value, 0);
    // Calculate percentages
    return data.map(d => ({ ...d, percent: total > 0 ? Math.round((d.value / total) * 100) : 0 }));
  }, [leads]);

  // Sales Funnel
  const funnelData = useMemo(() => {
    const qualified = leads.filter((l) => l.whatsappJoined).length;
    const proposal = leads.filter((l) => l.partPaymentAmount > 0 || l.fullPaymentAmount > 0).length;
    const won = dealsWon;
    
    return [
      { name: 'Total Leads', value: 100, label: '100%' },
      { name: 'Qualified (WA)', value: totalLeads ? (qualified / totalLeads) * 100 : 0, label: `${totalLeads ? Math.round((qualified / totalLeads) * 100) : 0}%` },
      { name: 'Proposal Sent', value: totalLeads ? (proposal / totalLeads) * 100 : 0, label: `${totalLeads ? Math.round((proposal / totalLeads) * 100) : 0}%` },
      { name: 'Won Deals', value: totalLeads ? (won / totalLeads) * 100 : 0, label: `${totalLeads ? Math.round((won / totalLeads) * 100) : 0}%` }
    ];
  }, [leads, totalLeads, dealsWon]);

  // Area Chart & Bar Chart (Trend Over Time)
  const { areaData, barData } = useMemo(() => {
    const trendMap: Record<string, { current: number, previous: number, deals: number }> = {};
    const now = new Date();
    
    // Simple mock binning by month based on createdAt for demonstration, 
    // ideally should group by exact weeks/months dynamically
    leads.forEach((l) => {
      const date = new Date(l.createdAt);
      const month = date.toLocaleString('default', { month: 'short' });
      if (!trendMap[month]) trendMap[month] = { current: 0, previous: 0, deals: 0 };
      
      if (!l.leadStatus?.startsWith('CLOSED')) {
        if (date.getFullYear() === now.getFullYear() - 1) trendMap[month].previous += (l.totalPayment || 0);
        else if (date.getFullYear() === now.getFullYear()) trendMap[month].current += (l.totalPayment || 0);
      }
      if (l.fullPaymentAmount > 0) trendMap[month].deals += 1;
    });

    const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Ensure we always have the last 6 months to make the chart look good
    const currentMonthIndex = now.getMonth();
    for (let i = 5; i >= 0; i--) {
      let mIndex = currentMonthIndex - i;
      if (mIndex < 0) mIndex += 12;
      const mName = monthsOrder[mIndex];
      if (!trendMap[mName]) {
        trendMap[mName] = { current: 0, previous: 0, deals: 0 };
      }
    }

    const sortedData = Object.entries(trendMap)
      .sort(([a], [b]) => monthsOrder.indexOf(a) - monthsOrder.indexOf(b))
      .map(([name, data]) => ({ name, current: data.current, previous: data.previous, deals: data.deals }));

    return { areaData: sortedData.length > 0 ? sortedData : [{name: 'No Data', current: 0, previous: 0}], barData: sortedData };
  }, [leads]);

  // Product Revenue (Top 4 Webinars)
  const productData = useMemo(() => {
    const pMap: Record<string, number> = {};
    leads.forEach((l) => {
      if (!l.leadStatus?.startsWith('CLOSED')) {
        const prodName = l.webinarName || 'No Product';
        pMap[prodName] = (pMap[prodName] || 0) + (l.totalPayment || 0);
      }
    });
    
    let total = 0;
    const sorted = Object.entries(pMap).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([, val]) => { total += val; });
    
    return sorted.slice(0, 4).map(([name, val], i) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      percent: total > 0 ? Math.round((val / total) * 100) : 0,
      colorClass: ['dot-blue', 'dot-purple', 'dot-green', 'dot-pink'][i]
    }));
  }, [leads]);

  // Activities Overview
  const activitiesData = useMemo(() => {
    const counts = { connected: 0, notConnected: 0, untouched: 0 };
    leads.forEach((l) => {
      if (l.callStatus === 'CALL_CONNECTED') counts.connected++;
      else if (l.callStatus === 'CALL_NOT_CONNECTED') counts.notConnected++;
      else counts.untouched++;
    });
    
    return [
      { name: 'Connected Calls', value: counts.connected, color: COLORS.success },
      { name: 'Not Connected', value: counts.notConnected, color: COLORS.danger },
      { name: 'Untouched Leads', value: counts.untouched, color: COLORS.warning }
    ].filter(d => d.value > 0);
  }, [leads]);


  

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹ ${(val/10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹ ${(val/100000).toFixed(2)} L`;
    if (val >= 1000) return `₹ ${(val/1000).toFixed(1)} K`;
    return `₹ ${val}`;
  };

  return (
    <div className="sales-dashboard-container">
      {/* HEADER */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Sales Team Performance Dashboard</h1>
          <p className="dashboard-subtitle">Real-time insights. Smarter decisions. Higher impact. 🚀</p>
        </div>
        <div className="dashboard-actions">
          <DatePicker
            selectsRange={true}
            startDate={filterStartDate || undefined}
            endDate={filterEndDate || undefined}
            onChange={(update) => { setFilterStartDate(update[0]); setFilterEndDate(update[1]); }}
            customInput={<CustomDateInput />}
            dateFormat="MMM d, yyyy"
          />
          <select className="dashboard-filter-btn" value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
            <option value="">Team: All Teams</option>
            <option value="inside">Inside Sales</option>
            <option value="field">Field Sales</option>
          </select>
          <select className="dashboard-filter-btn" value={filterManager} onChange={e => setFilterManager(e.target.value)}>
            <option value="">Manager: All Managers</option>
            <option value="ankit">Ankit Sharma</option>
          </select>
          <button className="sync-btn"><RefreshCw size={16} /></button>
        </div>
      </header>

      {/* TOP ROW: KPIs + Top Performer */}
      <div className="dashboard-top-row">
        <div className="kpi-grid">
          <MetricCard title="Total Revenue" value={formatCurrency(totalRevenue)} trend="18.6%" trendUp={true} icon={DollarSign} colorClass="kpi-blue" gradient={gradientStyle('#0ea5e9', '#3b82f6')} />
          <MetricCard title="Total Deals Won" value={dealsWon} trend="14.2%" trendUp={true} icon={Briefcase} colorClass="kpi-purple" gradient={gradientStyle('#8b5cf6', '#d946ef')} />
          <MetricCard title="Total Leads" value={totalLeads} trend="20.4%" trendUp={true} icon={Users} colorClass="kpi-emerald" gradient={gradientStyle('#10b981', '#059669')} />
          <MetricCard title="Conversion Rate" value={`${conversionRate}%`} trend="3.8%" trendUp={true} icon={Target} colorClass="kpi-green" gradient={gradientStyle('#84cc16', '#22c55e')} />
          <MetricCard title="Avg. Deal Value" value={formatCurrency(Number(avgDealValue))} trend="6.7%" trendUp={true} icon={DollarSign} colorClass="kpi-amber" gradient={gradientStyle('#f59e0b', '#d97706')} />
          <MetricCard title="Sales Cycle (Avg.)" value={salesCycle} trend="-2 Days" trendUp={false} icon={Clock} colorClass="kpi-pink" gradient={gradientStyle('#ec4899', '#be185d')} />
        </div>
        
        <div className="top-performer-card">
          <div className="trophy-container">
            <Trophy size={48} color="#d946ef" className="trophy-glow" />
          </div>
          <div className="performer-title">Top Performer</div>
          <div className="performer-name">{topPerformer.name}</div>
          <div className="performer-stats">Revenue: <b>{topPerformer.revStr}</b></div>
          <div className="performer-stats">Deals Won: <b>{topPerformer.deals}</b></div>
          <button className="leaderboard-btn">View Leaderboard →</button>
        </div>
      </div>

      {/* MIDDLE ROW */}
      <div className="dashboard-middle-row">
        {/* Revenue Trend Area Chart */}
        <div className="chart-card trend-card">
          <h3 className="chart-title">Revenue Trend</h3>
          <div className="chart-legend-top">
            <span className="legend-item"><span className="dot dot-blue"></span> Current Period (Jun-Jul)</span>
            <span className="legend-item"><span className="dot dot-gray"></span> Previous Period (Apr-May)</span>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor='var(--text-muted)' stopOpacity={0.1}/>
                    <stop offset="95%" stopColor='var(--text-muted)' stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke='var(--text-muted)' fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke='var(--text-muted)' fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000} L`} />
                <RechartsTooltip 
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="previous" stroke='var(--text-muted)' fillOpacity={1} fill="url(#colorPrev)" strokeWidth={2} />
                <Area type="monotone" dataKey="current" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorCurrent)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue By Team Donut */}
        <div className="chart-card">
          <h3 className="chart-title">Revenue by Team</h3>
          <div className="donut-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
            <div style={{ width: '60%', height: '200px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center-text" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div className="donut-total" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(totalRevenue)}</div>
                <div className="donut-label" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Total</div>
              </div>
            </div>
            <div className="donut-legend-right small" style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pieData.map((d, i: number) => (
                <div key={i} className="donut-legend-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="dot" style={{ background: d.color, width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 }}></span>
                  <span className="name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem' }}>{d.name}</span>
                  <span className="percent" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{d.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sales Funnel */}
        <div className="chart-card funnel-card">
          <h3 className="chart-title">Sales Funnel</h3>
          <div className="funnel-wrapper">
            {funnelData.map((d, i) => (
              <div key={i} className="funnel-layer-container">
                <div 
                  className="funnel-layer" 
                  style={{ 
                    width: `${Math.max(d.value, 40)}%`, 
                    background: `linear-gradient(90deg, ${COLORS.primary}88, ${COLORS.secondary}88)`,
                    clipPath: i === funnelData.length - 1 ? 'none' : `polygon(0 0, 100% 0, 95% 100%, 5% 100%)`,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={d.name}
                >
                  <span className="funnel-name" style={{ padding: '0 4px', fontSize: '0.7rem' }}>{d.name}</span>
                </div>
                <div className="funnel-label">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Performers */}
        <div className="chart-card performers-card">
          <h3 className="chart-title">Top 5 Performers</h3>
          <div className="performers-list">
            {topPerformers.map((p, i) => (
              <div key={i} className="performer-row">
                <div className="rank-badge">
                  {p.rank <= 3 ? <Trophy size={14} color={p.rank === 1 ? '#fbbf24' : p.rank === 2 ? 'var(--text-muted)' : '#b45309'} /> : p.rank}
                </div>
                <div className="performer-info">
                  <div className="name">{p.name}</div>
                  <div className="stats">{p.revStr} | {p.deals} Deals</div>
                </div>
              </div>
            ))}
          </div>
          <button className="view-all-btn">View All →</button>
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="dashboard-bottom-row">
        {/* Revenue by Product (Mocked with CSS circles) */}
        <div className="chart-card product-card">
          <h3 className="chart-title">Revenue by Product</h3>
          <div className="product-content">
             <div className="concentric-circles">
               {/* Decorative concentric circles to match RadialBarChart look */}
               <div className="circle c1"></div>
               <div className="circle c2"></div>
               <div className="circle c3"></div>
               <div className="circle-center"><Target size={24} color="#0ea5e9" /></div>
             </div>
             <div className="product-legend">
                {productData.map((p, i) => (
                  <div key={i} className="prod-row"><span className={`dot ${p.colorClass}`}></span> {p.name} <span className="val">{p.percent}%</span></div>
                ))}
             </div>
          </div>
        </div>

        {/* Deals Won Over Time */}
        <div className="chart-card">
          <h3 className="chart-title">Deals Won Over Time</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke='var(--text-muted)' fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke='var(--text-muted)' fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: 'var(--card-bg)', border: 'none', borderRadius: '8px' }}
                />
                <Bar dataKey="deals" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="total-deals-overlay">
              <div className="val">{dealsWon}</div>
              <div className="lbl">Total Deals</div>
            </div>
          </div>
        </div>

        {/* Activities Overview */}
        <div className="chart-card">
          <h3 className="chart-title">Activities Overview</h3>
          <div className="donut-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
            <div style={{ width: '55%', height: '200px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={activitiesData} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                    {activitiesData.map((entry, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center-text" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div className="donut-total" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalLeads}</div>
                <div className="donut-label" style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Leads</div>
              </div>
            </div>
            <div className="donut-legend-right small" style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activitiesData.map((d, i: number) => (
                <div key={i} className="donut-legend-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="dot" style={{ background: d.color, width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 }}></span>
                  <span className="name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem' }}>{d.name}</span>
                  <span className="percent" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div className="chart-card insights-card">
          <h3 className="chart-title"><Zap size={16} color="#f59e0b" style={{ display: 'inline', marginRight: '8px' }} /> Key Insights</h3>
          <div className="insights-list">
            <div className="insight-item">
              <div className="icon"><TrendingUp size={14} color="#0ea5e9" /></div>
              <div className="text">Revenue is up by <b>18.6%</b> compared to the previous period.</div>
            </div>
            <div className="insight-item">
              <div className="icon"><CheckCircle2 size={14} color="#10b981" /></div>
              <div className="text">Conversion rate improved by <b>3.8%</b>. Great job team! 🚀</div>
            </div>
            <div className="insight-item">
              <div className="icon"><Users size={14} color="#8b5cf6" /></div>
              <div className="text"><b>Inside Sales</b> is the top performing team this period.</div>
            </div>
            <div className="insight-item">
              <div className="icon"><Target size={14} color="#ec4899" /></div>
              <div className="text"><b>Product A</b> contributes the highest revenue (38%).</div>
            </div>
          </div>
          <button className="view-all-btn">View All Insights →</button>
        </div>
      </div>
      
      {/* QUOTE BANNER */}
      <div className="quote-banner">
        <div>
          &quot;Great sales teams don&apos;t just sell, they solve problems and build relationships.&quot;
        </div>
      </div>
    </div>
  )
}
