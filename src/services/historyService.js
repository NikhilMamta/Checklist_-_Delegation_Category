import { getData, addData, STORAGE_KEYS } from './storage.js';
import { generateId } from './idGenerator.js';

/**
 * Valid action types for history logging
 */
export const HISTORY_ACTIONS = {
  TASK_CREATED: 'Task Created',
  TASK_ASSIGNED: 'Task Assigned',
  TASK_UPDATED: 'Task Updated',
  STATUS_CHANGED: 'Status Changed',
  CHECKLIST_UPDATED: 'Checklist Updated',
  REMARKS_ADDED: 'Remarks Added',
  ATTACHMENT_ADDED: 'Attachment Added',
  DATE_EXTENDED: 'Date Extended',
  TASK_COMPLETED: 'Task Completed',
  TASK_CANCELLED: 'Task Cancelled',
};

/**
 * Logs a task history entry to LocalStorage
 *
 * @param {Object} params
 * @param {string} params.taskId - Required task ID
 * @param {string} [params.instanceId] - Optional instance ID
 * @param {string} params.action - One of HISTORY_ACTIONS
 * @param {string|Object} params.user - User name or user object who performed the action
 * @param {any} [params.oldValue] - Value before action
 * @param {any} [params.newValue] - Value after action
 * @param {string} [params.note] - Optional custom remarks or notes
 */
export const logHistory = ({
  taskId,
  instanceId = null,
  action,
  user,
  oldValue = null,
  newValue = null,
  note = '',
}) => {
  if (!taskId || !action) {
    console.warn('logHistory called with missing taskId or action', { taskId, action });
    return null;
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0]; // HH:mm:ss

  // Resolve user display name
  let userName = 'System';
  if (typeof user === 'string' && user.trim()) {
    userName = user;
  } else if (user && typeof user === 'object') {
    userName = user.name || user.id || 'User';
  }

  const historyEntry = {
    id: generateId('HIST'),
    taskId,
    instanceId,
    action,
    user: userName,
    date: dateStr,
    time: timeStr,
    oldValue: oldValue !== null && typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue ?? ''),
    newValue: newValue !== null && typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue ?? ''),
    note: note || '',
    createdAt: now.toISOString(),
  };

  addData(STORAGE_KEYS.TASK_HISTORY, historyEntry);
  return historyEntry;
};

/**
 * Retrieves all history records for a specific task
 */
export const getTaskHistory = (taskId) => {
  const allHistory = getData(STORAGE_KEYS.TASK_HISTORY, []);
  return allHistory
    .filter((entry) => entry.taskId === taskId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

/**
 * Retrieves all history records for a specific instance
 */
export const getInstanceHistory = (instanceId) => {
  const allHistory = getData(STORAGE_KEYS.TASK_HISTORY, []);
  return allHistory
    .filter((entry) => entry.instanceId === instanceId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};
