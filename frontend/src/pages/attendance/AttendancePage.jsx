import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Calendar, Clock, List, LogIn, LogOut, Plus, Zap, Timer } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useAuth, ROLES } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import AttendanceCalendar from '../../components/attendance/AttendanceCalendar';
import LiveClock from '../../components/common/LiveClock';
import { formatTime, formatDate, getLiveTimezone } from '../../utils/formatters';

export default function AttendancePage() {
  const { user, companySettings, hasRole } = useAuth();
  const isManagerOrHR = hasRole(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER);
  const canManualRecord = hasRole(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER);

  const now = new Date();
  const [tab, setTab] = useState(user?.employee?._id ? 'my' : 'team');
  const [viewMode, setViewMode] = useState('table');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [myData, setMyData] = useState(null);
  const [teamRecords, setTeamRecords] = useState([]);
  const [meta, setMeta] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockBusy, setClockBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const tz = getLiveTimezone(myData?.companyTimezone || companySettings?.timezone);

  const manualForm = useForm({
    defaultValues: {
      employee: '',
      dateKey: new Date().toISOString().slice(0, 10),
      status: 'Present',
      notes: '',
    },
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const limit = viewMode === 'calendar' ? 100 : 15;
      if (tab === 'my' && user?.employee?._id) {
        const res = await api.get(`/attendance/my?month=${month}&year=${year}&page=${page}&limit=${limit}`);
        setMyData(res.data.data);
        setMeta(res.data.meta);
      } else {
        const params = new URLSearchParams({
          month: String(month),
          year: String(year),
          page: String(page),
          limit: String(limit),
        });
        if (statusFilter) params.append('status', statusFilter);
        const res = await api.get(`/attendance?${params.toString()}`);
        setTeamRecords(res.data.data.records || []);
        setMeta(res.data.meta);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab, month, year, statusFilter, page, viewMode, user?.employee?._id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (canManualRecord) {
      api.get('/employees?limit=100').then((r) => setEmployees(r.data.data || [])).catch(() => {});
    }
  }, [canManualRecord]);

  const handleCheckIn = async () => {
    setClockBusy(true);
    try {
      const liveTime = new Date().toISOString();
      const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const res = await api.post('/attendance/check-in', {
        clientTime: liveTime,
        timezone: clientTz,
      });
      toast.success(res.data.message);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setClockBusy(false);
    }
  };

  const handleCheckOut = async () => {
    setClockBusy(true);
    try {
      const liveTime = new Date().toISOString();
      const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const res = await api.post('/attendance/check-out', {
        clientTime: liveTime,
        timezone: clientTz,
      });
      toast.success(res.data.message);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setClockBusy(false);
    }
  };

  const fillLiveCurrentTime = () => {
    const live = new Date();
    const hours = String(live.getHours()).padStart(2, '0');
    const mins = String(live.getMinutes()).padStart(2, '0');
    const todayStr = `${live.getFullYear()}-${String(live.getMonth() + 1).padStart(2, '0')}-${String(live.getDate()).padStart(2, '0')}`;
    manualForm.setValue('dateKey', todayStr);
    manualForm.setValue('checkInTime', `${hours}:${mins}`);
  };

  const onSaveManual = async (values) => {
    try {
      let checkInIso = null;
      if (values.checkInTime) {
        checkInIso = new Date(`${values.dateKey}T${values.checkInTime}:00`).toISOString();
      }
      let checkOutIso = null;
      if (values.checkOutTime) {
        checkOutIso = new Date(`${values.dateKey}T${values.checkOutTime}:00`).toISOString();
      }
      await api.post('/attendance/manual', {
        employee: values.employee,
        dateKey: values.dateKey,
        checkIn: checkInIso,
        checkOut: checkOutIso,
        status: values.status,
        notes: values.notes,
      });
      toast.success('Attendance record saved');
      setManualOpen(false);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const activeRecords = tab === 'my' ? myData?.records || [] : teamRecords;
  const today = myData?.today;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time live attendance tracking • Timezone: <span className="font-semibold text-slate-700">{tz}</span>
          </p>
        </div>
        {canManualRecord && (
          <button type="button" onClick={() => setManualOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Log Manual Attendance
          </button>
        )}
      </div>

      {/* Live System Clock & Shift Tracker Card */}
      <LiveClock
        timezone={tz}
        checkedInAt={today?.checkIn}
        checkedOutAt={today?.checkOut}
      />

      {/* Personal Check-In / Check-Out Panel */}
      {user?.employee?._id && (
        <div className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-blue-50/40 border border-blue-100">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-600 text-white shadow-sm">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Today&apos;s Shift ({myData?.todayKey || 'Today'})</h2>
                {today && <Badge status={today.status} />}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {today?.checkIn
                  ? `Checked in at ${formatTime(today.checkIn, tz, true)}${
                      today.checkOut
                        ? ` • Checked out at ${formatTime(today.checkOut, tz, true)} (${today.workingHours} hrs completed)`
                        : ' • Currently clocked in (Active live shift)'
                    }`
                  : 'You have not checked in yet today. Ready to record live check-in.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={clockBusy || Boolean(today?.checkIn)}
              className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" /> Check In Live
            </button>
            <button
              type="button"
              onClick={handleCheckOut}
              disabled={clockBusy || !today?.checkIn || Boolean(today?.checkOut)}
              className="btn-primary bg-amber-600 hover:bg-amber-700 flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" /> Check Out Live
            </button>
          </div>
        </div>
      )}

      {/* Personal Monthly Summary */}
      {tab === 'my' && myData?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="card p-4">
            <p className="text-xs text-slate-500">Present</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{myData.summary.present}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">Late Arrivals</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{myData.summary.late}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">Half-Day</p>
            <p className="text-xl font-bold text-indigo-700 mt-1">{myData.summary.halfDay}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">Absent</p>
            <p className="text-xl font-bold text-red-600 mt-1">{myData.summary.absent}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">Total Hours</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{myData.summary.totalWorkingHours}h</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">Overtime</p>
            <p className="text-xl font-bold text-blue-700 mt-1">{myData.summary.totalOvertimeHours}h</p>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {user?.employee?._id && (
            <button
              type="button"
              onClick={() => {
                setTab('my');
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold ${
                tab === 'my' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              My Attendance
            </button>
          )}
          {isManagerOrHR && (
            <button
              type="button"
              onClick={() => {
                setTab('team');
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold ${
                tab === 'team' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Team / All Attendance
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={month} onChange={(e) => { setMonth(Number(e.target.value)); setPage(1); }} className="input-field w-auto text-xs">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(Date.UTC(2026, i, 1)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })}
              </option>
            ))}
          </select>
          <select value={year} onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }} className="input-field w-auto text-xs">
            {[now.getUTCFullYear() - 1, now.getUTCFullYear(), now.getUTCFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {tab === 'team' && (
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto text-xs">
              <option value="">All Status</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Half-Day">Half-Day</option>
              <option value="Absent">Absent</option>
            </select>
          )}
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-2 ${viewMode === 'table' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`p-2 ${viewMode === 'calendar' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
              title="Calendar View"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table or Calendar */}
      <div className="card overflow-hidden">
        {loading ? (
          <Loader text="Loading attendance records..." />
        ) : viewMode === 'calendar' ? (
          <AttendanceCalendar year={year} month={month} records={activeRecords} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
                    {tab === 'team' && (
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Employee</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Check In</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Check Out</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Working Hrs</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Overtime</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeRecords.map((rec) => (
                    <tr key={rec._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900">{rec.dateKey}</td>
                      {tab === 'team' && (
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">
                            {rec.employee?.firstName} {rec.employee?.lastName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {rec.employee?.employeeId} • {rec.employee?.department?.name || '-'}
                          </p>
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-700">{formatTime(rec.checkIn, tz)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatTime(rec.checkOut, tz)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{rec.workingHours ?? 0} hrs</td>
                      <td className="px-4 py-3 text-blue-700">{rec.overtimeHours ?? 0} hrs</td>
                      <td className="px-4 py-3">
                        <Badge status={rec.status} />
                      </td>
                    </tr>
                  ))}
                  {activeRecords.length === 0 && (
                    <tr>
                      <td colSpan={tab === 'team' ? 7 : 6} className="px-4 py-10 text-center text-slate-500">
                        No attendance records for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination meta={meta} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Manual Attendance Modal (HR / Super Admin) */}
      <Modal isOpen={manualOpen} onClose={() => setManualOpen(false)} title="Record Manual Attendance" size="md">
        <form onSubmit={manualForm.handleSubmit(onSaveManual)} className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-600 font-medium">Quick Fill:</span>
            <button
              type="button"
              onClick={fillLiveCurrentTime}
              className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1.5 bg-white shadow-sm hover:bg-slate-100"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Use Current Live Time
            </button>
          </div>

          <div>
            <label className="label-text">Employee *</label>
            <select className="input-field" {...manualForm.register('employee', { required: 'Employee is required' })}>
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.firstName} {e.lastName} ({e.employeeId})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Date *</label>
              <input type="date" className="input-field" {...manualForm.register('dateKey', { required: true })} />
            </div>
            <div>
              <label className="label-text">Status *</label>
              <select className="input-field" {...manualForm.register('status')}>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Half-Day">Half-Day</option>
                <option value="Absent">Absent</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
            <div>
              <label className="label-text">Check-In Time (HH:MM)</label>
              <input type="time" className="input-field" {...manualForm.register('checkInTime')} />
            </div>
            <div>
              <label className="label-text">Check-Out Time (HH:MM)</label>
              <input type="time" className="input-field" {...manualForm.register('checkOutTime')} />
            </div>
          </div>
          <div>
            <label className="label-text">Notes</label>
            <textarea rows={2} className="input-field" {...manualForm.register('notes')} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setManualOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={manualForm.formState.isSubmitting} className="btn-primary">Save Record</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
