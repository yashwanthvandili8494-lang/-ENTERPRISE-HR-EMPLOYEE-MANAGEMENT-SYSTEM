import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  CalendarOff,
  Wallet,
  Briefcase,
  BarChart3,
  Bell,
  ShieldCheck,
  Settings,
  Search,
  LogOut,
  UserCircle,
  Menu,
  X,
  CheckCheck,
} from 'lucide-react';
import { useAuth, ROLES } from '../../context/AuthContext';
import api, { SERVER_BASE_URL } from '../../services/api';
import { ROLE_LABELS, formatDateTime } from '../../utils/formatters';

export default function AppLayout() {
  const { user, companySettings, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications?limit=6');
      setNotifications(res.data.data.notifications || []);
      setUnreadCount(res.data.data.unreadCount || 0);
    } catch (_) {
      // ignore transient errors
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 45000);
    return () => clearInterval(timer);
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id, link) => {
    try {
      await api.put(`/notifications/${id}/read`);
      loadNotifications();
      setNotifOpen(false);
      if (link) navigate(link);
    } catch (_) {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      loadNotifications();
    } catch (_) {
      // ignore
    }
  };

  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    if (hasRole(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER)) {
      navigate(`/employees?search=${encodeURIComponent(globalSearch.trim())}`);
    } else {
      navigate('/attendance');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, roles: null },
    {
      label: user?.role === ROLES.EMPLOYEE ? 'My Profile' : 'Employees',
      to: user?.role === ROLES.EMPLOYEE && user?.employee?._id ? `/employees/${user.employee._id}` : '/employees',
      icon: Users,
      roles: null,
    },
    { label: 'Departments', to: '/departments', icon: Building2, roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER] },
    { label: 'Attendance', to: '/attendance', icon: Clock, roles: null },
    { label: 'Leave Management', to: '/leaves', icon: CalendarOff, roles: null },
    { label: 'Payroll', to: '/payroll', icon: Wallet, roles: null },
    { label: 'Recruitment', to: '/recruitment', icon: Briefcase, roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER] },
    { label: 'Reports', to: '/reports', icon: BarChart3, roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER] },
    { label: 'Notifications', to: '/notifications', icon: Bell, roles: null, badge: unreadCount },
    { label: 'Audit Logs', to: '/audit-logs', icon: ShieldCheck, roles: [ROLES.SUPER_ADMIN] },
    { label: 'Settings', to: '/settings', icon: Settings, roles: [ROLES.SUPER_ADMIN] },
  ].filter((item) => !item.roles || item.roles.includes(user?.role));

  const logoUrl = companySettings?.logoPath ? `${SERVER_BASE_URL}${companySettings.logoPath}` : null;
  const companyName = companySettings?.companyName || 'Enterprise HR';

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-navy-900 text-slate-200">
      <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800">
        <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Company Logo" className="w-9 h-9 rounded-lg object-cover bg-white p-0.5" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow">
              HR
            </div>
          )}
          <div className="truncate">
            <p className="text-sm font-bold text-white truncate">{companyName}</p>
            <p className="text-[11px] text-slate-400">HRMS Enterprise</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <span className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </span>
              {item.badge > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-[11px] font-bold">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-200 uppercase">
            {(user?.name || 'U').slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{ROLE_LABELS[user?.role] || user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30 no-print">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 max-w-xs h-full z-10">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <form onSubmit={handleGlobalSearch} className="relative w-full hidden sm:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search employees by name, ID, email..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              />
            </form>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((prev) => !prev);
                  if (!notifOpen) loadNotifications();
                }}
                className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-40">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <span className="text-sm font-semibold text-slate-900">Notifications ({unreadCount} unread)</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-center text-sm text-slate-500">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n._id}
                          type="button"
                          onClick={() => handleMarkRead(n._id, n.link)}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                            !n.isRead ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                            {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1 shrink-0" />}
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {formatDateTime(n.createdAt, companySettings?.timezone)}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                  <Link
                    to="/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="block text-center py-2.5 text-xs font-semibold text-blue-700 hover:bg-slate-50 border-t border-slate-200"
                  >
                    View all notifications
                  </Link>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-navy-800 text-white flex items-center justify-center text-xs font-bold uppercase">
                  {(user?.name || 'U').slice(0, 2)}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 leading-tight">{ROLE_LABELS[user?.role]}</p>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-40">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <UserCircle className="w-4 h-4 text-slate-400" /> Profile & Password
                  </Link>
                  {hasRole(ROLES.SUPER_ADMIN) && (
                    <Link
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Settings className="w-4 h-4 text-slate-400" /> Company Settings
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
