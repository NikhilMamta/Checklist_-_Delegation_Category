import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckSquare,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ensureInitialData, loadSampleDummyData } from '../services/storage';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, settings, showToast } = useApp();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const result = login(identifier, password);
      setIsLoading(false);

      if (result.success) {
        showToast(
          `Welcome back, ${result.user.name}! Logged in as ${result.user.role}.`,
          'success'
        );
        const redirectPath = location.state?.from?.pathname || '/';
        navigate(redirectPath, { replace: true });
      } else {
        setError(result.error);
      }
    }, 250);
  };

  const handleQuickFill = (roleKey) => {
    ensureInitialData();
    setError('');
    if (roleKey === 'admin') {
      setIdentifier('admin');
      setPassword('admin123');
    } else {
      setIdentifier('user');
      setPassword('user123');
    }
  };

  const handleRestoreAccounts = () => {
    ensureInitialData();
    setError('');
    showToast('Default login accounts restored! You can now sign in.', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Ambient background hospital glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Logo & Name */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
            <CheckSquare className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none block">
              {settings?.orgName || 'Mamta Hospital'}
            </span>
            <span className="text-[11px] font-semibold text-blue-300 tracking-wider uppercase block mt-1">
              Checklist & Delegation System
            </span>
          </div>
        </div>

        <h2 className="text-center text-xl font-bold text-slate-200">
          Sign In to Your Account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Enter your User ID and password to access your portal
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-9 shadow-2xl rounded-3xl border border-white/20">
          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-700 font-medium leading-relaxed flex-1">
                  {error}
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-rose-200/60 flex justify-end">
                <button
                  type="button"
                  onClick={handleRestoreAccounts}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Restore Default Accounts & Re-try</span>
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* User ID */}
            <div>
              <label
                htmlFor="identifier"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                User ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="identifier"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="Enter User ID (e.g. admin or user)"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors font-medium bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors font-medium bg-slate-50/50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-70"
              >
                <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Footer */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2.5">
              1-Click Demo Credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="p-2.5 rounded-xl border border-blue-200/80 bg-blue-50/60 hover:bg-blue-100/70 text-left text-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 font-bold text-blue-700 group-hover:text-blue-800">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Demo</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  ID: <span className="font-mono font-semibold text-slate-700">admin</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Pass: <span className="font-mono font-semibold text-slate-700">admin123</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('user')}
                className="p-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 hover:bg-emerald-100/70 text-left text-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 group-hover:text-emerald-800">
                  <User className="w-3.5 h-3.5" />
                  <span>User Demo</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  ID: <span className="font-mono font-semibold text-slate-700">user</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Pass: <span className="font-mono font-semibold text-slate-700">user123</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Mamta Hospital Internal Access • Role-Protected</span>
        </div>
      </div>
    </div>
  );
};
