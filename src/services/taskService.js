import { getData, addData, updateData, STORAGE_KEYS } from './storage.js';
import { generateId } from './idGenerator.js';
import { logHistory, HISTORY_ACTIONS } from './historyService.js';
import { saveTaskToGroupTask } from './supabaseClient.js';

/**
 * Check if a date string is past today's date (at end-of-day or exact time)
 */
export const isOverdue = (dueDate, status) => {
  if (!dueDate) return false;
  const terminalStatuses = ['Done', 'Completed', 'Cancelled'];
  if (terminalStatuses.includes(status)) return false;

  const due = new Date(dueDate);
  // Set to end of day if no time component
  if (dueDate.length <= 10) {
    due.setHours(23, 59, 59, 999);
  }
  return new Date() > due;
};

/**
 * Returns effective display status considering dynamic overdue calculation
 */
export const getEffectiveStatus = (taskOrInstance) => {
  if (!taskOrInstance) return 'Pending';
  const status = taskOrInstance.status || 'Pending';
  if (isOverdue(taskOrInstance.dueDate, status)) {
    return 'Overdue';
  }
  return status;
};

/**
 * Resolves list of active user IDs based on assignment level
 */
export const resolveAssignedUsers = (assignmentLevel, groupId, subgroupId, selectedUserIds = []) => {
  const allUsers = getData(STORAGE_KEYS.USERS, []);
  const activeUsers = allUsers.filter((u) => u.status === 'Active');

  if (assignmentLevel === 'Individual User') {
    return activeUsers.filter((u) => selectedUserIds.includes(u.id));
  }

  if (assignmentLevel === 'Entire Subgroup') {
    return activeUsers.filter((u) => u.groupId === groupId && u.subgroupId === subgroupId);
  }

  if (assignmentLevel === 'Entire Group') {
    return activeUsers.filter((u) => u.groupId === groupId);
  }

  return [];
};

/**
 * Create a new Task with associated assignments and initial instances
 */
