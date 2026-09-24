import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getData,
  setData,
  STORAGE_KEYS,
  notifyStorageChange,
  ensureInitialData,
  migrateUsersToGroupUser,
} from '../services/storage';
import { syncSupabaseToAppStorage } from '../services/supabaseClient';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // Core collections starting empty
  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [groupUsers, setGroupUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskAssignments, setTaskAssignments] = useState([]);
  const [taskInstances, setTaskInstances] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [settings, setSettings] = useState({ orgName: 'Mamta Hospital' });
  const [currentUser, setCurrentUserState] = useState(() => {
    ensureInitialData();
    const savedUserId = getData(STORAGE_KEYS.AUTH_SESSION, null) || getData(STORAGE_KEYS.CURRENT_USER, null);
    if (!savedUserId) return null;
    const allUsers = getData(STORAGE_KEYS.USERS, []);
    const found = allUsers.find((u) => u.id === savedUserId || u.id?.toLowerCase() === savedUserId?.toLowerCase());
    if (found) return found;
    const savedPortal = getData(STORAGE_KEYS.PORTAL_MODE, 'user');
    return { id: savedUserId, role: savedPortal === 'admin' ? 'Admin' : 'User' };
  });
  const [portalMode, setPortalModeState] = useState('admin'); // 'admin' | 'user'

  // UI States
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    details: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDestructive: false,
    onConfirm: () => {},
  });

  // Helper function to verify admin role (case-insensitive)
  const isAdminUser = (user) => {
    if (!user || !user.role) return false;
    return user.role.toString().toLowerCase() === 'admin';
  };

  // Switch Portal Mode
  const setPortalMode = useCallback((mode) => {
    if (mode === 'admin' && currentUser && !isAdminUser(currentUser)) {
      return;
    }
    setPortalModeState(mode);
    setData(STORAGE_KEYS.PORTAL_MODE, mode);
  }, [currentUser]);

  // Reload all data from LocalStorage
  const loadAllData = useCallback(() => {
    setDepartments(getData(STORAGE_KEYS.DEPARTMENTS, []));
    setGroups(getData(STORAGE_KEYS.GROUPS, []));
    setSubgroups(getData(STORAGE_KEYS.SUBGROUPS, []));
    const allUsers = getData(STORAGE_KEYS.USERS, []);
    setUsers(allUsers);
    setGroupUsers(getData(STORAGE_KEYS.GROUP_USER, []));
    setTasks(getData(STORAGE_KEYS.TASKS, []));
    setTaskAssignments(getData(STORAGE_KEYS.TASK_ASSIGNMENTS, []));
    setTaskInstances(getData(STORAGE_KEYS.TASK_INSTANCES, []));
    setTaskHistory(getData(STORAGE_KEYS.TASK_HISTORY, []));
    setSettings(getData(STORAGE_KEYS.SETTINGS, { orgName: 'Mamta Hospital' }));

    // Current user / Auth session resolution
    let activeUser = null;
    const savedUserId = getData(STORAGE_KEYS.AUTH_SESSION, null) || getData(STORAGE_KEYS.CURRENT_USER, null);
    if (savedUserId) {
      if (allUsers.length > 0) {
        const found = allUsers.find((u) => u.id === savedUserId || u.id?.toLowerCase() === savedUserId?.toLowerCase());
        activeUser = found || null;
      }
      // If user object not loaded into local cache yet, preserve session shell object so user isn't logged out
      if (!activeUser) {
        const savedPortal = getData(STORAGE_KEYS.PORTAL_MODE, 'user');
        activeUser = { id: savedUserId, role: savedPortal === 'admin' ? 'Admin' : 'User' };
      }
    }
    setCurrentUserState(activeUser);

    // Portal Mode resolution (Non-admins are strictly pinned to user portal)
    if (activeUser && !isAdminUser(activeUser)) {
      setPortalModeState('user');
      setData(STORAGE_KEYS.PORTAL_MODE, 'user');
    } else if (activeUser && isAdminUser(activeUser)) {
      const savedPortalMode = getData(STORAGE_KEYS.PORTAL_MODE, 'admin');
      setPortalModeState(savedPortalMode);
    }
  }, []);

  // Listen to custom storage events and localstorage changes across tabs/windows
  useEffect(() => {
    loadAllData();

    syncSupabaseToAppStorage().then((synced) => {
      if (synced) {
        loadAllData();
      }
    });

    const handleStorageChange = (e) => {
      loadAllData();
    };

    window.addEventListener('app-storage-changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('app-storage-changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadAllData]);

  // Login handler
  const login = useCallback((identifier, password) => {
    let allUsers = getData(STORAGE_KEYS.USERS, []);
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: 'Please enter both User ID and password.' };
    }

    const findMatch = (users) =>
      users.find((u) => {
        const matchUsername = u.username?.toLowerCase() === cleanId;
        const matchId = u.id?.toLowerCase() === cleanId;
        const matchEmail = u.email?.toLowerCase() === cleanId;
        return matchUsername || matchId || matchEmail;
      });

    let matchedUser = findMatch(allUsers);

    // Auto-heal if admin or users are missing/unseeded in LocalStorage
    if (!matchedUser) {
      ensureInitialData();
      allUsers = getData(STORAGE_KEYS.USERS, []);
      matchedUser = findMatch(allUsers);
    }

    if (!matchedUser) {
      return { success: false, error: 'User ID not found. Please check your User ID.' };
    }

    if (matchedUser.status === 'Inactive') {
      return { success: false, error: 'This account has been deactivated. Please contact administrator.' };
    }

    // Password match check (supports 121212, admin123, user123, or account password)
    const validPasswords = [
      matchedUser.password,
      '121212',
      matchedUser.role?.toLowerCase() === 'admin' ? 'admin123' : 'user123',
    ].filter(Boolean);

    if (!validPasswords.includes(cleanPass)) {
      return { success: false, error: 'Invalid password. Please try again.' };
    }

    const isAdmin = isAdminUser(matchedUser);
    const targetPortal = isAdmin ? 'admin' : 'user';

    // Normalize role attribute
    matchedUser = {
      ...matchedUser,
      role: isAdmin ? 'Admin' : (matchedUser.role || 'User')
    };

    // Set authenticated session
    setCurrentUserState(matchedUser);
    setData(STORAGE_KEYS.AUTH_SESSION, matchedUser.id);
    setData(STORAGE_KEYS.CURRENT_USER, matchedUser.id);

    setPortalModeState(targetPortal);
    setData(STORAGE_KEYS.PORTAL_MODE, targetPortal);

    return { success: true, user: matchedUser, portalMode: targetPortal };
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    setCurrentUserState(null);
    setData(STORAGE_KEYS.AUTH_SESSION, null);
    setData(STORAGE_KEYS.CURRENT_USER, null);
    setData(STORAGE_KEYS.PORTAL_MODE, 'admin');
  }, []);

  // Set Current User manually
  const setCurrentUser = useCallback((user) => {
    setCurrentUserState(user);
    if (user) {
      const isAdmin = isAdminUser(user);
      const targetPortal = isAdmin ? 'admin' : 'user';
      setData(STORAGE_KEYS.AUTH_SESSION, user.id);
      setData(STORAGE_KEYS.CURRENT_USER, user.id);
      setPortalModeState(targetPortal);
      setData(STORAGE_KEYS.PORTAL_MODE, targetPortal);
    } else {
      setData(STORAGE_KEYS.AUTH_SESSION, null);
      setData(STORAGE_KEYS.CURRENT_USER, null);
    }
  }, []);

  // Check if current user has permission to self-assign tasks
  const canCurrentUserSelfAssign = useCallback(() => {
    if (!currentUser) return false;
    if (isAdminUser(currentUser)) return true;
    return Boolean(currentUser.canSelfAssign);
  }, [currentUser]);

  // Toast notifications
  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Confirmation modal dialog
  const confirmAction = useCallback(
    ({
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      details = '',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      isDestructive = false,
      onConfirm,
    }) => {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        details,
        confirmText,
        cancelText,
        isDestructive,
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          if (typeof onConfirm === 'function') onConfirm();
        },
      });
    },
    []
  );

  const closeConfirmModal = useCallback(() => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const value = {
    // Collections
    departments,
    groups,
    subgroups,
    users,
    groupUsers,
    tasks,
    taskAssignments,
    taskInstances,
    taskHistory,
    settings,
    currentUser,
    isAuthenticated: Boolean(currentUser),
    portalMode,
    setPortalMode,
    canCurrentUserSelfAssign,
    // Auth & Actions
    login,
    logout,
    setCurrentUser,
    refreshData: loadAllData,
    migrateGroupUsers: migrateUsersToGroupUser,
    showToast,
    removeToast,
    toasts,
    confirmAction,
    closeConfirmModal,
    confirmModal,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
