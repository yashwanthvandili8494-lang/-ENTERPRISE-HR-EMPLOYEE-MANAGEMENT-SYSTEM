import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { CalendarOff, Check, Download, Plus, X, Ban } from 'lucide-react';
import api, { downloadBlob, getErrorMessage } from '../../services/api';
import { useAuth, ROLES } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import LeaveFormModal from '../../components/leave/LeaveFormModal';
import { formatDate } from '../../utils/formatters';

const BUCKET_META = [
  { key: 'casual', label: 'Casual Leave' },
  { key: 'sick', label: 'Sick Leave' },
  { key: 'earned', label: 'Earned Leave' },
  { key: 'maternity', label: 'Maternity Leave' },
  { key: 'paternity', label: 'Paternity Leave' },
  { key: 'unpaid', label: 'Unpaid Leave' },
];

export default function LeavesPage() {
  const { user, companySettings, hasRole } = useAuth();
  const canApprove = hasRole(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER);
  const tz = companySettings?.timezone || 'UTC';

  const [tab, setTab] = useState(canApprove ? 'all' : 'my');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [balance, setBalance] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [applyOpen, setApplyOpen] = useState(false);
  const [decisionModal, setDecisionModal] = useState(null); // { leave, action: 'approve' | 'reject' }
  const [decisionComment, setDecisionComment] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (statusFilter) params.append('status', statusFilter);

      if (tab === 'my' && user?.employee?._id) {
        const res = await api.get(`/leaves/my?${params.toString()}`);
        setBalance(res.data.data.balance);
        setLeaves(res.data.data.leaves || []);
        setMeta(res.data.meta);
      } else {
        const [allRes, myBalRes] = await Promise.all([
          api.get(`/leaves?${params.toString()}`),
          user?.employee?._id ? api.get('/leaves/my?limit=1') : Promise.resolve(null),
        ]);
        setLeaves(allRes.data.data || []);
        setMeta(allRes.data.meta);
        if (myBalRes) setBalance(myBalRes.data.data.balance);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, page, user?.employee?._id]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const handleDecision = async (e) => {
    e.preventDefault();
    if (!decisionModal) return;
    setSubmittingDecision(true);
    try {
      await api.put(`/leaves/${decisionModal.leave._id}/${decisionModal.action}`, {
        comment: decisionComment,
      });
      toast.success(`Leave ${decisionModal.action === 'approve' ? 'approved' : 'rejected'}`);
      setDecisionModal(null);
      setDecisionComment('');
      loadLeaves();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    try {
      await api.put(`/leaves/${leaveId}/cancel`, {});
      toast.success('Leave request cancelled');
      loadLeaves();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track leave balances, submit time-off requests, and manage team approvals.
          </p>
        </div>
        {user?.employee?._id && (
          <button type="button" onClick={() => setApplyOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Apply for Leave
          </button>
        )}
      </div>

      {/* Leave Balance Cards */}
      {balance?.balances && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {BUCKET_META.map(({ key, label }) => {
            const b = balance.balances[key] || { allocated: 0, used: 0, pending: 0 };
            const avail = Math.max(0, b.allocated - b.used - b.pending);
            return (
              <div key={key} className="card p-4">
                <p className="text-xs font-semibold text-slate-600 truncate">{label}</p>
                <p className="text-2xl font-bold text-blue-800 mt-1">{avail}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Used {b.used} • Pending {b.pending} / {b.allocated}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs & Status Filter */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {canApprove && (
            <button
              type="button"
              onClick={() => { setTab('all'); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold ${
                tab === 'all' ? 'bg-blue-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Team &amp; Approval Queue
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
              My Leave History
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field w-auto text-xs"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Leaves Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <Loader text="Loading leave requests..." />
        ) : leaves.length === 0 ? (
          <EmptyState icon={CalendarOff} title="No leave requests found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {tab === 'all' && (
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Employee</th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Leave Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Days</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaves.map((lv) => {
                    const empId = lv.employee?._id || lv.employee;
                    const isSelf = user?.employee?._id && String(user.employee._id) === String(empId);
                    return (
                      <tr key={lv._id} className="hover:bg-slate-50/70">
                        {tab === 'all' && (
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">
                              {lv.employee?.firstName} {lv.employee?.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{lv.employee?.department?.name || '—'}</p>
                          </td>
                        )}
                        <td className="px-4 py-3 font-medium text-slate-900">{lv.leaveType}</td>
                        <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                          {formatDate(lv.startDate, tz)} – {formatDate(lv.endDate, tz)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{lv.totalDays}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">
                          <p className="truncate">{lv.reason}</p>
                          {lv.approvalNotes && (
                            <p className="text-[11px] text-slate-400 italic mt-0.5 truncate">Note: {lv.approvalNotes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge status={lv.status} />
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {lv.supportingDocument?.filePath && (
                              <button
                                type="button"
                                onClick={() =>
                                  downloadBlob(`/leaves/${lv._id}/document`, lv.supportingDocument.fileName || 'document')
                                }
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                                title="Download Supporting Document"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            {canApprove && lv.status === 'Pending' && !isSelf && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setDecisionModal({ leave: lv, action: 'approve' })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                                >
                                  <Check className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDecisionModal({ leave: lv, action: 'reject' })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                                >
                                  <X className="w-3.5 h-3.5" /> Reject
                                </button>
                              </>
                            )}
                            {(isSelf || hasRole(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER)) &&
                              ['Pending', 'Approved'].includes(lv.status) && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelLeave(lv._id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                                  title="Cancel Leave"
                                >
                                  <Ban className="w-3.5 h-3.5" /> Cancel
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

      <LeaveFormModal isOpen={applyOpen} onClose={() => setApplyOpen(false)} onSubmitted={loadLeaves} />

      <Modal
        isOpen={Boolean(decisionModal)}
        onClose={() => {
          setDecisionModal(null);
          setDecisionComment('');
        }}
        title={decisionModal?.action === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
        size="sm"
      >
        <form onSubmit={handleDecision} className="space-y-4">
          <p className="text-sm text-slate-600">
            {decisionModal?.action === 'approve'
              ? 'Approving will deduct these days from the employee leave balance.'
              : 'Rejecting will release pending days back to the employee leave balance.'}
          </p>
          <div>
            <label className="label-text">Comment / Note (Optional)</label>
            <textarea
              rows={3}
              value={decisionComment}
              onChange={(e) => setDecisionComment(e.target.value)}
              className="input-field"
              placeholder="Add approval or rejection remarks..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDecisionModal(null)} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingDecision}
              className={decisionModal?.action === 'approve' ? 'btn-primary bg-emerald-600 hover:bg-emerald-700' : 'btn-danger'}
            >
              {submittingDecision ? 'Saving...' : decisionModal?.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
