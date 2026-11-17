import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { BarChart3, Download, FileText, Printer } from 'lucide-react';
import api, { downloadBlob, getErrorMessage } from '../../services/api';
import { useAuth, ROLES } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import { formatCurrency } from '../../utils/formatters';

const REPORT_TYPES = [
  { key: 'employees', label: 'Employee Report', roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER] },
  { key: 'departments', label: 'Department Report', roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER] },
  { key: 'attendance', label: 'Attendance Report', roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER] },
  { key: 'leaves', label: 'Leave Report', roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER] },
  { key: 'payroll', label: 'Payroll Report', roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER] },
  { key: 'recruitment', label: 'Recruitment Report', roles: [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER] },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const availableReports = REPORT_TYPES.filter((r) => r.roles.includes(user?.role));

  const [reportType, setReportType] = useState(availableReports[0]?.key || 'employees');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('');
  const [employee, setEmployee] = useState('');

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/departments?limit=100'), api.get('/employees?limit=100')])
      .then(([d, e]) => {
        setDepartments(d.data.data || []);
        setEmployees(e.data.data || []);
      })
      .catch(() => {});
  }, []);

  const buildQuery = useCallback(
    (format = 'json') => {
      const params = new URLSearchParams({ format });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (department) params.append('department', department);
      if (employee) params.append('employee', employee);
      return `/reports/${reportType}?${params.toString()}`;
    },
    [reportType, startDate, endDate, department, employee]
  );

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(buildQuery('json'));
      setReportData(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExport = async (format) => {
    try {
      await downloadBlob(buildQuery(format), `${reportType}-report.${format}`);
      toast.success(`${format.toUpperCase()} report downloaded`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const records = reportData?.records || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports &amp; Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Generate live authorized reports with CSV, PDF, and print exports.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => handleExport('csv')} className="btn-secondary">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button type="button" onClick={() => handleExport('pdf')} className="btn-secondary">
            <FileText className="w-4 h-4" /> Export PDF
          </button>
          <button type="button" onClick={() => window.print()} className="btn-primary">
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex flex-wrap gap-2 no-print">
        {availableReports.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setReportType(r.key)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              reportType === r.key
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 no-print">
        <div>
          <label className="label-text">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="label-text">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="label-text">Department</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="input-field">
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-text">Employee</label>
          <select value={employee} onChange={(e) => setEmployee(e.target.value)} className="input-field">
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.employeeId})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Preview */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-700" />
            <h2 className="text-base font-bold text-slate-900">{reportData?.title || 'Report'}</h2>
          </div>
          {reportData?.summary && (
            <div className="flex flex-wrap gap-3 text-xs">
              {Object.entries(reportData.summary).map(([k, v]) => (
                <span key={k} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
                  {k.replace(/([A-Z])/g, ' $1')}: {k.toLowerCase().includes('payroll') ? formatCurrency(v) : v}
                </span>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <Loader text="Generating report..." />
        ) : records.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No records matched the selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold uppercase text-slate-500">#</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase text-slate-500">Primary Record</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase text-slate-500">Department / Context</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase text-slate-500">Details</th>
                  <th className="px-4 py-3 text-left font-semibold uppercase text-slate-500">Status / Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.slice(0, 100).map((row, idx) => (
                  <tr key={row._id || idx} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      {row.firstName
                        ? `${row.firstName} ${row.lastName} ${row.employeeId ? `(${row.employeeId})` : ''}`
                        : row.employee
                        ? `${row.employee.firstName} ${row.employee.lastName} (${row.employee.employeeId || ''})`
                        : row.name || row.title || row.salaryMonth || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {row.department?.name ||
                        row.employee?.department?.name ||
                        row.job?.title ||
                        row.managerName ||
                        row.code ||
                        '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {row.designation ||
                        row.dateKey ||
                        row.leaveType ||
                        row.salaryMonth ||
                        row.reviewPeriod ||
                        (row.totalEmployees !== undefined ? `${row.activeEmployees}/${row.totalEmployees} Active` : '—')}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">
                      {row.netSalary !== undefined
                        ? `${formatCurrency(row.netSalary)} (${row.paymentStatus})`
                        : row.rating !== undefined
                        ? `★ ${row.rating}/5 (${row.status})`
                        : row.workingHours !== undefined
                        ? `${row.workingHours}h (${row.status})`
                        : row.totalDays !== undefined
                        ? `${row.totalDays}d (${row.status})`
                        : row.employmentStatus || row.status || (row.isActive !== undefined ? (row.isActive ? 'Active' : 'Inactive') : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
