import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  ClipboardList,
  Settings,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isOverdue } from '../../services/taskService';

export const Sidebar = ({ isMobileOpen, onCloseMobile }) => {
  const {
    taskInstances,
    currentUser,
    portalMode,
    canCurrentUserSelfAssign,
  } = useApp();

  // Compute pending / overdue count for current user
  const userInstances = currentUser
    ? taskInstances.filter((i) => i.userId === currentUser.id)
    : [];

  const pendingCount = userInstances.filter(
    (i) => i.status !== 'Done' && i.status !== 'Completed' && i.status !== 'Cancelled'
  ).length;

  const overdueCount = userInstances.filter((i) => isOverdue(i.dueDate, i.status)).length;
  const myTaskBadge =
    overdueCount > 0
      ? `${overdueCount} overdue`
      : pendingCount > 0
      ? `${pendingCount}`
      : null;
  const myTaskBadgeColor =
    overdueCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700';

  const hasSelfAssignPerm = canCurrentUserSelfAssign();

  // Navigation items strictly per portal specification
  const adminNavItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/tasks/assign',
      label: 'Task Assign',
      icon: CheckSquare,
    },
    {
      to: '/my-tasks',
      label: 'My Task',
      icon: ClipboardList,
      badge: myTaskBadge,
      badgeColor: myTaskBadgeColor,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  const userNavItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    ...(hasSelfAssignPerm
      ? [
          {
            to: '/tasks/self-assign',
            label: 'Self Assign',
            icon: UserCheck,
            highlight: true,
          },
        ]
      : []),
    {
      to: '/my-tasks',
      label: 'My Task',
      icon: ClipboardList,
      badge: myTaskBadge,
      badgeColor: myTaskBadgeColor,
    },
  ];

  const currentNavItems = portalMode === 'admin' ? adminNavItems : userNavItems;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Top Sidebar Header on Mobile */}
      <div className="lg:hidden px-6 h-16 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            <CheckSquare className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900 text-sm">Task Manager</span>
        </div>
        <button
          onClick={onCloseMobile}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-5 px-3.5 space-y-2 overflow-y-auto">
        {/* Category Header Indicator */}
        <div className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>{portalMode === 'admin' ? 'Admin Portal' : 'User Portal'}</span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              portalMode === 'admin'
                ? 'bg-blue-50 text-blue-700'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {portalMode === 'admin' ? 'ADMIN' : 'USER'}
          </span>
        </div>

        {currentNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? portalMode === 'admin'
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden lg:block w-64 shrink-0 h-[calc(100vh-4rem)] sticky top-16">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Collapsible) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-xl z-50 flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
