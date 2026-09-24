import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey &&
    supabaseAnonKey.trim().length > 10
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Test connectivity to the Supabase project
 */
export const checkSupabaseConnection = async () => {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      connected: false,
      message: 'Supabase URL or API key is not configured in .env',
    };
  }

  try {
    // Ping by fetching session or checking basic health endpoint
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { connected: false, message: error.message };
    }
    return { connected: true, message: 'Connected successfully to Supabase!' };
  } catch (err) {
    return { connected: false, message: err.message || 'Unknown network error' };
  }
};

/**
 * Synchronize real Supabase users and groupUser records into client storage
 */
export const syncSupabaseToAppStorage = async () => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    // Exclusively query the isolated project table 'app_users' (DO NOT touch legacy 'users' table)
    let supaUsers = null;
    let { data: appUsersData, error: appUsersErr } = await supabase.from('app_users').select('*');
    
    if (!appUsersErr && Array.isArray(appUsersData) && appUsersData.length > 0) {
      supaUsers = appUsersData.map(u => ({
        id: String(u.id),
        name: u.name || u.username,
        username: u.username,
        password: u.password || '121212',
        email: u.email || '',
        mobile: u.mobile || '',
        phone: u.mobile || '',
        role: u.role || 'User',
        groupId: u.department || 'General',
        subgroupId: u.designation || '',
        status: u.status || 'Active',
        canSelfAssign: Boolean(u.can_self_assign),
        employeeId: u.employee_id || '',
        createdAt: u.created_at || new Date().toISOString(),
      }));
    }

    // If app_users table does not exist or is empty, use default project seed users (never load legacy system users)
    if (!supaUsers || supaUsers.length === 0) {
      supaUsers = [
        {
          id: '1',
          name: 'System Administrator',
          username: 'admin',
          password: '121212',
          email: 'admin@mamtahospital.com',
          mobile: '9876543210',
          phone: '9876543210',
          role: 'Admin',
          groupId: 'Management',
          subgroupId: 'Hospital Admin',
          status: 'Active',
          canSelfAssign: true,
          employeeId: 'EMP-001',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Dr. Rajesh Sharma',
          username: 'dr_sharma',
          password: '121212',
          email: 'sharma@mamtahospital.com',
          mobile: '9876543211',
          phone: '9876543211',
          role: 'User',
          groupId: 'Cardiology',
          subgroupId: 'Senior Consultant',
          status: 'Active',
          canSelfAssign: true,
          employeeId: 'EMP-002',
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'Priya Patel',
          username: 'nurse_priya',
          password: '121212',
          email: 'priya@mamtahospital.com',
          mobile: '9876543212',
          phone: '9876543212',
          role: 'User',
          groupId: 'ICU',
          subgroupId: 'Head Nurse',
          status: 'Active',
          canSelfAssign: false,
          employeeId: 'EMP-003',
          createdAt: new Date().toISOString(),
        },
        {
          id: '4',
          name: 'Sahil Mirza',
          username: 'sahil_it',
          password: '121212',
          email: 'sahil@mamtahospital.com',
          mobile: '9876543213',
          phone: '9876543213',
          role: 'User',
          groupId: 'IT & Infrastructure',
          subgroupId: 'IT Executive',
          status: 'Active',
          canSelfAssign: true,
          employeeId: 'EMP-004',
          createdAt: new Date().toISOString(),
        },
      ];
    }

    const { data: supaGroupUsers } = await supabase.from('groupUser').select('*');
    const { data: supaGroupTasks } = await supabase.from('grouptask').select('*');
    const { data: supaTaskInstances } = await supabase.from('taskInstances').select('*');

    // Ensure admin user has accessible password
    const adminUser = supaUsers.find((u) => u.username?.toLowerCase() === 'admin' || u.role === 'Admin');
    if (adminUser && !adminUser.password) {
      adminUser.password = '121212';
    }

    localStorage.setItem('users', JSON.stringify(supaUsers));

    if (Array.isArray(supaGroupUsers) && supaGroupUsers.length > 0) {
      localStorage.setItem('groupUser', JSON.stringify(supaGroupUsers));
    }

    // Sync real Supabase tasks or maintain clean state
    if (Array.isArray(supaGroupTasks)) {
      localStorage.setItem('tasks', JSON.stringify(supaGroupTasks));
    }
    if (Array.isArray(supaTaskInstances)) {
      localStorage.setItem('taskInstances', JSON.stringify(supaTaskInstances));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-storage-changed', { detail: { key: '*' } }));
    }
    return true;
  } catch (err) {
    console.error('Failed to sync from Supabase to App storage:', err);
    return false;
  }
};

