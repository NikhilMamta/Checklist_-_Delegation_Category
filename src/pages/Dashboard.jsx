import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Users,
  Building,
  Filter,
  RotateCcw,
  Plus,
  ChevronDown,
  ChevronUp,
  Inbox,
  ArrowRight,
  TrendingUp,
  UserCheck,
  ClipboardList,
  Search,
  Eye,
  ExternalLink,
  X,
  Tag,
  Check,
  FileText,
  ArrowLeft,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isOverdue, getEffectiveStatus } from '../services/taskService';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge, PriorityBadge, TaskTypeBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { DashboardAnalyticsCharts } from '../components/dashboard/DashboardAnalyticsCharts';

const GROUP_ACCENTS = [
  {
    border: 'border-blue-200/80',
    headerBg: 'from-blue-50/80 to-white',
    iconBg: 'bg-blue-600 text-white',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  {
    border: 'border-emerald-200/80',
    headerBg: 'from-emerald-50/80 to-white',
    iconBg: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  {
    border: 'border-purple-200/80',
    headerBg: 'from-purple-50/80 to-white',
    iconBg: 'bg-purple-600 text-white',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
  {
    border: 'border-amber-200/80',
    headerBg: 'from-amber-50/80 to-white',
    iconBg: 'bg-amber-600 text-white',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  {
    border: 'border-cyan-200/80',
    headerBg: 'from-cyan-50/80 to-white',
    iconBg: 'bg-cyan-600 text-white',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    dot: 'bg-cyan-500',
  },
  {
    border: 'border-rose-200/80',
    headerBg: 'from-rose-50/80 to-white',
    iconBg: 'bg-rose-600 text-white',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
];

export const Dashboard = () => {
  const {
    departments,
    groups,
    subgroups,
    users,
    tasks,
    taskInstances,
    currentUser,
    portalMode,
    canCurrentUserSelfAssign,
  } = useApp();

  // Selected KPI metric filter in Admin Dashboard: 'ALL' | 'pending' | 'inProgress' | 'completed' | 'overdue' | 'today'
  const [selectedKpi, setSelectedKpi] = useState('ALL');

  // Selected KPI filter in User Portal Dashboard: 'ALL' | 'pending' | 'overdue' | 'completed'
  const [userKpiFilter, setUserKpiFilter] = useState('ALL');

  // Popup modal state for clicking KPI metric cards
  const [kpiPopupOpen, setKpiPopupOpen] = useState(false);

  // Search and sort for dashboard tasks table
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskSortBy, setTaskSortBy] = useState('dueDateAsc');

  // Task detail modal state
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);

  // Filters State
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [filterSubgroup, setFilterSubgroup] = useState('ALL');
  const [filterUser, setFilterUser] = useState('ALL');
  const [filterTaskType, setFilterTaskType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Group summary display layout mode: 'columns' | 'list'
  const [groupViewMode, setGroupViewMode] = useState('columns');

  // Expandable group summary accordion state (for list view)
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroupExpand = (groupId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Subgroups available for currently selected filterGroup
  const availableFilterSubgroups = useMemo(() => {
    if (filterGroup === 'ALL') return subgroups;
    return subgroups.filter((sg) => sg.groupId === filterGroup);
  }, [subgroups, filterGroup]);

  // Users available for currently selected filterGroup and Subgroup
  const availableFilterUsers = useMemo(() => {
    return users.filter((u) => {
      const matchGroup = filterGroup === 'ALL' || u.groupId === filterGroup;
      const matchSubgroup = filterSubgroup === 'ALL' || u.subgroupId === filterSubgroup;
      return matchGroup && matchSubgroup;
    });
  }, [users, filterGroup, filterSubgroup]);

  // Reset filters
  const handleResetFilters = () => {
    setFilterGroup('ALL');
    setFilterSubgroup('ALL');
    setFilterUser('ALL');
    setFilterTaskType('ALL');
    setFilterStatus('ALL');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const hasActiveFilters =
    filterGroup !== 'ALL' ||
    filterSubgroup !== 'ALL' ||
    filterUser !== 'ALL' ||
    filterTaskType !== 'ALL' ||
    filterStatus !== 'ALL' ||
    filterStartDate !== '' ||
    filterEndDate !== '';

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtered Task Instances based on active filters
  const filteredInstances = useMemo(() => {
    return taskInstances.filter((instance) => {
      const effectiveStatus = getEffectiveStatus(instance);

      // Group
      if (filterGroup !== 'ALL' && instance.groupId !== filterGroup) return false;

      // Subgroup
      if (filterSubgroup !== 'ALL' && instance.subgroupId !== filterSubgroup) return false;

      // User
      if (filterUser !== 'ALL' && instance.userId !== filterUser) return false;

      // Task Type
      if (filterTaskType !== 'ALL' && instance.taskType !== filterTaskType) return false;

      // Status
      if (filterStatus !== 'ALL') {
        if (filterStatus === 'Overdue' && effectiveStatus !== 'Overdue') return false;
        if (filterStatus !== 'Overdue' && effectiveStatus !== filterStatus) return false;
      }

      // Date Range
      if (filterStartDate && instance.dueDate < filterStartDate) return false;
      if (filterEndDate && instance.dueDate > filterEndDate) return false;

      return true;
    });
  }, [
    taskInstances,
    filterGroup,
    filterSubgroup,
    filterUser,
    filterTaskType,
    filterStatus,
    filterStartDate,
    filterEndDate,
  ]);

  // KPI Metrics calculated dynamically from filtered data
  const metrics = useMemo(() => {
    const total = filteredInstances.length;
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;
    let today = 0;

    filteredInstances.forEach((i) => {
      const eff = getEffectiveStatus(i);
      if (eff === 'Pending') pending++;
      else if (eff === 'In Progress') inProgress++;
      else if (eff === 'Done' || eff === 'Completed') completed++;

      if (eff === 'Overdue') overdue++;

      if (i.dueDate === todayStr || i.startDate === todayStr) {
        today++;
      }
    });

    return { total, pending, inProgress, completed, overdue, today };
  }, [filteredInstances, todayStr]);

  // Group Summary Breakdown
  const groupSummary = useMemo(() => {
    return groups.map((grp) => {
      const grpSubgroups = subgroups.filter((sg) => sg.groupId === grp.id);
      const grpInstances = taskInstances.filter((i) => i.groupId === grp.id);

      let pending = 0;
      let completed = 0;
      let overdue = 0;

      grpInstances.forEach((i) => {
        const eff = getEffectiveStatus(i);
        if (eff === 'Pending' || eff === 'In Progress') pending++;
        if (eff === 'Done' || eff === 'Completed') completed++;
        if (eff === 'Overdue') overdue++;
      });

      // Subgroup breakdown
      const subgroupDetails = grpSubgroups.map((sg) => {
        const sgInstances = grpInstances.filter((i) => i.subgroupId === sg.id);
        let sgPending = 0;
        let sgCompleted = 0;
        let sgOverdue = 0;

        sgInstances.forEach((i) => {
          const eff = getEffectiveStatus(i);
          if (eff === 'Pending' || eff === 'In Progress') sgPending++;
          if (eff === 'Done' || eff === 'Completed') sgCompleted++;
          if (eff === 'Overdue') sgOverdue++;
        });

        return {
          ...sg,
          totalTasks: sgInstances.length,
          pending: sgPending,
          completed: sgCompleted,
          overdue: sgOverdue,
        };
      });

      return {
        ...grp,
        totalTasks: grpInstances.length,
        pending,
        completed,
        overdue,
        subgroups: subgroupDetails,
      };
    });
  }, [groups, subgroups, taskInstances]);

  // User-specific instances and metrics for User Portal
  const userInstances = useMemo(() => {
    if (!currentUser) return [];
    return taskInstances.filter((i) => i.userId === currentUser.id);
  }, [taskInstances, currentUser]);

  const userMetrics = useMemo(() => {
    const total = userInstances.length;
    const completed = userInstances.filter((i) => i.status === 'Done' || i.status === 'Completed').length;
    const overdue = userInstances.filter((i) => isOverdue(i.dueDate, i.status)).length;
    const inProgress = userInstances.filter((i) => i.status === 'In Progress').length;
    const pending = userInstances.filter(
      (i) => i.status === 'Pending' && !isOverdue(i.dueDate, i.status)
    ).length;
    const complianceRate = total > 0 ? Math.round((completed / total) * 100) : 100;

    return { total, completed, overdue, inProgress, pending, complianceRate };
  }, [userInstances]);

  // Handle KPI card click in Admin Dashboard to open popup modal
  const handleKpiCardClick = (kpiKey) => {
    setSelectedKpi(kpiKey);
    setTaskSearchQuery('');
    setSelectedTaskDetail(null);
    setKpiPopupOpen(true);
  };

  // Handle KPI card click in User Portal to open popup modal
  const handleUserKpiCardClick = (kpiKey) => {
    setUserKpiFilter(kpiKey);
    setTaskSearchQuery('');
    setSelectedTaskDetail(null);
    setKpiPopupOpen(true);
  };

  // KPI Filtered Tasks based on clicked card and active top filters
  const kpiFilteredTasks = useMemo(() => {
    return filteredInstances.filter((instance) => {
      const eff = getEffectiveStatus(instance);

      if (selectedKpi === 'pending') {
        return eff === 'Pending';
      }
      if (selectedKpi === 'inProgress') {
        return eff === 'In Progress';
      }
      if (selectedKpi === 'completed') {
        return eff === 'Done' || eff === 'Completed';
      }
      if (selectedKpi === 'overdue') {
        return eff === 'Overdue';
      }
      if (selectedKpi === 'today') {
        return instance.dueDate === todayStr || instance.startDate === todayStr;
      }

      // 'ALL'
      return true;
    });
  }, [filteredInstances, selectedKpi, todayStr]);

  // Display tasks with search and sorting applied (Admin Portal)
  const displayTasks = useMemo(() => {
    let result = kpiFilteredTasks;

    if (taskSearchQuery.trim()) {
      const q = taskSearchQuery.toLowerCase();
      result = result.filter((t) => {
        const user = users.find((u) => u.id === t.userId);
        const group = groups.find((g) => g.id === t.groupId);
        const dept = departments?.find((d) => d.id === t.department || d.id === t.groupId);
        return (
          t.title?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.subcategory?.toLowerCase().includes(q) ||
          user?.name?.toLowerCase().includes(q) ||
          group?.name?.toLowerCase().includes(q) ||
          dept?.name?.toLowerCase().includes(q) ||
          t.id?.toLowerCase().includes(q) ||
          t.taskId?.toLowerCase().includes(q)
        );
      });
    }

    return [...result].sort((a, b) => {
      if (taskSortBy === 'dueDateAsc') {
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      }
      if (taskSortBy === 'dueDateDesc') {
        return (b.dueDate || '').localeCompare(a.dueDate || '');
      }
      if (taskSortBy === 'priority') {
        const weight = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
        return (weight[b.priority] || 0) - (weight[a.priority] || 0);
      }
      if (taskSortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });
  }, [kpiFilteredTasks, taskSearchQuery, taskSortBy, users, groups, departments]);

  // User Portal filtered tasks
  const filteredUserInstances = useMemo(() => {
    return userInstances.filter((instance) => {
      const eff = getEffectiveStatus(instance);
      if (userKpiFilter === 'pending') {
        return eff === 'Pending' || eff === 'In Progress';
      }
      if (userKpiFilter === 'overdue') {
        return eff === 'Overdue';
      }
      if (userKpiFilter === 'completed') {
        return eff === 'Done' || eff === 'Completed';
      }
      return true;
    });
  }, [userInstances, userKpiFilter]);

  // User Portal display tasks with search and sorting applied
  const userDisplayTasks = useMemo(() => {
    let result = filteredUserInstances;

    if (taskSearchQuery.trim()) {
      const q = taskSearchQuery.toLowerCase();
      result = result.filter((t) => {
        const group = groups.find((g) => g.id === t.groupId);
        const dept = departments?.find((d) => d.id === t.department || d.id === t.groupId);
        return (
          t.title?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q) ||
          t.subcategory?.toLowerCase().includes(q) ||
          group?.name?.toLowerCase().includes(q) ||
          dept?.name?.toLowerCase().includes(q) ||
          t.id?.toLowerCase().includes(q) ||
          t.taskId?.toLowerCase().includes(q)
        );
      });
    }

    return [...result].sort((a, b) => {
      if (taskSortBy === 'dueDateAsc') {
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      }
      if (taskSortBy === 'dueDateDesc') {
        return (b.dueDate || '').localeCompare(a.dueDate || '');
      }
      if (taskSortBy === 'priority') {
        const weight = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
        return (weight[b.priority] || 0) - (weight[a.priority] || 0);
      }
      if (taskSortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });
  }, [filteredUserInstances, taskSearchQuery, taskSortBy, groups, departments]);

  // Reusable KPI Tasks Popup Modal for both Admin and User Portals
  const renderKpiTasksPopupModal = () => {
    const isAdmin = portalMode !== 'user';
    const activeTasks = isAdmin ? displayTasks : userDisplayTasks;
    const totalMatching = isAdmin ? kpiFilteredTasks.length : filteredUserInstances.length;

    // Determine current metric metadata
    let metricTitle = 'Task List';

    if (isAdmin) {
      switch (selectedKpi) {
        case 'pending':
          metricTitle = 'Pending Tasks';
          break;
        case 'inProgress':
          metricTitle = 'In Progress Tasks';
          break;
        case 'completed':
          metricTitle = 'Completed Tasks';
          break;
        case 'overdue':
          metricTitle = 'Overdue Tasks';
          break;
        case 'today':
          metricTitle = "Today's Tasks";
          break;
        default:
          metricTitle = 'All Task Instances';
      }
    } else {
      switch (userKpiFilter) {
        case 'pending':
          metricTitle = 'My Pending Tasks';
          break;
        case 'overdue':
          metricTitle = 'My Overdue Tasks';
          break;
        case 'completed':
          metricTitle = 'My Completed Tasks';
          break;
        default:
          metricTitle = 'My Tasks (All)';
      }
    }

    const modalTitle = selectedTaskDetail
      ? selectedTaskDetail.title
      : `${metricTitle} (${totalMatching})`;

    const modalSubtitle = selectedTaskDetail
      ? `Task ID: ${selectedTaskDetail.id} • Category: ${selectedTaskDetail.category || 'General'}`
      : `${isAdmin ? 'Admin Portal Overview' : 'Personal Checklist'} • Click any task to inspect details`;

    return (
      <Modal
        isOpen={kpiPopupOpen}
        onClose={() => {
          setKpiPopupOpen(false);
          setSelectedTaskDetail(null);
          setTaskSearchQuery('');
        }}
        title={modalTitle}
        subtitle={modalSubtitle}
        maxWidth="max-w-6xl"
        containerClassName="h-[88vh] max-h-[88vh] flex flex-col"
        bodyClassName="p-4 sm:p-5 flex flex-col flex-1 overflow-hidden min-h-0"
      >
        {selectedTaskDetail ? (
          /* ==================================================== */
          /* INLINE DRILLDOWN: TASK DETAILS VIEW INSIDE POPUP     */
          /* ==================================================== */
          <div className="flex flex-col flex-1 min-h-0 h-full">
            {/* Top Navigation Bar: Back to List */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTaskDetail(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to {metricTitle}</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <TaskTypeBadge type={selectedTaskDetail.taskType} />
                <StatusBadge status={getEffectiveStatus(selectedTaskDetail)} />
                <PriorityBadge priority={selectedTaskDetail.priority} />
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {selectedTaskDetail.frequency || 'One Time'}
                </span>
              </div>
            </div>

            {/* Scrollable details container */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-4 py-2">
              {/* Key Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-400 text-xs block">Assigned Employee (Doer)</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    {users.find((u) => u.id === selectedTaskDetail.userId)?.name || selectedTaskDetail.userId || 'Unassigned'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-xs block">Assigner (Given By)</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                    {selectedTaskDetail.givenBy || selectedTaskDetail.assignBy || 'Admin'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-xs block">Department / Group</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    {departments?.find((d) => d.id === selectedTaskDetail.department || d.id === selectedTaskDetail.groupId)?.name ||
                      groups.find((g) => g.id === selectedTaskDetail.groupId)?.name || 'General'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-xs block">Category & Subcategory</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    {selectedTaskDetail.category} {selectedTaskDetail.subcategory ? `• ${selectedTaskDetail.subcategory}` : ''}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-xs block">Start Date</span>
                  <span className="font-medium text-slate-700 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {selectedTaskDetail.startDate || '—'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-xs block">Due Date</span>
                  <span className={`font-semibold flex items-center gap-1.5 mt-0.5 ${
                    isOverdue(selectedTaskDetail.dueDate, selectedTaskDetail.status) ? 'text-rose-600' : 'text-slate-700'
                  }`}>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {selectedTaskDetail.dueDate || 'Today'}
                    {isOverdue(selectedTaskDetail.dueDate, selectedTaskDetail.status) && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded font-bold">OVERDUE</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Description & Instructions */}
              {selectedTaskDetail.description && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Description & Instructions</span>
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {selectedTaskDetail.description}
                  </div>
                </div>
              )}

              {/* Checklist items status if any */}
              {selectedTaskDetail.checklistItemsStatus && selectedTaskDetail.checklistItemsStatus.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Checklist Sub-tasks</span>
                  <div className="divide-y divide-slate-100 bg-slate-50/70 rounded-xl border border-slate-200 overflow-hidden">
                    {selectedTaskDetail.checklistItemsStatus.map((item, idx) => (
                      <div key={item.id || idx} className="p-2.5 flex items-center gap-2.5 text-xs sm:text-sm">
                        <div className={`w-4 h-4 rounded flex items-center justify-center ${item.completed ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'}`}>
                          {item.completed && <Check className="w-3 h-3" />}
                        </div>
                        <span className={item.completed ? 'line-through text-slate-400' : 'text-slate-700'}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons (fixed at bottom) */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0 mt-auto">
              <button
                type="button"
                onClick={() => setSelectedTaskDetail(null)}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                ← Back to List
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setKpiPopupOpen(false);
                    setSelectedTaskDetail(null);
                  }}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <Link
                  to="/my-tasks"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <span>Open in My Tasks Board</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* ==================================================== */
          /* TASKS LIST VIEW INSIDE POPUP                         */
          /* ==================================================== */
          <div className="flex flex-col flex-1 min-h-0 h-full">
            {/* Quick Status Filter Tabs Inside Popup */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 shrink-0 mb-3">
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedKpi('ALL')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      selectedKpi === 'ALL'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    All ({metrics.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedKpi('pending')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      selectedKpi === 'pending'
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    Pending ({metrics.pending})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedKpi('inProgress')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      selectedKpi === 'inProgress'
                        ? 'bg-white text-sky-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    In Progress ({metrics.inProgress})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedKpi('completed')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      selectedKpi === 'completed'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    Completed ({metrics.completed})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedKpi('overdue')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      selectedKpi === 'overdue'
                        ? 'bg-white text-rose-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    Overdue ({metrics.overdue})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedKpi('today')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      selectedKpi === 'today'
                        ? 'bg-white text-purple-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    Today ({metrics.today})
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setUserKpiFilter('ALL')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      userKpiFilter === 'ALL'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    My Tasks ({userMetrics.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserKpiFilter('pending')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      userKpiFilter === 'pending'
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    Pending ({userMetrics.pending + userMetrics.inProgress})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserKpiFilter('overdue')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      userKpiFilter === 'overdue'
                        ? 'bg-white text-rose-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    Overdue ({userMetrics.overdue})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserKpiFilter('completed')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      userKpiFilter === 'completed'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    Completed ({userMetrics.completed})
                  </button>
                </>
              )}
            </div>

            {/* Filter / Search / Sort Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 mb-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAdmin ? "Search tasks, doer, dept, id..." : "Search tasks, dept, id..."}
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                />
                {taskSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTaskSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={taskSortBy}
                  onChange={(e) => setTaskSortBy(e.target.value)}
                  className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="dueDateAsc">Due Date (Earliest)</option>
                  <option value="dueDateDesc">Due Date (Latest)</option>
                  <option value="priority">Priority (Highest)</option>
                  <option value="title">Title (A-Z)</option>
                </select>

                <Link
                  to="/my-tasks"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shrink-0"
                >
                  <span>Board</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Tasks Table (ONLY this table container scrolls vertically!) */}
            {activeTasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No matching tasks found</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {taskSearchQuery
                    ? `No tasks match "${taskSearchQuery}".`
                    : 'There are currently no tasks in this view.'}
                </p>
                {taskSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTaskSearchQuery('')}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Clear search query
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-700 uppercase tracking-wider shadow-2xs">
                    <tr>
                      <th className="px-3.5 py-2.5 bg-slate-50">Task Details</th>
                      {isAdmin && <th className="px-3 py-2.5 bg-slate-50">Assigned To</th>}
                      <th className="px-3 py-2.5 bg-slate-50">Department</th>
                      <th className="px-3 py-2.5 bg-slate-50">Priority</th>
                      <th className="px-3 py-2.5 bg-slate-50">Due Date</th>
                      <th className="px-3 py-2.5 bg-slate-50">Status</th>
                      <th className="px-3 py-2.5 bg-slate-50 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {activeTasks.map((task) => {
                      const effStatus = getEffectiveStatus(task);
                      const isTaskOverdue = effStatus === 'Overdue';
                      const isTaskToday = task.dueDate === todayStr || task.startDate === todayStr;
                      const user = users.find((u) => u.id === task.userId);
                      const group = groups.find((g) => g.id === task.groupId);
                      const dept = departments?.find((d) => d.id === task.department || d.id === task.groupId);

                      return (
                        <tr
                          key={task.id}
                          onClick={() => setSelectedTaskDetail(task)}
                          className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                        >
                          {/* Task Details */}
                          <td className="px-3.5 py-2.5 max-w-[280px]">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <TaskTypeBadge type={task.taskType} />
                              <span className="font-mono text-[10px] text-slate-400">
                                {task.id}
                              </span>
                            </div>
                            <h4 className="font-semibold text-slate-900 text-xs sm:text-sm group-hover:text-blue-600 transition-colors line-clamp-1">
                              {task.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {task.category} {task.subcategory ? `• ${task.subcategory}` : ''}
                            </p>
                          </td>

                          {/* Assigned To (Doer) - Admin view */}
                          {isAdmin && (
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {user?.avatar ? (
                                  <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                )}
                                <div>
                                  <span className="font-semibold text-slate-800 block text-xs">
                                    {user?.name || task.userId}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">
                                    {user?.role || 'Staff'}
                                  </span>
                                </div>
                              </div>
                            </td>
                          )}

                          {/* Department / Group */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              <Building className="w-3 h-3 text-slate-400" />
                              <span>{dept?.name || group?.name || 'General'}</span>
                            </span>
                          </td>

                          {/* Priority */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <PriorityBadge priority={task.priority} />
                          </td>

                          {/* Due Date */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <div
                                className={`flex items-center gap-1 font-semibold ${
                                  isTaskOverdue
                                    ? 'text-rose-600'
                                    : isTaskToday
                                    ? 'text-purple-600'
                                    : 'text-slate-700'
                                }`}
                              >
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{task.dueDate || 'Today'}</span>
                              </div>
                              {isTaskOverdue && (
                                <span className="inline-block text-[10px] font-bold text-rose-600">
                                  Overdue
                                </span>
                              )}
                              {isTaskToday && !isTaskOverdue && (
                                <span className="inline-block text-[10px] font-bold text-purple-600">
                                  Due Today
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <StatusBadge status={effStatus} />
                          </td>

                          {/* Actions */}
                          <td
                            className="px-3 py-2.5 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedTaskDetail(task)}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Showing {activeTasks.length} of {totalMatching} tasks
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setKpiPopupOpen(false);
                    setSelectedTaskDetail(null);
                  }}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <Link
                  to="/my-tasks"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  <span>Open My Tasks Board</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </Modal>
    );
  };

  // Keep backward compatibility alias
  const renderTaskDetailModal = renderKpiTasksPopupModal;

  // ==========================================
  // USER PORTAL DASHBOARD VIEW
  // ==========================================
  if (portalMode === 'user') {
    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                User Portal
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {currentUser?.role || 'Staff Member'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome, {currentUser?.name || 'Staff Member'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Review your personal hospital checklists, active delegations, and pending items.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {canCurrentUserSelfAssign() && (
              <Link
                to="/tasks/self-assign"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors"
              >
                <UserCheck className="w-4 h-4" />
                <span>Self Assign Task</span>
              </Link>
            )}
            <Link
              to="/my-tasks"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Go to My Tasks</span>
            </Link>
          </div>
        </div>

        {/* User KPI Cards Grid - Clickable */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">My Tasks Summary</span>
            {userKpiFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setUserKpiFilter('ALL')}
                className="text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Show All ({userMetrics.total})</span>
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => handleUserKpiCardClick('ALL')}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
                userKpiFilter === 'ALL'
                  ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">My Tasks</span>
                <CheckSquare className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{userMetrics.total}</p>
              <span className="text-[11px] text-slate-400 block mt-1">Assigned to you</span>
            </button>

            <button
              type="button"
              onClick={() => handleUserKpiCardClick('pending')}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
                userKpiFilter === 'pending'
                  ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Pending</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-extrabold text-amber-600 mt-2">{userMetrics.pending + userMetrics.inProgress}</p>
              <span className="text-[11px] text-slate-400 block mt-1">Requires action</span>
            </button>

            <button
              type="button"
              onClick={() => handleUserKpiCardClick('overdue')}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
                userKpiFilter === 'overdue'
                  ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Overdue</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-extrabold text-rose-600 mt-2">{userMetrics.overdue}</p>
              <span className="text-[11px] text-slate-400 block mt-1">Needs urgent review</span>
            </button>

            <button
              type="button"
              onClick={() => handleUserKpiCardClick('completed')}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
                userKpiFilter === 'completed'
                  ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-600 mt-2">{userMetrics.completed}</p>
              <span className="text-[11px] text-slate-400 block mt-1">Finished tasks</span>
            </button>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Compliance</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-extrabold text-blue-600 mt-2">{userMetrics.complianceRate}%</p>
              <span className="text-[11px] text-slate-400 mt-1 block">On-time rate</span>
            </div>
          </div>
        </div>

        {/* User's Recent / Today Checklist Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-slate-900 text-base">
                {userKpiFilter === 'pending' && 'My Pending Tasks'}
                {userKpiFilter === 'overdue' && 'My Overdue Tasks'}
                {userKpiFilter === 'completed' && 'My Completed Tasks'}
                {userKpiFilter === 'ALL' && 'My Checklist & Task Queue'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                {filteredUserInstances.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {userKpiFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setUserKpiFilter('ALL')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Show All Tasks
                </button>
              )}
              <Link
                to="/my-tasks"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>View All in My Tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {filteredUserInstances.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 text-sm">
                {userKpiFilter !== 'ALL' ? `No ${userKpiFilter} tasks found.` : 'No tasks currently assigned to you.'}
              </p>
              {canCurrentUserSelfAssign() && (
                <Link
                  to="/tasks/self-assign"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create a self-assigned task now</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredUserInstances.map((instance) => {
                const effStatus = getEffectiveStatus(instance);
                return (
                  <div
                    key={instance.id}
                    onClick={() => {
                      setSelectedTaskDetail(instance);
                      setKpiPopupOpen(true);
                    }}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <TaskTypeBadge type={instance.taskType} />
                        <StatusBadge status={effStatus} />
                        <PriorityBadge priority={instance.priority} />
                        <span className="font-mono text-[10px] text-slate-400">{instance.id}</span>
                      </div>
                      <h3 className="font-semibold text-slate-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                        {instance.title}
                      </h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {instance.category} • Due: {instance.dueDate || 'Today'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTaskDetail(instance);
                          setKpiPopupOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Details
                      </button>
                      <Link
                        to="/my-tasks"
                        className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shrink-0 text-center transition-colors"
                      >
                        Open Task
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal */}
        {renderTaskDetailModal()}
      </div>
    );
  }

  // ==========================================
  // ADMIN PORTAL DASHBOARD VIEW
  // ==========================================
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Admin Portal
            </span>
            <span className="text-xs text-slate-500 font-medium">Hospital-Wide Overview</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time organizational performance, checklist compliance, and delegation oversight.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/tasks/assign"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Task</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid - Clickable */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Hospital Overview Metrics</span>
          </div>
          {selectedKpi !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedKpi('ALL')}
              className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Reset filter (Show All {metrics.total} Tasks)</span>
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Total Tasks */}
          <button
            type="button"
            onClick={() => handleKpiCardClick('ALL')}
            className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
              selectedKpi === 'ALL'
                ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Tasks</span>
              <CheckSquare className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-2">{metrics.total}</p>
            <span className="text-[11px] text-slate-400 block mt-1">Active instances</span>
          </button>

          {/* Pending */}
          <button
            type="button"
            onClick={() => handleKpiCardClick('pending')}
            className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
              selectedKpi === 'pending'
                ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-extrabold text-amber-600 mt-2">{metrics.pending}</p>
            <span className="text-[11px] text-slate-400 block mt-1">Awaiting action</span>
          </button>

          {/* In Progress */}
          <button
            type="button"
            onClick={() => handleKpiCardClick('inProgress')}
            className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
              selectedKpi === 'inProgress'
                ? 'bg-sky-50/70 border-sky-400 ring-2 ring-sky-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
              <TrendingUp className="w-4 h-4 text-sky-500" />
            </div>
            <p className="text-2xl font-extrabold text-sky-600 mt-2">{metrics.inProgress}</p>
            <span className="text-[11px] text-slate-400 block mt-1">Currently ongoing</span>
          </button>

          {/* Completed */}
          <button
            type="button"
            onClick={() => handleKpiCardClick('completed')}
            className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
              selectedKpi === 'completed'
                ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-extrabold text-emerald-600 mt-2">{metrics.completed}</p>
            <span className="text-[11px] text-slate-400 block mt-1">Marked done</span>
          </button>

          {/* Overdue */}
          <button
            type="button"
            onClick={() => handleKpiCardClick('overdue')}
            className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
              selectedKpi === 'overdue'
                ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Overdue</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-extrabold text-rose-600 mt-2">{metrics.overdue}</p>
            <span className="text-[11px] text-slate-400 block mt-1">Past due date</span>
          </button>

          {/* Today's Tasks */}
          <button
            type="button"
            onClick={() => handleKpiCardClick('today')}
            className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
              selectedKpi === 'today'
                ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's</span>
              <Calendar className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-extrabold text-purple-600 mt-2">{metrics.today}</p>
            <span className="text-[11px] text-slate-400 block mt-1">Due or start today</span>
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Task Filters</h2>
            {hasActiveFilters && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                Active Filter
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Group */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Group
            </label>
            <select
              value={filterGroup}
              onChange={(e) => {
                setFilterGroup(e.target.value);
                setFilterSubgroup('ALL');
              }}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="ALL">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subgroup */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Subgroup
            </label>
            <select
              value={filterSubgroup}
              onChange={(e) => setFilterSubgroup(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="ALL">All Subgroups</option>
              {availableFilterSubgroups.map((sg) => (
                <option key={sg.id} value={sg.id}>
                  {sg.name}
                </option>
              ))}
            </select>
          </div>

          {/* User */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              User
            </label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="ALL">All Users</option>
              {availableFilterUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Task Type
            </label>
            <select
              value={filterTaskType}
              onChange={(e) => setFilterTaskType(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="ALL">All Types</option>
              <option value="Checklist">Checklist</option>
              <option value="Delegation">Delegation</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Completed / Done</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Due Date From
            </label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Due Date To
            </label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Analytics Charts: Task Status & Department Distribution */}
      <DashboardAnalyticsCharts
        tasks={filteredInstances}
        departments={departments}
        groups={groups}
        onOpenKpiPopup={(statusKey) => handleKpiCardClick(statusKey)}
        onFilterDepartment={(deptId) => {
          if (deptId === 'other') return;
          const matchingGroup = groups.find((g) => g.id === deptId);
          if (matchingGroup) {
            setFilterGroup((prev) => (prev === matchingGroup.id ? 'ALL' : matchingGroup.id));
            setFilterSubgroup('ALL');
          } else {
            handleKpiCardClick('ALL');
          }
        }}
      />

      {/* Main Content: Group Summary Breakdown OR Empty State */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Group Summary</h2>
            <p className="text-xs text-slate-400">
              {groups.length} Group(s) • {subgroups.length} Subgroup(s)
            </p>
          </div>

          {/* View Toggle: Columns vs Rows */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setGroupViewMode('columns')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                groupViewMode === 'columns'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Columns</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                groupViewMode === 'list'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Rows</span>
            </button>
          </div>
        </div>

        {groups.length === 0 ? (
          <EmptyState
            icon={Building}
            title="No Groups Created Yet"
            description="Your organization hierarchy starts here. Create your first Group and Subgroup to start delegating tasks."
            actionText="Create Group"
            onAction={() => (window.location.href = '/users')}
          />
        ) : tasks.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <CheckSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No task data available</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You have created Groups and Users, but no tasks have been assigned yet.
            </p>
            <Link
              to="/tasks/assign"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign First Task</span>
            </Link>
          </div>
        ) : groupViewMode === 'columns' ? (
          /* ============================================================== */
          /* COLUMN-WISE VIEW (Grid of Vertical Group Cards)                */
          /* ============================================================== */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
            {groupSummary.map((grp, idx) => {
              const accent = GROUP_ACCENTS[idx % GROUP_ACCENTS.length];
              const compRate = grp.totalTasks > 0 ? Math.round((grp.completed / grp.totalTasks) * 100) : 0;

              return (
                <div
                  key={grp.id}
                  className={`bg-white rounded-2xl border ${accent.border} shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col`}
                >
                  {/* Column Header */}
                  <div className={`p-4 sm:p-5 bg-gradient-to-b ${accent.headerBg} border-b border-slate-100`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${accent.iconBg} flex items-center justify-center shrink-0 shadow-xs font-bold text-sm`}>
                          <Building className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-900 truncate leading-tight">
                            {grp.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] text-slate-400">
                              {grp.id}
                            </span>
                            <span className="text-[10px] text-slate-300">•</span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              {grp.subgroups.length} Subgroup(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${
                        compRate === 100
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {compRate}% Done
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${compRate}%` }}
                      />
                    </div>

                    {/* Quick Counters Grid */}
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <div className="bg-white/90 p-1.5 rounded-lg border border-slate-200/70 shadow-2xs">
                        <span className="text-xs font-bold text-slate-800 block">
                          {grp.totalTasks}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Total</span>
                      </div>
                      <div className="bg-amber-50/70 p-1.5 rounded-lg border border-amber-200/60 shadow-2xs">
                        <span className="text-xs font-bold text-amber-700 block">
                          {grp.pending}
                        </span>
                        <span className="text-[10px] text-amber-600 font-medium">Pending</span>
                      </div>
                      <div className="bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-200/60 shadow-2xs">
                        <span className="text-xs font-bold text-emerald-700 block">
                          {grp.completed}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-medium">Done</span>
                      </div>
                      <div className={`p-1.5 rounded-lg border shadow-2xs ${
                        grp.overdue > 0
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-white/90 border-slate-200/70 text-slate-400'
                      }`}>
                        <span className={`text-xs font-bold block ${grp.overdue > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                          {grp.overdue}
                        </span>
                        <span className={`text-[10px] font-medium ${grp.overdue > 0 ? 'text-rose-600' : 'text-slate-400'}`}>Overdue</span>
                      </div>
                    </div>
                  </div>

                  {/* Subgroups Column Content */}
                  <div className="p-3.5 sm:p-4 flex-1 flex flex-col bg-slate-50/40">
                    <div className="flex items-center justify-between mb-2.5 px-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Subgroups ({grp.subgroups.length})
                      </span>
                      {grp.totalTasks > 0 && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {grp.totalTasks} tasks delegated
                        </span>
                      )}
                    </div>

                    {grp.subgroups.length === 0 ? (
                      <div className="py-6 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                        No subgroups in this group yet.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                        {grp.subgroups.map((sg) => {
                          const sgRate = sg.totalTasks > 0 ? Math.round((sg.completed / sg.totalTasks) * 100) : 0;
                          return (
                            <div
                              key={sg.id}
                              className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs hover:border-blue-200 transition-colors space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className={`w-2 h-2 rounded-full ${accent.dot} shrink-0`} />
                                  <span className="font-bold text-slate-800 text-xs truncate">
                                    {sg.name}
                                  </span>
                                </div>
                                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                                  {sg.id}
                                </span>
                              </div>

                              {/* Mini progress bar */}
                              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${sgRate}%` }}
                                />
                              </div>

                              {/* Stats row */}
                              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                                <div className="flex items-center gap-2">
                                  <span><strong className="text-slate-800">{sg.totalTasks}</strong> total</span>
                                  <span>•</span>
                                  <span className="text-amber-600 font-semibold">{sg.pending} pend</span>
                                  <span>•</span>
                                  <span className="text-emerald-600 font-semibold">{sg.completed} done</span>
                                </div>
                                {sg.overdue > 0 && (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">
                                    {sg.overdue} overdue
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ============================================================== */
          /* ROWS / LIST VIEW (Original Accordion View)                     */
          /* ============================================================== */
          <div className="space-y-3">
            {groupSummary.map((grp) => {
              const isExpanded = expandedGroups[grp.id] !== false; // default expanded

              return (
                <div
                  key={grp.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
                >
                  {/* Group Header Bar */}
                  <div
                    onClick={() => toggleGroupExpand(grp.id)}
                    className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{grp.name}</h3>
                        <p className="text-xs text-slate-400">
                          {grp.id} • {grp.subgroups.length} Subgroup(s)
                        </p>
                      </div>
                    </div>

                    {/* Group Counters */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-700">
                          {grp.totalTasks} Tasks
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 font-semibold text-amber-700">
                          {grp.pending} Pending
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 font-semibold text-emerald-700">
                          {grp.completed} Done
                        </span>
                        {grp.overdue > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-100 font-bold text-rose-700">
                            {grp.overdue} Overdue
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Nested Subgroups Breakdown */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5">
                      {grp.subgroups.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">
                          No subgroups in this group yet.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {grp.subgroups.map((sg) => (
                            <div
                              key={sg.id}
                              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 text-sm truncate">
                                  {sg.name}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  {sg.id}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 pt-1 text-center text-xs">
                                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                  <span className="font-bold text-slate-800 block">
                                    {sg.totalTasks}
                                  </span>
                                  <span className="text-[10px] text-slate-400">Total</span>
                                </div>
                                <div className="bg-amber-50/60 p-1.5 rounded-lg border border-amber-100">
                                  <span className="font-bold text-amber-700 block">
                                    {sg.pending}
                                  </span>
                                  <span className="text-[10px] text-amber-500">Pending</span>
                                </div>
                                <div className="bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-100">
                                  <span className="font-bold text-emerald-700 block">
                                    {sg.completed}
                                  </span>
                                  <span className="text-[10px] text-emerald-500">Done</span>
                                </div>
                              </div>

                              {sg.overdue > 0 && (
                                <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-center">
                                  <span className="text-xs font-bold text-rose-700">
                                    {sg.overdue} Task(s) Overdue
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {renderTaskDetailModal()}
    </div>
  );
};
