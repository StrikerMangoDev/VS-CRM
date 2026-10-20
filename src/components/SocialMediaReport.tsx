'use client'
import type { ContentView,TaskView,AdCreativeView,Person,DashboardUser,DateButtonProps } from '@/lib/view-types';

import React,{ useState,useMemo,useCallback } from 'react';
import {
Download,
User,
FileText,
ArrowUpDown,
X,
CheckSquare,
Square,
Calendar,
CalendarDays,
ChevronLeft,
ChevronRight,
Target
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface SocialMediaReportProps {
  socialMediaData: ContentView[];
  taskData: TaskView[];
  executives: Person[];
  currentUser: DashboardUser;
  adCreativeData?: AdCreativeView[];
}

const CustomDateInput = React.forwardRef<HTMLButtonElement,DateButtonProps>(({ value, onClick }, ref) => (
  <button 
    type="button"
    onClick={onClick} 
    ref={ref} 
    style={{ 
      background: 'var(--table-hover)', 
      border: '1px solid var(--card-border)', 
      padding: '8px 12px', 
      borderRadius: '8px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      color: 'var(--text-primary)', 
      cursor: 'pointer', 
      fontSize: '0.9rem' 
    }}
  >
    <FileText size={14} />
    <span>{value || 'Select Date Range'}</span>
  </button>
));
CustomDateInput.displayName = 'CustomDateInput';

type TabType = 'EDITING' | 'GRAPHICS' | 'POSTING';
type PeriodType = 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

const CHANNELS = [
  'VS Channel',
  'LVS Channel',
  'Malyam Channel',
  'AI Telmate',
  'Vedic Code',
  'Occult Sage'
] as const;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_OPTIONS = [
  { value: 0, label: 'January (Jan)' },
  { value: 1, label: 'February (Feb)' },
  { value: 2, label: 'March (Mar)' },
  { value: 3, label: 'April (Apr)' },
  { value: 4, label: 'May (May)' },
  { value: 5, label: 'June (Jun)' },
  { value: 6, label: 'July (Jul)' },
  { value: 7, label: 'August (Aug)' },
  { value: 8, label: 'September (Sep)' },
  { value: 9, label: 'October (Oct)' },
  { value: 10, label: 'November (Nov)' },
  { value: 11, label: 'December (Dec)' },
];

// Helper: Get Monday of given date (00:00:00.000)
const getMonday = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  // 0 is Sunday -> -6 to get previous Monday, 1 is Monday -> 0
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// Helper: Get Saturday of given Monday (23:59:59.999)
const getSaturday = (monday: Date): Date => {
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);
  return saturday;
};

const formatDateShort = (d: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
};

