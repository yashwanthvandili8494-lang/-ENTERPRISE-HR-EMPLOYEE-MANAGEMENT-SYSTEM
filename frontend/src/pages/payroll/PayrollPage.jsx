import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Download, Edit, Eye, Plus, Wallet } from 'lucide-react';
import api, { downloadBlob, getErrorMessage } from '../../services/api';
import { useAuth, ROLES } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import PayrollFormModal from '../../components/payroll/PayrollFormModal';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function PayrollPage() {
  const { user, companySettings, hasRole } = useAuth();
  const canManagePayroll = hasRole(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER);
  const tz = companySettings?.timezone || 'UTC';

  const [tab, setTab] = useState(canManagePayroll ? 'manage' : 'my');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (month) params.append('month', month);
      if (year) params.append('year', year);
      if (statusFilter) params.append('paymentStatus', statusFilter);

      if (tab === 'manage' && canManagePayroll) {
        const res = await api.get(`/payroll?${params.toString()}`);
        setRecords(res.data.data.records || []);
        setSummary(res.data.data.summary || null);
        setMeta(res.data.meta);
      } else {
        const res = await api.get(`/payroll/my?${params.toString()}`);
        setRecords(res.data.data || []);
        setSummary(null);
        setMeta(res.data.meta);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab, canManagePayroll, month, year, statusFilter, page]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  useEffect(() => {
    if (canManagePayroll) {
      api.get('/employees?limit=100').then((r) => setEmployees(r.data.data || [])).catch(() => {});
    }
  }, [canManagePayroll]);

  const handleDownloadPdf = async (rec) => {
    try {
      await downloadBlob(`/payroll/${rec._id}/payslip`, `payslip-${rec.employee?.employeeId || 'emp'}-${rec.salaryMonth}.pdf`);
      toast.success('Payslip PDF downloaded');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll &amp; Payslips</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Internal salary recording, breakdown statements, and PDF payslip generation.
          </p>
        </div>
        {canManagePayroll && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> Add Salary Record
          </button>
        )}
      </div>

      {/* Summary KPIs for HR/Admin */}
      {tab === 'manage' && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Total Net Payroll</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{formatCurrency(summary.totalNetSalary)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Total Basic</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(summary.totalBasic)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Total Bonuses</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(summary.totalBonus)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Total Deductions</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(summary.totalDeductions)}</p>
          </div>
        </div>
      )}

      {/* Tabs & Filters */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {canManagePayroll && (
            <button
              type="button"
              onClick={() => { setTab('manage'); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold ${
                tab === 'manage' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Company Payroll
            </button>
          )}
          {user?.employee?._id && (
            <button
              type="button"
              onClick={() => { setTab('my'); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold ${
                tab === 'my' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              My Payslips
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }} className="input-field w-auto text-xs">
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(Date.UTC(2026, i, 1)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => { setYear(e.target.value); setPage(1); }}
            placeholder="Year"
            className="input-field w-24 text-xs"
          />
          {tab === 'manage' && (
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field w-auto text-xs">
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Processed">Processed</option>
              <option value="Paid">Paid</option>
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <Loader text="Loading payroll records..." />
        ) : records.length === 0 ? (
          <EmptyState icon={Wallet} title="No payroll records found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Month</th>
                    {tab === 'manage' && (
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Employee</th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Basic</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Allowances + Bonus</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Deductions</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Net Salary</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((rec) => {
                    const curr = rec.employee?.salary?.currency || 'INR';
                    const allowBonus = (rec.houseRentAllowance || 0) + (rec.otherAllowances || 0) + (rec.bonus || 0);
                    return (
                      <tr key={rec._id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-semibold text-slate-900">{rec.salaryMonth}</td>
                        {tab === 'manage' && (
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">
                              {rec.employee?.firstName} {rec.employee?.lastName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {rec.employee?.employeeId} • {rec.employee?.department?.name || '-'}
                            </p>
                          </td>
                        )}
                        <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(rec.basicSalary, curr)}</td>
                        <td className="px-4 py-3 text-right text-emerald-700">+{formatCurrency(allowBonus, curr)}</td>
                        <td className="px-4 py-3 text-right text-red-600">-{formatCurrency(rec.deductions, curr)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(rec.netSalary, curr)}</td>
                        <td className="px-4 py-3">
                          <Badge status={rec.paymentStatus} />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewing(rec)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                              title="View Breakdown"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(rec)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                              title="Download Payslip PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {canManagePayroll && tab === 'manage' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditing(rec);
                                  setFormOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                                title="Edit Record"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination meta={meta} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Payslip Breakdown Modal */}
      <Modal
        isOpen={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={`Payslip Breakdown — ${viewing?.salaryMonth || ''}`}
        size="md"
      >
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {viewing.employee?.firstName} {viewing.employee?.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  {viewing.employee?.employeeId} • {viewing.employee?.designation}
                </p>
              </div>
              <Badge status={viewing.paymentStatus} />
            </div>

            <dl className="divide-y divide-slate-100 text-sm">
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">Basic Salary</dt>
                <dd className="font-medium">{formatCurrency(viewing.basicSalary)}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">House Rent Allowance (HRA)</dt>
                <dd className="font-medium">{formatCurrency(viewing.houseRentAllowance)}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">Other Allowances</dt>
                <dd className="font-medium">{formatCurrency(viewing.otherAllowances)}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">Bonus</dt>
                <dd className="font-medium text-emerald-700">+{formatCurrency(viewing.bonus)}</dd>
              </div>
              <div className="py-2 flex justify-between">
                <dt className="text-slate-600">Deductions</dt>
                <dd className="font-medium text-red-600">-{formatCurrency(viewing.deductions)}</dd>
              </div>
              <div className="py-3 flex justify-between bg-blue-50/80 px-3 rounded-lg mt-2">
                <dt className="font-bold text-blue-900">Net Salary Payable</dt>
                <dd className="font-bold text-blue-900 text-base">{formatCurrency(viewing.netSalary)}</dd>
              </div>
            </dl>

            <p className="text-xs text-slate-500">
              Payment Date: {viewing.paymentDate ? formatDate(viewing.paymentDate, tz) : 'Pending'}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setViewing(null)} className="btn-secondary">Close</button>
              <button type="button" onClick={() => handleDownloadPdf(viewing)} className="btn-primary">
                <Download className="w-4 h-4" /> Download PDF Payslip
              </button>
            </div>
          </div>
        )}
      </Modal>

      <PayrollFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        payroll={editing}
        employees={employees}
        onSaved={loadPayroll}
      />
    </div>
  );
}
