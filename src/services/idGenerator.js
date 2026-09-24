import { getData, STORAGE_KEYS } from './storage.js';

/**
 * Key mapping for ID prefixes
 */
const PREFIX_KEY_MAP = {
  GROUP: STORAGE_KEYS.GROUPS,
  SUBGROUP: STORAGE_KEYS.SUBGROUPS,
  USER: STORAGE_KEYS.USERS,
  GROUPUSER: STORAGE_KEYS.GROUP_USER,
  GU: STORAGE_KEYS.GROUP_USER,
  GROUPTASK: STORAGE_KEYS.GROUP_TASK,
  GT: STORAGE_KEYS.GROUP_TASK,
  TASK: STORAGE_KEYS.TASKS,
  ASSIGN: STORAGE_KEYS.TASK_ASSIGNMENTS,
  INST: STORAGE_KEYS.TASK_INSTANCES,
  HIST: STORAGE_KEYS.TASK_HISTORY,
};

/**
 * Generates formatted IDs such as GROUP-001, SUBGROUP-001, etc.
 * Looks at existing records to find the highest number and increments it.
 */
export const generateId = (prefix) => {
  const normalizedPrefix = prefix.toUpperCase();
  const storageKey = PREFIX_KEY_MAP[normalizedPrefix];

  let maxNumber = 0;
  if (storageKey) {
    const records = getData(storageKey, []);
    const regex = new RegExp(`^${normalizedPrefix}-(\\d+)`);
    
    records.forEach((record) => {
      if (record && typeof record.id === 'string') {
        const match = record.id.match(regex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    });
  }

  const nextNumber = maxNumber + 1;
  const paddedNumber = String(nextNumber).padStart(3, '0');
  return `${normalizedPrefix}-${paddedNumber}`;
};
