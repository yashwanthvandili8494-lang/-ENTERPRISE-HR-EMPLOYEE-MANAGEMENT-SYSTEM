import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ROLES } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ProfilePage from './pages/auth/ProfilePage';
import DashboardPage from './pages/dashboard/DashboardPage';
import EmployeesPage from './pages/employees/EmployeesPage';
import EmployeeProfilePage from './pages/employees/EmployeeProfilePage';
import DepartmentsPage from './pages/departments/DepartmentsPage';
import AttendancePage from './pages/attendance/AttendancePage';
import LeavesPage from './pages/leaves/LeavesPage';
import PayrollPage from './pages/payroll/PayrollPage';
import RecruitmentPage from './pages/recruitment/RecruitmentPage';
import ReportsPage from './pages/reports/ReportsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import AuditLogsPage from './pages/audit/AuditLogsPage';
import SettingsPage from './pages/settings/SettingsPage';

export default function App() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected Enterprise Application Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="employees/:id" element={<EmployeeProfilePage />} />
        <Route
          path="departments"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER]}>
              <DepartmentsPage />
            </ProtectedRoute>
          }
        />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="leaves" element={<LeavesPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route
          path="recruitment"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER]}>
              <RecruitmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER]}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route
          path="audit-logs"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
