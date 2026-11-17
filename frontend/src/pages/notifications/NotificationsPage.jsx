import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Bell, CheckCheck, Check } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import { formatDateTime } from '../../utils/formatters';

export default function NotificationsPage() {
  const { companySettings } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/notifications?page=${page}&limit=15&unreadOnly=${unreadOnly}`);
      setNotifications(res.data.data.notifications || []);
      setUnreadCount(res.data.data.unreadCount || 0);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      loadNotifications();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      toast.success('All notifications marked as read');
      loadNotifications();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">You have {unreadCount} unread notification(s).</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setUnreadOnly((p) => !p); setPage(1); }}
            className="btn-secondary text-xs"
          >
            {unreadOnly ? 'Show All' : 'Unread Only'}
          </button>
          {unreadCount > 0 && (
            <button type="button" onClick={markAllRead} className="btn-primary text-xs">
              <CheckCheck className="w-4 h-4" /> Mark All Read
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <Loader text="Loading notifications..." />
        ) : notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You are completely caught up." />
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className={`p-4 flex items-start justify-between gap-4 ${!n.isRead ? 'bg-blue-50/40' : 'bg-white'}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                      <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                        {n.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1.5">
                      {formatDateTime(n.createdAt, companySettings?.timezone)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {n.link && (
                      <Link to={n.link} className="btn-secondary text-xs py-1 px-2.5">
                        Open
                      </Link>
                    )}
                    {!n.isRead && (
                      <button type="button" onClick={() => markRead(n._id)} className="btn-secondary text-xs py-1 px-2.5">
                        <Check className="w-3.5 h-3.5" /> Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Pagination meta={meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
