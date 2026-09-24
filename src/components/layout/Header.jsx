import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Calendar,
  CheckSquare,
  ChevronDown,
  Shield,
  User,
  LogOut,
  Building,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Header = ({ onOpenMobileMenu }) => {
  const navigate = useNavigate();
  const { currentUser, logout, settings, confirmAction } = useApp();

  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
      }
    };

    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileOpen]);

  // Format today's date
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleLogout = () => {
    confirmAction({
      title: 'Sign Out',
      message: `Are you sure you want to sign out, ${currentUser?.name || 'User'}?`,
      confirmText: 'Sign Out',
      isDestructive: true,
      onConfirm: () => {
        logout();
        navigate('/login');
      },
    });
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-slate-900 text-base leading-tight block">
                {settings?.orgName || 'Mamta Hospital'}
              </span>
              <span className="text-[11px] text-slate-500 font-medium tracking-wide uppercase block">
                Checklist & Delegation
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Portal Badge */}
        {isAdmin ? (
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Portal</span>
          </div>
        ) : (
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <User className="w-3.5 h-3.5" />
            <span>Staff Portal</span>
          </div>
        )}

        {/* Right: Date & Current Logged-In User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Current Date Indicator */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{todayFormatted}</span>
          </div>

          {/* User Profile Card & Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-expanded={profileOpen}
              aria-haspopup="true"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer text-xs font-medium text-slate-800 shadow-2xs select-none ${
                profileOpen
                  ? 'border-blue-300 bg-blue-50/70 ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100/90'
              }`}
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="max-w-[110px] sm:max-w-[150px] truncate text-left">
                <span className="font-bold text-slate-900 block truncate leading-tight">
                  {currentUser?.name || 'Logged User'}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  @{currentUser?.username || 'user'} • <strong className={isAdmin ? 'text-blue-600' : 'text-emerald-600'}>{currentUser?.role || 'User'}</strong>
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 ml-0.5 transition-transform duration-200 ${
                  profileOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </button>

            {/* Profile Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {currentUser?.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                    @{currentUser?.username} • {currentUser?.email || 'No email registered'}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isAdmin
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {currentUser?.role || 'Staff'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ID: {currentUser?.id}
                    </span>
                  </div>
                </div>

                <div className="p-1.5 space-y-0.5">
                  {isAdmin && (
                    <Link
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>Hospital Settings</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Sign Out Icon Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

