import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell, CheckCheck, Check, AlertTriangle, ShieldAlert, Info, Clock,
} from "lucide-react";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notifications";
import { ApiError } from "../services/api";
import { Card, CardHeader, StatusBadge, LoadingState, EmptyState } from "../components/ui/Blocks";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
];

function severityMeta(severity) {
  const map = {
    critical: { icon: ShieldAlert, tone: "bg-red-50 text-red-600", label: "Critical" },
    warning: { icon: AlertTriangle, tone: "bg-amber-50 text-amber-600", label: "Warning" },
    info: { icon: Info, tone: "bg-blue-50 text-blue-600", label: "Info" },
  };
  return map[severity] || map.info;
}

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage({ onChanged }) {
  const [filter, setFilter] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState(false);

  const loadNotifications = useCallback(async (unreadOnly = false) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchNotifications(
        unreadOnly ? { is_read: "false" } : {}
      );
      setNotifications(data || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load notifications.");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications(filter === "unread");
  }, [filter, loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update notification.");
    }
  };

  const handleMarkAll = async () => {
    setMarking(true);
    setError("");
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update notifications.");
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <Card>
        <CardHeader
          title="Notifications"
          subtitle={unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          action={
            <div className="flex items-center gap-2">
              <div className="inline-flex gap-1 p-1 bg-slate-100 rounded-lg">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={`px-3.5 py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                      filter === f.key
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={marking || unreadCount === 0}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                <CheckCheck size={16} />
                {marking ? "Marking..." : "Mark all read"}
              </button>
            </div>
          }
        />

        {error && (
          <div className="flex items-center gap-2 px-5 py-3.5 bg-red-50 border-b border-red-200 text-sm text-red-700 font-medium">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <LoadingState label="Loading notifications..." />
        ) : notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" subtitle="Stock and expiry alerts will appear here." />
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map((n) => {
              const meta = severityMeta(n.severity);
              const Icon = meta.icon;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 px-5 py-5 transition-colors ${
                    n.is_read ? "bg-white" : "bg-blue-50/40"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${meta.tone}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-semibold text-slate-900">{n.title}</span>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Unread" />
                      )}
                    </div>
                    {n.message && (
                      <p className="text-[13px] text-slate-500 font-normal mt-1 leading-relaxed">{n.message}</p>
                    )}
                    <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
                      {n.product_name && (
                        <span className="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-500 border border-slate-200 font-medium">
                          {n.product_name}
                        </span>
                      )}
                      <StatusBadge status={meta.label} />
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                  </div>
                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      title="Mark as read"
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer shrink-0 transition-colors"
                    >
                      <Check size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}