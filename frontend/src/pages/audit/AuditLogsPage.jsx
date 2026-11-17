import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { ShieldCheck } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import { formatDateTime } from '../../utils/formatters';

export default function AuditLogsPage() {
  const { companySettings } = useAuth();
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (entityType) params.append('entityType', entityType);
      if (actionFilter) params.append('action', actionFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(res.data.data || []);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, entityType, actionFilter, startDate, endDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Immutable security and compliance trail restricted to Super Administrators.
        </p>
      </div>

      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} className="input-field">
          <option value="">All Entities</option>
          {['User', 'Employee', 'Department', 'Attendance', 'Leave', 'Payroll', 'Job', 'Candidate', 'Interview', 'CompanySettings'].map(
            (e) => (
              <option key={e} value={e}>{e}</option>
            )
          )}
        </select>
        <input
          type="text"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          placeholder="Search action (e.g. LOGIN, PAYROLL)..."
          className="input-field"
        />
        <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="input-field" />
        <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="input-field" />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Loader text="Loading audit logs..." />
        ) : logs.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No audit logs found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold uppercase text-slate-500">Timestamp</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase text-slate-500">User</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase text-slate-500">Action</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase text-slate-500">Entity</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase text-slate-500">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {formatDateTime(log.createdAt, companySettings?.timezone)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-semibold text-slate-900">{log.user?.name || 'System'}</p>
                        <p className="text-[11px] text-slate-500">{log.user?.email || ''}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {log.entityType}
                        {log.entityId && <span className="text-slate-400 ml-1">#{log.entityId.slice(-6)}</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono max-w-md truncate">
                        {log.metadata && Object.keys(log.metadata).length > 0 ? JSON.stringify(log.metadata) : '—'}
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
    </div>
  );
}
