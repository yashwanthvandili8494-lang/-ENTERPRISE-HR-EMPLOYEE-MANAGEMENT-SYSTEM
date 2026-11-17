import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Download,
  Edit,
  Eye,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import api, { downloadBlob, getErrorMessage } from '../../services/api';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmployeeFormModal from '../../components/employees/EmployeeFormModal';
import { formatDate } from '../../utils/formatters';

export default function EmployeesPage() {
  const { hasRole, companySettings } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManage = hasRole(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER);

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(search, 350);
  const debouncedDesignation = useDebounce(designation, 350);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await api.get('/departments?limit=100');
      setDepartments(res.data.data || []);
    } catch (_) {
      // ignore
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10', sort });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (department) params.append('department', department);
      if (debouncedDesignation) params.append('designation', debouncedDesignation);
      if (status) params.append('employmentStatus', status);

      const res = await api.get(`/employees?${params.toString()}`);
      setEmployees(res.data.data || []);
      setMeta(res.data.meta || null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, sort, debouncedSearch, department, debouncedDesignation, status]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (searchParams.get('action') === 'add' && canManage) {
      setEditingEmployee(null);
      setFormModalOpen(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, canManage, setSearchParams]);

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (department) params.append('department', department);
      if (status) params.append('employmentStatus', status);
      await downloadBlob(`/employees/export?${params.toString()}`, 'employees-export.csv');
      toast.success('Employee CSV exported');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleToggleActivation = async () => {
    if (!confirmTarget) return;
    setActionLoading(true);
    try {
      if (confirmTarget.employmentStatus === 'Active') {
        await api.delete(`/employees/${confirmTarget._id}`);
        toast.success('Employee deactivated');
      } else {
        await api.patch(`/employees/${confirmTarget._id}/reactivate`);
        toast.success('Employee reactivated');
      }
      setConfirmTarget(null);
      loadEmployees();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage employee profiles, assignments, and lifecycle statuses.</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleExportCsv} className="btn-secondary">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingEmployee(null);
                setFormModalOpen(true);
              }}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email, ID..."
            className="input-field pl-9"
          />
        </div>
        <select
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            setPage(1);
          }}
          className="input-field"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={designation}
          onChange={(e) => {
            setDesignation(e.target.value);
            setPage(1);
          }}
          placeholder="Filter designation..."
          className="input-field"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="input-field"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="On Leave">On Leave</option>
          <option value="Inactive">Inactive</option>
          <option value="Terminated">Terminated</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field">
          <option value="-createdAt">Newest First</option>
          <option value="firstName">Name (A-Z)</option>
          <option value="-firstName">Name (Z-A)</option>
          <option value="employeeId">Employee ID</option>
          <option value="-joiningDate">Recent Joining</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <Loader text="Loading employees..." />
        ) : employees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees found"
            description="Try adjusting your search criteria or add a new employee."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Designation</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Joined</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {employees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                            {emp.firstName?.[0]}
                            {emp.lastName?.[0]}
                          </div>
                          <div>
                            <Link
                              to={`/employees/${emp._id}`}
                              className="text-sm font-semibold text-slate-900 hover:text-blue-700"
                            >
                              {emp.firstName} {emp.lastName}
                            </Link>
                            <p className="text-xs text-slate-500">
                              {emp.employeeId} • {emp.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-700 whitespace-nowrap">
                        {emp.department?.name || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-700 whitespace-nowrap">{emp.designation}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">{emp.employmentType}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                        {formatDate(emp.joiningDate, companySettings?.timezone)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge status={emp.employmentStatus} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            to={`/employees/${emp._id}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEmployee(emp);
                                  setFormModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                                title="Edit Employee"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmTarget(emp)}
                                className={`p-1.5 rounded-lg ${
                                  emp.employmentStatus === 'Active'
                                    ? 'text-slate-500 hover:bg-red-50 hover:text-red-600'
                                    : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'
                                }`}
                                title={emp.employmentStatus === 'Active' ? 'Deactivate' : 'Reactivate'}
                              >
                                {emp.employmentStatus === 'Active' ? (
                                  <UserX className="w-4 h-4" />
                                ) : (
                                  <UserCheck className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <EmployeeFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        employee={editingEmployee}
        departments={departments}
        managers={employees}
        onSaved={loadEmployees}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleToggleActivation}
        loading={actionLoading}
        variant={confirmTarget?.employmentStatus === 'Active' ? 'danger' : 'primary'}
        title={confirmTarget?.employmentStatus === 'Active' ? 'Deactivate Employee' : 'Reactivate Employee'}
        confirmText={confirmTarget?.employmentStatus === 'Active' ? 'Deactivate' : 'Reactivate'}
        message={
          confirmTarget?.employmentStatus === 'Active'
            ? `Are you sure you want to deactivate ${confirmTarget?.firstName} ${confirmTarget?.lastName}? Their historical records will be preserved and login access suspended.`
            : `Reactivate ${confirmTarget?.firstName} ${confirmTarget?.lastName} and restore active status?`
        }
      />
    </div>
  );
}
