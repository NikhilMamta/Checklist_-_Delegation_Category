import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Building,
  User,
  Users,
  Paperclip,
  CalendarPlus,
  History,
  CheckSquare,
  Search,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  Plus,
  HeartPulse,
  Receipt,
  Briefcase,
  Activity,
  ShieldCheck,
  Sparkles,
  Pill,
  Wrench,
  FileText,
  Tag,
  Check,
  Layers,
  Filter,
  RotateCcw,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  isOverdue,
  getEffectiveStatus,
  completeInstance,
  updateChecklistItems,
  extendDueDate,
  markTaskDone,
} from '../services/taskService';
import { loadSampleDummyData } from '../services/storage';
import { getTaskHistory } from '../services/historyService';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import {
  PriorityBadge,
  StatusBadge,
  TaskTypeBadge,
  CategoryBadge,
  SubcategoryBadge,
} from '../components/common/Badge';
import { HOSPITAL_CATEGORIES, getCategoryMeta } from '../constants/taskCategories';

// Category Icon Mapping
const CATEGORY_ICONS = {
  'Patient Care & Clinical': HeartPulse,
  'Billing & Collections': Receipt,
  'General Operations': Briefcase,
  'Equipment Inspection': Activity,
  'Regulatory & Audit': ShieldCheck,
  'Hygiene & Sanitation': Sparkles,
  'Pharmacy & Inventory': Pill,
  'Maintenance & Facilities': Wrench,
  'Documentation & Reporting': FileText,
};

const getCategoryIconComponent = (categoryName) => {
  return CATEGORY_ICONS[categoryName] || Tag;
};

