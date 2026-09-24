import React, { useState, useMemo } from 'react';
import {
  FolderTree,
  FolderPlus,
  Users as UsersIcon,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Layers,
  CheckCircle2,
  XCircle,
  Plus,
  Building,
  Camera,
  Upload,
  Eye,
  EyeOff,
  Lock,
  AtSign,
  Mail,
  Phone,
  User,
  RefreshCw,
  Link2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  addData,
  updateData,
  deleteData,
  STORAGE_KEYS,
  syncUserToGroupUser,
  deleteGroupUserByUserId,
  migrateUsersToGroupUser,
} from '../services/storage';
import { generateId } from '../services/idGenerator';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/Badge';

export const UsersPage = () => {
  const {
    departments,
    groups,
    subgroups,
    users,
    groupUsers,
    tasks,
    showToast,
    confirmAction,
    migrateGroupUsers,
  } = useApp();

  // Active Tab: 'departments' | 'groups' | 'subgroups' | 'users'
  const [activeTab, setActiveTab] = useState('departments');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');

  // Department Modal state
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    code: '',
    description: '',
    head: '',
    status: 'Active',
  });

  // Modals state
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({
    departmentId: '',
    name: '',
    description: '',
    status: 'Active',
  });

  const [subgroupModalOpen, setSubgroupModalOpen] = useState(false);
  const [editingSubgroup, setEditingSubgroup] = useState(null);
  const [subgroupForm, setSubgroupForm] = useState({
    groupId: '',
    name: '',
    description: '',
    status: 'Active',
  });

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState({
    avatar: '',
    name: '',
    username: '',
    email: '',
    mobile: '',
    role: 'User',
    groupId: '',
    subgroupId: '',
    password: '',
    status: 'Active',
    canSelfAssign: false,
  });

  // ==========================================
  // DEPARTMENT CRUD HANDLERS
  // ==========================================
  const handleOpenAddDepartment = () => {
    setEditingDepartment(null);
    setDepartmentForm({ name: '', code: '', description: '', head: '', status: 'Active' });
    setDepartmentModalOpen(true);
  };

  const handleOpenEditDepartment = (dept) => {
    setEditingDepartment(dept);
    setDepartmentForm({
      name: dept.name,
      code: dept.code || '',
      description: dept.description || '',
      head: dept.head || '',
      status: dept.status || 'Active',
    });
    setDepartmentModalOpen(true);
  };

  const handleSaveDepartment = (e) => {
    e.preventDefault();
    if (!departmentForm.name.trim()) {
      showToast('Department name is required', 'error');
      return;
    }

    if (editingDepartment) {
      updateData(STORAGE_KEYS.DEPARTMENTS, editingDepartment.id, {
        name: departmentForm.name.trim(),
        code: departmentForm.code.trim().toUpperCase(),
        description: departmentForm.description.trim(),
        head: departmentForm.head.trim(),
        status: departmentForm.status,
      });
      showToast('Department updated successfully');
    } else {
      const newDept = {
        id: generateId('DEPT'),
        name: departmentForm.name.trim(),
        code: departmentForm.code.trim().toUpperCase() || 'DEPT',
        description: departmentForm.description.trim(),
        head: departmentForm.head.trim(),
        status: departmentForm.status,
        createdAt: new Date().toISOString(),
      };
      addData(STORAGE_KEYS.DEPARTMENTS, newDept);
      showToast(`Department "${newDept.name}" created successfully`);
    }
    setDepartmentModalOpen(false);
  };

  const handleDeleteDepartment = (dept) => {
    const linkedGroups = groups.filter((g) => g.departmentId === dept.id);
    confirmAction({
      title: 'Delete Department',
      message: `Are you sure you want to delete department "${dept.name}"?`,
      details: linkedGroups.length > 0 ? `Notice: ${linkedGroups.length} group(s) are linked to this Department.` : '',
      confirmText: 'Delete Department',
      isDestructive: true,
      onConfirm: () => {
        deleteData(STORAGE_KEYS.DEPARTMENTS, dept.id);
        showToast(`Department "${dept.name}" deleted successfully`);
      },
    });
  };

  // ==========================================
  // GROUP CRUD HANDLERS
  // ==========================================
  const handleOpenAddGroup = () => {
    setEditingGroup(null);
    setGroupForm({
      departmentId: departments[0]?.id || '',
      name: '',
      description: '',
      status: 'Active',
    });
    setGroupModalOpen(true);
  };

  const handleOpenEditGroup = (group) => {
    setEditingGroup(group);
    setGroupForm({
      departmentId: group.departmentId || '',
      name: group.name,
      description: group.description || '',
      status: group.status || 'Active',
    });
    setGroupModalOpen(true);
  };

  const handleSaveGroup = (e) => {
    e.preventDefault();
    if (!groupForm.name.trim()) {
      showToast('Group name is required', 'error');
      return;
    }

    if (editingGroup) {
      updateData(STORAGE_KEYS.GROUPS, editingGroup.id, {
        departmentId: groupForm.departmentId || null,
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
        status: groupForm.status,
      });
      showToast('Group updated successfully');
    } else {
      const newGroup = {
        id: generateId('GROUP'),
        departmentId: groupForm.departmentId || null,
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
        status: groupForm.status,
        createdAt: new Date().toISOString(),
      };
      addData(STORAGE_KEYS.GROUPS, newGroup);
      showToast('Group created successfully');
    }
    setGroupModalOpen(false);
  };

  const handleDeleteGroup = (group) => {
    // Check if group contains subgroups
    const relatedSubgroups = subgroups.filter((sg) => sg.groupId === group.id);
    const relatedUsers = users.filter((u) => u.groupId === group.id);

    let details = '';
    if (relatedSubgroups.length > 0 || relatedUsers.length > 0) {
      details = `Warning: This group contains ${relatedSubgroups.length} subgroup(s) and ${relatedUsers.length} user(s). Deleting it will affect these records!`;
    }

    confirmAction({
      title: 'Delete Group',
      message: `Are you sure you want to delete the group "${group.name}" (${group.id})?`,
      details,
      confirmText: 'Delete Group',
      isDestructive: true,
      onConfirm: () => {
        deleteData(STORAGE_KEYS.GROUPS, group.id);
        showToast(`Group "${group.name}" deleted`, 'info');
      },
    });
  };

  // ==========================================
  // SUBGROUP CRUD HANDLERS
  // ==========================================
  const handleOpenAddSubgroup = () => {
    if (groups.length === 0) {
      showToast('Please create at least one Group first', 'warning');
      return;
    }
    setEditingSubgroup(null);
    setSubgroupForm({
      groupId: groups[0]?.id || '',
      name: '',
      description: '',
      status: 'Active',
    });
    setSubgroupModalOpen(true);
  };

  const handleOpenEditSubgroup = (subgroup) => {
    setEditingSubgroup(subgroup);
    setSubgroupForm({
      groupId: subgroup.groupId,
      name: subgroup.name,
      description: subgroup.description || '',
      status: subgroup.status || 'Active',
    });
    setSubgroupModalOpen(true);
  };

  const handleSaveSubgroup = (e) => {
    e.preventDefault();
    if (!subgroupForm.groupId) {
      showToast('Please select a valid parent Group', 'error');
      return;
    }
    if (!subgroupForm.name.trim()) {
      showToast('Subgroup name is required', 'error');
      return;
    }

    if (editingSubgroup) {
      updateData(STORAGE_KEYS.SUBGROUPS, editingSubgroup.id, {
        groupId: subgroupForm.groupId,
        name: subgroupForm.name.trim(),
        description: subgroupForm.description.trim(),
        status: subgroupForm.status,
      });
      showToast('Subgroup updated successfully');
    } else {
      const newSubgroup = {
        id: generateId('SUBGROUP'),
        groupId: subgroupForm.groupId,
        name: subgroupForm.name.trim(),
        description: subgroupForm.description.trim(),
        status: subgroupForm.status,
        createdAt: new Date().toISOString(),
      };
      addData(STORAGE_KEYS.SUBGROUPS, newSubgroup);
      showToast('Subgroup created successfully');
    }
    setSubgroupModalOpen(false);
  };

  const handleDeleteSubgroup = (subgroup) => {
    // Check if subgroup contains users or tasks
    const relatedUsers = users.filter((u) => u.subgroupId === subgroup.id);
    const relatedTasks = tasks.filter((t) => t.subgroupId === subgroup.id);

    let details = '';
    if (relatedUsers.length > 0 || relatedTasks.length > 0) {
      details = `Warning: This subgroup has ${relatedUsers.length} user(s) and ${relatedTasks.length} task(s) associated with it.`;
    }

    confirmAction({
      title: 'Delete Subgroup',
      message: `Are you sure you want to delete "${subgroup.name}" (${subgroup.id})?`,
      details,
      confirmText: 'Delete Subgroup',
      isDestructive: true,
      onConfirm: () => {
        deleteData(STORAGE_KEYS.SUBGROUPS, subgroup.id);
        showToast(`Subgroup "${subgroup.name}" deleted`, 'info');
      },
    });
  };

  // ==========================================
  // USER CRUD HANDLERS
  // ==========================================
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Profile photo size must be under 2MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUserForm((prev) => ({ ...prev, avatar: reader.result }));
      showToast('Profile photo selected');
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddUser = () => {
    if (groups.length === 0) {
      showToast('Please create at least one Department/Group first', 'warning');
      return;
    }
    const firstGroup = groups[0];
    const availableSubgroups = subgroups.filter((sg) => sg.groupId === firstGroup.id);

    setEditingUser(null);
    setShowPassword(false);
    setUserForm({
      avatar: '',
      name: '',
      username: '',
      email: '',
      mobile: '',
      role: 'User',
      groupId: firstGroup.id,
      subgroupId: availableSubgroups[0]?.id || '',
      password: '',
      status: 'Active',
      canSelfAssign: false,
    });
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setShowPassword(false);
    setUserForm({
      avatar: user.avatar || '',
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      mobile: user.mobile || '',
      role: user.role === 'Admin' ? 'Admin' : 'User',
      groupId: user.groupId || '',
      subgroupId: user.subgroupId || '',
      password: '',
      status: user.status || 'Active',
      canSelfAssign: Boolean(user.canSelfAssign),
    });
    setUserModalOpen(true);
  };

  const handleToggleSelfAssign = (user) => {
    const nextVal = !user.canSelfAssign;
    updateData(STORAGE_KEYS.USERS, user.id, { canSelfAssign: nextVal });
    syncUserToGroupUser({ ...user, canSelfAssign: nextVal });
    showToast(`Self-Assign permission for ${user.name} is now ${nextVal ? 'GRANTED' : 'REVOKED'}`);
  };

  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!userForm.name.trim()) {
      showToast('Full Name is required', 'error');
      return;
    }
    if (!userForm.username.trim()) {
      showToast('User Name is required', 'error');
      return;
    }
    if (!userForm.groupId) {
      showToast('Please select a Department (Group)', 'error');
      return;
    }
    if (!userForm.subgroupId) {
      showToast('Please select a Subgroup', 'error');
      return;
    }
    if (!editingUser && !userForm.password) {
      showToast('Password is required for new user', 'error');
      return;
    }

    // Check username uniqueness
    const existingWithUsername = users.find(
      (u) =>
        u.username?.toLowerCase() === userForm.username.trim().toLowerCase() &&
        u.id !== editingUser?.id
    );
    if (existingWithUsername) {
      showToast(`User Name "${userForm.username}" is already taken. Please choose another.`, 'error');
      return;
    }

    if (editingUser) {
      const updatePayload = {
        avatar: userForm.avatar,
        name: userForm.name.trim(),
        username: userForm.username.trim().toLowerCase(),
        email: userForm.email.trim(),
        mobile: userForm.mobile.trim(),
        role: userForm.role,
        groupId: userForm.groupId,
        subgroupId: userForm.subgroupId,
        status: userForm.status,
        canSelfAssign: Boolean(userForm.canSelfAssign),
      };
      if (userForm.password) {
        updatePayload.password = userForm.password;
      }
      updateData(STORAGE_KEYS.USERS, editingUser.id, updatePayload);
      syncUserToGroupUser({ ...editingUser, ...updatePayload });
      showToast('User updated successfully');
    } else {
      const newUser = {
        id: generateId('USER'),
        avatar: userForm.avatar || '',
        name: userForm.name.trim(),
        username: userForm.username.trim().toLowerCase(),
        email: userForm.email.trim(),
        mobile: userForm.mobile.trim(),
        role: userForm.role,
        groupId: userForm.groupId,
        subgroupId: userForm.subgroupId,
        password: userForm.password,
        status: userForm.status,
        canSelfAssign: Boolean(userForm.canSelfAssign),
        createdAt: new Date().toISOString(),
      };
      addData(STORAGE_KEYS.USERS, newUser);
      syncUserToGroupUser(newUser);
      showToast(`User "${newUser.name}" (@${newUser.username}) created successfully`);
    }
    setUserModalOpen(false);
  };

  const handleDeleteUser = (user) => {
    confirmAction({
      title: 'Delete User',
      message: `Are you sure you want to delete user "${user.name}" (${user.id})?`,
      confirmText: 'Delete User',
      isDestructive: true,
      onConfirm: () => {
        deleteData(STORAGE_KEYS.USERS, user.id);
        deleteGroupUserByUserId(user.id);
        showToast(`User "${user.name}" deleted`, 'info');
      },
    });
  };

  // ==========================================
  // FILTERED DATA
  // ==========================================
  const filteredDepartments = useMemo(() => {
    return (departments || []).filter((d) => {
      const q = searchQuery.toLowerCase();
      return (
        d.name?.toLowerCase().includes(q) ||
        d.code?.toLowerCase().includes(q) ||
        (d.head && d.head.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        d.id?.toLowerCase().includes(q)
      );
    });
  }, [departments, searchQuery]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const q = searchQuery.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        (g.description && g.description.toLowerCase().includes(q)) ||
        g.id.toLowerCase().includes(q)
      );
    });
  }, [groups, searchQuery]);

  const filteredSubgroups = useMemo(() => {
    return subgroups.filter((sg) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        sg.name.toLowerCase().includes(q) ||
        (sg.description && sg.description.toLowerCase().includes(q)) ||
        sg.id.toLowerCase().includes(q);
      const matchesGroup =
        selectedGroupFilter === 'ALL' || sg.groupId === selectedGroupFilter;
      return matchesSearch && matchesGroup;
    });
  }, [subgroups, searchQuery, selectedGroupFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase();
      const parentGroup = groups.find((g) => g.id === u.groupId);
      const parentSubgroup = subgroups.find((sg) => sg.id === u.subgroupId);

      const matchesSearch =
        u.name.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.mobile && u.mobile.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        u.id.toLowerCase().includes(q) ||
        (parentGroup && parentGroup.name.toLowerCase().includes(q)) ||
        (parentSubgroup && parentSubgroup.name.toLowerCase().includes(q));

      const matchesGroup =
        selectedGroupFilter === 'ALL' || u.groupId === selectedGroupFilter;

      return matchesSearch && matchesGroup;
    });
  }, [users, groups, subgroups, searchQuery, selectedGroupFilter]);

  const filteredGroupUsers = useMemo(() => {
    return (groupUsers || []).filter((gu) => {
      const q = searchQuery.toLowerCase();
      const parentGroup = groups.find((g) => g.id === gu.groupId);
      const parentSubgroup = subgroups.find((sg) => sg.id === gu.subgroupId);

      const matchesSearch =
        gu.id?.toLowerCase().includes(q) ||
        gu.userId?.toLowerCase().includes(q) ||
        gu.username?.toLowerCase().includes(q) ||
        gu.email?.toLowerCase().includes(q) ||
        gu.role?.toLowerCase().includes(q) ||
        gu.status?.toLowerCase().includes(q) ||
        (parentGroup && parentGroup.name.toLowerCase().includes(q)) ||
        (parentSubgroup && parentSubgroup.name.toLowerCase().includes(q));

      const matchesGroup =
        selectedGroupFilter === 'ALL' || gu.groupId === selectedGroupFilter;

      return matchesSearch && matchesGroup;
    });
  }, [groupUsers, groups, subgroups, searchQuery, selectedGroupFilter]);

  // Subgroups available for the currently selected group in the User Form
  const userFormSubgroups = useMemo(() => {
    if (!userForm.groupId) return [];
    return subgroups.filter((sg) => sg.groupId === userForm.groupId);
  }, [subgroups, userForm.groupId]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Settings & Organization
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure hospital departments, user accounts, and User Portal self-assign permissions.
          </p>
        </div>

        {/* Action Button depending on tab */}
        <div className="flex items-center gap-2">
          {activeTab === 'departments' && (
            <button
              onClick={handleOpenAddDepartment}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
            >
              <Building className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          )}

          {activeTab === 'groups' && (
            <button
              onClick={handleOpenAddGroup}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Add Group</span>
            </button>
          )}

          {activeTab === 'subgroups' && (
            <button
              onClick={handleOpenAddSubgroup}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Add Subgroup</span>
            </button>
          )}

          {activeTab === 'users' && (
            <button
              onClick={handleOpenAddUser}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          )}

          {activeTab === 'groupUser' && (
            <button
              onClick={() => {
                const res = migrateUsersToGroupUser(true);
                showToast(`Synced ${res.length} live user records into groupUser table`, 'success');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Sync / Migrate from Users</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 sm:space-x-8" aria-label="Tabs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('departments');
              setSearchQuery('');
            }}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'departments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Departments</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'departments' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {departments?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('groups');
              setSearchQuery('');
            }}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'groups'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Groups</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'groups' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {groups.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('subgroups');
              setSearchQuery('');
            }}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'subgroups'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Subgroups</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'subgroups'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {subgroups.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('users');
              setSearchQuery('');
            }}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            <span>Users</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'users' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('groupUser');
              setSearchQuery('');
            }}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'groupUser'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Group Users (groupUser)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'groupUser' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {groupUsers.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
          />
        </div>

        {/* Group Filter for Subgroups and Users */}
        {(activeTab === 'subgroups' || activeTab === 'users') && groups.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium shrink-0">Filter by Group:</span>
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="text-xs sm:text-sm py-2 px-3 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 0. DEPARTMENTS TAB */}
      {/* ============================================================== */}
      {activeTab === 'departments' && (
        <>
          {(!departments || departments.length === 0) ? (
            <EmptyState
              icon={Building}
              title="No Departments Found"
              description="Start building your hospital structure by creating top-level Departments (e.g., Clinical & Medical Services, Nursing, Administration)."
              actionText="Add Department"
              onAction={handleOpenAddDepartment}
            />
          ) : filteredDepartments.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <p className="text-slate-500 text-sm">No departments match your search query "{searchQuery}".</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">ID</th>
                      <th className="px-6 py-3.5">Department Name</th>
                      <th className="px-6 py-3.5">Code</th>
                      <th className="px-6 py-3.5">Head of Dept (HOD)</th>
                      <th className="px-6 py-3.5">Linked Groups</th>
                      <th className="px-6 py-3.5">Description</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDepartments.map((dept) => {
                      const linkedGroups = groups.filter((g) => g.departmentId === dept.id);
                      return (
                        <tr key={dept.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-500">
                            {dept.id}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                                <Building className="w-3.5 h-3.5" />
                              </div>
                              <span>{dept.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">
                            <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {dept.code || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-800 font-medium">
                            {dept.head ? dept.head : <span className="text-slate-400 text-xs italic">Not set</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              {linkedGroups.length} Groups
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                            {dept.description || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={dept.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditDepartment(dept)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Department"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteDepartment(dept)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Department"
                              >
                                <Trash2 className="w-4 h-4" />
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
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* 1. GROUPS TAB */}
      {/* ============================================================== */}
      {activeTab === 'groups' && (
        <>
          {groups.length === 0 ? (
            <EmptyState
              icon={FolderTree}
              title="No Groups Found"
              description="Start building your hierarchy by creating the first Group (e.g., Medical Services, Administration, Pharmacy)."
              actionText="Add Group"
              onAction={handleOpenAddGroup}
            />
          ) : filteredGroups.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <p className="text-slate-500 text-sm">No groups match your search query "{searchQuery}".</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">ID</th>
                      <th className="px-6 py-3.5">Group Name</th>
                      <th className="px-6 py-3.5">Department</th>
                      <th className="px-6 py-3.5">Description</th>
                      <th className="px-6 py-3.5">Subgroups</th>
                      <th className="px-6 py-3.5">Users</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGroups.map((group) => {
                      const parentDept = (departments || []).find((d) => d.id === group.departmentId);
                      const groupSubgroups = subgroups.filter((sg) => sg.groupId === group.id);
                      const groupUsers = users.filter((u) => u.groupId === group.id);

                      return (
                        <tr key={group.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-500">
                            {group.id}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {group.name}
                          </td>
                          <td className="px-6 py-4">
                            {parentDept ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <Building className="w-3 h-3 text-indigo-500" />
                                <span>{parentDept.name}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                            {group.description || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                              {groupSubgroups.length} Subgroups
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                              {groupUsers.length} Users
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={group.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditGroup(group)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Group"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteGroup(group)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Group"
                              >
                                <Trash2 className="w-4 h-4" />
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
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* 2. SUBGROUPS TAB */}
      {/* ============================================================== */}
      {activeTab === 'subgroups' && (
        <>
          {subgroups.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No Subgroups Found"
              description={
                groups.length === 0
                  ? 'Please create a Group first before adding Subgroups.'
                  : 'Add Subgroups under your created Groups (e.g., ICU, OPD, Emergency, Sanitation).'
              }
              actionText={groups.length > 0 ? 'Add Subgroup' : 'Add Group First'}
              onAction={groups.length > 0 ? handleOpenAddSubgroup : handleOpenAddGroup}
            />
          ) : filteredSubgroups.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <p className="text-slate-500 text-sm">No subgroups match your current filter.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5">ID</th>
                      <th className="px-6 py-3.5">Subgroup Name</th>
                      <th className="px-6 py-3.5">Parent Group</th>
                      <th className="px-6 py-3.5">Description</th>
                      <th className="px-6 py-3.5">Users</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubgroups.map((subgroup) => {
                      const parentGroup = groups.find((g) => g.id === subgroup.groupId);
                      const subgroupUsers = users.filter((u) => u.subgroupId === subgroup.id);

                      return (
                        <tr key={subgroup.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-500">
                            {subgroup.id}
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-900">
                            {subgroup.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                              <Building className="w-3.5 h-3.5 text-slate-500" />
                              {parentGroup ? parentGroup.name : 'Unknown Group'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                            {subgroup.description || '—'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                              {subgroupUsers.length} Users
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={subgroup.status} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditSubgroup(subgroup)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Subgroup"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSubgroup(subgroup)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Subgroup"
                              >
                                <Trash2 className="w-4 h-4" />
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
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* 3. USERS TAB */}
      {/* ============================================================== */}
      {activeTab === 'users' && (
        <>
          {users.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No Users Found"
              description={
                subgroups.length === 0
                  ? 'Please create a Group and Subgroup first before adding Users.'
                  : 'Add team members, assign them to specific Groups and Subgroups, and configure their roles.'
              }
              actionText={subgroups.length > 0 ? 'Add User' : 'Add Group / Subgroup'}
              onAction={
                subgroups.length > 0
                  ? handleOpenAddUser
                  : groups.length === 0
                  ? handleOpenAddGroup
                  : handleOpenAddSubgroup
              }
            />
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <p className="text-slate-500 text-sm">No users match your current filter.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">ID</th>
                      <th className="px-5 py-3.5">User Profile & Name</th>
                      <th className="px-5 py-3.5">User Name</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Department</th>
                      <th className="px-5 py-3.5">Subgroup</th>
                      <th className="px-5 py-3.5">Contact</th>
                      <th className="px-5 py-3.5">Self-Assign</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => {
                      const parentGroup = groups.find((g) => g.id === user.groupId);
                      const parentSubgroup = subgroups.find((sg) => sg.id === user.subgroupId);

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-500">
                            {user.id}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt={user.name}
                                  className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-100 shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-blue-50">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 leading-tight truncate">
                                  {user.name}
                                </p>
                                <span className="text-[11px] text-slate-400 block truncate">
                                  {user.email || 'No email'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                              @{user.username || user.name.toLowerCase().replace(/\s+/g, '')}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-medium text-slate-800">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                              <Building className="w-3.5 h-3.5 text-slate-500" />
                              {parentGroup ? parentGroup.name : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs font-medium text-slate-700">
                            {parentSubgroup ? parentSubgroup.name : '—'}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-600">
                            <div className="space-y-0.5">
                              {user.mobile ? (
                                <p className="flex items-center gap-1.5 text-slate-700 font-medium">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{user.mobile}</span>
                                </p>
                              ) : null}
                              {user.email ? (
                                <p className="flex items-center gap-1.5 text-slate-500">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span className="truncate max-w-[150px]">{user.email}</span>
                                </p>
                              ) : null}
                              {!user.mobile && !user.email && <span className="text-slate-400">—</span>}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => handleToggleSelfAssign(user)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                                user.canSelfAssign
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                              }`}
                              title="Click to toggle self-assign permission"
                            >
                              <CheckCircle2 className={`w-3.5 h-3.5 ${user.canSelfAssign ? 'text-emerald-600' : 'text-slate-400'}`} />
                              <span>{user.canSelfAssign ? 'Allowed' : 'Off'}</span>
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={user.status} />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditUser(user)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit User"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
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
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* 5. GROUP USER (groupUser TABLE) TAB */}
      {/* ============================================================== */}
      {activeTab === 'groupUser' && (
        <>
          {/* Informational banner about real origin data migration */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-indigo-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-indigo-900">
                  Origin Table: <code className="bg-white/80 px-2 py-0.5 rounded text-indigo-700 font-mono text-xs font-bold border border-indigo-200">groupUser</code>
                </h3>
                <p className="text-xs text-indigo-700 mt-0.5">
                  Live relational table populated directly by migrating authentic records from the <span className="font-semibold">users</span> table. Every user is mapped to their assigned group and subgroup.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const res = migrateUsersToGroupUser(true);
                showToast(`Migrated & verified ${res.length} user records in groupUser table`, 'success');
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-sync Table</span>
            </button>
          </div>

          {groupUsers.length === 0 ? (
            <EmptyState
              icon={Link2}
              title="No Group User Records"
              description="No groupUser records found. Click below to migrate from the live users table."
              actionText="Migrate from Users"
              onAction={() => {
                const res = migrateUsersToGroupUser(true);
                showToast(`Migrated ${res.length} origin user records into groupUser table`, 'success');
              }}
            />
          ) : filteredGroupUsers.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
              <p className="text-slate-500 text-sm">No groupUser records match your current filter.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Record ID (groupUser)</th>
                      <th className="px-5 py-3.5">User</th>
                      <th className="px-5 py-3.5">User ID</th>
                      <th className="px-5 py-3.5">Assigned Group</th>
                      <th className="px-5 py-3.5">Subgroup</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Self-Assign</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Assigned At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGroupUsers.map((gu) => {
                      const parentGroup = groups.find((g) => g.id === gu.groupId);
                      const parentSubgroup = subgroups.find((sg) => sg.id === gu.subgroupId);

                      return (
                        <tr key={gu.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4 font-mono text-xs font-semibold text-indigo-600">
                            {gu.id}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-indigo-50">
                                {(gu.username || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 leading-tight truncate">
                                  {gu.username || gu.userId}
                                </p>
                                <span className="text-[11px] text-slate-400 block truncate">
                                  {gu.email || 'No email'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-600">
                            {gu.userId}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                              <Building className="w-3.5 h-3.5 text-slate-500" />
                              {parentGroup ? parentGroup.name : (gu.groupId || '—')}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs font-medium text-slate-700">
                            {parentSubgroup ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs">
                                {parentSubgroup.name}
                              </span>
                            ) : (
                              gu.subgroupId || '—'
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {gu.role}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                gu.canSelfAssign
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              <CheckCircle2 className={`w-3 h-3 ${gu.canSelfAssign ? 'text-emerald-600' : 'text-slate-400'}`} />
                              <span>{gu.canSelfAssign ? 'Allowed' : 'Off'}</span>
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={gu.status} />
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                            {gu.assignedAt ? new Date(gu.assignedAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* DEPARTMENT MODAL */}
      {/* ============================================================== */}
      <Modal
        isOpen={departmentModalOpen}
        onClose={() => setDepartmentModalOpen(false)}
        title={editingDepartment ? `Edit Department: ${editingDepartment.id}` : 'Create New Department'}
        subtitle="Departments are primary hospital divisions (e.g. Clinical, Administration, Nursing)."
      >
        <form onSubmit={handleSaveDepartment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Department Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Clinical & Medical Services, Nursing, Pharmacy"
              value={departmentForm.name}
              onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Department Code
              </label>
              <input
                type="text"
                placeholder="e.g. CMS, ADM, NUR"
                value={departmentForm.code}
                onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Head of Department (HOD)
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Rajesh Sharma"
                value={departmentForm.head}
                onChange={(e) => setDepartmentForm({ ...departmentForm, head: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Optional overview or function of this department..."
              value={departmentForm.description}
              onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              value={departmentForm.status}
              onChange={(e) => setDepartmentForm({ ...departmentForm, status: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDepartmentModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
            >
              {editingDepartment ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* GROUP MODAL */}
      {/* ============================================================== */}
      <Modal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        title={editingGroup ? `Edit Group: ${editingGroup.id}` : 'Create New Group'}
        subtitle="Groups represent organizational departments or divisions."
      >
        <form onSubmit={handleSaveGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Parent Department
            </label>
            <select
              value={groupForm.departmentId}
              onChange={(e) => setGroupForm({ ...groupForm, departmentId: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">-- No Department (Unassigned) --</option>
              {(departments || []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.code ? `(${d.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Group Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Clinical Services, Pharmacy, Housekeeping"
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Optional overview or scope of this group..."
              value={groupForm.description}
              onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              value={groupForm.status}
              onChange={(e) => setGroupForm({ ...groupForm, status: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setGroupModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
            >
              {editingGroup ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* SUBGROUP MODAL */}
      {/* ============================================================== */}
      <Modal
        isOpen={subgroupModalOpen}
        onClose={() => setSubgroupModalOpen(false)}
        title={editingSubgroup ? `Edit Subgroup: ${editingSubgroup.id}` : 'Create New Subgroup'}
        subtitle="Subgroups belong to a specific parent Group."
      >
        <form onSubmit={handleSaveSubgroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Parent Group <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={subgroupForm.groupId}
              onChange={(e) => setSubgroupForm({ ...subgroupForm, groupId: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Subgroup Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., ICU Ward, Sanitation Unit, Shift A"
              value={subgroupForm.name}
              onChange={(e) => setSubgroupForm({ ...subgroupForm, name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Optional overview or function of this subgroup..."
              value={subgroupForm.description}
              onChange={(e) => setSubgroupForm({ ...subgroupForm, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              value={subgroupForm.status}
              onChange={(e) => setSubgroupForm({ ...subgroupForm, status: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSubgroupModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs"
            >
              {editingSubgroup ? 'Save Changes' : 'Create Subgroup'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================== */}
      {/* USER MODAL */}
      {/* ============================================================== */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? `Edit User: ${editingUser.id}` : 'Create New User'}
        subtitle="Configure user profile, credentials, role, and department assignment."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveUser} className="space-y-5">
          {/* 1. User Profile Photo Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="relative group shrink-0">
              {userForm.avatar ? (
                <img
                  src={userForm.avatar}
                  alt="Profile Preview"
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-white shadow-sm border border-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl shadow-inner border border-blue-200">
                  {userForm.name ? userForm.name.charAt(0).toUpperCase() : <User className="w-8 h-8 text-blue-500" />}
                </div>
              )}
              <label
                htmlFor="user-avatar-upload"
                className="absolute bottom-0 right-0 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full cursor-pointer shadow-md transition-transform hover:scale-105"
                title="Upload profile photo"
              >
                <Camera className="w-3.5 h-3.5" />
                <input
                  id="user-avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <label className="block text-sm font-semibold text-slate-800">
                User Profile Photo
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                PNG, JPG or WEBP up to 2MB. Saved offline in LocalStorage.
              </p>
              <div className="mt-2.5 flex items-center justify-center sm:justify-start gap-2">
                <label
                  htmlFor="user-avatar-upload"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>{userForm.avatar ? 'Change Photo' : 'Upload Photo'}</span>
                </label>
                {userForm.avatar && (
                  <button
                    type="button"
                    onClick={() => setUserForm((prev) => ({ ...prev, avatar: '' }))}
                    className="px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. Name & User Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Digendra Verma"
                  value={userForm.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setUserForm((prev) => ({
                      ...prev,
                      name: newName,
                      // Auto suggest username if currently empty
                      username:
                        !editingUser && !prev.username
                          ? newName.toLowerCase().replace(/\s+/g, '').slice(0, 15)
                          : prev.username,
                    }));
                  }}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                User Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. digendra15"
                  value={userForm.username}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
                    })
                  }
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* 3. Email ID & Mobile Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="e.g. digendrav15@gmail.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  placeholder="e.g. +91 80857 05807"
                  value={userForm.mobile}
                  onChange={(e) => setUserForm({ ...userForm, mobile: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Role & Department (Group) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="Admin">Admin</option>
                <option value="User">User</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Department (Group) <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={userForm.groupId}
                onChange={(e) => {
                  const newGroupId = e.target.value;
                  const validSubgroups = subgroups.filter((sg) => sg.groupId === newGroupId);
                  setUserForm({
                    ...userForm,
                    groupId: newGroupId,
                    subgroupId: validSubgroups[0]?.id || '',
                  });
                }}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Subgroup & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Subgroup <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={userForm.subgroupId}
                onChange={(e) => setUserForm({ ...userForm, subgroupId: e.target.value })}
                disabled={userFormSubgroups.length === 0}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-400"
              >
                {userFormSubgroups.length === 0 ? (
                  <option value="">No subgroups in this department</option>
                ) : (
                  userFormSubgroups.map((sg) => (
                    <option key={sg.id} value={sg.id}>
                      {sg.name}
                    </option>
                  ))
                )}
              </select>
              {userFormSubgroups.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  Please create a Subgroup under this Department first.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password {!editingUser && <span className="text-rose-500">*</span>}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!editingUser}
                  placeholder={editingUser ? 'Leave blank to keep unchanged' : 'Enter account password'}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* 6. Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Account Status
            </label>
            <select
              value={userForm.status}
              onChange={(e) => setUserForm({ ...userForm, status: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* 7. Self-Assign Permission */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={userForm.canSelfAssign || false}
                onChange={(e) => setUserForm({ ...userForm, canSelfAssign: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 block">
                  Allow Self-Assign (User Portal)
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  When enabled, this user will have access to the "Self Assign" page in their User Portal to assign tasks directly to themselves.
                </span>
              </div>
            </label>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setUserModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!userForm.subgroupId}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingUser ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const SettingsPage = UsersPage;
