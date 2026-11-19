export const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  HR_MANAGER: 'HR Manager',
  DEPARTMENT_MANAGER: 'Department Manager',
  EMPLOYEE: 'Employee',
};

export function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

export function getLiveTimezone(preferredTimezone) {
  if (preferredTimezone && preferredTimezone !== 'UTC') {
    return preferredTimezone;
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || preferredTimezone || 'Asia/Kolkata';
  } catch (_) {
    return preferredTimezone || 'Asia/Kolkata';
  }
}

export function formatDate(dateVal, timeZone) {
  if (!dateVal) return '—';
  try {
    const tz = getLiveTimezone(timeZone);
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      timeZone: tz,
    }).format(new Date(dateVal));
  } catch (_) {
    return String(dateVal).slice(0, 10);
  }
}

export function formatTime(dateVal, timeZone, includeSeconds = false) {
  if (!dateVal) return '—';
  try {
    const tz = getLiveTimezone(timeZone);
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
      hour12: true,
      timeZone: tz,
    }).format(new Date(dateVal));
  } catch (_) {
    return new Date(dateVal).toLocaleTimeString();
  }
}

export function formatDateTime(dateVal, timeZone, includeSeconds = false) {
  if (!dateVal) return '—';
  try {
    const tz = getLiveTimezone(timeZone);
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
      hour12: true,
      timeZone: tz,
    }).format(new Date(dateVal));
  } catch (_) {
    return new Date(dateVal).toLocaleString();
  }
}

export function formatDurationMs(durationMs) {
  if (!durationMs || durationMs < 0) return '00h 00m 00s';
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export function getStatusBadgeClass(status) {
  const map = {
    Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    Present: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    Hired: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    Open: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    Processed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    Shortlisted: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    Selected: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    Submitted: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    Acknowledged: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    Scheduled: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    'Interview Scheduled': 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    Pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Late: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    'Half-Day': 'bg-amber-50 text-amber-700 ring-amber-600/20',
    'On Leave': 'bg-amber-50 text-amber-700 ring-amber-600/20',
    'On Hold': 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Draft: 'bg-slate-100 text-slate-700 ring-slate-500/20',
    Applied: 'bg-slate-100 text-slate-700 ring-slate-500/20',
    Inactive: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    Cancelled: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    Closed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    Absent: 'bg-red-50 text-red-700 ring-red-600/20',
    Rejected: 'bg-red-50 text-red-700 ring-red-600/20',
    Terminated: 'bg-red-50 text-red-700 ring-red-600/20',
    'No-Show': 'bg-red-50 text-red-700 ring-red-600/20',
  };
  return map[status] || 'bg-slate-100 text-slate-700 ring-slate-500/20';
}
