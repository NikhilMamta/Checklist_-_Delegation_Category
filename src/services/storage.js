/**
 * LocalStorage Service
 * Modular abstraction layer for local storage CRUD operations.
 * Future-ready for seamless migration to Supabase or other backends.
 */

export const STORAGE_KEYS = {
  DEPARTMENTS: 'departments',
  GROUPS: 'groups',
  SUBGROUPS: 'subgroups',
  USERS: 'users',
  GROUP_USER: 'groupUser',
  GROUP_TASK: 'grouptask',
  TASKS: 'tasks',
  TASK_ASSIGNMENTS: 'taskAssignments',
  TASK_INSTANCES: 'taskInstances',
  TASK_HISTORY: 'taskHistory',
  CURRENT_USER: 'currentUser',
  AUTH_SESSION: 'authSession',
  SETTINGS: 'settings',
  PORTAL_MODE: 'portalMode',
};

// Dispatches a window event so all listeners can reactively re-render
export const notifyStorageChange = (key) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-storage-changed', { detail: { key } }));
  }
};

/**
 * Get data from LocalStorage
 * Returns an empty array or default value if key doesn't exist
 */
export const getData = (key, defaultValue = []) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Error reading ${key} from LocalStorage:`, error);
    return defaultValue;
  }
};

/**
 * Set data in LocalStorage
 */
export const setData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    notifyStorageChange(key);
    return true;
  } catch (error) {
    console.error(`Error writing ${key} to LocalStorage:`, error);
    return false;
  }
};

/**
 * Add a new item to an existing array in LocalStorage
 */
export const addData = (key, item) => {
  const list = getData(key, []);
  list.push(item);
  setData(key, list);
  return item;
};

/**
 * Update an existing item in LocalStorage by ID
 */
export const updateData = (key, id, updates) => {
  const list = getData(key, []);
  const index = list.findIndex((i) => i.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    setData(key, list);
    return list[index];
  }
  return null;
};

/**
 * Delete an item from LocalStorage by ID
 */
export const deleteData = (key, id) => {
  const list = getData(key, []);
  const filtered = list.filter((i) => i.id !== id);
  setData(key, filtered);
  return true;
};

/**
 * Clear all system data in LocalStorage
 */
export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
  notifyStorageChange('*');
};

// Default Empty Collections (No hardcoded sample data)
export const DEFAULT_DEPARTMENTS = [];
export const DEFAULT_GROUPS = [];
export const DEFAULT_SUBGROUPS = [];
export const DEFAULT_USERS = [];

/**
 * Ensures initial default data exists for Mamta Hospital
 */
export const ensureInitialData = () => {
  const existingTasks = getData(STORAGE_KEYS.TASKS, []);
  const isSampleTasks = Array.isArray(existingTasks) && existingTasks.some(t => String(t.id).includes('101') || String(t.givenBy).includes('Director') || String(t.givenBy).includes('Biomedical'));
  if (isSampleTasks) {
    setData(STORAGE_KEYS.TASKS, []);
    setData(STORAGE_KEYS.TASK_ASSIGNMENTS, []);
    setData(STORAGE_KEYS.TASK_INSTANCES, []);
    setData(STORAGE_KEYS.TASK_HISTORY, []);
  }

  const existingUsers = getData(STORAGE_KEYS.USERS, []);
  const isLegacyUsers = Array.isArray(existingUsers) && existingUsers.some(u => u.email?.includes('botivate') || u.number === '8085705807');
  if (isLegacyUsers) {
    setData(STORAGE_KEYS.USERS, []);
    setData(STORAGE_KEYS.GROUP_USER, []);
  }
  // 4. Ensure real origin users are migrated to 'groupUser' table with proper mapping (no seed/dummy data)
  migrateUsersToGroupUser(false);
};

/**
 * Migrates real origin data from USERS table to GROUP_USER table.
 * Strictly migrates authentic user records from localStorage without generating fake/seed dummy data.
 * Properly maps relational attributes:
 * - id: GU-<userId>
 * - userId: user.id
 * - userName: user.name
 * - username: user.username
 * - email: user.email
 * - mobile: user.mobile || user.phone
 * - groupId: user.groupId
 * - subgroupId: user.subgroupId
 * - role: user.role
 * - status: user.status
 * - canSelfAssign: user.canSelfAssign
 * - assignedAt: user.createdAt
 * - updatedAt: user.updatedAt || user.createdAt
 */
export const migrateUsersToGroupUser = (force = false) => {
  try {
    const originUsers = getData(STORAGE_KEYS.USERS, []);
    const existingGroupUsers = getData(STORAGE_KEYS.GROUP_USER, []);

    let updatedGroupUsers = force ? [] : [...existingGroupUsers];
    let hasChanges = force;

    // Process every actual origin user
    originUsers.forEach((user) => {
      if (!user || !user.id) return;

      const existingIndex = updatedGroupUsers.findIndex((gu) => gu.userId === user.id);
      const mappedRecord = {
        id: existingIndex !== -1 ? updatedGroupUsers[existingIndex].id : `GU-${user.id}`,
        userId: user.id,
        username: user.username || user.name || '',
        email: user.email || '',
        mobile: user.mobile || user.phone || '',
        groupId: user.groupId || null,
        subgroupId: user.subgroupId || null,
        role: user.role || 'User',
        status: user.status || 'Active',
        canSelfAssign: Boolean(user.canSelfAssign),
        assignedAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.updatedAt || user.createdAt || new Date().toISOString(),
      };

      if (existingIndex === -1) {
        updatedGroupUsers.push(mappedRecord);
        hasChanges = true;
      } else {
        const current = updatedGroupUsers[existingIndex];
        const isDifferent =
          current.groupId !== mappedRecord.groupId ||
          current.subgroupId !== mappedRecord.subgroupId ||
          current.role !== mappedRecord.role ||
          current.status !== mappedRecord.status ||
          current.username !== mappedRecord.username ||
          current.email !== mappedRecord.email ||
          current.mobile !== mappedRecord.mobile ||
          current.canSelfAssign !== mappedRecord.canSelfAssign;

        if (isDifferent) {
          updatedGroupUsers[existingIndex] = {
            ...current,
            ...mappedRecord,
            updatedAt: new Date().toISOString(),
          };
          hasChanges = true;
        }
      }
    });

    // Remove groupUser records for users that no longer exist in origin users
    const validUserIds = new Set(originUsers.map((u) => u.id));
    const prunedGroupUsers = updatedGroupUsers.filter((gu) => validUserIds.has(gu.userId));
    if (prunedGroupUsers.length !== updatedGroupUsers.length) {
      updatedGroupUsers = prunedGroupUsers;
      hasChanges = true;
    }

    if (hasChanges || existingGroupUsers.length === 0) {
      setData(STORAGE_KEYS.GROUP_USER, updatedGroupUsers);
    }

    return updatedGroupUsers;
  } catch (error) {
    console.error('Error migrating origin users to groupUser table:', error);
    return [];
  }
};

/**
 * Synchronize a single user object into the groupUser table
 */
export const syncUserToGroupUser = (user) => {
  if (!user || !user.id) return null;
  const list = getData(STORAGE_KEYS.GROUP_USER, []);
  const index = list.findIndex((gu) => gu.userId === user.id);

  const mapped = {
    id: index !== -1 ? list[index].id : `GU-${user.id}`,
    userId: user.id,
    username: user.username || user.name || '',
    email: user.email || '',
    mobile: user.mobile || user.phone || '',
    groupId: user.groupId || null,
    subgroupId: user.subgroupId || null,
    role: user.role || 'User',
    status: user.status || 'Active',
    canSelfAssign: Boolean(user.canSelfAssign),
    assignedAt: user.createdAt || (index !== -1 ? list[index].assignedAt : new Date().toISOString()),
    updatedAt: new Date().toISOString(),
  };

  if (index !== -1) {
    list[index] = mapped;
  } else {
    list.push(mapped);
  }

  setData(STORAGE_KEYS.GROUP_USER, list);
  return mapped;
};

/**
 * Delete a user's entry from groupUser table
 */
export const deleteGroupUserByUserId = (userId) => {
  if (!userId) return false;
  const list = getData(STORAGE_KEYS.GROUP_USER, []);
  const filtered = list.filter((gu) => gu.userId !== userId);
  setData(STORAGE_KEYS.GROUP_USER, filtered);
  return true;
};


