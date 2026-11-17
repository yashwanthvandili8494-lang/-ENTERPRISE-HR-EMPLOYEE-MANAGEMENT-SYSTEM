import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Briefcase,
  CalendarOff,
  Clock,
  Download,
  FileText,
  Lock,
  Mail,
  Phone,
  Upload,
  User,
  Wallet,
} from 'lucide-react';
import api, { SERVER_BASE_URL, downloadBlob, getErrorMessage } from '../../services/api';
import { useAuth, ROLES } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';

export default function EmployeeProfilePage() {
  const { id } = useParams();
  const { user, hasRole, companySettings } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const tz = companySettings?.timezone || 'UTC';
  const canManage = hasRole(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER);
  const isSelf = user?.employee?._id === id;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/employees/${id}`);
      setProfile(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('photo', file);
    setUploading(true);
    try {
      await api.post(`/employees/${id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Profile photo updated');
      loadProfile();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('document', file);
    formData.append('name', file.name);
    formData.append('type', 'HR Document');
    setUploading(true);
    try {
      await api.post(`/employees/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded');
      loadProfile();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDoc = async (doc) => {
    try {
      await downloadBlob(`/employees/${id}/documents/${doc._id}`, doc.name);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <Loader text="Loading employee profile..." />;
  if (!profile) return <p className="text-sm text-slate-500">Employee profile unavailable.</p>;

  const tabs = [
    { key: 'personal', label: 'Personal Info', icon: User },
    { key: 'employment', label: 'Employment Details', icon: Briefcase },
    { key: 'attendance', label: 'Attendance History', icon: Clock },
    { key: 'leaves', label: 'Leave History', icon: CalendarOff },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'salary', label: 'Salary Info', icon: Wallet },
  ];

  const photoUrl = profile.profilePhoto ? `${SERVER_BASE_URL}${profile.profilePhoto}` : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to={hasRole(ROLES.EMPLOYEE) ? '/dashboard' : '/employees'} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      {/* Hero Profile Banner */}
      <div className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            {photoUrl ? (
              <img src={photoUrl} alt="Employee" className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-100" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-navy-900 text-white flex items-center justify-center text-2xl font-bold uppercase">
                {profile.firstName?.[0]}
                {profile.lastName?.[0]}
              </div>
            )}
            {(canManage || isSelf) && (
              <label className="absolute -bottom-2 -right-2 bg-white border border-slate-200 shadow-sm rounded-full p-1.5 cursor-pointer hover:bg-slate-50" title="Upload photo">
                <Upload className="w-3.5 h-3.5 text-blue-700" />
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
              </label>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900">
                {profile.firstName} {profile.lastName}
              </h1>
              <Badge status={profile.employmentStatus} />
            </div>
            <p className="text-sm text-slate-600 mt-0.5">
              {profile.designation} • {profile.department?.name || '—'}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="font-semibold text-blue-700">{profile.employeeId}</span>
              <span className="inline-flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> {profile.email}
              </span>
              <span className="inline-flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {profile.phone}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex gap-2 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  active
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card p-6">
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-500 mb-3">Personal Information</h3>
              <dl className="space-y-2.5">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <dt className="text-slate-500">Gender</dt>
                  <dd className="font-medium text-slate-900">{profile.gender || '—'}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <dt className="text-slate-500">Date of Birth</dt>
                  <dd className="font-medium text-slate-900">{formatDate(profile.dateOfBirth, tz)}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <dt className="text-slate-500">Address</dt>
                  <dd className="font-medium text-slate-900 text-right">
                    {[profile.address?.street, profile.address?.city, profile.address?.state, profile.address?.country]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-500 mb-3">Emergency Contact</h3>
              <dl className="space-y-2.5">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <dt className="text-slate-500">Name</dt>
                  <dd className="font-medium text-slate-900">{profile.emergencyContact?.name || '—'}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <dt className="text-slate-500">Relationship</dt>
                  <dd className="font-medium text-slate-900">{profile.emergencyContact?.relationship || '—'}</dd>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <dt className="text-slate-500">Phone</dt>
                  <dd className="font-medium text-slate-900">{profile.emergencyContact?.phone || '—'}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'employment' && (
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-slate-50">
              <dt className="text-xs text-slate-500">Department</dt>
              <dd className="font-semibold text-slate-900 mt-1">{profile.department?.name || '—'}</dd>
            </div>
            <div className="p-4 rounded-xl bg-slate-50">
              <dt className="text-xs text-slate-500">Designation</dt>
              <dd className="font-semibold text-slate-900 mt-1">{profile.designation}</dd>
            </div>
            <div className="p-4 rounded-xl bg-slate-50">
              <dt className="text-xs text-slate-500">Employment Type</dt>
              <dd className="font-semibold text-slate-900 mt-1">{profile.employmentType}</dd>
            </div>
            <div className="p-4 rounded-xl bg-slate-50">
              <dt className="text-xs text-slate-500">Joining Date</dt>
              <dd className="font-semibold text-slate-900 mt-1">{formatDate(profile.joiningDate, tz)}</dd>
            </div>
            <div className="p-4 rounded-xl bg-slate-50">
              <dt className="text-xs text-slate-500">Reporting Manager</dt>
              <dd className="font-semibold text-slate-900 mt-1">
                {profile.reportingManager
                  ? `${profile.reportingManager.firstName} ${profile.reportingManager.lastName} (${profile.reportingManager.designation})`
                  : 'None assigned'}
              </dd>
            </div>
            <div className="p-4 rounded-xl bg-slate-50">
              <dt className="text-xs text-slate-500">Portal Access</dt>
              <dd className="font-semibold text-slate-900 mt-1">
                {profile.user ? `${profile.user.role} (${profile.user.isActive ? 'Active' : 'Disabled'})` : 'No portal account'}
              </dd>
            </div>
          </dl>
        )}

        {activeTab === 'attendance' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Check In</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Check Out</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Hours</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(profile.attendanceHistory || []).map((a) => (
                  <tr key={a._id}>
                    <td className="px-4 py-2.5 font-medium">{a.dateKey}</td>
                    <td className="px-4 py-2.5">{formatTime(a.checkIn, tz)}</td>
                    <td className="px-4 py-2.5">{formatTime(a.checkOut, tz)}</td>
                    <td className="px-4 py-2.5">{a.workingHours} hrs</td>
                    <td className="px-4 py-2.5">
                      <Badge status={a.status} />
                    </td>
                  </tr>
                ))}
                {(profile.attendanceHistory || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No attendance records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'leaves' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Dates</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Days</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Reason</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(profile.leaveHistory || []).map((l) => (
                  <tr key={l._id}>
                    <td className="px-4 py-2.5 font-medium">{l.leaveType}</td>
                    <td className="px-4 py-2.5">
                      {formatDate(l.startDate, tz)} – {formatDate(l.endDate, tz)}
                    </td>
                    <td className="px-4 py-2.5">{l.totalDays}</td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">{l.reason}</td>
                    <td className="px-4 py-2.5">
                      <Badge status={l.status} />
                    </td>
                  </tr>
                ))}
                {(profile.leaveHistory || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No leave requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            {!profile.canViewSalary ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">
                <Lock className="w-5 h-5 shrink-0" />
                <span>Private employee documents are restricted to HR Managers, Super Admins, and the employee.</span>
              </div>
            ) : (
              <>
                {canManage && (
                  <div className="flex justify-end">
                    <label className="btn-primary cursor-pointer">
                      <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Document'}
                      <input type="file" onChange={handleDocumentUpload} className="hidden" disabled={uploading} />
                    </label>
                  </div>
                )}
                {(profile.documents || []).length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No documents uploaded yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {profile.documents.map((doc) => (
                      <div key={doc._id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-700" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                            <p className="text-xs text-slate-500">
                              {doc.type} • Uploaded {formatDate(doc.uploadedAt, tz)}
                            </p>
                          </div>
                        </div>
                        <button type="button" onClick={() => handleDownloadDoc(doc)} className="btn-secondary text-xs py-1.5">
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'salary' && (
          <div>
            {!profile.canViewSalary || !profile.salary ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 text-amber-800 text-sm">
                <Lock className="w-5 h-5 shrink-0" />
                <span>Salary information is confidential and restricted to HR Managers, Super Admins, and the employee.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500">Basic Salary</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {formatCurrency(profile.salary.basic, profile.salary.currency)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500">HRA</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {formatCurrency(profile.salary.hra, profile.salary.currency)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500">Other Allowances</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {formatCurrency(profile.salary.otherAllowances, profile.salary.currency)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-red-50/70">
                  <p className="text-xs text-red-700">Standard Deductions</p>
                  <p className="text-lg font-bold text-red-700 mt-1">
                    - {formatCurrency(profile.salary.deductions, profile.salary.currency)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-xs font-semibold text-blue-800">Estimated Monthly Net</p>
                  <p className="text-lg font-bold text-blue-900 mt-1">
                    {formatCurrency(
                      (profile.salary.basic || 0) +
                        (profile.salary.hra || 0) +
                        (profile.salary.otherAllowances || 0) -
                        (profile.salary.deductions || 0),
                      profile.salary.currency
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
