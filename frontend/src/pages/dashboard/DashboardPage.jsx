import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Users,
  UserCheck,
  UserX,
  Building2,
  CheckCircle2,
  XCircle,
  CalendarOff,
  Clock,
  Cake,
  Activity,
  Bell,
  Plus,
  LogIn,
  LogOut,
  FileText,
  Briefcase,
} from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useAuth, ROLES } from '../../context/AuthContext';
import StatCard from '../../components/dashboard/StatCard';
import DashboardCharts from '../../components/dashboard/DashboardCharts';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { formatDate, formatDateTime, formatTime } from '../../utils/formatters';

export default function DashboardPage() {
  const { user, companySettings, hasRole } = useAuth();
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [monthsRange, setMonthsRange] = useState(6);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);

  const tz = companySettings?.timezone || 'UTC';

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const chartParams = new URLSearchParams({ months: String(monthsRange) });
      if (startDate) chartParams.append('startDate', startDate);
      if (endDate) chartParams.append('endDate', endDate);

      const requests = [
        api.get('/dashboard/stats'),
        api.get(`/dashboard/charts?${chartParams.toString()}`),
      ];
      if (user?.employee?._id) {
        requests.push(api.get('/attendance/my?limit=1'));
      }

      const [statsRes, chartsRes, myAttRes] = await Promise.all(requests);
      setStats(statsRes.data.data);
      setCharts(chartsRes.data.data);
      if (myAttRes) {
        setTodayAttendance(myAttRes.data.data.today);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [monthsRange, startDate, endDate, user?.employee?._id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleClockIn = async () => {
    setClockLoading(true);
    try {
      const res = await api.post('/attendance/check-in', {});
      toast.success(res.data.message);
      loadDashboard();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = async () => {
    setClockLoading(true);
    try {
      const res = await api.post('/attendance/check-out', {});
      toast.success(res.data.message);
      loadDashboard();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setClockLoading(false);
    }
  };

  const handleQuickLeaveDecision = async (leaveId, action) => {
    try {
      await api.put(`/leaves/${leaveId}/${action}`, { comment: `Quick ${action} from dashboard` });
      toast.success(`Leave ${action === 'approve' ? 'approved' : 'rejected'}`);
      loadDashboard();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading && !stats) return <Loader text="Loading enterprise analytics..." />;

  const kpis = stats?.kpis || {};
  const widgets = stats?.widgets || {};

  return (
    <div className="space-y-6">
      {/* Header & Date Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time organizational metrics • Timezone: <span className="font-medium text-slate-700">{tz}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={monthsRange}
            onChange={(e) => setMonthsRange(Number(e.target.value))}
            className="input-field w-auto text-xs"
            aria-label="Chart period"
          >
            <option value={3}>Last 3 Months</option>
            <option value={6}>Last 6 Months</option>
            <option value={12}>Last 12 Months</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-field w-auto text-xs"
            aria-label="Start date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-field w-auto text-xs"
            aria-label="End date"
          />
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="btn-secondary text-xs py-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions & Personal Attendance Bar */}
      <div className="card p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-navy-900 to-navy-800 text-white border-none">
        <div className="flex flex-wrap items-center gap-3">
          {user?.employee?._id && (
            <>
              {!todayAttendance?.checkIn ? (
                <button
                  type="button"
                  onClick={handleClockIn}
                  disabled={clockLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors"
                >
                  <LogIn className="w-4 h-4" /> Check In Today
                </button>
              ) : !todayAttendance?.checkOut ? (
                <button
                  type="button"
                  onClick={handleClockOut}
                  disabled={clockLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Check Out ({formatTime(todayAttendance.checkIn, tz)})
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-xs font-medium text-emerald-200">
                  <CheckCircle2 className="w-4 h-4" /> Completed shift: {todayAttendance.workingHours} hrs
                </span>
              )}
            </>
          )}
          <Link
            to="/leaves"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
          >
            <CalendarOff className="w-4 h-4" /> Apply Leave
          </Link>
          {hasRole(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER) && (
            <>
              <Link
                to="/employees?action=add"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Employee
              </Link>
              <Link
                to="/payroll"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
              >
                <FileText className="w-4 h-4" /> Run Payroll
              </Link>
              <Link
                to="/recruitment"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
              >
                <Briefcase className="w-4 h-4" /> Post Job
              </Link>
            </>
          )}
        </div>
        <span className="text-xs text-blue-200">Today: {stats?.todayKey}</span>
      </div>

      {/* 8 KPI Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={kpis.totalEmployees ?? 0} subtitle="Organization directory" icon={Users} tone="blue" />
        <StatCard title="Active Employees" value={kpis.activeEmployees ?? 0} subtitle="Currently employed" icon={UserCheck} tone="emerald" />
        <StatCard title="Inactive Employees" value={kpis.inactiveEmployees ?? 0} subtitle="Deactivated / exited" icon={UserX} tone="slate" />
        <StatCard title="Total Departments" value={kpis.totalDepartments ?? 0} subtitle="Active business units" icon={Building2} tone="indigo" />
        <StatCard title="Present Today" value={kpis.presentToday ?? 0} subtitle="Checked-in workforce" icon={CheckCircle2} tone="emerald" />
        <StatCard title="Absent Today" value={kpis.absentToday ?? 0} subtitle="Not checked in" icon={XCircle} tone="red" />
        <StatCard title="Employees on Leave" value={kpis.employeesOnLeave ?? 0} subtitle="Approved leave today" icon={CalendarOff} tone="amber" />
        <StatCard title="Pending Leave Requests" value={kpis.pendingLeaveRequests ?? 0} subtitle="Awaiting decision" icon={Clock} tone="amber" />
      </div>

      {/* 5 Interactive Recharts Analytics */}
      <DashboardCharts charts={charts} />

      {/* Bottom Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Pending Approvals */}
        <div className="card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Pending Leave Approvals</h3>
            <Link to="/leaves" className="text-xs font-medium text-blue-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3 flex-1">
            {(widgets.pendingApprovals || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No pending leave approvals.</p>
            ) : (
              widgets.pendingApprovals.map((lv) => (
                <div key={lv._id} className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/60">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900">
                      {lv.employee?.firstName} {lv.employee?.lastName}
                    </p>
                    <Badge status="Pending">{lv.totalDays}d • {lv.leaveType}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {formatDate(lv.startDate, tz)} – {formatDate(lv.endDate, tz)}
                  </p>
                  {hasRole(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER) &&
                    String(user?.employee?._id) !== String(lv.employee?._id) && (
                      <div className="mt-2.5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickLeaveDecision(lv._id, 'approve')}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickLeaveDecision(lv._id, 'reject')}
                          className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Employees */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Recent Employees</h3>
            <Link to="/employees" className="text-xs font-medium text-blue-700 hover:underline">
              Directory
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {(widgets.recentEmployees || []).map((emp) => (
              <Link
                key={emp._id}
                to={`/employees/${emp._id}`}
                className="py-2.5 flex items-center justify-between hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {emp.firstName} {emp.lastName}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {emp.designation} • {emp.department?.name || '-'}
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 ml-2">{formatDate(emp.joiningDate, tz)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming Birthdays */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cake className="w-4 h-4 text-blue-700" />
            <h3 className="text-sm font-semibold text-slate-900">Upcoming Birthdays</h3>
          </div>
          <div className="space-y-3">
            {(widgets.upcomingBirthdays || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No upcoming birthdays in the next 45 days.</p>
            ) : (
              widgets.upcomingBirthdays.map((b) => (
                <div key={b._id} className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/40 border border-blue-100">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      {b.firstName} {b.lastName}
                    </p>
                    <p className="text-[11px] text-slate-500">{b.department}</p>
                  </div>
                  <span className="text-xs font-semibold text-blue-700">
                    {b.daysUntil === 0 ? 'Today!' : `In ${b.daysUntil}d`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-700" />
              <h3 className="text-sm font-semibold text-slate-900">Recent System Activities</h3>
            </div>
            {hasRole(ROLES.SUPER_ADMIN) && (
              <Link to="/audit-logs" className="text-xs font-medium text-blue-700 hover:underline">
                Full Audit Log
              </Link>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {(widgets.recentActivities || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No activity logged yet.</p>
            ) : (
              widgets.recentActivities.map((act) => (
                <div key={act._id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-800">{act.action.replace(/_/g, ' ')}</span>
                    <span className="text-slate-500">
                      {' '}
                      • {act.entityType} by {act.user?.name || 'System'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">{formatDateTime(act.createdAt, tz)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-700" />
              <h3 className="text-sm font-semibold text-slate-900">Recent Notifications</h3>
            </div>
            <Link to="/notifications" className="text-xs font-medium text-blue-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2.5">
            {(widgets.recentNotifications || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">You are all caught up!</p>
            ) : (
              widgets.recentNotifications.map((n) => (
                <div key={n._id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70">
                  <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
