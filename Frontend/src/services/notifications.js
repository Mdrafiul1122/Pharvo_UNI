/**
 * Notifications API service.
 *
 * Wraps the current Django `notifications` app endpoints:
 *   GET   /api/notifications/              - list notifications
 *   GET   /api/notifications/unread-count/ - unread count
 *   GET|PATCH /api/notifications/<id>/     - detail / mark read
 *
 * The current backend has no "mark all read" endpoint, so that helper is
 * implemented client-side by marking each unread notification read.
 */

import { request } from "./api";

function qs(params = {}) {
  const s = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined)
    )
  ).toString();
  return s ? `?${s}` : "";
}

/**
 * List notifications. Optional filters: is_read, severity, type.
 * @param {object} params
 * @returns {Promise<object[]>}
 */
export async function fetchNotifications(params = {}) {
  const data = await request(`/notifications/${qs(params)}`);
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch the number of unread notifications.
 * @returns {Promise<{ unread_count: number }>}
 */
export async function fetchUnreadCount() {
  return request("/notifications/unread-count/");
}

/**
 * Mark a single notification as read.
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export async function markNotificationRead(id) {
  return request(`/notifications/${id}/`, { method: "PATCH", body: { is_read: true } });
}

/**
 * Mark every notification as read.
 *
 * The current backend has no batch endpoint, so each unread notification is
 * marked read individually.
 * @returns {Promise<{ marked_read: number }>}
 */
export async function markAllNotificationsRead() {
  const notifications = await fetchNotifications();
  const unread = notifications.filter((n) => !n.is_read);
  await Promise.all(
    unread.map((n) => markNotificationRead(n.id).catch(() => null))
  );
  return { marked_read: unread.length };
}
