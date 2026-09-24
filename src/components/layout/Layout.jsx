import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ToastContainer } from '../common/Toast';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Top Navbar */}
      <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

      <div className="flex-1 flex w-full">
        {/* Sidebar */}
        <Sidebar
          isMobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 pb-20 lg:pb-12 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Global Modals & Notifications */}
      <ToastContainer />
      <ConfirmDialog />
    </div>
  );
};
