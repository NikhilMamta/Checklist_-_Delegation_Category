import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  ClipboardList,
  Settings,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isOverdue } from '../../services/taskService';

export const BottomNav = () => {
  const { currentUser, taskInstances, portalMode, canCurrentUserSelfAssign } = useApp();

  const userInstances = currentUser
    ? taskInstances.filter((i) => i.userId === currentUser.id)
    : [];

  const overdueCount = userInstances.filter((i) => isOverdue(i.dueDate, i.status)).length;
  const pendingCount = userInstances.filter(
    (i) => i.status !== 'Done' && i.status !== 'Completed' && i.status !== 'Cancelled'
  ).length;

  const myTaskBadge = overdueCount > 0 ? `${overdueCount}` : pendingCount > 0 ? `${pendingCount}` : null;
  const hasSelfAssignPerm = canCurrentUserSelfAssign();

  const adminTabs = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tasks/assign', label: 'Assign', icon: CheckSquare },
    {
      to: '/my-tasks',
      label: 'My Task',
      icon: ClipboardList,
      badge: myTaskBadge,
      isOverdue: overdueCount > 0,
    },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const userTabs = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    ...(hasSelfAssignPerm
      ? [{ to: '/tasks/self-assign', label: 'Self Assign', icon: UserCheck }]
      : []),
    {
      to: '/my-tasks',
      label: 'My Task',
      icon: ClipboardList,
      badge: myTaskBadge,
      isOverdue: overdueCount > 0,
    },
  ];

  const activeTabs = portalMode === 'admin' ? adminTabs : userTabs;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg px-2 py-1.5 flex items-center justify-around">
      {activeTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-lg text-[11px] font-medium transition-colors relative ${
                isActive
                  ? portalMode === 'admin'
                    ? 'text-blue-600 font-bold'
                    : 'text-emerald-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <div className="relative">
              <Icon className="w-5 h-5 mb-0.5" />
              {tab.badge && (
                <span
                  className={`absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${
                    tab.isOverdue ? 'bg-rose-500' : 'bg-blue-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </div>
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
