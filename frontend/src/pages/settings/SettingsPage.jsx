import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Building2, Plus, Save, Settings as SettingsIcon, Shield, Upload, Users } from 'lucide-react';
import api, { SERVER_BASE_URL, getErrorMessage } from '../../services/api';
import { useAuth, ROLES } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import { ROLE_LABELS } from '../../utils/formatters';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SettingsPage() {
  const { refreshSettings } = useAuth();
  const [tab, setTab] = useState('company');
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingDays, setWorkingDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [userModalOpen, setUserModalOpen] = useState(false);

  const settingsForm = useForm();
  const newUserForm = useForm({
    defaultValues: { name: '', email: '', password: '', role: ROLES.EMPLOYEE },
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, uRes] = await Promise.all([api.get('/settings'), api.get('/auth/users?limit=100')]);
      const s = sRes.data.data;
      setSettings(s);
      setWorkingDays(s.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
      settingsForm.reset({
        companyName: s.companyName || '',
        address: s.address || '',
        phone: s.phone || '',
        officialEmail: s.officialEmail || '',
        website: s.website || '',
        timezone: s.timezone || 'UTC',
        startTime: s.workingHours?.startTime || '09:00',
        endTime: s.workingHours?.endTime || '18:00',
        lateThresholdMinutes: s.workingHours?.lateThresholdMinutes ?? 15,
        earlyDepartureThresholdMinutes: s.workingHours?.earlyDepartureThresholdMinutes ?? 15,
        halfDayHours: s.workingHours?.halfDayHours ?? 4,
        standardDailyHours: s.workingHours?.standardDailyHours ?? 8,
        casual: s.leavePolicies?.casual ?? 12,
        sick: s.leavePolicies?.sick ?? 10,
        earned: s.leavePolicies?.earned ?? 15,
        maternity: s.leavePolicies?.maternity ?? 90,
        paternity: s.leavePolicies?.paternity ?? 14,
        inAppEnabled: s.notificationPreferences?.inAppEnabled ?? true,
        leaveAlerts: s.notificationPreferences?.leaveAlerts ?? true,
        payrollAlerts: s.notificationPreferences?.payrollAlerts ?? true,
        attendanceReminders: s.notificationPreferences?.attendanceReminders ?? true,
      });
      setUsers(uRes.data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [settingsForm]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggleDay = (day) => {
    setWorkingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const onSaveSettings = async (values) => {
    try {
      await api.put('/settings', {
        companyName: values.companyName,
        address: values.address,
        phone: values.phone,
        officialEmail: values.officialEmail,
        website: values.website,
        timezone: values.timezone,
        workingDays,
        workingHours: {
          startTime: values.startTime,
          endTime: values.endTime,
          lateThresholdMinutes: Number(values.lateThresholdMinutes),
          earlyDepartureThresholdMinutes: Number(values.earlyDepartureThresholdMinutes),
          halfDayHours: Number(values.halfDayHours),
          standardDailyHours: Number(values.standardDailyHours),
        },
        leavePolicies: {
          casual: Number(values.casual),
          sick: Number(values.sick),
          earned: Number(values.earned),
          maternity: Number(values.maternity),
          paternity: Number(values.paternity),
        },
        notificationPreferences: {
          inAppEnabled: Boolean(values.inAppEnabled),
          leaveAlerts: Boolean(values.leaveAlerts),
          payrollAlerts: Boolean(values.payrollAlerts),
          attendanceReminders: Boolean(values.attendanceReminders),
        },
      });
      await refreshSettings();
      toast.success('Company settings saved');
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    try {
      await api.post('/settings/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshSettings();
      toast.success('Company logo updated');
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await api.put(`/auth/users/${userId}`, updates);
      toast.success('User account updated');
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const onCreateUser = async (values) => {
    try {
      await api.post('/auth/users', values);
      toast.success('User account created');
      setUserModalOpen(false);
      newUserForm.reset();
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Loader text="Loading system configuration..." />;

  const logoUrl = settings?.logoPath ? `${SERVER_BASE_URL}${settings.logoPath}` : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Settings &amp; Access Control</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure organization policies, attendance rules, and system roles.</p>
        </div>
        {tab === 'users' && (
          <button type="button" onClick={() => setUserModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Create Portal User
          </button>
        )}
      </div>

      <div className="card p-2 inline-flex gap-1">
        <button
          type="button"
          onClick={() => setTab('company')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
            tab === 'company' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <SettingsIcon className="w-4 h-4" /> Organization &amp; Policies
        </button>
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
            tab === 'users' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" /> Users &amp; Roles ({users.length})
        </button>
      </div>

      {tab === 'company' && (
        <form onSubmit={settingsForm.handleSubmit(onSaveSettings)} className="space-y-6">
          {/* Company Identity & Logo */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-blue-700" />
                <h2 className="text-base font-bold text-slate-900">Company Profile</h2>
              </div>
              <div className="flex items-center gap-3">
                {logoUrl && <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover border" />}
                <label className="btn-secondary text-xs cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Upload Logo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-text">Company Name</label>
                <input className="input-field" {...settingsForm.register('companyName', { required: true })} />
              </div>
              <div>
                <label className="label-text">Official Email</label>
                <input type="email" className="input-field" {...settingsForm.register('officialEmail')} />
              </div>
              <div>
                <label className="label-text">Contact Phone</label>
                <input className="input-field" {...settingsForm.register('phone')} />
              </div>
              <div>
                <label className="label-text">Company Timezone (IANA)</label>
                <select className="input-field" {...settingsForm.register('timezone')}>
                  {['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney'].map(
                    (tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    )
                  )}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label-text">Company Address</label>
                <input className="input-field" {...settingsForm.register('address')} />
              </div>
            </div>
          </div>

          {/* Working Days & Attendance Config */}
          <div className="card p-6 space-y-5">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              Working Days &amp; Attendance Configuration
            </h2>
            <div>
              <label className="label-text">Working Days</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ALL_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      workingDays.includes(day)
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="label-text">Shift Start</label>
                <input type="time" className="input-field" {...settingsForm.register('startTime')} />
              </div>
              <div>
                <label className="label-text">Shift End</label>
                <input type="time" className="input-field" {...settingsForm.register('endTime')} />
              </div>
              <div>
                <label className="label-text">Late Grace (min)</label>
                <input type="number" className="input-field" {...settingsForm.register('lateThresholdMinutes')} />
              </div>
              <div>
                <label className="label-text">Early Leave (min)</label>
                <input type="number" className="input-field" {...settingsForm.register('earlyDepartureThresholdMinutes')} />
              </div>
              <div>
                <label className="label-text">Half-Day (hrs)</label>
                <input type="number" className="input-field" {...settingsForm.register('halfDayHours')} />
              </div>
              <div>
                <label className="label-text">Std Daily (hrs)</label>
                <input type="number" className="input-field" {...settingsForm.register('standardDailyHours')} />
              </div>
            </div>
          </div>

          {/* Leave Policies & Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
                Annual Leave Entitlements (Days)
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label-text">Casual</label>
                  <input type="number" className="input-field" {...settingsForm.register('casual')} />
                </div>
                <div>
                  <label className="label-text">Sick</label>
                  <input type="number" className="input-field" {...settingsForm.register('sick')} />
                </div>
                <div>
                  <label className="label-text">Earned</label>
                  <input type="number" className="input-field" {...settingsForm.register('earned')} />
                </div>
                <div>
                  <label className="label-text">Maternity</label>
                  <input type="number" className="input-field" {...settingsForm.register('maternity')} />
                </div>
                <div>
                  <label className="label-text">Paternity</label>
                  <input type="number" className="input-field" {...settingsForm.register('paternity')} />
                </div>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
                Notification Preferences
              </h2>
              <div className="space-y-3 text-sm text-slate-700">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" className="rounded text-blue-700" {...settingsForm.register('inAppEnabled')} />
                  Enable In-App Notifications
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" className="rounded text-blue-700" {...settingsForm.register('leaveAlerts')} />
                  Leave Submission &amp; Approval Alerts
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" className="rounded text-blue-700" {...settingsForm.register('payrollAlerts')} />
                  Payroll Publication Alerts
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" className="rounded text-blue-700" {...settingsForm.register('attendanceReminders')} />
                  Attendance Reminders
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={settingsForm.formState.isSubmitting} className="btn-primary px-6">
              <Save className="w-4 h-4" /> Save All Settings
            </button>
          </div>
        </form>
      )}

      {tab === 'users' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Linked Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Account Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {u.employee ? `${u.employee.employeeId} (${u.employee.designation})` : 'Not linked'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateUser(u._id, { role: e.target.value })}
                        className="input-field py-1 text-xs w-auto"
                      >
                        {Object.entries(ROLE_LABELS).map(([k, label]) => (
                          <option key={k} value={k}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={u.isActive ? 'Active' : 'Inactive'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleUpdateUser(u._id, { isActive: !u.isActive })}
                        className="btn-secondary text-xs py-1 px-3"
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} title="Create Portal User" size="sm">
        <form onSubmit={newUserForm.handleSubmit(onCreateUser)} className="space-y-4">
          <div>
            <label className="label-text">Full Name *</label>
            <input className="input-field" {...newUserForm.register('name', { required: true })} />
          </div>
          <div>
            <label className="label-text">Email *</label>
            <input type="email" className="input-field" {...newUserForm.register('email', { required: true })} />
          </div>
          <div>
            <label className="label-text">Password (min 8 chars) *</label>
            <input type="password" className="input-field" {...newUserForm.register('password', { required: true, minLength: 8 })} />
          </div>
          <div>
            <label className="label-text">Role *</label>
            <select className="input-field" {...newUserForm.register('role')}>
              {Object.entries(ROLE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setUserModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={newUserForm.formState.isSubmitting} className="btn-primary">
              <Shield className="w-4 h-4" /> Create User
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
