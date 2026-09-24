import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ChevronDown,
  Calendar,
  Clock,
  Paperclip,
  Plus,
  Trash2,
  Building,
  Tag,
  ListPlus,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { createTask } from '../services/taskService';
import { HOSPITAL_CATEGORIES, getSubcategoriesForCategory } from '../constants/taskCategories';

export const SelfAssignPage = () => {
  const navigate = useNavigate();
  const { departments, groups, currentUser, showToast, canCurrentUserSelfAssign } = useApp();

  const isPermitted = canCurrentUserSelfAssign();
  const todayStr = new Date().toISOString().split('T')[0];

  const deptList = useMemo(() => {
    return departments && departments.length > 0 ? departments : groups;
  }, [departments, groups]);

  // 1. Department
  const userDefaultDept = currentUser?.departmentId || currentUser?.groupId || deptList[0]?.id || '';
  const [departmentId, setDepartmentId] = useState(userDefaultDept);

  // 2. Category & Subcategory
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

  // 3. Frequency
  const [frequency, setFrequency] = useState('Daily');

  // 4. Start Date & Due Date
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // 5. Task Description & Instructions / Add Task Multiples
  const [taskDescription, setTaskDescription] = useState('');
  const [enableMultiples, setEnableMultiples] = useState(false);
  const [tasksMultiples, setTasksMultiples] = useState([
    { id: 'TASK-1', title: '', priority: 'Medium', description: '' },
  ]);

  // 6. Required Attachment & Reminder Alerts
  const [requiredAttachment, setRequiredAttachment] = useState(false);
  const [reminderAlerts, setReminderAlerts] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');

  // Proof attachment file
  const [proofAttachment, setProofAttachment] = useState(null);

  // Keep department in sync
  useEffect(() => {
    if (!departmentId && groups.length > 0) {
      setDepartmentId(currentUser?.groupId || groups[0].id);
    }
  }, [groups, departmentId, currentUser]);

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

    if (!currentUser) {
      showToast('No active user logged in', 'error');
      return;
    }

    if (!departmentId) {
      showToast('Please select a Department', 'error');
      return;
    }

    if (!enableMultiples && !taskDescription.trim()) {
      showToast('Please enter Task Description & Instructions', 'error');
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
              givenBy: currentUser.name,
              assignBy: `${currentUser.name} (Self-Assigned)`,
              category: finalCategory,
              subcategory: finalSubcategory,
              assignedUserIds: [currentUser.id],
              title: t.title.trim(),
              description: t.description.trim() || taskDescription.trim(),
              priority: t.priority || 'Medium',
              startDate,
              dueDate: endDate,
              endDate,
              frequency,
              enableReminder: reminderAlerts,
              reminder: reminderAlerts,
              reminderTime: reminderAlerts ? reminderTime : '',
              requiredAttachment,
              attachment: proofAttachment,
              remarks: `Self-assigned by ${currentUser.name} on ${todayStr}`,
              checklistItems: [{ id: 'ITEM-1', text: t.title.trim(), required: true }],
            },
            currentUser
          );
        });

        showToast(
          `Successfully self-assigned ${validTasks.length} task(s) to your checklist!`,
          'success'
        );
      } else {
        createTask(
          {
            taskType,
            assignmentLevel: 'Individual User',
            groupId: departmentId,
            subgroupId: null,
            department: departmentId,
            group: null,
            givenBy: currentUser.name,
            assignBy: `${currentUser.name} (Self-Assigned)`,
            category: finalCategory,
            subcategory: finalSubcategory,
            assignedUserIds: [currentUser.id],
            title: taskDescription.trim().slice(0, 75) + (taskDescription.length > 75 ? '...' : ''),
            description: taskDescription.trim(),
            priority: 'Medium',
            startDate,
            dueDate: endDate,
            endDate,
            frequency,
            enableReminder: reminderAlerts,
            reminder: reminderAlerts,
            reminderTime: reminderAlerts ? reminderTime : '',
            requiredAttachment,
            attachment: proofAttachment,
            remarks: `Self-assigned by ${currentUser.name} on ${todayStr}`,
            checklistItems: [{ id: 'ITEM-1', text: 'Complete self-assigned task instructions', required: true }],
          },
          currentUser
        );

        showToast('Task successfully self-assigned to your checklist!', 'success');
      }

      navigate('/my-tasks');
    } catch (error) {
      console.error('Self task assignment error:', error);
      showToast('Failed to self-assign task. Check console.', 'error');
    }
  };

  // If permission is not granted to this user
  if (!isPermitted) {
    return (
      <div className="py-12 px-4 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Self-Assign Permission Required</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            You do not currently have permission to self-assign tasks or checklists. This feature is restricted to employees who have been granted access by a Hospital Administrator.
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
            Active User: <span className="font-semibold text-slate-800">{currentUser?.name}</span> ({currentUser?.role})
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/my-tasks')}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
            >
              Go to My Tasks
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 sm:py-6 px-1 sm:px-4 flex items-center justify-center">
      {/* Light Theme Modal Card */}
      <div className="w-full max-w-2xl bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Self Assign Task</h2>
              <p className="text-xs text-slate-500">Create a task or checklist assigned directly to yourself</p>
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
          {/* ROW 1: Department * & Pre-locked Assigned To (Self) */}
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
                Assigned To (Doer)
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 shadow-2xs">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    {currentUser?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="truncate">
                  <span>{currentUser?.name}</span>
                  <span className="ml-1 text-[10px] text-emerald-700 font-normal">
                    (Self • {currentUser?.role})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: Frequency (Half width) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <option value="Daily">Daily (Recurring Checklist)</option>
                  <option value="One Time (Delegation)">One Time (Single Task)</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Event Based">Event Based</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium shadow-2xs"
              />
            </div>
          </div>

          {/* ROW 3: Category & Subcategory Selector Box */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                Category & Subcategory
              </span>
              <span className="text-[11px] text-blue-600 font-medium">
                Organized in My Tasks
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

          {/* ROW 4: End Date / Due Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Due Date / End Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium shadow-2xs"
            />
          </div>

          {/* ROW 5: Task Description & Instructions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Task Description & Instructions <span className="text-rose-500">*</span>
              </label>

              <button
                type="button"
                onClick={() => setEnableMultiples(!enableMultiples)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
                  enableMultiples
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ListPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>{enableMultiples ? 'Multiple Tasks (ON)' : '+ Add Multiples'}</span>
              </button>
            </div>

            {!enableMultiples ? (
              <textarea
                rows={3}
                required={!enableMultiples}
                placeholder="Enter self-assigned task details, protocol checklist, or steps to complete..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white text-slate-800 placeholder-slate-400 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 resize-none font-medium leading-relaxed shadow-2xs"
              />
            ) : (
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Tasks to self-assign:
                  </span>
                  <button
                    type="button"
                    onClick={handleAddTaskRow}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
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
                          className="text-slate-400 hover:text-rose-500 p-1"
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
                        className="sm:col-span-2 px-3 py-1.5 text-xs bg-white text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <select
                        value={taskRow.priority}
                        onChange={(e) =>
                          handleUpdateTaskRow(taskRow.id, 'priority', e.target.value)
                        }
                        className="px-2 py-1.5 text-xs bg-white text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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

          {/* ROW 6: Required Attachment & Reminder Alerts */}
          <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={requiredAttachment}
                onChange={(e) => setRequiredAttachment(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
              />
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 block">
                  Required Proof Upload
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Requires proof attachment before completion
                </span>
              </div>
            </label>

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
                  Enable notification alert
                </span>
              </div>
            </label>
          </div>

          {/* Optional Proof File Upload if Required Attachment is selected */}
          {requiredAttachment && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Attach Reference Document:
              </label>
              {!proofAttachment ? (
                <label className="flex items-center justify-center gap-2 p-3.5 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl cursor-pointer bg-white text-xs text-slate-600 transition-colors">
                  <Paperclip className="w-4 h-4 text-blue-600" />
                  <span>Upload SOP / Reference document (Max 3MB)</span>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between text-xs p-2.5 bg-white border border-slate-200 rounded-lg">
                  <span className="text-blue-700 font-medium truncate">
                    {proofAttachment.name} ({proofAttachment.size})
                  </span>
                  <button
                    type="button"
                    onClick={() => setProofAttachment(null)}
                    className="text-slate-400 hover:text-rose-600 font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Reminder Time */}
          {reminderAlerts && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-slate-700 font-medium">Alert Time:</span>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="px-2.5 py-1 bg-white text-slate-800 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}

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
              className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Self Assign Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