export const createTask = (taskData, creatorUser) => {
  const taskId = generateId('TASK');
  const now = new Date().toISOString();

  // Target users
  const targetUsers = resolveAssignedUsers(
    taskData.assignmentLevel,
    taskData.groupId,
    taskData.subgroupId,
    taskData.assignedUserIds || []
  );

  const assignedUserIds = targetUsers.map((u) => u.id);

  // Normalize checklist items if Checklist
  const checklistItems = (taskData.checklistItems || []).map((item, idx) => ({
    id: item.id || `ITEM-${idx + 1}`,
    text: typeof item === 'string' ? item : item.text,
    required: true,
  }));

  const newTask = {
    id: taskId,
    taskType: taskData.taskType, // 'Checklist' | 'Delegation'
    assignmentLevel: taskData.assignmentLevel, // 'Individual User' | 'Entire Subgroup' | 'Entire Group'
    groupId: taskData.groupId,
    subgroupId: taskData.subgroupId || null,
    department: taskData.department || taskData.groupId,
    group: taskData.group || taskData.subgroupId || null,
    givenBy: taskData.givenBy || '',
    assignBy: taskData.assignBy || (creatorUser ? (creatorUser.name || creatorUser.id) : 'Admin'),
    category: taskData.category || 'General Operations',
    subcategory: taskData.subcategory || 'General',
    assignedUserIds,
    title: taskData.title.trim(),
    description: (taskData.description || '').trim(),
    priority: taskData.priority || 'Medium', // 'Low' | 'Medium' | 'High' | 'Urgent'
    startDate: taskData.startDate || new Date().toISOString().split('T')[0],
    dueDate: taskData.dueDate || taskData.endDate || new Date().toISOString().split('T')[0],
    endDate: taskData.endDate || taskData.dueDate || null,
    frequency: taskData.frequency || (taskData.taskType === 'Checklist' ? 'Daily' : 'One Time'),
    reminder: Boolean(taskData.reminder || taskData.enableReminder),
    reminderTime: taskData.reminderTime || '',
    requiredAttachment: Boolean(taskData.requiredAttachment),
    remarks: (taskData.remarks || '').trim(),
    attachment: taskData.attachment || taskData.proofAttachment || null,
    tasksMultiples: taskData.tasksMultiples || [],
    checklistItems,
    status: 'Pending',
    createdBy: taskData.assignBy || (creatorUser ? (creatorUser.name || creatorUser.id) : 'Admin'),
    createdAt: now,
    updatedAt: now,
  };

  // 1. Save main Task
  addData(STORAGE_KEYS.TASKS, newTask);

  // 2. Save Task Assignments
  targetUsers.forEach((user) => {
    const assignmentId = generateId('ASSIGN');
    const assignment = {
      id: assignmentId,
      taskId,
      userId: user.id,
      assignedAt: now,
    };
    addData(STORAGE_KEYS.TASK_ASSIGNMENTS, assignment);
  });

  // 3. Create initial Task Instances for each assigned user
  const createdInstances = [];
  targetUsers.forEach((user) => {
    const instanceId = generateId('INST');
    const instance = {
      id: instanceId,
      taskId,
      userId: user.id,
      title: newTask.title,
      taskType: newTask.taskType,
      priority: newTask.priority,
      groupId: newTask.groupId,
      subgroupId: newTask.subgroupId,
      department: newTask.department,
      group: newTask.group,
      givenBy: newTask.givenBy,
      assignBy: newTask.assignBy,
      category: newTask.category,
      subcategory: newTask.subcategory,
      startDate: newTask.startDate,
      dueDate: newTask.dueDate,
      endDate: newTask.endDate,
      frequency: newTask.frequency,
      status: 'Pending',
      tasksMultiples: newTask.tasksMultiples,
      checklistItemsStatus: checklistItems.map((item) => ({
        id: item.id,
        text: item.text,
        completed: false,
        completedAt: null,
      })),
      remarks: '',
      requiredAttachment: newTask.requiredAttachment,
      adminAttachment: newTask.attachment || null,
      attachment: null,
      dateExtensions: [],
      completedAt: null,
      completedBy: null,
      createdAt: now,
      updatedAt: now,
    };

    addData(STORAGE_KEYS.TASK_INSTANCES, instance);
    createdInstances.push(instance);
  });

  // 4. Log Task Created history
  logHistory({
    taskId,
    action: HISTORY_ACTIONS.TASK_CREATED,
    user: creatorUser,
    newValue: { title: newTask.title, type: newTask.taskType, priority: newTask.priority },
    note: `Created task "${newTask.title}" (${newTask.taskType})`,
  });

  // 5. Log Task Assigned history
  if (targetUsers.length > 0) {
    const userNames = targetUsers.map((u) => u.name).join(', ');
    logHistory({
      taskId,
      action: HISTORY_ACTIONS.TASK_ASSIGNED,
      user: creatorUser,
      newValue: userNames,
      note: `Assigned to ${targetUsers.length} user(s): ${userNames} (Level: ${newTask.assignmentLevel})`,
    });
  }

  return { task: newTask, instances: createdInstances };
};

/**
 * Extend Task / Instance Due Date
 */
export const extendDueDate = ({ taskId, instanceId, newDueDate, reason, user }) => {
  const tasks = getData(STORAGE_KEYS.TASKS, []);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) throw new Error('Task not found');

  const oldDueDate = task.dueDate;
  const now = new Date().toISOString();

  const extensionRecord = {
    oldDueDate,
    newDueDate,
    reason: reason || 'Due date extended by user',
    extendedBy: user ? (user.name || user.id) : 'User',
    timestamp: now,
  };

  // Update Task
  updateData(STORAGE_KEYS.TASKS, taskId, {
    dueDate: newDueDate,
  });

  // Update Instance if provided
  if (instanceId) {
    const instances = getData(STORAGE_KEYS.TASK_INSTANCES, []);
    const instance = instances.find((i) => i.id === instanceId);
    if (instance) {
      const currentExtensions = instance.dateExtensions || [];
      updateData(STORAGE_KEYS.TASK_INSTANCES, instanceId, {
        dueDate: newDueDate,
        dateExtensions: [...currentExtensions, extensionRecord],
      });
    }
  }

  // Log History
  logHistory({
    taskId,
    instanceId,
    action: HISTORY_ACTIONS.DATE_EXTENDED,
    user,
    oldValue: oldDueDate,
    newValue: newDueDate,
    note: reason ? `Extended to ${newDueDate}. Reason: ${reason}` : `Extended to ${newDueDate}`,
  });

  return extensionRecord;
};

/**
 * Update checklist items in an instance (toggle check state)
 */
