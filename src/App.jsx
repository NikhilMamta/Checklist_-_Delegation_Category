import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { TaskAssignPage } from './pages/TaskAssignPage';
import { SelfAssignPage } from './pages/SelfAssignPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { SettingsPage } from './pages/UsersPage';
import { LoginPage } from './pages/LoginPage';

// Protect routes that require login
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useApp();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Protect routes strictly for Admin role
const AdminRoute = ({ children }) => {
  const { currentUser } = useApp();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (currentUser.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Prevent logged-in users from seeing the login screen
const PublicRoute = ({ children }) => {
  const { currentUser } = useApp();
  if (currentUser) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected App Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="tasks/assign"
          element={
            <AdminRoute>
              <TaskAssignPage />
            </AdminRoute>
          }
        />
        <Route path="tasks/self-assign" element={<SelfAssignPage />} />
        <Route path="my-tasks" element={<MyTasksPage />} />
        <Route path="my_tasks" element={<Navigate to="/my-tasks" replace />} />
        <Route
          path="settings"
          element={
            <AdminRoute>
              <SettingsPage />
            </AdminRoute>
          }
        />
        <Route path="users" element={<Navigate to="/settings" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;