const getDayStr = (d:string | Date | null | undefined): string | null => {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeChannel = (ch: string | null | undefined): string => {
  if (!ch) return 'VS Channel';
  const lower = ch.toLowerCase().trim();
  if (lower.includes('lvs')) return 'LVS Channel';
  if (lower.includes('malyam')) return 'Malyam Channel';
  if (lower.includes('ai') || lower.includes('telmate')) return 'AI Telmate';
  if (lower.includes('vedic')) return 'Vedic Code';
  if (lower.includes('occult')) return 'Occult Sage';
  if (lower.includes('vs')) return 'VS Channel';
  return ch;
};

const escapeCSV = (val:unknown): string => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export default function SocialMediaReport({ socialMediaData, taskData, adCreativeData = [], executives }: SocialMediaReportProps) {
  const [activeTab, setActiveTab] = useState<TabType>('EDITING');
  const [filterExecutive, setFilterExecutive] = useState('');
  const [sortField, setSortField] = useState('totalContent');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

  // Report Period States (Default to WEEKLY: Mon - Sat)
  const [periodType, setPeriodType] = useState<PeriodType>('WEEKLY');

  // Weekly selector state
  const currentWeekMondayStr = useMemo(() => {
    return getDayStr(getMonday(new Date())) || '';
  }, []);
  const [selectedWeekMonday, setSelectedWeekMonday] = useState<string>(currentWeekMondayStr);

  // Monthly selector state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  // Custom date range state
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedExportTeams, setSelectedExportTeams] = useState<TabType[]>(['EDITING', 'GRAPHICS', 'POSTING']);

  // Today string for overdue checking (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    return getDayStr(new Date()) || '';
  }, []);

  // Generate 16 weeks past, current week, and 2 weeks future for easy selection
  const weekOptions = useMemo(() => {
    const list: { key: string; label: string; isCurrent: boolean; monday: Date; saturday: Date }[] = [];
    const currMon = getMonday(new Date());
    const currKey = getDayStr(currMon);

    for (let i = 2; i >= -16; i--) {
      const mon = new Date(currMon);
      mon.setDate(currMon.getDate() + (i * 7));
      mon.setHours(0, 0, 0, 0);
      const sat = getSaturday(mon);
      const key = getDayStr(mon) || '';
      const isCurrent = key === currKey;
      const label = `Mon ${formatDateShort(mon)} – Sat ${formatDateShort(sat)}, ${sat.getFullYear()}${isCurrent ? ' (Current Week)' : ''}`;
      list.push({ key, label, isCurrent, monday: mon, saturday: sat });
    }
    return list;
  }, []);

  // Shift week by offset (-1 for prev week, +1 for next week)
  const handleShiftWeek = (offset: number) => {
    const currentMon = new Date(selectedWeekMonday + 'T00:00:00');
    currentMon.setDate(currentMon.getDate() + (offset * 7));
    const newMonStr = getDayStr(currentMon);
    if (newMonStr) {
      setSelectedWeekMonday(newMonStr);
    }
  };

  // Compute effective start and end dates and label
  const { effectiveStartDate, effectiveEndDate, periodLabel, periodShortLabel } = useMemo(() => {
    if (periodType === 'WEEKLY') {
      const mon = new Date(selectedWeekMonday + 'T00:00:00');
      const sat = getSaturday(mon);
      return {
        effectiveStartDate: mon,
        effectiveEndDate: sat,
        periodLabel: `Weekly: Mon ${formatDateShort(mon)} – Sat ${formatDateShort(sat)}, ${sat.getFullYear()} (Mon to Sat Count)`,
        periodShortLabel: `Weekly_${selectedWeekMonday}`
      };
    } else if (periodType === 'MONTHLY') {
      const start = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
      const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
      return {
        effectiveStartDate: start,
        effectiveEndDate: end,
        periodLabel: `Monthly: ${MONTH_NAMES[selectedMonth]} ${selectedYear}`,
        periodShortLabel: `Monthly_${MONTH_NAMES[selectedMonth]}_${selectedYear}`
      };
    } else {
      return {
        effectiveStartDate: filterStartDate,
        effectiveEndDate: filterEndDate,
        periodLabel: filterStartDate && filterEndDate 
          ? `Custom: ${formatDateShort(filterStartDate)} – ${formatDateShort(filterEndDate)}, ${filterEndDate.getFullYear()}`
          : 'Custom Range',
        periodShortLabel: 'Custom'
      };
    }
  }, [periodType, selectedWeekMonday, selectedMonth, selectedYear, filterStartDate, filterEndDate]);

  // Compute stats helper for any given team/tab
  const computeStatsForTab = useCallback((tab: TabType, targetExecutiveFilter = '') => {
    const map: Record<string,{ id: string; name: string; department: string; channelCounts: Record<string, number>; target: number; storiesTarget: number; actual: number; variance: number; targetStatus: string; totalContent: number; totalPosts: number; pendingApproval: number; approved: number; scheduled: number; pendingPosts: number; duePosts: number; totalTasks: number; completedTasks: number; pendingTasks: number; adCreativesCount:number; }> = {};
    const isPostingTab = tab === 'POSTING';
    const postingExecs = executives.filter(e => e.department === 'Posting Team' || e.mainDepartment === 'Posting Team');
    
    executives.forEach(exec => {
      const isSM = ['Social Media', 'Editing Team', 'Graphics Team', 'Posting Team'].includes(exec.department) || ['Social Media', 'Editing Team', 'Graphics Team', 'Posting Team'].includes((exec.mainDepartment||''));
      if (!isSM) return;
      
      let matchTab = true;
      if (tab === 'EDITING' && exec.department !== 'Editing Team' && exec.mainDepartment !== 'Editing Team') matchTab = false;
      if (tab === 'GRAPHICS' && exec.department !== 'Graphics Team' && exec.mainDepartment !== 'Graphics Team') matchTab = false;
      if (tab === 'POSTING' && exec.department !== 'Posting Team' && exec.mainDepartment !== 'Posting Team') matchTab = false;

      if (matchTab) {
        const matchExec = !targetExecutiveFilter || targetExecutiveFilter === exec.id;
        if (matchExec) {
          const channelInit: Record<string, number> = {};
          CHANNELS.forEach(ch => { channelInit[ch] = 0; });

          // Extract targets from socialMediaTarget based on periodType
          const targetObj = exec.socialMediaTarget || null;
          let target = 0;
          let storiesTarget = 0;

          if (periodType === 'WEEKLY') {
            if (tab === 'EDITING') target = targetObj?.weeklyVideos || 0;
            else if (tab === 'GRAPHICS') target = targetObj?.weeklyGraphics || 0;
            else if (tab === 'POSTING') {
              target = targetObj?.weeklyPosts || 0;
              storiesTarget = targetObj?.weeklyStories || 0;
            }
          } else if (periodType === 'MONTHLY') {
            if (tab === 'EDITING') target = targetObj?.monthlyVideos || 0;
            else if (tab === 'GRAPHICS') target = targetObj?.monthlyGraphics || 0;
            else if (tab === 'POSTING') {
              target = targetObj?.monthlyPosts || 0;
              storiesTarget = targetObj?.monthlyStories || 0;
            }
          }

          map[exec.id] = {
            id: exec.id,
            name: exec.name,
            department: exec.department,
            channelCounts: channelInit,
            target,
            storiesTarget,
            actual: 0,
            variance: 0,
            targetStatus: 'NO_TARGET',
            totalContent: 0,
            totalPosts: 0,
            pendingApproval: 0,
            approved: 0,
            scheduled: 0,
            pendingPosts: 0,
            duePosts: 0,
            totalTasks: 0,
            completedTasks: 0,
            pendingTasks: 0, adCreativesCount:0
          };
        }
      }
    });

    // Content filtered by date + strict Monday to Saturday rule for Weekly
    const tabFilteredContent = socialMediaData.filter((c) => {
      const dateToUse = (isPostingTab && c.uploadingDate) 
        ? c.uploadingDate 
        : ((isPostingTab && c.postOnDate) ? c.postOnDate : c.createdAt);

      if (!dateToUse) return false;
      const d = new Date(dateToUse);

      // In WEEKLY mode, strictly count Monday to Saturday (exclude Sunday = 0)
      if (periodType === 'WEEKLY' && d.getDay() === 0) {
        return false;
      }

      if (effectiveStartDate) {
        const startCheck = new Date(d);
        startCheck.setHours(0,0,0,0);
        if (startCheck < effectiveStartDate) return false;
      }
      if (effectiveEndDate) {
        const endCheck = new Date(d);
        endCheck.setHours(23,59,59,999);
        if (endCheck > effectiveEndDate) return false;
      }
      return true;
    });

    // Populate Content & Posting Stats
    tabFilteredContent.forEach((c) => {
      const normChannel = normalizeChannel(c.channel);
      const isUploaded = c.uploadingStatus === 'Uploaded' || c.uploadingStatus === 'Published';
      const isScheduled = c.uploadingStatus === 'Scheduled';
      const postDateStr = getDayStr(c.postOnDate);
      const uploadDateStr = getDayStr(c.uploadingDate);

      if (isPostingTab) {
        const targetExecId = c.postedById || c.postedBy?.id || (postingExecs.length === 1 ? postingExecs[0].id : null);

        if (targetExecId && map[targetExecId]) {
          if (isUploaded) {
            map[targetExecId].totalPosts += 1;
            map[targetExecId].totalContent += 1;
            if (map[targetExecId].channelCounts[normChannel] !== undefined) {
              map[targetExecId].channelCounts[normChannel] += 1;
            } else {
              map[targetExecId].channelCounts[normChannel] = 1;
            }

            if (postDateStr && uploadDateStr && uploadDateStr > postDateStr) {
              map[targetExecId].duePosts += 1;
            }
          }

          if (isScheduled) {
            map[targetExecId].scheduled += 1;
          }

          if (c.approvalStatus === 'Approved' && !isUploaded && !isScheduled) {
            if (postDateStr && postDateStr < todayStr) {
              map[targetExecId].pendingPosts += 1;
            }
          }
        }
      } else {
        if (c.editor && map[c.editor.id]) {
          map[c.editor.id].totalContent += 1;
          if (map[c.editor.id].channelCounts[normChannel] !== undefined) {
            map[c.editor.id].channelCounts[normChannel] += 1;
          }
          if (c.approvalStatus === 'Pending') map[c.editor.id].pendingApproval += 1;
          if (c.approvalStatus === 'Approved') map[c.editor.id].approved += 1;
        }
      }
    });

    // Task stats filtered by date + strict Monday to Saturday rule for Weekly
    const tabFilteredTasks = taskData.filter((t) => {
      if (!t.createdAt) return false;
      const d = new Date(t.createdAt);

      if (periodType === 'WEEKLY' && d.getDay() === 0) {
        return false;
      }

      if (effectiveStartDate) {
        const startCheck = new Date(d);
        startCheck.setHours(0,0,0,0);
        if (startCheck < effectiveStartDate) return false;
      }
      if (effectiveEndDate) {
        const endCheck = new Date(d);
        endCheck.setHours(23,59,59,999);
        if (endCheck > effectiveEndDate) return false;
      }
      return true;
    });

    tabFilteredTasks.forEach((t) => {
      if (t.assignedTo && map[t.assignedTo.id]) {
        map[t.assignedTo.id].totalTasks += 1;
        if (t.status === 'Completed') map[t.assignedTo.id].completedTasks += 1;
        if (t.status === 'Pending') map[t.assignedTo.id].pendingTasks += 1;
      }
    });

    // Ad Creatives stats filtered by date + strict Monday to Saturday rule for Weekly
    const tabFilteredAdCreatives = (adCreativeData || []).filter((ac) => {
      if (!ac.createdAt) return false;
      const d = new Date(ac.createdAt);

      if (periodType === 'WEEKLY' && d.getDay() === 0) {
        return false;
      }

      if (effectiveStartDate) {
        const startCheck = new Date(d);
        startCheck.setHours(0,0,0,0);
        if (startCheck < effectiveStartDate) return false;
      }
      if (effectiveEndDate) {
        const endCheck = new Date(d);
        endCheck.setHours(23,59,59,999);
        if (endCheck > effectiveEndDate) return false;
      }
      return true;
    });

    if (!isPostingTab) {
      tabFilteredAdCreatives.forEach((ac) => {
        if (ac.editor && map[ac.editor.id]) {
          map[ac.editor.id].adCreativesCount += 1;
        }
      });
    }

    // Finalize Actual, Variance and Target Status
    Object.values(map).forEach((item) => {
      const actual = isPostingTab ? item.totalPosts : item.totalContent;
      item.actual = actual;
      item.variance = actual - item.target;
      if (item.target > 0) {
        item.targetStatus = actual >= item.target ? 'MET' : 'PENDING';
      } else {
        item.targetStatus = 'NO_TARGET';
      }
    });

    return Object.values(map);
  },[socialMediaData,taskData,adCreativeData,executives,periodType,effectiveStartDate,effectiveEndDate,todayStr]);

  // Stats for currently active tab
  const execStats = useMemo(() => {
    return computeStatsForTab(activeTab, filterExecutive);
  }, [computeStatsForTab,activeTab,filterExecutive]);

  // Sort
  const sortedStats = useMemo(() => {
    return [...execStats].sort((a, b) => {
      const isPosting = activeTab === 'POSTING';
      let valA: string | number;
      let valB: string | number;

      if (CHANNELS.some(channel=>channel===sortField)) {
        valA = a.channelCounts[sortField] || 0;
        valB = b.channelCounts[sortField] || 0;
      } else if (sortField === 'totalContent' || sortField === 'totalPosts') {
        valA = isPosting ? a.totalPosts : a.totalContent;
        valB = isPosting ? b.totalPosts : b.totalContent;
      } else if (sortField === 'target') {
        valA = a.target || 0;
        valB = b.target || 0;
      } else {
        valA = a[sortField as Exclude<keyof typeof a,'channelCounts'>];
        valB = b[sortField as Exclude<keyof typeof b,'channelCounts'>];
      }
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [execStats, sortField, sortDir, activeTab]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const isPostingTab = activeTab === 'POSTING';
  const totalColumnLabel = isPostingTab ? 'TOTAL POST' : 'TOTAL CONTENT';
  const targetColumnHeader = periodType === 'WEEKLY' ? 'WEEKLY TARGET' : (periodType === 'MONTHLY' ? 'MONTHLY TARGET' : 'TARGET');

  // Multi-Team CSV Export Generator
  const handleExecuteExport = () => {
    if (selectedExportTeams.length === 0) return;

    const sections: string[] = [];
    const teamOrder: TabType[] = ['EDITING', 'GRAPHICS', 'POSTING'];
    const teamsToExport = teamOrder.filter(t => selectedExportTeams.includes(t));

    teamsToExport.forEach((tab) => {
      const stats = computeStatsForTab(tab);
      const isPosting = tab === 'POSTING';
      const teamTitle = tab === 'EDITING' 
        ? 'EDITING TEAM PERFORMANCE REPORT' 
        : tab === 'GRAPHICS' 
          ? 'GRAPHICS TEAM PERFORMANCE REPORT' 
          : 'POSTING TEAM PERFORMANCE REPORT';

      const sectionRows: string[][] = [];
      sectionRows.push([teamTitle]);
      sectionRows.push([`Period: ${periodLabel} ${periodType === 'WEEKLY' ? '[Count: Monday to Saturday, Sunday Excluded]' : ''}`]);
      sectionRows.push([`Generated On: ${new Date().toLocaleString()}`]);
      sectionRows.push([]); // blank row

      const exportTargetHeader = periodType === 'WEEKLY' 
        ? 'Weekly Target' 
        : (periodType === 'MONTHLY' ? 'Monthly Target' : 'Target');

      if (isPosting) {
        sectionRows.push([
          'Name',
          'Department',
          ...CHANNELS,
          'Total Post',
          ...(periodType !== 'CUSTOM' ? [exportTargetHeader, 'Target Status'] : []),
          'Scheduled',
          'Pending to Post',
          'Due Post'
        ]);

        stats.forEach(s => {
          const statusText = s.target > 0 
            ? (s.actual >= s.target ? `Target Met (${s.actual}/${s.target})` : `${s.target - s.actual} Pending (${s.actual}/${s.target})`)
            : 'No Target Set';

          sectionRows.push([
            s.name,
            s.department,
            ...CHANNELS.map(ch => String(s.channelCounts[ch] || 0)),
            String(s.totalPosts || 0),
            ...(periodType !== 'CUSTOM' ? [String(s.target || 0), statusText] : []),
            String(s.scheduled || 0),
            String(s.pendingPosts || 0),
            String(s.duePosts || 0)
          ]);
        });

        // Totals
        const tabTotals = stats.reduce((acc, curr) => {
          CHANNELS.forEach(ch => {
            acc.channelCounts[ch] = (acc.channelCounts[ch] || 0) + (curr.channelCounts[ch] || 0);
          });
          acc.target += curr.target || 0;
          acc.totalPosts += curr.totalPosts || 0;
          acc.scheduled += curr.scheduled || 0;
          acc.pendingPosts += curr.pendingPosts || 0;
          acc.duePosts += curr.duePosts || 0;
          return acc;
        }, {
          channelCounts: CHANNELS.reduce((a, ch) => ({ ...a, [ch]: 0 }), {} as Record<string, number>),
          target: 0,
          totalPosts: 0,
          scheduled: 0,
          pendingPosts: 0,
          duePosts: 0
        });

        const totalStatusText = tabTotals.target > 0
          ? (tabTotals.totalPosts >= tabTotals.target ? `Target Met (${tabTotals.totalPosts}/${tabTotals.target})` : `${tabTotals.target - tabTotals.totalPosts} Pending (${tabTotals.totalPosts}/${tabTotals.target})`)
          : '-';

        sectionRows.push([
          'TOTAL',
          '',
          ...CHANNELS.map(ch => String(tabTotals.channelCounts[ch] || 0)),
          String(tabTotals.totalPosts),
          ...(periodType !== 'CUSTOM' ? [String(tabTotals.target), totalStatusText] : []),
          String(tabTotals.scheduled),
          String(tabTotals.pendingPosts),
          String(tabTotals.duePosts)
        ]);
      } else {
        sectionRows.push([
          'Name',
          'Department',
          ...CHANNELS,
          'Total Content',
          ...(periodType !== 'CUSTOM' ? [exportTargetHeader, 'Target Status'] : []),
          'Ad Creatives',
          'Pending Approval',
          'Approved',
          'Assigned Tasks',
          'Tasks Completed',
          'Tasks Pending'
        ]);

        stats.forEach(s => {
          const statusText = s.target > 0 
            ? (s.actual >= s.target ? `Target Met (${s.actual}/${s.target})` : `${s.target - s.actual} Pending (${s.actual}/${s.target})`)
            : 'No Target Set';

          sectionRows.push([
            s.name,
            s.department,
            ...CHANNELS.map(ch => String(s.channelCounts[ch] || 0)),
            String(s.totalContent || 0),
            ...(periodType !== 'CUSTOM' ? [String(s.target || 0), statusText] : []),
            String(s.adCreativesCount || 0),
            String(s.pendingApproval || 0),
            String(s.approved || 0),
            String(s.totalTasks || 0),
            String(s.completedTasks || 0),
            String(s.pendingTasks || 0)
          ]);
        });

        // Totals
        const tabTotals = stats.reduce((acc, curr) => {
          CHANNELS.forEach(ch => {
            acc.channelCounts[ch] = (acc.channelCounts[ch] || 0) + (curr.channelCounts[ch] || 0);
          });
          acc.target += curr.target || 0;
          acc.totalContent += curr.totalContent || 0;
          acc.pendingApproval += curr.pendingApproval || 0;
          acc.approved += curr.approved || 0;
          acc.totalTasks += curr.totalTasks || 0;
          acc.completedTasks += curr.completedTasks || 0;
          acc.pendingTasks += curr.pendingTasks || 0;
          acc.adCreativesCount += curr.adCreativesCount || 0;
          return acc;
        }, {
          channelCounts: CHANNELS.reduce((a, ch) => ({ ...a, [ch]: 0 }), {} as Record<string, number>),
          target: 0,
          totalContent: 0,
          pendingApproval: 0,
          approved: 0,
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          adCreativesCount: 0
        });

        const totalStatusText = tabTotals.target > 0
          ? (tabTotals.totalContent >= tabTotals.target ? `Target Met (${tabTotals.totalContent}/${tabTotals.target})` : `${tabTotals.target - tabTotals.totalContent} Pending (${tabTotals.totalContent}/${tabTotals.target})`)
          : '-';

        sectionRows.push([
          'TOTAL',
          '',
          ...CHANNELS.map(ch => String(tabTotals.channelCounts[ch] || 0)),
          String(tabTotals.totalContent),
          ...(periodType !== 'CUSTOM' ? [String(tabTotals.target), totalStatusText] : []),
          String(tabTotals.adCreativesCount || 0),
          String(tabTotals.pendingApproval),
          String(tabTotals.approved),
          String(tabTotals.totalTasks),
          String(tabTotals.completedTasks),
          String(tabTotals.pendingTasks)
        ]);
      }

      const csvSection = sectionRows.map(row => row.map(cell => escapeCSV(cell)).join(',')).join('\n');
      sections.push(csvSection);
    });

    // 2 blank rows between reports
    const fullCSV = sections.join('\n\n\n');

    const blob = new Blob([fullCSV], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `SocialMedia_Report_${periodShortLabel}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setIsExportModalOpen(false);
  };

  const toggleExportTeam = (team: TabType) => {
    if (selectedExportTeams.includes(team)) {
      setSelectedExportTeams(selectedExportTeams.filter(t => t !== team));
    } else {
      setSelectedExportTeams([...selectedExportTeams, team]);
    }
  };

  // Grand Totals for currently active tab
  const totals = sortedStats.reduce((acc, curr) => {
    CHANNELS.forEach(ch => {
      acc.channelCounts[ch] = (acc.channelCounts[ch] || 0) + (curr.channelCounts[ch] || 0);
    });
    acc.target += curr.target || 0;
    acc.actual += curr.actual || 0;
    acc.totalContent += curr.totalContent;
    acc.totalPosts += curr.totalPosts;
    acc.pendingApproval += curr.pendingApproval;
    acc.approved += curr.approved;
    acc.scheduled += curr.scheduled;
    acc.pendingPosts += curr.pendingPosts;
    acc.duePosts += curr.duePosts;
    acc.totalTasks += curr.totalTasks;
    acc.completedTasks += curr.completedTasks;
    acc.pendingTasks += curr.pendingTasks;
    acc.adCreativesCount += curr.adCreativesCount || 0;
    return acc;
  }, {
    channelCounts: CHANNELS.reduce((a, ch) => ({ ...a, [ch]: 0 }), {} as Record<string, number>),
    target: 0,
    actual: 0,
    totalContent: 0,
    totalPosts: 0,
    pendingApproval: 0,
    approved: 0,
    scheduled: 0,
    pendingPosts: 0,
    duePosts: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    adCreativesCount: 0
  });

  const thStyle = { 
    padding: '14px 12px', 
    textAlign: 'left' as const, 
    fontSize: '0.75rem', 
    fontWeight: 700, 
    color: 'var(--text-muted)', 
    textTransform: 'uppercase' as const, 
    cursor: 'pointer', 
    userSelect: 'none' as const, 
    whiteSpace: 'nowrap' as const 
  };
  const tdStyle = { 
    padding: '14px 12px', 
    fontSize: '0.9rem', 
    color: 'var(--text-primary)', 
    borderBottom: '1px solid var(--card-border)', 
    whiteSpace: 'nowrap' as const 
  };

  return (
    <div style={{ background: 'var(--table-header-bg)', borderRadius: '12px', border: '1px solid var(--card-border)', overflow: 'hidden' }}>
      
      {/* Team Tabs */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 24px', borderBottom: '1px solid var(--card-border)' }}>
        {(['EDITING', 'GRAPHICS', 'POSTING'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setFilterExecutive('');
              setSortField(tab === 'POSTING' ? 'totalPosts' : 'totalContent');
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
            {tab.charAt(0) + tab.slice(1).toLowerCase() + ' Team'}
          </button>
        ))}
      </div>

      {/* Main Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
              {isPostingTab ? 'Posting Team Performance Report' : `${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} Team Performance Report`}
            </h2>
            <span style={{ 
              background: 'rgba(59, 130, 246, 0.15)', 
              color: 'var(--primary)', 
              fontSize: '0.78rem', 
              fontWeight: 600, 
              padding: '3px 10px', 
              borderRadius: '20px', 
              border: '1px solid rgba(59, 130, 246, 0.3)' 
            }}>
              {periodLabel}
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {isPostingTab 
              ? 'Channel-wise posts published, scheduled, pending, due posts and target progress' 
              : `Comprehensive performance report and target tracking for social media ${activeTab.toLowerCase()} team`}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Executive Filter */}
          <div style={{ position: 'relative' }}>
            <select 
              value={filterExecutive} 
              onChange={(e) => setFilterExecutive(e.target.value)}
              style={{ appearance: 'none', background: 'var(--table-hover)', border: '1px solid var(--card-border)', padding: '8px 36px 8px 16px', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.9rem', outline: 'none' }}
            >
              <option value="">All Editors & Creators</option>
              {executives
                .filter(e => {
                  const isSM = ['Social Media', 'Editing Team', 'Graphics Team', 'Posting Team'].includes(e.department) || ['Social Media', 'Editing Team', 'Graphics Team', 'Posting Team'].includes((e.mainDepartment||''));
                  if (!isSM) return false;
                  if (activeTab === 'EDITING' && e.department !== 'Editing Team' && e.mainDepartment !== 'Editing Team') return false;
                  if (activeTab === 'GRAPHICS' && e.department !== 'Graphics Team' && e.mainDepartment !== 'Graphics Team') return false;
                  if (activeTab === 'POSTING' && e.department !== 'Posting Team' && e.mainDepartment !== 'Posting Team') return false;
                  return true;
                })
                .map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <User size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          </div>

          {/* Export CSV Button */}
          <button 
            onClick={() => setIsExportModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', border: 'none', padding: '8px 18px', borderRadius: '8px', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
            onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Period Selection Control Bar */}
      <div style={{ padding: '14px 24px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        
        {/* Period Mode Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Report Frequency:
          </span>
          <div style={{ display: 'inline-flex', background: 'var(--table-hover)', borderRadius: '8px', padding: '3px', border: '1px solid var(--card-border)' }}>
            <button
              type="button"
              onClick={() => setPeriodType('WEEKLY')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: periodType === 'WEEKLY' ? '#3b82f6' : 'transparent',
                color: periodType === 'WEEKLY' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: periodType === 'WEEKLY' ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Calendar size={14} /> Weekly (Mon - Sat)
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('MONTHLY')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: periodType === 'MONTHLY' ? '#3b82f6' : 'transparent',
                color: periodType === 'MONTHLY' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: periodType === 'MONTHLY' ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <CalendarDays size={14} /> Monthly (Jan - Dec)
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('CUSTOM')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: periodType === 'CUSTOM' ? '#3b82f6' : 'transparent',
                color: periodType === 'CUSTOM' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: periodType === 'CUSTOM' ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <FileText size={14} /> Custom Range
            </button>
          </div>
        </div>

        {/* Dynamic Period Inputs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Weekly Navigation & Dropdown */}
          {periodType === 'WEEKLY' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleShiftWeek(-1)}
                title="Previous Week"
                style={{
                  background: 'var(--table-hover)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  padding: '7px 9px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <select
                value={selectedWeekMonday}
                onChange={(e) => setSelectedWeekMonday(e.target.value)}
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {weekOptions.map(w => (
                  <option key={w.key} value={w.key} style={{ background: 'var(--table-header-bg)', color: 'var(--text-primary)' }}>
                    {w.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleShiftWeek(1)}
                title="Next Week"
                style={{
                  background: 'var(--table-hover)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  padding: '7px 9px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronRight size={16} />
              </button>

              {selectedWeekMonday !== currentWeekMondayStr && (
                <button
                  type="button"
                  onClick={() => setSelectedWeekMonday(currentWeekMondayStr)}
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '6px',
                    color: 'var(--primary)',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  This Week
                </button>
              )}

              <span style={{ 
                fontSize: '0.74rem', 
                color: 'var(--success)', 
                background: 'rgba(16, 185, 129, 0.12)', 
                padding: '4px 10px', 
                borderRadius: '6px', 
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontWeight: 600
              }}>
                Mon – Sat Count (Sun Excluded)
              </span>
            </div>
          )}

          {/* Monthly Month & Year Dropdowns */}
          {periodType === 'MONTHLY' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {MONTH_OPTIONS.map(m => (
                  <option key={m.value} value={m.value} style={{ background: 'var(--table-header-bg)', color: 'var(--text-primary)' }}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  padding: '7px 12px',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y} style={{ background: 'var(--table-header-bg)', color: 'var(--text-primary)' }}>
                    {y}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  const n = new Date();
                  setSelectedMonth(n.getMonth());
                  setSelectedYear(n.getFullYear());
                }}
                style={{
                  background: (selectedMonth === now.getMonth() && selectedYear === now.getFullYear()) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  color: (selectedMonth === now.getMonth() && selectedYear === now.getFullYear()) ? '#60a5fa' : 'var(--text-muted)',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                This Month
              </button>

              <button
                type="button"
                onClick={() => {
                  const n = new Date();
                  n.setMonth(n.getMonth() - 1);
                  setSelectedMonth(n.getMonth());
                  setSelectedYear(n.getFullYear());
                }}
                style={{
                  background: 'var(--table-hover)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '6px',
                  color: 'var(--text-muted)',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Last Month
              </button>
            </div>
          )}

          {/* Custom Date Range Picker */}
          {periodType === 'CUSTOM' && (
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
              placeholderText="Select Date Range"
              dateFormat="MMM d, yyyy"
              isClearable={true}
            />
          )}

        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1300px' }}>
          <thead style={{ background: 'rgba(0,0,0,0.25)' }}>
            <tr>
              <th style={thStyle} onClick={() => handleSort('name')}>
                Name {sortField === 'name' && <ArrowUpDown size={12} style={{marginLeft:'4px'}}/>}
              </th>

              {/* Channel Columns */}
              {CHANNELS.map(ch => (
                <th key={ch} style={{...thStyle, textAlign: 'center'}} onClick={() => handleSort(ch)}>
                  {ch} {sortField === ch && <ArrowUpDown size={12} style={{marginLeft:'4px'}}/>}
                </th>
              ))}

              {/* Total Content / Total Post Column */}
              <th 
                style={{...thStyle, textAlign: 'center', color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.08)'}} 
                onClick={() => handleSort(isPostingTab ? 'totalPosts' : 'totalContent')}
              >
                {totalColumnLabel} {(sortField === 'totalContent' || sortField === 'totalPosts') && <ArrowUpDown size={12} style={{marginLeft:'4px'}}/>}
              </th>

              {/* Target Columns (shown in Weekly and Monthly modes) */}
              {periodType !== 'CUSTOM' && (
                <>
                  <th 
                    style={{...thStyle, textAlign: 'center', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.06)'}} 
                    onClick={() => handleSort('target')}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Target size={13} /> {targetColumnHeader}
                    </span>
                    {sortField === 'target' && <ArrowUpDown size={12} style={{marginLeft:'4px'}}/>}
                  </th>

                  <th style={{...thStyle, textAlign: 'center', background: 'rgba(245, 158, 11, 0.04)'}}>
                    TARGET STATUS
                  </th>
                </>
              )}

              {!isPostingTab && (
                <th style={{...thStyle, textAlign: 'center', color: '#3b82f6'}} onClick={() => handleSort('adCreativesCount')}>
                  Ad Creatives {sortField === 'adCreativesCount' && <ArrowUpDown size={12} style={{marginLeft:'4px'}}/>}
                </th>
              )}

              {isPostingTab ? (
                <>
                  <th style={{...thStyle, textAlign: 'center'}} onClick={() => handleSort('scheduled')}>
                    Scheduled {sortField === 'scheduled' && <ArrowUpDown size={12} style={{marginLeft:'4px'}}/>}
                  </th>
                  <th style={{...thStyle, textAlign: 'center'}} onClick={() => handleSort('pendingPosts')}>
                    Pending to Post {sortField === 'pendingPosts' && <ArrowUpDown size={12} style={{marginLeft:'4px'}}/>}
                  </th>
                  <th style={{...thStyle, textAlign: 'center', color: 'var(--danger)'}} onClick={() => handleSort('duePosts')}>
                    Due Post {sortField === 'duePosts' && <ArrowUpDown size={12} style={{marginLeft:'4px'}}/>}
                  </th>
                </>
              ) : (
                <>
                  <th style={{...thStyle, textAlign: 'center'}} onClick={() => handleSort('pendingApproval')}>
                    Pending Approval {sortField === 'pendingApproval' && <ArrowUpDown size={12} style={{marginLeft:'4px'}}/>}
                  </th>
                  <th style={{...thStyle, textAlign: 'center'}} onClick={() => handleSort('approved')}>
                    Approved {sortField === 'approved' && <ArrowUpDown size={12} style={{marginLeft:'4px'}}/>}
                  </th>
                </>
              )}

              {!isPostingTab && (
                <>
                  <th style={{...thStyle, textAlign: 'center'}} onClick={() => handleSort('totalTasks')}>
                    Assigned Tasks {sortField === 'totalTasks' && <ArrowUpDown size={12} style={{marginLeft:'4px'}}/>}
                  </th>

                  <th style={{...thStyle, textAlign: 'center'}} onClick={() => handleSort('completedTasks')}>
                    Tasks Completed {sortField === 'completedTasks' && <ArrowUpDown size={12} style={{marginLeft:'4px'}}/>}
                  </th>

                  <th style={{...thStyle, textAlign: 'center', color: 'var(--primary)'}} onClick={() => handleSort('pendingTasks')}>
                    Tasks Pending {sortField === 'pendingTasks' && <ArrowUpDown size={12} style={{marginLeft:'4px'}}/>}
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((stat, i) => (
              <tr key={i} style={{ transition: 'background 0.2s', cursor: 'default' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>
                  {stat.name}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{stat.department}</div>
                </td>

                {/* Channel-wise Counts */}
                {CHANNELS.map(ch => (
                  <td key={ch} style={{ ...tdStyle, textAlign: 'center' }}>
                    {stat.channelCounts[ch] || 0}
                  </td>
                ))}

                {/* Total Content / Total Post */}
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.05)' }}>
                  {isPostingTab ? stat.totalPosts : stat.totalContent}
                </td>

                {/* Target Column */}
                {periodType !== 'CUSTOM' && (
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: stat.target > 0 ? '#fbbf24' : 'var(--text-muted)', background: 'rgba(245, 158, 11, 0.03)' }}>
                    {stat.target > 0 ? stat.target : '-'}
                  </td>
                )}

                {/* Target Status Column */}
                {periodType !== 'CUSTOM' && (
                  <td style={{ ...tdStyle, textAlign: 'center', background: 'rgba(245, 158, 11, 0.02)' }}>
                    {stat.target === 0 ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No Target Set</span>
                    ) : stat.targetStatus === 'MET' ? (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        background: 'rgba(16, 185, 129, 0.15)', 
                        color: 'var(--success)', 
                        border: '1px solid rgba(16, 185, 129, 0.3)', 
                        padding: '3px 9px', 
                        borderRadius: '12px', 
                        fontSize: '0.76rem', 
                        fontWeight: 600 
                      }}>
                        ✓ Met ({stat.actual}/{stat.target})
                      </span>
                    ) : (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        background: 'rgba(245, 158, 11, 0.15)', 
                        color: 'var(--warning)', 
                        border: '1px solid rgba(245, 158, 11, 0.3)', 
                        padding: '3px 9px', 
                        borderRadius: '12px', 
                        fontSize: '0.76rem', 
                        fontWeight: 600 
                      }}>
                        {stat.target - stat.actual} to go ({stat.actual}/{stat.target})
                      </span>
                    )}
                  </td>
                )}

                {!isPostingTab && (
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#3b82f6', fontWeight: stat.adCreativesCount > 0 ? 600 : 400 }}>
                    {stat.adCreativesCount || 0}
                  </td>
                )}

                {isPostingTab ? (
                  <>
                    <td style={{ ...tdStyle, textAlign: 'center', color: stat.scheduled > 0 ? '#3b82f6' : 'inherit' }}>
                      {stat.scheduled}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: stat.pendingPosts > 0 ? '#f59e0b' : 'inherit', fontWeight: stat.pendingPosts > 0 ? 600 : 400 }}>
                      {stat.pendingPosts}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: stat.duePosts > 0 ? '#ef4444' : 'inherit', fontWeight: stat.duePosts > 0 ? 600 : 400 }}>
                      {stat.duePosts}
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ ...tdStyle, textAlign: 'center', color: stat.pendingApproval > 0 ? '#f59e0b' : 'inherit' }}>
                      {stat.pendingApproval}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: stat.approved > 0 ? '#10b981' : 'inherit' }}>
                      {stat.approved}
                    </td>
                  </>
                )}

                {!isPostingTab && (
                  <>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {stat.totalTasks}
                    </td>

                    <td style={{ ...tdStyle, textAlign: 'center', color: stat.completedTasks > 0 ? '#10b981' : 'inherit' }}>
                      {stat.completedTasks}
                    </td>

                    <td style={{ ...tdStyle, textAlign: 'center', color: stat.pendingTasks > 0 ? '#ef4444' : 'inherit', fontWeight: 600 }}>
                      {stat.pendingTasks}
                    </td>
                  </>
                )}
              </tr>
            ))}

            {sortedStats.length === 0 && (
              <tr>
                <td colSpan={periodType !== 'CUSTOM' ? (isPostingTab ? 13 : 15) : (isPostingTab ? 11 : 13)} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No performance data found for the selected period.
                </td>
              </tr>
            )}
            
            {/* Grand Total Row */}
            {sortedStats.length > 0 && (
              <tr style={{ background: 'rgba(59, 130, 246, 0.1)', borderTop: '2px solid rgba(59, 130, 246, 0.3)' }}>
                <td style={{ ...tdStyle, fontWeight: 800, color: 'var(--text-primary)' }}>TOTAL</td>

                {CHANNELS.map(ch => (
                  <td key={ch} style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                    {totals.channelCounts[ch] || 0}
                  </td>
                ))}

                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800, color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.15)' }}>
                  {isPostingTab ? totals.totalPosts : totals.totalContent}
                </td>

                {/* Target Column in Total */}
                {periodType !== 'CUSTOM' && (
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800, color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.08)' }}>
                    {totals.target > 0 ? totals.target : '-'}
                  </td>
                )}

                {/* Target Status in Total */}
                {periodType !== 'CUSTOM' && (
                  <td style={{ ...tdStyle, textAlign: 'center', background: 'rgba(245, 158, 11, 0.06)' }}>
                    {totals.target === 0 ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                    ) : totals.actual >= totals.target ? (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        background: 'rgba(16, 185, 129, 0.2)', 
                        color: 'var(--success)', 
                        border: '1px solid rgba(16, 185, 129, 0.4)', 
                        padding: '3px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.78rem', 
                        fontWeight: 700 
                      }}>
                        ✓ Target Met ({totals.actual}/{totals.target})
                      </span>
                    ) : (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        background: 'rgba(245, 158, 11, 0.2)', 
                        color: 'var(--warning)', 
                        border: '1px solid rgba(245, 158, 11, 0.4)', 
                        padding: '3px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.78rem', 
                        fontWeight: 700 
                      }}>
                        {totals.target - totals.actual} Pending ({totals.actual}/{totals.target})
                      </span>
                    )}
                  </td>
                )}

                {!isPostingTab && (
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.05)' }}>
                    {totals.adCreativesCount || 0}
                  </td>
                )}

                {isPostingTab ? (
                  <>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: totals.scheduled > 0 ? '#3b82f6' : 'inherit' }}>
                      {totals.scheduled}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: totals.pendingPosts > 0 ? '#f59e0b' : 'inherit' }}>
                      {totals.pendingPosts}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: totals.duePosts > 0 ? '#ef4444' : 'inherit' }}>
                      {totals.duePosts}
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: totals.pendingApproval > 0 ? '#f59e0b' : 'inherit' }}>
                      {totals.pendingApproval}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: totals.approved > 0 ? '#10b981' : 'inherit' }}>
                      {totals.approved}
                    </td>
                  </>
                )}

                {!isPostingTab && (
                  <>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                      {totals.totalTasks}
                    </td>

                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: totals.completedTasks > 0 ? '#10b981' : 'inherit' }}>
                      {totals.completedTasks}
                    </td>

                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800, color: 'var(--primary)' }}>
                      {totals.pendingTasks}
                    </td>
                  </>
                )}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Export Selection Modal */}
      {isExportModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setIsExportModalOpen(false)}
        >
          <div 
            style={{
              background: 'var(--table-header-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '16px',
              padding: '28px',
              width: '90%',
              maxWidth: '500px',
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
                <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>
                  Export CSV Report
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Download comprehensive performance & target report
                </p>
              </div>
              <button 
                onClick={() => setIsExportModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Active Period & Target Notification Card */}
            <div style={{ 
              background: 'rgba(59, 130, 246, 0.08)', 
              border: '1px solid rgba(59, 130, 246, 0.25)', 
              borderRadius: '10px', 
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '0.88rem', fontWeight: 700 }}>
                <Calendar size={15} /> {periodLabel}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', fontSize: '0.8rem', fontWeight: 600 }}>
                <Target size={14} /> {periodType === 'WEEKLY' ? 'Weekly Target & Status included in CSV (Mon-Sat count)' : periodType === 'MONTHLY' ? 'Monthly Target & Status included in CSV' : 'Custom range data included in CSV'}
              </div>
            </div>

            {/* Select All Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Teams to Include</span>
              <button
                type="button"
                onClick={() => {
                  if (selectedExportTeams.length === 3) {
                    setSelectedExportTeams([]);
                  } else {
                    setSelectedExportTeams(['EDITING', 'GRAPHICS', 'POSTING']);
                  }
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                {selectedExportTeams.length === 3 ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Checkbox Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { id: 'EDITING' as TabType, label: 'Editing Team', desc: 'Video targets, channel metrics & task performance' },
                { id: 'GRAPHICS' as TabType, label: 'Graphics Team', desc: 'Graphics targets, creative approvals & task metrics' },
                { id: 'POSTING' as TabType, label: 'Posting Team', desc: 'Posting targets, scheduled, pending & due posts' },
              ].map(item => {
                const isSelected = selectedExportTeams.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleExportTeam(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ color: isSelected ? '#3b82f6' : 'var(--text-muted)' }}>
                      {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600 }}>{item.label}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Note */}
            <div style={{ background: 'var(--table-hover)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--card-border)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              💡 Multiple teams select karne par CSV me sabhi teams ka data target aur target status ke sath clearly format hokar separate sections me aayega.
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                style={{
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--card-border)',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedExportTeams.length === 0}
                onClick={handleExecuteExport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: selectedExportTeams.length === 0 ? '#475569' : '#3b82f6',
                  color: 'var(--text-primary)',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: selectedExportTeams.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedExportTeams.length === 0 ? 0.6 : 1,
                  transition: 'background 0.2s'
                }}
              >
                <Download size={16} /> Download CSV
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