/**
 * Save an assigned task to the Supabase 'grouptask' table
 */
export const saveTaskToGroupTask = async (taskData) => {
  if (!isSupabaseConfigured() || !supabase || !taskData) return null;

  try {
    const record = {
      id: taskData.id,
      taskId: taskData.id,
      title: taskData.title || '',
      description: taskData.description || '',
      category: taskData.category || 'General Operations',
      subcategory: taskData.subcategory || 'General',
      priority: taskData.priority || 'Medium',
      taskType: taskData.taskType || 'Checklist',
      assignmentLevel: taskData.assignmentLevel || 'Individual User',
      groupId: taskData.groupId || null,
      subgroupId: taskData.subgroupId || null,
      department: taskData.department || taskData.groupId || '',
      givenBy: taskData.givenBy || '',
      assignBy: taskData.assignBy || 'Admin',
      assignedUserIds: taskData.assignedUserIds || [],
      assignedUsers: Array.isArray(taskData.assignedUsers)
        ? taskData.assignedUsers.join(', ')
        : (taskData.assignedUsers || ''),
      startDate: taskData.startDate || null,
      dueDate: taskData.dueDate || null,
      frequency: taskData.frequency || 'Daily',
      status: taskData.status || 'Pending',
      checklistItems: taskData.checklistItems || [],
      requiredAttachment: Boolean(taskData.requiredAttachment),
      attachment: taskData.attachment || null,
      remarks: taskData.remarks || '',
      completedAt: taskData.completedAt || null,
      completedBy: taskData.completedBy || null,
      createdAt: taskData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('grouptask').upsert(record).select();
    if (error) {
      console.warn('Could not save to Supabase grouptask (table will store once created in Supabase SQL editor):', error.message);
      return null;
    }
    return data?.[0] || null;
  } catch (err) {
    console.error('Error saving task to Supabase grouptask:', err);
    return null;
  }
};

/**
 * Sync all existing tasks from localStorage into Supabase 'grouptask' table
 */
export const syncAllTasksToGroupTask = async () => {
  if (!isSupabaseConfigured() || !supabase) return false;

  try {
    const rawTasks = localStorage.getItem('tasks');
    if (!rawTasks) return false;
    const tasks = JSON.parse(rawTasks);
    if (!Array.isArray(tasks) || tasks.length === 0) return false;

    const records = tasks.map((t) => ({
      id: t.id,
      taskId: t.id,
      title: t.title || '',
      description: t.description || '',
      category: t.category || 'General Operations',
      subcategory: t.subcategory || 'General',
      priority: t.priority || 'Medium',
      taskType: t.taskType || 'Checklist',
      assignmentLevel: t.assignmentLevel || 'Individual User',
      groupId: t.groupId || null,
      subgroupId: t.subgroupId || null,
      department: t.department || t.groupId || '',
      givenBy: t.givenBy || '',
      assignBy: t.assignBy || 'Admin',
      assignedUserIds: t.assignedUserIds || [],
      assignedUsers: Array.isArray(t.assignedUsers) ? t.assignedUsers.join(', ') : (t.assignedUsers || ''),
      startDate: t.startDate || null,
      dueDate: t.dueDate || null,
      frequency: t.frequency || 'Daily',
      status: t.status || 'Pending',
      checklistItems: t.checklistItems || [],
      requiredAttachment: Boolean(t.requiredAttachment),
      attachment: t.attachment || null,
      remarks: t.remarks || '',
      completedAt: t.completedAt || null,
      completedBy: t.completedBy || null,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const { data, error } = await supabase.from('grouptask').upsert(records).select();
    if (error) {
      console.warn('Could not batch sync to Supabase grouptask:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to sync tasks to Supabase grouptask:', err);
    return false;
  }
};