export const updateChecklistItems = ({ instanceId, taskId, itemsStatus, user }) => {
  const instances = getData(STORAGE_KEYS.TASK_INSTANCES, []);
  const instance = instances.find((i) => i.id === instanceId);
  if (!instance) throw new Error('Instance not found');

  const completedCount = itemsStatus.filter((i) => i.completed).length;
  const totalCount = itemsStatus.length;

  updateData(STORAGE_KEYS.TASK_INSTANCES, instanceId, {
    checklistItemsStatus: itemsStatus,
  });

  logHistory({
    taskId,
    instanceId,
    action: HISTORY_ACTIONS.CHECKLIST_UPDATED,
    user,
    newValue: `${completedCount}/${totalCount} completed`,
    note: `Checklist progress: ${completedCount}/${totalCount} items completed`,
  });
};

/**
 * Complete a Task Instance (Checklist or Delegation)
 */
export const completeInstance = ({
  instanceId,
  taskId,
  status, // 'Done' | 'Not Done' | 'In Progress' | 'Cancelled'
  remarks,
  attachment,
  checklistItemsStatus,
  user,
}) => {
  const instances = getData(STORAGE_KEYS.TASK_INSTANCES, []);
  const instance = instances.find((i) => i.id === instanceId);
  if (!instance) throw new Error('Instance not found');

  const tasks = getData(STORAGE_KEYS.TASKS, []);
  const parentTask = tasks.find((t) => t.id === taskId);
  const isAttachmentRequired = Boolean(instance.requiredAttachment || parentTask?.requiredAttachment);

  if (status === 'Done' && isAttachmentRequired) {
    const finalAttachment = attachment || instance.attachment;
    if (!finalAttachment) {
      throw new Error('A proof attachment is mandatory before this task can be marked as Done.');
    }
  }

  const oldStatus = instance.status;
  const now = new Date().toISOString();

  const updates = {
    status,
    remarks: remarks !== undefined ? remarks : instance.remarks,
    updatedAt: now,
  };

  if (attachment) {
    updates.attachment = attachment;
    logHistory({
      taskId,
      instanceId,
      action: HISTORY_ACTIONS.ATTACHMENT_ADDED,
      user,
      newValue: attachment.name,
      note: `Attached file: ${attachment.name}`,
    });
  }

  if (remarks && remarks !== instance.remarks) {
    logHistory({
      taskId,
      instanceId,
      action: HISTORY_ACTIONS.REMARKS_ADDED,
      user,
      newValue: remarks,
      note: `Remarks added: ${remarks}`,
    });
  }

  if (checklistItemsStatus) {
    updates.checklistItemsStatus = checklistItemsStatus;
  }

  if (status === 'Done') {
    updates.completedAt = now;
    updates.completedBy = user ? (user.name || user.id) : 'User';

    logHistory({
      taskId,
      instanceId,
      action: HISTORY_ACTIONS.TASK_COMPLETED,
      user,
      oldValue: oldStatus,
      newValue: 'Done',
      note: 'Task marked as Done/Completed',
    });
  } else if (status === 'Cancelled') {
    logHistory({
      taskId,
      instanceId,
      action: HISTORY_ACTIONS.TASK_CANCELLED,
      user,
      oldValue: oldStatus,
      newValue: 'Cancelled',
      note: 'Task cancelled',
    });
  } else if (oldStatus !== status) {
    logHistory({
      taskId,
      instanceId,
      action: HISTORY_ACTIONS.STATUS_CHANGED,
      user,
      oldValue: oldStatus,
      newValue: status,
      note: `Status changed from ${oldStatus} to ${status}`,
    });
  }

  updateData(STORAGE_KEYS.TASK_INSTANCES, instanceId, updates);

  // Check if all instances of parent task are completed to update parent task status
  const allInstances = getData(STORAGE_KEYS.TASK_INSTANCES, []);
  const taskInstances = allInstances.filter((i) => i.taskId === taskId);
  const allDone = taskInstances.length > 0 && taskInstances.every((i) => (i.id === instanceId ? status === 'Done' : i.status === 'Done'));

  if (allDone) {
    updateData(STORAGE_KEYS.TASKS, taskId, { status: 'Done' });
  } else if (status === 'In Progress' || taskInstances.some((i) => i.status === 'In Progress')) {
    updateData(STORAGE_KEYS.TASKS, taskId, { status: 'In Progress' });
  }

  return updates;
};

/**
 * Convenience helper to directly mark a task instance as Done and move it to Task History
 */
export const markTaskDone = ({
  instanceId,
  taskId,
  user,
  remarks = '',
  attachment = null,
  checklistItemsStatus = null,
}) => {
  return completeInstance({
    instanceId,
    taskId,
    status: 'Done',
    remarks,
    attachment,
    checklistItemsStatus,
    user,
  });
};
