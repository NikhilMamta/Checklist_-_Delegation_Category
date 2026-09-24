import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ChevronDown,
  Check,
  Calendar,
  Clock,
  Paperclip,
  Plus,
  Trash2,
  Building,
  Tag,
  ListPlus,
  ClipboardList,
  Search,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { createTask } from '../services/taskService';
import { EmptyState } from '../components/common/EmptyState';
import { HOSPITAL_CATEGORIES, getSubcategoriesForCategory } from '../constants/taskCategories';

export const TaskAssignPage = () => {
  const navigate = useNavigate();
  const { departments, groups, users, currentUser, showToast } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];

  // Available departments list (departments from settings, with groups as fallback)
  const deptList = useMemo(() => {
    return departments && departments.length > 0 ? departments : groups;
  }, [departments, groups]);

  // 1. Department *
  const [departmentId, setDepartmentId] = useState(deptList[0]?.id || '');

  // 2. Assign From (Assigner) *
  const [assignFrom, setAssignFrom] = useState(
    currentUser ? `${currentUser.name} (${currentUser.role})` : 'Admin'
  );

  // 3. Category & Subcategory *
  const [category, setCategory] = useState('Patient Care & Clinical');
  const [customCategory, setCustomCategory] = useState('');
  const [subcategory, setSubcategory] = useState('Ward Rounds & Doctor Notes');
  const [customSubcategory, setCustomSubcategory] = useState('');

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    if (newCat !== 'Custom') {
      const subs = getSubcategoriesForCategory(newCat);
      setSubcategory(subs[0] || 'General');
    } else {
      setSubcategory('Custom');
    }
  };

  const availableSubcategories = useMemo(() => {
    if (category === 'Custom') return [];
    return getSubcategoriesForCategory(category);
  }, [category]);

  // 4. Doer's Name (Select Multiple Employees) *
  const [selectedDoerIds, setSelectedDoerIds] = useState([]);
  const [doerDropdownOpen, setDoerDropdownOpen] = useState(false);
  const [doerSearchQuery, setDoerSearchQuery] = useState('');
  const doerDropdownRef = useRef(null);

  // 5. Frequency *
  const [frequency, setFrequency] = useState('One Time (Delegation)');

  // 6. Start Date * & End Date / Due Date *
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // 7. Task Title & Priority / Add Task Multiples
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskDescription, setTaskDescription] = useState('');
  const [enableMultiples, setEnableMultiples] = useState(false);
  const [tasksMultiples, setTasksMultiples] = useState([
    { id: 'TASK-1', title: '', priority: 'Medium', description: '' },
  ]);

  // 8. Required Attachment & Reminder Alerts
  const [requiredAttachment, setRequiredAttachment] = useState(false);
  const [reminderAlerts, setReminderAlerts] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');

  // Proof attachment file
  const [proofAttachment, setProofAttachment] = useState(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (doerDropdownRef.current && !doerDropdownRef.current.contains(e.target)) {
        setDoerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync department when deptList loads
  useEffect(() => {
    if (!departmentId && deptList.length > 0) {
      setDepartmentId(deptList[0].id);
    }
  }, [deptList, departmentId]);

  // Reset selected doers when department changes
  useEffect(() => {
    setSelectedDoerIds([]);
  }, [departmentId]);

  // Available active users in selected department
  const availableUsers = useMemo(() => {
    const active = users.filter((u) => u.status === 'Active');
    if (!departmentId) return active;
    const childGroupIds = groups.filter((g) => g.departmentId === departmentId).map((g) => g.id);
    const deptUsers = active.filter(
      (u) =>
        u.groupId === departmentId ||
        childGroupIds.includes(u.groupId) ||
        u.departmentId === departmentId
    );
    return deptUsers.length > 0 ? deptUsers : active;
  }, [users, groups, departmentId]);

  // Filtered doers based on search inside dropdown
  const filteredDoers = useMemo(() => {
    if (!doerSearchQuery.trim()) return availableUsers;
    const q = doerSearchQuery.toLowerCase();
    return availableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))
    );
  }, [availableUsers, doerSearchQuery]);

  // Toggle doer selection
  const handleToggleDoer = (userId) => {
    setSelectedDoerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllDoers = () => {
    if (selectedDoerIds.length === availableUsers.length) {
      setSelectedDoerIds([]);
    } else {
      setSelectedDoerIds(availableUsers.map((u) => u.id));
    }
  };

  // Add Task Multiples handlers
  const handleAddTaskRow = () => {
    const nextIdx = tasksMultiples.length + 1;
    setTasksMultiples([
      ...tasksMultiples,
      {
        id: `TASK-${Date.now()}-${nextIdx}`,
        title: '',
        priority: 'Medium',
        description: '',
      },
    ]);
  };

  const handleUpdateTaskRow = (id, field, value) => {
    setTasksMultiples(
      tasksMultiples.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleRemoveTaskRow = (id) => {
    if (tasksMultiples.length <= 1) {
      showToast('At least one task row is required', 'warning');
      return;
    }
    setTasksMultiples(tasksMultiples.filter((t) => t.id !== id));
  };

  // Proof attachment handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast('File size must be under 3MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProofAttachment({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type,
        dataUrl: reader.result,
      });
      showToast(`Attachment ready: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!departmentId) {
      showToast('Please select a Department', 'error');
      return;
    }

    if (selectedDoerIds.length === 0) {
      showToast('Please select at least one Doer (Employee)', 'error');
      return;
    }

    // Validate task title or tasks multiples
    if (!enableMultiples && !taskTitle.trim()) {
      showToast('Please enter a Task Title', 'error');
      return;
    }

    if (enableMultiples) {
      const valid = tasksMultiples.filter((t) => t.title.trim().length > 0);
      if (valid.length === 0) {
        showToast('Please enter at least one Task Title in Task Multiples', 'error');
        return;
      }
    }

    const finalCategory = category === 'Custom' ? customCategory.trim() || 'General Operations' : category;
    const finalSubcategory = subcategory === 'Custom'
      ? (customSubcategory.trim() || 'General')
      : (category === 'Custom' ? (customSubcategory.trim() || 'General') : subcategory);
    const taskType = frequency.includes('Delegation') || frequency === 'One Time' ? 'Delegation' : 'Checklist';

    try {
      if (enableMultiples) {
        // Create multiple tasks
        const validTasks = tasksMultiples.filter((t) => t.title.trim().length > 0);
        validTasks.forEach((t) => {
          createTask(
            {
              taskType,
              assignmentLevel: 'Individual User',
              groupId: departmentId,
              subgroupId: null,
              department: departmentId,
              group: null,
              givenBy: assignFrom.trim(),
              assignBy: assignFrom.trim(),
              category: finalCategory,
              subcategory: finalSubcategory,
              assignedUserIds: selectedDoerIds,
              title: t.title.trim(),
              description: '',
              priority: t.priority || 'Medium',
              startDate,
              dueDate: endDate,
              endDate,
              frequency,
              enableReminder: reminderAlerts,
              reminder: reminderAlerts,
              reminderTime: reminderAlerts ? reminderTime : '',
              requiredAttachment,
              attachment: null,
              remarks: `Assigned by: ${assignFrom}`,
              checklistItems: [{ id: 'ITEM-1', text: t.title.trim(), required: true }],
            },
            currentUser
          );
        });

        showToast(
          `Successfully assigned ${validTasks.length} task(s) to ${selectedDoerIds.length} doer(s)!`,
          'success'
        );
      } else {
        // Create single master task
        createTask(
          {
            taskType,
            assignmentLevel: 'Individual User',
            groupId: departmentId,
            subgroupId: null,
            department: departmentId,
            group: null,
            givenBy: assignFrom.trim(),
            assignBy: assignFrom.trim(),
            category: finalCategory,
            subcategory: finalSubcategory,
            assignedUserIds: selectedDoerIds,
            title: taskTitle.trim(),
            description: '',
            priority: taskPriority || 'Medium',
            startDate,
            dueDate: endDate,
            endDate,
            frequency,
            enableReminder: reminderAlerts,
            reminder: reminderAlerts,
            reminderTime: reminderAlerts ? reminderTime : '',
            requiredAttachment,
            attachment: null,
            remarks: `Assigned by: ${assignFrom}`,
            checklistItems: [{ id: 'ITEM-1', text: taskTitle.trim(), required: true }],
          },
          currentUser
        );

        showToast(`Task successfully assigned to ${selectedDoerIds.length} doer(s)!`, 'success');
      }

      navigate('/my-tasks');
    } catch (error) {
      console.error('Task assignment error:', error);
      showToast('Failed to assign task. Check console for details.', 'error');
    }
  };

  // If no Groups exist
  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Building}
          title="No Departments Created Yet"
          description="Please create at least one Department before assigning tasks."
          actionText="Create Department"
          onAction={() => navigate('/users')}
        />
      </div>
    );
  }

  return (
    <div className="py-2 sm:py-6 px-1 sm:px-4 flex items-center justify-center">
      {/* Light Theme Modal Card matching entire site UI */}
      <div className="w-full max-w-2xl bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Assign New Task</h2>
              <p className="text-xs text-slate-500">Create and delegate checklist or one-time assignments</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/my-tasks')}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-2 rounded-xl transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5">
          {/* ROW 1: Department * & Assign From (Assigner) * */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Department <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 appearance-none font-medium cursor-pointer shadow-2xs transition-colors"
                >
                  {deptList.map((d) => (
                    <option key={d.id} value={d.id} className="text-slate-800">
                      {d.name} {d.code ? `(${d.code})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assign From (Assigner) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={assignFrom}
                  onChange={(e) => setAssignFrom(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 appearance-none font-medium cursor-pointer shadow-2xs transition-colors"
                >
                  {users.length > 0 ? (
                    users.map((u) => (
                      <option
                        key={u.id}
                        value={`${u.name} (${u.role.toUpperCase()})`}
                        className="text-slate-800"
                      >
                        {u.name} ({u.role.toUpperCase()})
                      </option>
                    ))
                  ) : (
                    <option value="Admin (ADMIN)">Admin (ADMIN)</option>
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* ROW 2: Doer's Name (Compact width - 1 column) & Frequency (1 column) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Doer's Name */}
            <div className="relative" ref={doerDropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Doer's Name <span className="text-rose-500">*</span>
                </label>
                {availableUsers.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllDoers}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    {selectedDoerIds.length === availableUsers.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                )}
              </div>

              {/* Custom Multi-select trigger */}
              <div
                onClick={() => setDoerDropdownOpen(!doerDropdownOpen)}
                className={`w-full min-h-[42px] px-3.5 py-2 bg-white border rounded-xl cursor-pointer flex items-center justify-between gap-2 shadow-2xs transition-colors ${
                  doerDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                  {selectedDoerIds.length === 0 ? (
                    <span className="text-sm text-slate-400 font-medium">
                      Select doers...
                    </span>
                  ) : (
                    selectedDoerIds.map((id) => {
                      const doer = users.find((u) => u.id === id);
                      if (!doer) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium"
                        >
                          <span className="truncate max-w-[100px]">{doer.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleDoer(id);
                            }}
                            className="text-blue-500 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              {/* Dropdown Menu */}
              {doerDropdownOpen && (
                <div className="absolute left-0 right-0 sm:right-auto sm:w-[320px] mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-100">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={doerSearchQuery}
                      onChange={(e) => setDoerSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1">
                    {filteredDoers.length === 0 ? (
                      <p className="text-xs text-slate-500 p-2 text-center">
                        No matching active employees found.
                      </p>
                    ) : (
                      filteredDoers.map((doer) => {
                        const isSelected = selectedDoerIds.includes(doer.id);
                        return (
                          <div
                            key={doer.id}
                            onClick={() => handleToggleDoer(doer.id)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                              isSelected
                                ? 'bg-blue-50 text-blue-900 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded text-blue-600 focus:ring-blue-500 pointer-events-none"
                              />
                              {doer.avatar ? (
                                <img
                                  src={doer.avatar}
                                  alt={doer.name}
                                  className="w-6 h-6 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {doer.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="truncate">
                                <span className="block truncate text-slate-800">{doer.name}</span>
                                <span className="text-[10px] text-slate-500 block -mt-0.5 truncate">
                                  {doer.username ? `@${doer.username} • ` : ''}{doer.role}
                                </span>
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Frequency <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 appearance-none font-medium cursor-pointer shadow-2xs transition-colors"
                >
                  <option value="One Time (Delegation)">One Time (Delegation)</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Half-Yearly">Half-Yearly</option>
                  <option value="Annual">Annual</option>
                  <option value="Custom">Custom</option>
                  <option value="Event Based">Event Based</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Category & Subcategory Selector Box */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                Category & Subcategory Classification
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 appearance-none font-medium cursor-pointer shadow-2xs transition-colors"
                  >
                    {HOSPITAL_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.name} className="text-slate-800">
                        {cat.name}
                      </option>
                    ))}
                    <option value="Custom" className="text-slate-800">Custom Category...</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {category === 'Custom' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom category name"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="mt-2 w-full px-3.5 py-2 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                  />
                )}
              </div>

              {/* Subcategory */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Subcategory <span className="text-rose-500">*</span>
                </label>
                {category === 'Custom' ? (
                  <input
                    type="text"
                    required
                    placeholder="Enter subcategory name"
                    value={customSubcategory}
                    onChange={(e) => setCustomSubcategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium shadow-2xs"
                  />
                ) : (
                  <div>
                    <div className="relative">
                      <select
                        value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 appearance-none font-medium cursor-pointer shadow-2xs transition-colors"
                      >
                        {availableSubcategories.map((sub) => (
                          <option key={sub} value={sub} className="text-slate-800">
                            {sub}
                          </option>
                        ))}
                        <option value="Custom" className="text-slate-800">Custom Subcategory...</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    {subcategory === 'Custom' && (
                      <input
                        type="text"
                        required
                        placeholder="Enter custom subcategory"
                        value={customSubcategory}
                        onChange={(e) => setCustomSubcategory(e.target.value)}
                        className="mt-2 w-full px-3.5 py-2 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ROW 3: Start Date * & End Date / Due Date * */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                End Date / Due Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* ROW 4: Task Title / Add Task Multiples */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {enableMultiples ? 'Multiple Tasks in Batch' : 'Task Title'} <span className="text-rose-500">*</span>
              </label>

              {/* Toggle for Add Task Multiples */}
              <button
                type="button"
                onClick={() => setEnableMultiples(!enableMultiples)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  enableMultiples
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ListPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>{enableMultiples ? 'Single Task Mode' : '+ Add Task Multiples'}</span>
              </button>
            </div>

            {!enableMultiples ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="sm:col-span-3">
                  <input
                    type="text"
                    required={!enableMultiples}
                    placeholder="Enter task title (e.g., Morning ICU rounds, Clean OT 2)..."
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 placeholder-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium shadow-2xs transition-colors"
                  />
                </div>
                <div className="relative">
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium cursor-pointer shadow-2xs appearance-none transition-colors"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Urgent">Urgent Priority</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Tasks to assign in this batch:
                  </span>
                  <button
                    type="button"
                    onClick={handleAddTaskRow}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task</span>
                  </button>
                </div>

                {tasksMultiples.map((taskRow, idx) => (
                  <div
                    key={taskRow.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 relative shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-blue-700">
                        Task #{idx + 1}
                      </span>
                      {tasksMultiples.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTaskRow(taskRow.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Task title..."
                        value={taskRow.title}
                        onChange={(e) =>
                          handleUpdateTaskRow(taskRow.id, 'title', e.target.value)
                        }
                        className="sm:col-span-2 px-3 py-1.5 text-xs bg-white text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                      />
                      <select
                        value={taskRow.priority}
                        onChange={(e) =>
                          handleUpdateTaskRow(taskRow.id, 'priority', e.target.value)
                        }
                        className="px-2 py-1.5 text-xs bg-white text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium cursor-pointer"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ROW 5: Required Attachment & Reminder Alerts Container Box */}
          <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Required Attachment */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={requiredAttachment}
                onChange={(e) => setRequiredAttachment(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
              />
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 block">
                  Required Attachment
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Mandatory file upload on complete
                </span>
              </div>
            </label>

            {/* Reminder Alerts */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={reminderAlerts}
                onChange={(e) => setReminderAlerts(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
              />
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 block">
                  Reminder Alerts
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Enable notification alerts
                </span>
              </div>
            </label>
          </div>





          {/* Bottom Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate('/my-tasks')}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedDoerIds.length === 0}
              className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Assign to {selectedDoerIds.length} Doer(s)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
