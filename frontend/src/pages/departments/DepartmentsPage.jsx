import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Building2, Edit, Eye, Plus, Search, Trash2, Users } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useAuth, ROLES } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DepartmentFormModal from '../../components/departments/DepartmentFormModal';

export default function DepartmentsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER);

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingDept, setViewingDept] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (debouncedSearch) params.append('search', debouncedSearch);
      const res = await api.get(`/departments?${params.toString()}`);
      setDepartments(res.data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    if (canManage) {
      api.get('/employees?limit=100').then((r) => setEmployees(r.data.data || [])).catch(() => {});
    }
  }, [canManage]);

  const handleViewDetails = async (deptId) => {
    try {
      const res = await api.get(`/departments/${deptId}`);
      setViewingDept(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setActionLoading(true);
    try {
      await api.delete(`/departments/${deactivateTarget._id}`);
      toast.success('Department deactivated');
      setDeactivateTarget(null);
      loadDepartments();
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
          <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
          <p className="text-sm text-slate-500 mt-0.5">Organizational structure, leadership assignments, and headcount.</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> Add Department
          </button>
        )}
      </div>

      <div className="card p-4 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments by name or code..."
            className="input-field pl-9"
          />
        </div>
      </div>

      {loading ? (
        <Loader text="Loading departments..." />
      ) : departments.length === 0 ? (
        <EmptyState icon={Building2} title="No departments found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {departments.map((dept) => (
            <div key={dept._id} className="card p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {dept.code}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">{dept.name}</h3>
                  </div>
                  <Badge status={dept.isActive ? 'Active' : 'Inactive'} />
                </div>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{dept.description || 'No description provided.'}</p>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-slate-400">Department Head</p>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {dept.manager ? `${dept.manager.firstName} ${dept.manager.lastName}` : 'Unassigned'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400">Employees</p>
                    <p className="font-bold text-slate-900 mt-0.5 inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-blue-600" /> {dept.activeEmployeeCount ?? dept.employeeCount ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button type="button" onClick={() => handleViewDetails(dept._id)} className="btn-secondary text-xs py-1.5 px-3">
                  <Eye className="w-3.5 h-3.5" /> View Team
                </button>
                {canManage && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(dept);
                        setFormOpen(true);
                      }}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    {dept.isActive && (
                      <button
                        type="button"
                        onClick={() => setDeactivateTarget(dept)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Deactivate Department"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Department Team Detail Modal */}
      <Modal
        isOpen={Boolean(viewingDept)}
        onClose={() => setViewingDept(null)}
        title={viewingDept ? `${viewingDept.name} (${viewingDept.code})` : ''}
        subtitle={viewingDept?.description}
        size="lg"
      >
        {viewingDept && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 text-sm">
              <div>
                <span className="text-slate-500">Manager: </span>
                <span className="font-semibold text-slate-900">
                  {viewingDept.manager
                    ? `${viewingDept.manager.firstName} ${viewingDept.manager.lastName}`
                    : 'Unassigned'}
                </span>
              </div>
              <Badge status={viewingDept.isActive ? 'Active' : 'Inactive'} />
            </div>

            {(viewingDept.employees || []).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No employees assigned to this department.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {viewingDept.employees.map((e) => (
                  <div key={e._id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <Link
                        to={`/employees/${e._id}`}
                        onClick={() => setViewingDept(null)}
                        className="text-sm font-semibold text-slate-900 hover:text-blue-700"
                      >
                        {e.firstName} {e.lastName}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {e.employeeId} • {e.designation}
                      </p>
                    </div>
                    <Badge status={e.employmentStatus} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <DepartmentFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        department={editing}
        employees={employees}
        onSaved={loadDepartments}
      />

      <ConfirmDialog
        isOpen={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        loading={actionLoading}
        title="Deactivate Department"
        confirmText="Deactivate"
        message={`Deactivate ${deactivateTarget?.name}? Note: Departments with active assigned employees cannot be deactivated.`}
      />
    </div>
  );
}