export const MyTasksPage = () => {
  const {
    currentUser,
    setCurrentUser,
    users,
    groups,
    subgroups,
    tasks,
    taskInstances,
    taskHistory,
    showToast,
    portalMode,
  } = useApp();

  const isAdmin = portalMode === 'admin' || currentUser?.role === 'Admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');

  // Primary Navigation Mode: 'categories' (Category drill-down) | 'flat' (All list) | 'history' (Task History)
  const [mainTab, setMainTab] = useState(urlTab || 'categories');

  // Staff filter for Admin mode: 'ALL' or specific userId
  const [adminStaffFilter, setAdminStaffFilter] = useState('ALL');

  // History tracking filter: 'all' (all given tasks) | 'ongoing' (active tasks) | 'done' (past completed tasks)
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all');

  // Synchronize mainTab with URL parameter if it changes
  useEffect(() => {
    if (urlTab && (urlTab === 'categories' || urlTab === 'flat' || urlTab === 'history')) {
      setMainTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (newTab) => {
    setMainTab(newTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', newTab);
      return next;
    });
  };

  // Display Format Switcher: 'table' (Table on desktop, Cards on mobile) | 'cards' (Cards on all)
  const [viewMode, setViewMode] = useState('table');

  // Expanded row ID for checklist dropdown in table
  const [expandedTableRows, setExpandedTableRows] = useState({});
  const toggleRowChecklist = (id) => {
    setExpandedTableRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Category drill-down navigation state
  // Level 1: selectedCategory = null
  // Level 2: selectedCategory = '...', selectedSubcategory = null
  // Level 3: selectedCategory = '...', selectedSubcategory = '...'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Flat view tab filter: 'All' | 'Today' | 'Pending' | 'In Progress' | 'Overdue'
  const [flatTab, setFlatTab] = useState('All');

  // History view filters
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState('ALL');
  const [historySubcategoryFilter, setHistorySubcategoryFilter] = useState('ALL');

  // Search input
  const [searchQuery, setSearchQuery] = useState('');

  // Execution modal state
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [detailModalTab, setDetailModalTab] = useState('execution'); // 'execution' | 'history'
  const [execRemarks, setExecRemarks] = useState('');
  const [execStatus, setExecStatus] = useState('Pending');
  const [execAttachment, setExecAttachment] = useState(null);
  const [localChecklistItems, setLocalChecklistItems] = useState([]);

  // Date extend modal state
  const [dateExtendModalOpen, setDateExtendModalOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  const [dateExtendReason, setDateExtendReason] = useState('');

  // Filter instances for current user OR hospital-wide for Admin
  const userInstances = useMemo(() => {
    if (!currentUser) return [];
    if (!isAdmin) {
      return taskInstances.filter((i) => i.userId === currentUser.id);
    }
    // Admin mode: see all tasks across hospital or filter by staff
    if (adminStaffFilter === 'ALL') {
      return taskInstances;
    }
    return taskInstances.filter((i) => i.userId === adminStaffFilter);
  }, [taskInstances, currentUser, isAdmin, adminStaffFilter]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Separate active vs completed/history instances
  const activeInstances = useMemo(() => {
    return userInstances.filter(
      (i) => i.status !== 'Done' && i.status !== 'Completed' && i.status !== 'Cancelled'
    );
  }, [userInstances]);

  // Completed instances (past done tasks)
  const completedInstances = useMemo(() => {
    return userInstances.filter(
      (i) => i.status === 'Done' || i.status === 'Completed'
    );
  }, [userInstances]);

  // Instances to display in History View based on historyTypeFilter
  const historyInstances = useMemo(() => {
    if (historyTypeFilter === 'ongoing') {
      return activeInstances;
    }
    if (historyTypeFilter === 'done') {
      return completedInstances;
    }
    // 'all': all given tasks
    return userInstances;
  }, [userInstances, activeInstances, completedInstances, historyTypeFilter]);

  // Aggregate Category & Subcategory summary for active tasks
  const categorySummary = useMemo(() => {
    const summary = {};

    activeInstances.forEach((instance) => {
      const parent = tasks.find((t) => t.id === instance.taskId);
      const cat = instance.category || parent?.category || 'General Operations';
      const sub = instance.subcategory || parent?.subcategory || 'General';

      if (!summary[cat]) {
        const meta = getCategoryMeta(cat);
        summary[cat] = {
          name: cat,
          meta,
          activeCount: 0,
          overdueCount: 0,
          urgentCount: 0,
          subcategories: {},
          instances: [],
        };
      }

      summary[cat].activeCount++;
      if (getEffectiveStatus(instance) === 'Overdue') summary[cat].overdueCount++;
      if (instance.priority === 'Urgent' || instance.priority === 'High') {
        summary[cat].urgentCount++;
      }

      if (!summary[cat].subcategories[sub]) {
        summary[cat].subcategories[sub] = [];
      }
      summary[cat].subcategories[sub].push(instance);
      summary[cat].instances.push(instance);
    });

    return summary;
  }, [activeInstances, tasks]);

  // Available categories list based on active tasks
  const activeCategoryList = useMemo(() => {
    return Object.values(categorySummary).sort((a, b) => b.activeCount - a.activeCount);
  }, [categorySummary]);

  // Active subcategories under selectedCategory
  const selectedCategoryData = useMemo(() => {
    if (!selectedCategory) return null;
    return categorySummary[selectedCategory] || null;
  }, [categorySummary, selectedCategory]);

  // Active instances under selectedCategory and selectedSubcategory
  const currentSubcategoryInstances = useMemo(() => {
    if (!selectedCategory || !selectedSubcategory || !selectedCategoryData) return [];
    const list = selectedCategoryData.subcategories[selectedSubcategory] || [];
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.description && i.description.toLowerCase().includes(q)) ||
        i.id.toLowerCase().includes(q)
    );
  }, [selectedCategory, selectedSubcategory, selectedCategoryData, searchQuery]);

  // Flat View Filtered Instances
  const filteredFlatInstances = useMemo(() => {
    return activeInstances.filter((instance) => {
      const eff = getEffectiveStatus(instance);
      const parent = tasks.find((t) => t.id === instance.taskId);

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          instance.title.toLowerCase().includes(q) ||
          instance.id.toLowerCase().includes(q) ||
          (instance.category && instance.category.toLowerCase().includes(q)) ||
          (instance.subcategory && instance.subcategory.toLowerCase().includes(q)) ||
          (parent?.description && parent.description.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Tab match
      if (flatTab === 'All') return true;
      if (flatTab === 'Today') {
        return (
          instance.dueDate === todayStr ||
          instance.startDate === todayStr ||
          instance.instanceDate === todayStr
        );
      }
      if (flatTab === 'Pending') return eff === 'Pending';
      if (flatTab === 'In Progress') return eff === 'In Progress';
      if (flatTab === 'Overdue') return eff === 'Overdue';

      return true;
    });
  }, [activeInstances, flatTab, searchQuery, todayStr, tasks]);

  // Filtered History Instances
  const filteredHistoryInstances = useMemo(() => {
    return historyInstances.filter((instance) => {
      const parent = tasks.find((t) => t.id === instance.taskId);
      const user = users.find((u) => u.id === instance.userId);
      const cat = instance.category || parent?.category || 'General Operations';
      const sub = instance.subcategory || parent?.subcategory || 'General';

      if (historyCategoryFilter !== 'ALL' && cat !== historyCategoryFilter) return false;
      if (historySubcategoryFilter !== 'ALL' && sub !== historySubcategoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          instance.title?.toLowerCase().includes(q) ||
          cat.toLowerCase().includes(q) ||
          sub.toLowerCase().includes(q) ||
          (instance.remarks && instance.remarks.toLowerCase().includes(q)) ||
          user?.name?.toLowerCase().includes(q) ||
          instance.id?.toLowerCase().includes(q) ||
          (instance.givenBy && instance.givenBy.toLowerCase().includes(q)) ||
          (parent?.givenBy && parent.givenBy.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [historyInstances, historyCategoryFilter, historySubcategoryFilter, searchQuery, tasks, users]);

  // Available categories in history for filtering
  const historyCategories = useMemo(() => {
    const set = new Set();
    historyInstances.forEach((i) => {
      const parent = tasks.find((t) => t.id === i.taskId);
      set.add(i.category || parent?.category || 'General Operations');
    });
    return Array.from(set);
  }, [historyInstances, tasks]);

  // Available subcategories in history for filtering
  const historySubcategories = useMemo(() => {
    const set = new Set();
    historyInstances.forEach((i) => {
      const parent = tasks.find((t) => t.id === i.taskId);
      const cat = i.category || parent?.category || 'General Operations';
      if (historyCategoryFilter === 'ALL' || cat === historyCategoryFilter) {
        set.add(i.subcategory || parent?.subcategory || 'General');
      }
    });
    return Array.from(set);
  }, [historyInstances, historyCategoryFilter, tasks]);

  // Quick Mark Done Action
  const handleQuickMarkDone = (instance) => {
    const parentTask = tasks.find((t) => t.id === instance.taskId);
    const isAttachmentRequired = Boolean(instance.requiredAttachment || parentTask?.requiredAttachment);

    if (isAttachmentRequired && !instance.attachment) {
      handleOpenInstanceModal(instance);
      showToast('Proof attachment is mandatory for this task. Please upload proof before marking as Done.', 'warning');
      return;
    }

    if (instance.taskType === 'Checklist' && instance.checklistItemsStatus?.length > 0) {
      const allChecked = instance.checklistItemsStatus.every((item) => item.completed);
      if (!allChecked) {
        handleOpenInstanceModal(instance);
        showToast('Please check all items or open task to complete checklist', 'warning');
        return;
      }
    }

    try {
      markTaskDone({
        instanceId: instance.id,
        taskId: instance.taskId,
        user: currentUser,
        remarks: 'Marked as Done',
        attachment: instance.attachment || null,
        checklistItemsStatus: instance.checklistItemsStatus,
      });

      showToast(`Task "${instance.title}" marked as Done & moved to Task History!`, 'success');
    } catch (error) {
      console.error('Error marking task done:', error);
      showToast(error.message || 'Failed to mark task as done', 'error');
    }
  };

  // Toggle checklist item
  const handleToggleChecklistItem = (instance, itemId) => {
    const currentItems = instance.checklistItemsStatus || [];
    const updated = currentItems.map((item) =>
      item.id === itemId
        ? {
            ...item,
            completed: !item.completed,
            completedAt: !item.completed ? new Date().toISOString() : null,
          }
        : item
    );

    updateChecklistItems({
      instanceId: instance.id,
      taskId: instance.taskId,
      itemsStatus: updated,
      user: currentUser,
    });
  };

  // Open detail modal
  const handleOpenInstanceModal = (instance) => {
    setSelectedInstance(instance);
    setDetailModalTab('execution');
    setExecRemarks(instance.remarks || '');
    setExecStatus(instance.status || 'Pending');
    setExecAttachment(instance.attachment || null);
    setLocalChecklistItems(instance.checklistItemsStatus || []);
    setNewDueDate(instance.dueDate || todayStr);
    setDateExtendReason('');
  };

  // Modal Checklist toggle
  const handleToggleModalChecklistItem = (itemId) => {
    if (!selectedInstance) return;
    const updated = localChecklistItems.map((item) =>
      item.id === itemId
        ? {
            ...item,
            completed: !item.completed,
            completedAt: !item.completed ? new Date().toISOString() : null,
          }
        : item
    );
    setLocalChecklistItems(updated);

    updateChecklistItems({
      instanceId: selectedInstance.id,
      taskId: selectedInstance.taskId,
      itemsStatus: updated,
      user: currentUser,
    });
  };

  // Modal file change
  const handleExecFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast('File size must be under 3MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setExecAttachment({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type,
        dataUrl: reader.result,
      });
      showToast(`Attachment ready: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Submit Modal execution
  const handleSubmitExecution = (e) => {
    e.preventDefault();
    if (!selectedInstance) return;

    const parentTask = tasks.find((t) => t.id === selectedInstance.taskId);
    const isAttachmentRequired = Boolean(selectedInstance.requiredAttachment || parentTask?.requiredAttachment);

    if (execStatus === 'Done') {
      if (isAttachmentRequired && !execAttachment) {
        showToast('Proof attachment is mandatory before marking this task as Done! Please upload a file or photo.', 'error');
        return;
      }

      if (selectedInstance.taskType === 'Checklist') {
        const allChecked =
          localChecklistItems.length > 0 && localChecklistItems.every((item) => item.completed);
        if (!allChecked) {
          showToast('All checklist items must be checked before marking as Done!', 'error');
          return;
        }
      }
    }

    try {
      completeInstance({
        instanceId: selectedInstance.id,
        taskId: selectedInstance.taskId,
        status: execStatus,
        remarks: execRemarks.trim(),
        attachment: execAttachment,
        checklistItemsStatus: localChecklistItems,
        user: currentUser,
      });

      if (execStatus === 'Done') {
        showToast(`Task marked as Done & moved to Task History!`, 'success');
      } else {
        showToast(`Task status updated to "${execStatus}"`, 'success');
      }
      setSelectedInstance(null);
    } catch (error) {
      console.error('Error submitting execution:', error);
      showToast('Failed to save task update', 'error');
    }
  };

  // Date Extension Submit
  const handleDateExtendSubmit = (e) => {
    e.preventDefault();
    if (!selectedInstance) return;

    if (!newDueDate) {
      showToast('Please select a valid new due date', 'error');
      return;
    }

    if (newDueDate <= selectedInstance.dueDate) {
      showToast('New due date must be after current due date', 'warning');
      return;
    }

    try {
      extendDueDate({
        taskId: selectedInstance.taskId,
        instanceId: selectedInstance.id,
        newDueDate,
        reason: dateExtendReason.trim(),
        user: currentUser,
      });

      showToast(`Due date extended to ${newDueDate}`, 'success');
      setDateExtendModalOpen(false);
      setSelectedInstance((prev) => ({
        ...prev,
        dueDate: newDueDate,
      }));
    } catch (error) {
      console.error('Error extending date:', error);
      showToast('Failed to extend due date', 'error');
    }
  };

  // Parent Task & Audit history for modal
  const modalParentTask = useMemo(() => {
    if (!selectedInstance) return null;
    return tasks.find((t) => t.id === selectedInstance.taskId);
  }, [selectedInstance, tasks]);

  const activeTaskHistory = useMemo(() => {
    if (!selectedInstance) return [];
    return getTaskHistory(selectedInstance.taskId);
  }, [selectedInstance, taskHistory]);

  // Reusable View Switcher Component
  const renderViewModeSwitcher = () => (
    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
      <button
        type="button"
        onClick={() => setViewMode('table')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          viewMode === 'table'
            ? 'bg-white text-blue-600 shadow-2xs font-bold'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="Table Format (Desktop optimal)"
      >
        <TableIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Table Format</span>
        <span className="sm:hidden">Table</span>
      </button>
      <button
        type="button"
        onClick={() => setViewMode('cards')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          viewMode === 'cards'
            ? 'bg-white text-blue-600 shadow-2xs font-bold'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="Card Format (Mobile optimal)"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Card Format</span>
        <span className="sm:hidden">Cards</span>
      </button>
    </div>
  );

  // If no users exist in system
  if (users.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">
            Category & Subcategory task execution workspace.
          </p>
        </div>
        <EmptyState
          icon={User}
          title="No Users Registered"
          description="Create your user profile first to begin assigning and managing tasks."
          actionText="Create User"
          onAction={() => {}}
          secondaryActionText="Go to Users Page"
          onSecondaryAction={() => (window.location.href = '/users')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP BANNER: USER ACTING WORKSPACE & ACTIONS */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                {isAdmin ? 'Admin Portal' : 'My Workspace'}
              </span>
              {currentUser?.username && (
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  @{currentUser.username}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {isAdmin ? (
                <span>Hospital Tasks & Delegation</span>
              ) : (
                <>
                  <span>Tasks for</span>
                  <span className="text-blue-600 underline decoration-blue-200">
                    {currentUser?.name || 'No User'}
                  </span>
                </>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin ? (
                'Category workflows, active tasks monitoring, and lifecycle tracking of all given tasks.'
              ) : (
                <>
                  Role: <span className="font-semibold text-slate-700">{currentUser?.role || 'Staff'}</span> •{' '}
                  Department:{' '}
                  <span className="font-semibold text-slate-700">
                    {groups.find((g) => g.id === currentUser?.groupId)?.name || 'Mamta Hospital'}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Staff Filter, Load Dummy Tasks & Assign Task Button */}
        <div className="flex items-center flex-wrap gap-2.5">
          {isAdmin ? (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-500 font-medium">Filter Staff:</span>
              <select
                value={adminStaffFilter}
                onChange={(e) => {
                  setAdminStaffFilter(e.target.value);
                  setSelectedCategory(null);
                  setSelectedSubcategory(null);
                }}
                className="text-xs py-1 px-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">All Hospital Staff ({taskInstances.length} tasks)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              loadSampleDummyData(true);
              setSelectedCategory(null);
              setSelectedSubcategory(null);
              showToast('20 Sample Tasks loaded across 7 categories & 14 subcategories!', 'success');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 shadow-2xs transition-colors shrink-0 cursor-pointer"
            title="Load 20 realistic hospital tasks organized by category and subcategory"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Load 20 Sample Tasks</span>
          </button>

          {isAdmin && (
            <Link
              to="/tasks/assign"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Task</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. MAIN NAVIGATION TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* TAB 1: Categories & Tasks Drill-down */}
          <button
            type="button"
            onClick={() => handleTabChange('categories')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              mainTab === 'categories'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Category View</span>
            <span
              className={`px-2 py-0.2 rounded-full text-xs font-bold ${
                mainTab === 'categories' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
              }`}
            >
              {activeCategoryList.length}
            </span>
          </button>

          {/* TAB 2: All Tasks Flat List */}
          <button
            type="button"
            onClick={() => handleTabChange('flat')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              mainTab === 'flat'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>All Tasks List</span>
            <span
              className={`px-2 py-0.2 rounded-full text-xs font-bold ${
                mainTab === 'flat' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
              }`}
            >
              {activeInstances.length}
            </span>
          </button>

          {/* TAB 3: Task History */}
          <button
            type="button"
            onClick={() => handleTabChange('history')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              mainTab === 'history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Task History</span>
            <span
              className={`px-2 py-0.2 rounded-full text-xs font-bold ${
                mainTab === 'history' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {isAdmin ? `${userInstances.length} Given` : `${completedInstances.length} Done`}
            </span>
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. VIEW 1: CATEGORY & SUBCATEGORY DRILL-DOWN (MAIN WORKFLOW) */}
      {/* ============================================================== */}
      {mainTab === 'categories' && (
        <div className="space-y-5">
          {/* BREADCRUMB NAVIGATION */}
          <div className="bg-slate-50 p-3 sm:px-4 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedSubcategory(null);
                }}
                className={`font-semibold flex items-center gap-1.5 transition-colors ${
                  !selectedCategory
                    ? 'text-blue-600'
                    : 'text-slate-600 hover:text-blue-600 underline'
                }`}
              >
                <Layers className="w-4 h-4 text-blue-500" />
                <span>All Categories</span>
              </button>

              {selectedCategory && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setSelectedSubcategory(null)}
                    className={`font-semibold flex items-center gap-1.5 transition-colors ${
                      !selectedSubcategory
                        ? 'text-blue-600'
                        : 'text-slate-600 hover:text-blue-600 underline'
                    }`}
                  >
                    <span>{selectedCategory}</span>
                  </button>
                </>
              )}

              {selectedCategory && selectedSubcategory && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-slate-900 bg-blue-100/60 text-blue-800 px-2 py-0.5 rounded">
                    {selectedSubcategory}
                  </span>
                </>
              )}
            </div>

            {selectedSubcategory ? (
              <button
                type="button"
                onClick={() => setSelectedSubcategory(null)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Subcategories</span>
              </button>
            ) : selectedCategory ? (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Categories</span>
              </button>
            ) : null}
          </div>

          {/* ---------------------------------------------------------- */}
          {/* LEVEL 1: CATEGORY SELECTION (TABLE ON DESKTOP & CARDS ON MOBILE) */}
          {/* ---------------------------------------------------------- */}
          {!selectedCategory && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Select a Category to View Assigned Tasks
                  </h2>
                  <p className="text-xs text-slate-500">
                    Click on any category to view its specific subcategories and perform tasks.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {activeCategoryList.length} Active Categories • {activeInstances.length} Tasks
                  </span>
                  {renderViewModeSwitcher()}
                </div>
              </div>

              {activeCategoryList.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="All Tasks Completed!"
                  description={
                    isAdmin
                      ? 'There are currently no active tasks across the hospital. Click below to load sample tasks or assign a new task.'
                      : `There are currently no active tasks assigned to ${currentUser?.name}. Click below to load sample tasks or assign a new task.`
                  }
                  actionText="Load Sample Tasks"
                  onAction={() => {
                    loadSampleDummyData(true);
                    showToast('20 Sample Tasks loaded successfully!', 'success');
                  }}
                  secondaryActionText="View Task History"
                  onSecondaryAction={() => setMainTab('history')}
                />
              ) : (
                <>
                  {/* DESKTOP TABLE FORMAT FOR CATEGORIES */}
                  <div className={viewMode === 'table' ? 'hidden md:block' : 'hidden'}>
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="py-3 px-3 w-10 text-center">#</th>
                              <th className="py-3 px-3 min-w-[180px]">Category</th>
                              <th className="py-3 px-3 w-28 text-center">Active Tasks</th>
                              <th className="py-3 px-3 min-w-[200px]">Subcategories with Tasks</th>
                              <th className="py-3 px-3 w-28">Task Types</th>
                              <th className="py-3 px-3 w-24 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {activeCategoryList.map((catItem, idx) => {
                              const IconComponent = getCategoryIconComponent(catItem.name);
                              const subcatKeys = Object.keys(catItem.subcategories);
                              const checklistCount = catItem.instances.filter(
                                (i) => i.taskType === 'Checklist'
                              ).length;
                              const delegationCount = catItem.instances.filter(
                                (i) => i.taskType === 'Delegation'
                              ).length;

                              return (
                                <tr
                                  key={catItem.name}
                                  onClick={() => setSelectedCategory(catItem.name)}
                                  className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                                >
                                  <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-400">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs bg-gradient-to-br ${
                                          catItem.meta?.cardGradient || 'from-blue-600 to-indigo-600'
                                        } text-white shrink-0`}
                                      >
                                        <IconComponent className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors block leading-snug">
                                          {catItem.name}
                                        </span>
                                        <span className="text-slate-500 text-[11px] line-clamp-1 block">
                                          {catItem.meta?.description ||
                                            'Operational hospital task category.'}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <div className="inline-flex flex-col items-center gap-1">
                                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        {catItem.activeCount}{' '}
                                        {catItem.activeCount === 1 ? 'Task' : 'Tasks'}
                                      </span>
                                      {catItem.overdueCount > 0 && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-0.5">
                                          <AlertTriangle className="w-2.5 h-2.5" />
                                          {catItem.overdueCount} Overdue
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div className="flex flex-wrap gap-1.5 max-w-md">
                                      {subcatKeys.map((subName) => (
                                        <button
                                          key={subName}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedCategory(catItem.name);
                                            setSelectedSubcategory(subName);
                                          }}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 border border-slate-200 transition-colors"
                                          title={`View tasks in ${subName}`}
                                        >
                                          <span className="truncate max-w-[150px]">{subName}</span>
                                          <span className="text-blue-600 font-bold">
                                            ({catItem.subcategories[subName].length})
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div className="flex flex-col gap-1 text-[11px]">
                                      {checklistCount > 0 && (
                                        <span className="text-slate-600 flex items-center gap-1 font-medium">
                                          <CheckSquare className="w-3 h-3 text-emerald-600" />
                                          {checklistCount} Checklist
                                        </span>
                                      )}
                                      {delegationCount > 0 && (
                                        <span className="text-slate-600 flex items-center gap-1 font-medium">
                                          <ClipboardList className="w-3 h-3 text-indigo-600" />
                                          {delegationCount} Delegation
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCategory(catItem.name)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors group-hover:bg-blue-600 group-hover:text-white"
                                    >
                                      <span>Explore</span>
                                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* MOBILE CARDS FORMAT FOR CATEGORIES */}
                  <div
                    className={
                      viewMode === 'table'
                        ? 'block md:hidden space-y-3.5'
                        : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5'
                    }
                  >
                    {activeCategoryList.map((catItem) => {
                      const IconComponent = getCategoryIconComponent(catItem.name);
                      const subcatKeys = Object.keys(catItem.subcategories);

                      return (
                        <div
                          key={catItem.name}
                          onClick={() => setSelectedCategory(catItem.name)}
                          className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-400 p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                        >
                          <div
                            className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
                              catItem.meta?.cardGradient || 'from-blue-600 to-indigo-600'
                            }`}
                          />

                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div
                                className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs bg-gradient-to-br ${
                                  catItem.meta?.cardGradient || 'from-blue-600 to-indigo-600'
                                } text-white`}
                              >
                                <IconComponent className="w-5 h-5" />
                              </div>

                              <div className="flex flex-col items-end gap-1">
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  {catItem.activeCount}{' '}
                                  {catItem.activeCount === 1 ? 'Task' : 'Tasks'}
                                </span>
                                {catItem.overdueCount > 0 && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {catItem.overdueCount} Overdue
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {catItem.name}
                              </h3>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                {catItem.meta?.description || 'Operational hospital task category.'}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider">
                                Subcategories with Tasks ({subcatKeys.length}):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {subcatKeys.map((subName) => (
                                  <button
                                    key={subName}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCategory(catItem.name);
                                      setSelectedSubcategory(subName);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 border border-slate-200 transition-colors"
                                  >
                                    <span>{subName}</span>
                                    <span className="text-blue-600 font-bold">
                                      ({catItem.subcategories[subName].length})
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                            <span>Explore Subcategories</span>
                            <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------- */}
          {/* LEVEL 2: SUBCATEGORY SELECTION (TABLE ON DESKTOP & CARDS ON MOBILE) */}
          {/* ---------------------------------------------------------- */}
          {selectedCategory && !selectedSubcategory && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {(() => {
                    const Icon = getCategoryIconComponent(selectedCategory);
                    return (
                      <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                        <Icon className="w-6 h-6" />
                      </div>
                    );
                  })()}
                  <div>
                    <span className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider">
                      Selected Category
                    </span>
                    <h2 className="text-xl font-bold text-white">{selectedCategory}</h2>
                    <p className="text-xs text-blue-100 mt-0.5">
                      Koun se subcategories ka task dekhoge? Click a subcategory below:
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-2xl font-black text-white">
                      {selectedCategoryData?.activeCount || 0}
                    </span>
                    <span className="block text-[11px] text-blue-200">Active Tasks</span>
                  </div>
                  {renderViewModeSwitcher()}
                </div>
              </div>

              {/* DESKTOP TABLE FORMAT FOR SUBCATEGORIES */}
              <div className={viewMode === 'table' ? 'hidden md:block' : 'hidden'}>
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-3 w-10 text-center">#</th>
                          <th className="py-3 px-3 min-w-[170px]">Subcategory Name</th>
                          <th className="py-3 px-3 w-24 text-center">Active Tasks</th>
                          <th className="py-3 px-3 w-28">Urgency / Status</th>
                          <th className="py-3 px-3 min-w-[180px]">Latest Task Preview</th>
                          <th className="py-3 px-3 w-28 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {selectedCategoryData &&
                          Object.keys(selectedCategoryData.subcategories).map((subName, idx) => {
                            const instancesInSub = selectedCategoryData.subcategories[subName] || [];
                            const hasOverdue = instancesInSub.some(
                              (i) => getEffectiveStatus(i) === 'Overdue'
                            );
                            const urgentTasks = instancesInSub.filter(
                              (i) => i.priority === 'Urgent' || i.priority === 'High'
                            );

                            return (
                              <tr
                                key={subName}
                                onClick={() => setSelectedSubcategory(subName)}
                                className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                              >
                                <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                      <Tag className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors block leading-snug">
                                        {subName}
                                      </span>
                                      <span className="text-slate-500 text-[11px] block mt-0.5">
                                        Assigned operational subcategory
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    {instancesInSub.length}{' '}
                                    {instancesInSub.length === 1 ? 'Task' : 'Tasks'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {hasOverdue && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Overdue
                                      </span>
                                    )}
                                    {urgentTasks.length > 0 && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        {urgentTasks.length} Urgent / High
                                      </span>
                                    )}
                                    {!hasOverdue && urgentTasks.length === 0 && (
                                      <span className="text-slate-400 text-[11px]">Normal</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  {instancesInSub[0] ? (
                                    <div>
                                      <span className="text-slate-800 font-semibold block truncate max-w-sm">
                                        {instancesInSub[0].title}
                                      </span>
                                      <span className="text-slate-400 text-[10px] font-mono block">
                                        Due: {instancesInSub[0].dueDate}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic">No tasks</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSubcategory(subName)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors group-hover:bg-blue-600 group-hover:text-white"
                                  >
                                    <span>View Tasks</span>
                                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* MOBILE CARDS FORMAT FOR SUBCATEGORIES */}
              <div
                className={
                  viewMode === 'table'
                    ? 'block md:hidden space-y-3.5'
                    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                }
              >
                {selectedCategoryData &&
                  Object.keys(selectedCategoryData.subcategories).map((subName) => {
                    const instancesInSub = selectedCategoryData.subcategories[subName] || [];
                    const hasOverdue = instancesInSub.some(
                      (i) => getEffectiveStatus(i) === 'Overdue'
                    );

                    return (
                      <div
                        key={subName}
                        onClick={() => setSelectedSubcategory(subName)}
                        className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-400 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {instancesInSub.length}{' '}
                              {instancesInSub.length === 1 ? 'Task' : 'Tasks'}
                            </span>
                            {hasOverdue && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </span>
                            )}
                          </div>

                          <div>
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {subName}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                              Assigned tasks in this operational subcategory.
                            </p>
                          </div>

                          {instancesInSub[0] && (
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                              <span className="text-[10px] text-slate-400 block font-medium uppercase">
                                Latest Task:
                              </span>
                              <span className="font-semibold text-slate-700 block truncate">
                                {instancesInSub[0].title}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                          <span>View {instancesInSub.length} Tasks</span>
                          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------- */}
          {/* LEVEL 3: TASKS LIST (TABLE FORMAT ON DESKTOP & CARDS ON MOBILE) */}
          {/* ---------------------------------------------------------- */}
          {selectedCategory && selectedSubcategory && (
            <div className="space-y-4">
              {/* Header with View Switcher */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CategoryBadge category={selectedCategory} />
                    <span className="text-slate-400">&rarr;</span>
                    <SubcategoryBadge subcategory={selectedSubcategory} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">
                    Tasks in &ldquo;{selectedSubcategory}&rdquo;
                  </h2>
                  <p className="text-xs text-slate-500">
                    Check tasks below and click &ldquo;Mark Done&rdquo; to complete them. They will
                    move to Task History.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg shrink-0">
                    {currentSubcategoryInstances.length} Active Task(s)
                  </span>
                  {renderViewModeSwitcher()}
                </div>
              </div>

              {/* Empty / All Done State */}
              {currentSubcategoryInstances.length === 0 ? (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-emerald-900">
                    All tasks in this subcategory are completed!
                  </h3>
                  <p className="text-xs text-emerald-700 max-w-md mx-auto">
                    All tasks for &ldquo;{selectedSubcategory}&rdquo; have been marked done and
                    transferred into Task History.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSubcategory(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                    >
                      Back to Subcategories
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainTab('history')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                    >
                      View in Task History
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* DESKTOP TABLE FORMAT (Active on desktop when viewMode === 'table') */}
                  <div className={viewMode === 'table' ? 'hidden md:block' : 'hidden'}>
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="py-3 px-3 w-10 text-center">Done</th>
                              <th className="py-3 px-3 min-w-[200px]">Task Information</th>
                              <th className="py-3 px-3 w-36">Assigned Doer</th>
                              <th className="py-3 px-3 w-40">Checklist Progress</th>
                              <th className="py-3 px-3 w-28">Due Date</th>
                              <th className="py-3 px-3 w-36 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {currentSubcategoryInstances.map((instance) => {
                              const eff = getEffectiveStatus(instance);
                              const isOver = eff === 'Overdue';
                              const checklistItems = instance.checklistItemsStatus || [];
                              const totalChecklist = checklistItems.length;
                              const doneCount = checklistItems.filter((i) => i.completed).length;
                              const isExpanded = expandedTableRows[instance.id];
                              const assignedUser = users.find((u) => u.id === instance.userId);

                              return (
                                <React.Fragment key={instance.id}>
                                  <tr className="hover:bg-slate-50/80 transition-colors">
                                    {/* Quick Check Circle */}
                                    <td className="py-3 px-3 text-center align-top">
                                      <button
                                        type="button"
                                        onClick={() => handleQuickMarkDone(instance)}
                                        className="w-6 h-6 rounded-full border-2 border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 flex items-center justify-center text-transparent hover:text-emerald-600 transition-colors mx-auto cursor-pointer"
                                        title="Click to Mark Done"
                                      >
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      </button>
                                    </td>

                                    {/* Task Title & Details */}
                                    <td className="py-3 px-3 align-top">
                                      <span className="font-bold text-slate-900 block leading-snug line-clamp-2">
                                        {instance.title}
                                      </span>
                                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        <TaskTypeBadge type={instance.taskType} />
                                        <PriorityBadge priority={instance.priority} />
                                        <span className="text-[10px] font-mono text-slate-400">
                                          ID: {instance.id}
                                        </span>
                                        {Boolean(instance.requiredAttachment || tasks.find((t) => t.id === instance.taskId)?.requiredAttachment) && (
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title="Proof attachment is mandatory before completion">
                                            <Paperclip className="w-2.5 h-2.5" /> Proof Req
                                          </span>
                                        )}
                                      </div>
                                      {instance.description && (
                                        <p className="text-slate-500 text-xs mt-1 line-clamp-1">
                                          {instance.description}
                                        </p>
                                      )}
                                    </td>

                                    {/* Assigned Doer */}
                                    <td className="py-3 px-3 align-top whitespace-nowrap">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                          {assignedUser?.name ? assignedUser.name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <span
                                          className="font-semibold text-slate-800 text-xs truncate max-w-[110px]"
                                          title={assignedUser?.name || instance.userId}
                                        >
                                          {assignedUser?.name || instance.userId || 'Staff'}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Checklist Status */}
                                    <td className="py-3 px-3 align-top">
                                      {instance.taskType === 'Checklist' && totalChecklist > 0 ? (
                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                                            <span>
                                              {doneCount}/{totalChecklist}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => toggleRowChecklist(instance.id)}
                                              className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5 text-[10px]"
                                            >
                                              <span>{isExpanded ? 'Hide' : 'Items'}</span>
                                              {isExpanded ? (
                                                <ChevronUp className="w-3 h-3" />
                                              ) : (
                                                <ChevronDown className="w-3 h-3" />
                                              )}
                                            </button>
                                          </div>
                                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div
                                              className="bg-emerald-500 h-full transition-all"
                                              style={{
                                                width: `${(doneCount / totalChecklist) * 100}%`,
                                              }}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic text-[11px]">
                                          Delegation
                                        </span>
                                      )}
                                    </td>

                                    {/* Due Date */}
                                    <td className="py-3 px-3 align-top whitespace-nowrap">
                                      <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        <span
                                          className={`font-medium text-xs ${
                                            isOver ? 'text-rose-600 font-bold' : 'text-slate-700'
                                          }`}
                                        >
                                          {instance.dueDate}
                                        </span>
                                      </div>
                                      {isOver && (
                                        <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                                          Overdue
                                        </span>
                                      )}
                                    </td>

                                    {/* Actions */}
                                    <td className="py-3 px-3 text-right align-top whitespace-nowrap">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenInstanceModal(instance)}
                                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                        >
                                          Details
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleQuickMarkDone(instance)}
                                          className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                                        >
                                          Done
                                        </button>
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Expandable Checklist Row */}
                                  {isExpanded && instance.taskType === 'Checklist' && (
                                    <tr className="bg-slate-50/50">
                                      <td colSpan={6} className="p-3.5 pl-14">
                                        <div className="bg-white p-3 rounded-xl border border-slate-200 max-w-xl space-y-1.5">
                                          <span className="text-[11px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                                            Click to check off items:
                                          </span>
                                          {checklistItems.map((item) => (
                                            <div
                                              key={item.id}
                                              onClick={() =>
                                                handleToggleChecklistItem(instance, item.id)
                                              }
                                              className={`flex items-start gap-2 p-1.5 rounded-lg cursor-pointer text-xs ${
                                                item.completed
                                                  ? 'bg-emerald-50 text-emerald-900'
                                                  : 'hover:bg-slate-50 text-slate-800'
                                              }`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={item.completed}
                                                onChange={() => {}}
                                                className="mt-0.5 rounded text-emerald-600 pointer-events-none"
                                              />
                                              <span
                                                className={
                                                  item.completed
                                                    ? 'line-through text-slate-400'
                                                    : ''
                                                }
                                              >
                                                {item.text}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* MOBILE CARDS FORMAT (Active on mobile or when viewMode === 'cards') */}
                  <div
                    className={
                      viewMode === 'table'
                        ? 'block md:hidden space-y-3.5'
                        : 'grid grid-cols-1 md:grid-cols-2 gap-4'
                    }
                  >
                    {currentSubcategoryInstances.map((instance) => {
                      const effectiveStatus = getEffectiveStatus(instance);
                      const parent = tasks.find((t) => t.id === instance.taskId);
                      const isItemOverdue = effectiveStatus === 'Overdue';
                      const checklistItems = instance.checklistItemsStatus || [];
                      const totalChecklist = checklistItems.length;
                      const completedChecklist = checklistItems.filter((i) => i.completed).length;

                      return (
                        <div
                          key={instance.id}
                          className={`bg-white rounded-2xl border transition-all duration-150 flex flex-col justify-between shadow-xs hover:shadow-md ${
                            isItemOverdue
                              ? 'border-rose-300 ring-1 ring-rose-200'
                              : 'border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="p-4 sm:p-5 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <TaskTypeBadge type={instance.taskType} />
                                <PriorityBadge priority={instance.priority} />
                                {Boolean(instance.requiredAttachment || tasks.find((t) => t.id === instance.taskId)?.requiredAttachment) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <Paperclip className="w-2.5 h-2.5" /> Proof Required
                                  </span>
                                )}
                              </div>
                              <StatusBadge status={effectiveStatus} />
                            </div>

                            <div>
                              <h3 className="text-base font-bold text-slate-900 leading-snug">
                                {instance.title}
                              </h3>
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                ID: {instance.id}
                              </p>
                            </div>

                            {parent?.description && (
                              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-3 leading-relaxed">
                                {parent.description}
                              </p>
                            )}

                            {/* Mobile Checklist Checkboxes with generous touch padding */}
                            {instance.taskType === 'Checklist' && totalChecklist > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                                  <span>Checklist Items:</span>
                                  <span className="text-blue-600 font-bold">
                                    {completedChecklist}/{totalChecklist} Done
                                  </span>
                                </div>

                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                  {checklistItems.map((item) => (
                                    <div
                                      key={item.id}
                                      onClick={() => handleToggleChecklistItem(instance, item.id)}
                                      className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                                        item.completed
                                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={item.completed}
                                        onChange={() => {}}
                                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none w-4 h-4"
                                      />
                                      <span
                                        className={`flex-1 ${
                                          item.completed ? 'line-through text-slate-400' : ''
                                        }`}
                                      >
                                        {item.text}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>Due: {instance.dueDate}</span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                By: {parent?.createdBy || 'Admin'}
                              </span>
                            </div>
                          </div>

                          {/* Mobile Action Row */}
                          <div className="px-4 sm:px-5 py-3 bg-slate-50/80 border-t border-slate-100 rounded-b-2xl flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenInstanceModal(instance)}
                              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 bg-white"
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickMarkDone(instance)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Mark Done</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. VIEW 2: FLAT ALL TASKS LIST WITH TABLE & CARDS */}
      {/* ============================================================== */}
      {mainTab === 'flat' && (
        <div className="space-y-5">
          {/* Subtabs and View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'All', label: 'All Active' },
                { id: 'Today', label: "Today's" },
                { id: 'Pending', label: 'Pending' },
                { id: 'In Progress', label: 'In Progress' },
                { id: 'Overdue', label: 'Overdue' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFlatTab(t.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    flatTab === t.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {renderViewModeSwitcher()}
          </div>

          {filteredFlatInstances.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={`No ${flatTab} tasks found`}
              description="All tasks matching this filter are completed or none assigned."
              actionText="Assign New Task"
              onAction={() => (window.location.href = '/tasks/assign')}
            />
          ) : (
            <>
              {/* DESKTOP TABLE FORMAT */}
              <div className={viewMode === 'table' ? 'hidden md:block' : 'hidden'}>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-3 w-10 text-center">Done</th>
                          <th className="py-3 px-3 min-w-[200px]">Task Information</th>
                          <th className="py-3 px-3 w-44">Category / Subcategory</th>
                          <th className="py-3 px-3 w-36">Assigned Doer</th>
                          <th className="py-3 px-3 w-32">Status & Due</th>
                          <th className="py-3 px-3 w-32 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredFlatInstances.map((instance) => {
                          const eff = getEffectiveStatus(instance);
                          const isOver = eff === 'Overdue';
                          const assignedUser = users.find((u) => u.id === instance.userId);
                          const parent = tasks.find((t) => t.id === instance.taskId);

                          return (
                            <tr key={instance.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3 text-center align-top">
                                <button
                                  type="button"
                                  onClick={() => handleQuickMarkDone(instance)}
                                  className="w-6 h-6 rounded-full border-2 border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 flex items-center justify-center text-transparent hover:text-emerald-600 transition-colors mx-auto cursor-pointer"
                                  title="Mark Done"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </button>
                              </td>
                              <td className="py-3 px-3 align-top">
                                <span className="font-bold text-slate-900 block leading-snug line-clamp-2">
                                  {instance.title}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <PriorityBadge priority={instance.priority} />
                                  <span className="text-[10px] font-mono text-slate-400">
                                    ID: {instance.id}
                                  </span>
                                  {Boolean(instance.requiredAttachment || parent?.requiredAttachment) && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      <Paperclip className="w-2.5 h-2.5" /> Proof Req
                                    </span>
                                  )}
                                  <span className="text-slate-300">•</span>
                                  <span className="text-[11px] text-slate-500">
                                    By: {instance.givenBy || parent?.givenBy || parent?.createdBy || 'Admin'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3 align-top">
                                <CategoryBadge category={instance.category || 'General'} />
                                <div
                                  className="text-[11px] font-medium text-slate-600 mt-1 truncate max-w-[170px]"
                                  title={instance.subcategory}
                                >
                                  {instance.subcategory || 'General'}
                                </div>
                              </td>
                              <td className="py-3 px-3 align-top whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                    {assignedUser?.name ? assignedUser.name.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                  <span
                                    className="font-semibold text-slate-800 text-xs truncate max-w-[110px]"
                                    title={assignedUser?.name || instance.userId}
                                  >
                                    {assignedUser?.name || instance.userId || 'Staff'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3 align-top whitespace-nowrap">
                                <StatusBadge status={eff} />
                                <span
                                  className={`block text-[11px] mt-1 ${
                                    isOver ? 'text-rose-600 font-bold' : 'text-slate-500'
                                  }`}
                                >
                                  Due: {instance.dueDate}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right whitespace-nowrap align-top">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenInstanceModal(instance)}
                                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
                                  >
                                    Details
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickMarkDone(instance)}
                                    className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs cursor-pointer"
                                  >
                                    Done
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* MOBILE CARDS FORMAT */}
              <div
                className={
                  viewMode === 'table'
                    ? 'block md:hidden space-y-3.5'
                    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                }
              >
                {filteredFlatInstances.map((instance) => {
                  const effectiveStatus = getEffectiveStatus(instance);
                  const parent = tasks.find((t) => t.id === instance.taskId);
                  const assignedUser = users.find((u) => u.id === instance.userId);

                  return (
                    <div
                      key={instance.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <CategoryBadge category={instance.category || 'General'} />
                            <PriorityBadge priority={instance.priority} />
                          </div>
                          <StatusBadge status={effectiveStatus} />
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-slate-900 line-clamp-2">
                            {instance.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 font-medium">
                            Subcategory:{' '}
                            <span className="text-slate-800">
                              {instance.subcategory || 'General'}
                            </span>
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-700">
                              {assignedUser?.name || instance.userId || 'Staff'}
                            </span>
                          </div>
                          <span>Due: {instance.dueDate}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenInstanceModal(instance)}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickMarkDone(instance)}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Done</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. VIEW 3: TASK HISTORY (COMPLETED TASKS TABLE & CARDS) */}
      {/* ============================================================== */}
      {mainTab === 'history' && (
        <div className="space-y-5">
          {/* History Header & Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-600" />
                  <span>Task History & Tracking</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track all tasks given: review ongoing delegations, past completed tasks, and audit logs.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl shrink-0">
                  {filteredHistoryInstances.length} Tasks in View
                </span>
                {renderViewModeSwitcher()}
              </div>
            </div>

            {/* Status Type Toggle Pills: All Given | Ongoing | Done in Past */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('all')}
                  className={`px-3 py-1.5 font-semibold rounded-lg transition-all cursor-pointer ${
                    historyTypeFilter === 'all'
                      ? 'bg-white text-blue-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Given Tasks ({userInstances.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('ongoing')}
                  className={`px-3 py-1.5 font-semibold rounded-lg transition-all cursor-pointer ${
                    historyTypeFilter === 'ongoing'
                      ? 'bg-white text-amber-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ongoing Tasks ({activeInstances.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('done')}
                  className={`px-3 py-1.5 font-semibold rounded-lg transition-all cursor-pointer ${
                    historyTypeFilter === 'done'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Done in Past ({completedInstances.length})
                </button>
              </div>

              {/* Secondary category & subcategory filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Category:</span>
                  <select
                    value={historyCategoryFilter}
                    onChange={(e) => {
                      setHistoryCategoryFilter(e.target.value);
                      setHistorySubcategoryFilter('ALL');
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 font-medium"
                  >
                    <option value="ALL">All Categories</option>
                    {historyCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Subcategory:</span>
                  <select
                    value={historySubcategoryFilter}
                    onChange={(e) => setHistorySubcategoryFilter(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 font-medium"
                  >
                    <option value="ALL">All Subcategories</option>
                    {historySubcategories.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {(historyCategoryFilter !== 'ALL' || historySubcategoryFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryCategoryFilter('ALL');
                      setHistorySubcategoryFilter('ALL');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Filter</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* History Data View */}
          {filteredHistoryInstances.length === 0 ? (
            <EmptyState
              icon={History}
              title="No Tasks Found in History"
              description="There are currently no tasks matching your selected history filter (Ongoing / Done)."
              actionText="View Active Tasks"
              onAction={() => setMainTab('categories')}
            />
          ) : (
            <>
              {/* DESKTOP TABLE FORMAT FOR HISTORY */}
              <div className={viewMode === 'table' ? 'hidden md:block' : 'hidden'}>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3 px-3 w-28">Status</th>
                          <th className="py-3 px-3 min-w-[200px]">Task Details</th>
                          <th className="py-3 px-3 w-44">Category / Subcategory</th>
                          <th className="py-3 px-3 w-36">Assigned Doer</th>
                          <th className="py-3 px-3 w-36">Completed / Due</th>
                          <th className="py-3 px-3 w-20 text-right">Audit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredHistoryInstances.map((instance) => {
                          const eff = getEffectiveStatus(instance);
                          const isDone = eff === 'Done' || eff === 'Completed';
                          const isOver = eff === 'Overdue';
                          const assignedUser = users.find((u) => u.id === instance.userId);
                          const parent = tasks.find((t) => t.id === instance.taskId);
                          const completedDateFormatted = instance.completedAt
                            ? new Date(instance.completedAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Completed';

                          return (
                            <tr key={instance.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3 whitespace-nowrap align-top">
                                <StatusBadge status={eff} />
                              </td>
                              <td className="py-3 px-3 align-top">
                                <span className="font-bold text-slate-900 block leading-snug line-clamp-2">
                                  {instance.title}
                                </span>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                                  <span className="text-[10px] font-mono text-slate-400">
                                    ID: {instance.id}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span>
                                    Given by: <strong className="font-semibold text-slate-700">{instance.givenBy || parent?.givenBy || parent?.createdBy || 'Hospital Admin'}</strong>
                                  </span>
                                  {instance.attachment && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      <Paperclip className="w-2.5 h-2.5" /> Proof Attached
                                    </span>
                                  )}
                                </div>
                                {instance.remarks && (
                                  <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">
                                    &ldquo;{instance.remarks}&rdquo;
                                  </p>
                                )}
                              </td>
                              <td className="py-3 px-3 align-top">
                                <CategoryBadge category={instance.category || parent?.category || 'General'} />
                                <div
                                  className="text-[11px] font-medium text-slate-600 mt-1 truncate max-w-[170px]"
                                  title={instance.subcategory || parent?.subcategory}
                                >
                                  {instance.subcategory || parent?.subcategory || 'General'}
                                </div>
                              </td>
                              <td className="py-3 px-3 align-top whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                    {assignedUser?.name ? assignedUser.name.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                  <span
                                    className="font-semibold text-slate-800 text-xs truncate max-w-[110px]"
                                    title={assignedUser?.name || instance.userId}
                                  >
                                    {assignedUser?.name || instance.userId || 'Staff'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3 align-top whitespace-nowrap">
                                {isDone ? (
                                  <div className="text-slate-600 font-medium">
                                    <span className="font-semibold text-slate-700 block">{completedDateFormatted}</span>
                                    {instance.completedBy && (
                                      <span className="text-[10px] text-slate-400 block mt-0.5">
                                        by {instance.completedBy}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className={isOver ? 'text-rose-600 font-bold' : 'text-slate-600 font-medium'}>
                                    <span>Due: {instance.dueDate || 'Today'}</span>
                                    {isOver && (
                                      <span className="inline-block text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold ml-1">
                                        OVERDUE
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right whitespace-nowrap align-top">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenInstanceModal(instance);
                                    setDetailModalTab('history');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                  title="View audit trail"
                                >
                                  <History className="w-3 h-3 text-slate-500" />
                                  <span>Audit</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* MOBILE CARDS FORMAT FOR HISTORY */}
              <div
                className={
                  viewMode === 'table' ? 'block md:hidden space-y-3' : 'space-y-3'
                }
              >
                {filteredHistoryInstances.map((instance) => {
                  const eff = getEffectiveStatus(instance);
                  const isDone = eff === 'Done' || eff === 'Completed';
                  const isOver = eff === 'Overdue';
                  const assignedUser = users.find((u) => u.id === instance.userId);
                  const parent = tasks.find((t) => t.id === instance.taskId);
                  const completedDateFormatted = instance.completedAt
                    ? new Date(instance.completedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Completed';

                  return (
                    <div
                      key={instance.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <StatusBadge status={eff} />
                        <span className="text-[10px] font-mono text-slate-400">ID: {instance.id}</span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {instance.title}
                        </h3>
                        {instance.remarks && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 mt-1">
                            <strong className="text-slate-700">Remarks:</strong> {instance.remarks}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <CategoryBadge category={instance.category || parent?.category || 'General'} />
                        <SubcategoryBadge subcategory={instance.subcategory || parent?.subcategory || 'General'} />
                        {instance.attachment && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Paperclip className="w-2.5 h-2.5" /> Proof Attached
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Assigned Doer:</span>
                          <span className="font-semibold text-slate-800">
                            {assignedUser?.name || instance.userId || 'Staff'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Given By:</span>
                          <span className="font-medium text-slate-700">
                            {instance.givenBy || parent?.givenBy || parent?.createdBy || 'Admin'}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center justify-between pt-1">
                          <div>
                            {isDone ? (
                              <span className="text-emerald-700 text-xs font-semibold">
                                Completed: {completedDateFormatted}
                              </span>
                            ) : (
                              <span className={`text-xs ${isOver ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                                Due: {instance.dueDate || 'Today'} {isOver && '(OVERDUE)'}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenInstanceModal(instance);
                              setDetailModalTab('history');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          >
                            <History className="w-3 h-3" />
                            <span>Audit Trail</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. TASK EXECUTION & AUDIT MODAL */}
      {/* ============================================================== */}
      {selectedInstance && (
        <Modal
          isOpen={Boolean(selectedInstance)}
          onClose={() => setSelectedInstance(null)}
          title={selectedInstance.title}
          subtitle={`Category: ${selectedInstance.category || 'General'} • Subcategory: ${
            selectedInstance.subcategory || 'General'
          } • ID: ${selectedInstance.id}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6">
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setDetailModalTab('execution')}
                className={`pb-2.5 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                  detailModalTab === 'execution'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>Task Execution & Details</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailModalTab('history')}
                className={`pb-2.5 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                  detailModalTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Audit History ({activeTaskHistory.length})</span>
              </button>
            </div>

            {/* TAB 1: EXECUTION */}
            {detailModalTab === 'execution' && (
              <div className="space-y-5">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Category</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                      {selectedInstance.category || 'General'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Subcategory</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                      {selectedInstance.subcategory || 'General'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Task Type</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {selectedInstance.taskType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Priority</span>
                    <div className="mt-0.5">
                      <PriorityBadge priority={selectedInstance.priority} />
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Due Date</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {selectedInstance.dueDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Status</span>
                    <div className="mt-0.5">
                      <StatusBadge status={getEffectiveStatus(selectedInstance)} />
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Assigned By</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                      {modalParentTask?.createdBy || 'Admin'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Given By</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                      {modalParentTask?.givenBy || 'Director'}
                    </span>
                  </div>
                </div>

                {modalParentTask?.description && (
                  <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-800 block mb-1">Instructions:</span>
                    {modalParentTask.description}
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-900">Need more time?</h4>
                    <p className="text-[11px] text-indigo-700">
                      Due Date: <strong>{selectedInstance.dueDate}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewDueDate(selectedInstance.dueDate);
                      setDateExtendModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Extend Date</span>
                  </button>
                </div>

                <form onSubmit={handleSubmitExecution} className="space-y-4 pt-2 border-t border-slate-200">
                  {selectedInstance.taskType === 'Checklist' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-900 block">
                        Verify Checklist Items
                      </label>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {localChecklistItems.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleToggleModalChecklistItem(item.id)}
                            className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer text-xs transition-colors ${
                              item.completed
                                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => {}}
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none"
                            />
                            <span
                              className={`flex-1 ${
                                item.completed ? 'line-through text-slate-400' : ''
                              }`}
                            >
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mandatory Proof Warning Banner */}
                  {Boolean(selectedInstance.requiredAttachment || modalParentTask?.requiredAttachment) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-900">Proof Attachment Mandatory:</span>
                        <p className="mt-0.5 text-amber-700 leading-relaxed">
                          The assigner has marked proof attachment as required for this task. You must upload a document or photo proof before the task can be marked as Done.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Assigner Guidelines / Reference Document if available */}
                  {modalParentTask?.attachment && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-700 truncate">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate font-medium">Assigner Reference: {modalParentTask.attachment.name}</span>
                      </div>
                      {modalParentTask.attachment.data && (
                        <a
                          href={modalParentTask.attachment.data}
                          download={modalParentTask.attachment.name}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold shrink-0 ml-2"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Update Status <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={execStatus}
                        onChange={(e) => setExecStatus(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done (Completed &rarr; Move to History)</option>
                        <option value="Not Done">Not Done</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Proof Attachment {Boolean(selectedInstance.requiredAttachment || modalParentTask?.requiredAttachment) && (
                            <span className="text-rose-500 font-bold">* (Mandatory)</span>
                          )}
                        </label>
                        {Boolean(selectedInstance.requiredAttachment || modalParentTask?.requiredAttachment) && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                            Required for Done
                          </span>
                        )}
                      </div>
                      {!execAttachment ? (
                        <label className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-xl cursor-pointer transition-all ${
                          Boolean(selectedInstance.requiredAttachment || modalParentTask?.requiredAttachment) && execStatus === 'Done'
                            ? 'bg-rose-50 border-2 border-dashed border-rose-300 text-rose-700 hover:bg-rose-100/70'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}>
                          <Paperclip className="w-4 h-4 text-slate-400" />
                          <span>Upload Proof File / Photo</span>
                          <input
                            type="file"
                            onChange={handleExecFileChange}
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx"
                          />
                        </label>
                      ) : (
                        <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="truncate text-emerald-900 font-medium">
                              {execAttachment.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExecAttachment(null)}
                            className="text-slate-400 hover:text-rose-600 ml-2 font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Execution Remarks & Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Add completion observations, notes..."
                      value={execRemarks}
                      onChange={(e) => setExecRemarks(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedInstance(null)}
                      className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                    >
                      Save Task Execution
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: AUDIT TRAIL */}
            {detailModalTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Chronological Audit Trail</span>
                  <span>Immutable log</span>
                </div>

                {activeTaskHistory.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">
                    No history records found for this task.
                  </p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {activeTaskHistory.map((hist) => (
                      <div key={hist.id} className="relative">
                        <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800">{hist.action}</span>
                            <span className="font-mono text-slate-400 text-[10px]">
                              {hist.date} {hist.time}
                            </span>
                          </div>
                          <p className="text-slate-600">
                            By: <strong className="text-slate-800">{hist.user}</strong>
                          </p>
                          {hist.note && (
                            <p className="text-slate-700 font-medium pt-0.5">{hist.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* 7. DATE EXTEND MODAL */}
      {/* ============================================================== */}
      <Modal
        isOpen={dateExtendModalOpen}
        onClose={() => setDateExtendModalOpen(false)}
        title="Extend Task Due Date"
        subtitle="Postpone task deadline with justification and audit trail."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleDateExtendSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 text-slate-600">
            <p>
              Current Due Date:{' '}
              <strong className="text-slate-900">{selectedInstance?.dueDate}</strong>
            </p>
            <p>
              Requested by:{' '}
              <strong className="text-slate-900">{currentUser?.name}</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Due Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              min={selectedInstance?.dueDate}
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Extension <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Explain why deadline needs to be extended..."
              value={dateExtendReason}
              onChange={(e) => setDateExtendReason(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDateExtendModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              Confirm Extension
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
