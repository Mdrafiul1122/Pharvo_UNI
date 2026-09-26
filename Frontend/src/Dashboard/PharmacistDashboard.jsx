import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardList,
  Clock,
  Package,
  Pill,
  Receipt,
  ShieldAlert,
} from "lucide-react";
import { fetchProducts } from "../services/medicine";
import { fetchSales } from "../services/pos";
import { fetchNotifications } from "../services/notifications";
import { fetchReminders } from "../services/crm";
import { ApiError } from "../services/api";
import {
  ErrorBanner,
  GreetingHeader,
  LoadingState,
  Panel,
  SeverityBadge,
  SkeletonCards,
  ViewAllButton,
  daysUntil,
  formatMoney,
  shortDate,
  stockSeverity,
} from "./widgets";
import { StaffCard, StaffEmptyState, StaffStatCard } from "./StaffBlocks";

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

/* Pharmacist daily-workflow view. Distinct from the Admin business view:
 * answers "what needs my attention right now?" using only existing APIs
 * (inventory products, sales, notifications). No task API exists, so the
 * queue is derived from real stock, expiry, sensitive-medicine and sales
 * data. No prescription/Rx module exists or is created here. */
export default function PharmacistDashboard({ user, onPageChange }) {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alertTab, setAlertTab] = useState("low");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [prods, salesList, notifs, rems] = await Promise.all([
        fetchProducts({ is_active: "true" }),
        fetchSales(),
        fetchNotifications().catch(() => []),
        fetchReminders().catch(() => []),
      ]);
      setProducts(prods || []);
      setSales(salesList || []);
      setNotifications(notifs || []);
      setReminders(rems || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load workflow data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const todayISO = isoDay(new Date());

  const todaySales = useMemo(
    () => (sales || []).filter((s) => (s.sale_date || s.created_at || "").slice(0, 10) === todayISO),
    [sales, todayISO]
  );

  const criticalStock = useMemo(
    () => (products || []).filter((p) => stockSeverity(p) === "critical"),
    [products]
  );
  const lowStock = useMemo(
    () => (products || []).filter((p) => stockSeverity(p) === "warning"),
    [products]
  );
  const expiring = useMemo(
    () =>
      (products || [])
        .filter((p) => {
          const left = daysUntil(p.expiry_date);
          return left !== null && left >= 0 && left <= 30;
        })
        .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)),
    [products]
  );
  const expired = useMemo(
    () =>
      (products || []).filter((p) => {
        const left = daysUntil(p.expiry_date);
        return left !== null && left < 0;
      }),
    [products]
  );
  const sensitive = useMemo(
    () => (products || []).filter((p) => p.is_sensitive),
    [products]
  );
  const unreadCount = useMemo(
    () => (notifications || []).filter((n) => !n.is_read).length,
    [notifications]
  );

  const verificationCount = sensitive.length;
  const attentionCount = criticalStock.length + expired.length;
  const readyCount = todaySales.length;
  const totalTasks = verificationCount + attentionCount + lowStock.length + expiring.length;

  const queue = useMemo(() => {
    const rows = [];
    expired.forEach((p) =>
      rows.push({ key: `exp-${p.id}`, severity: "critical", icon: Clock, title: p.name, detail: `Expired ${shortDate(p.expiry_date)} — remove from shelf`, page: "medicines-inventory", action: "Review" })
    );
    criticalStock.forEach((p) =>
      rows.push({
        key: `crit-${p.id}`, severity: "critical", icon: Package,
        title: p.name, detail: `${Number(p.stock_quantity).toLocaleString()} left · min ${Number(p.reorder_level || 0).toLocaleString()}`,
        page: "medicines-inventory", action: "Restock",
      })
    );
    sensitive.forEach((p) =>
      rows.push({
        key: `sens-${p.id}`, severity: "attention", icon: ShieldAlert,
        title: p.name, detail: "Restricted medicine — verify before dispensing",
        page: "medicines-inventory", action: "Verify",
      })
    );
    expiring.forEach((p) =>
      rows.push({
        key: `expiry-${p.id}`, severity: "warning", icon: Clock,
        title: p.name, detail: `Expires ${shortDate(p.expiry_date)}`,
        page: "medicines-inventory", action: "Review",
      })
    );
    lowStock.forEach((p) =>
      rows.push({
        key: `low-${p.id}`, severity: "warning", icon: Package,
        title: p.name, detail: `${Number(p.stock_quantity).toLocaleString()} left · min ${Number(p.reorder_level || 0).toLocaleString()}`,
        page: "medicines-inventory", action: "Restock",
      })
    );
    const rank = { critical: 0, attention: 1, warning: 2, normal: 3 };
    return rows.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 8);
  }, [expired, criticalStock, sensitive, expiring, lowStock]);

  const recentActivity = useMemo(() => {
    const items = (sales || [])
      .slice()
      .sort((a, b) => new Date(b.created_at || b.sale_date) - new Date(a.created_at || a.sale_date))
      .slice(0, 4)
      .map((s) => ({
        key: `sale-${s.id}`,
        icon: Receipt,
        title: s.invoice_number || "Sale",
        detail: `${s.customer?.name || s.customer_name || "Walk-in"} · ${formatMoney(s.payable_amount ?? s.total_amount)}`,
      }));
    return items;
  }, [sales]);

  const go = (page) => () => onPageChange && onPageChange(page);

  const refillsDueToday = useMemo(() => {
    const today = isoDay(new Date());
    return (reminders || [])
      .filter((r) => r.is_active && (r.reminder_time || "").slice(0, 10) === today)
      .sort((a, b) => new Date(a.reminder_time) - new Date(b.reminder_time));
  }, [reminders]);

  const ALERT_TABS = useMemo(
    () => [
      {
        key: "low",
        label: `Low Stock (${lowStock.length + criticalStock.length})`,
        items: [...criticalStock, ...lowStock].slice(0, 6).map((p) => ({
          key: `tab-low-${p.id}`,
          title: p.name,
          detail: `${Number(p.stock_quantity).toLocaleString()} left · min ${Number(p.reorder_level || 0).toLocaleString()}`,
          actionLabel: "Reorder Stock",
          page: "medicines-inventory",
        })),
        emptyTitle: "No low-stock items",
        emptySubtitle: "All bins are above reorder thresholds.",
      },
      {
        key: "expiry",
        label: `Expiring ≤30d (${expiring.length})`,
        items: expiring.slice(0, 6).map((p) => ({
          key: `tab-exp-${p.id}`,
          title: p.name,
          detail: `Expires ${shortDate(p.expiry_date)}`,
          actionLabel: "Review Expiry",
          page: "medicines-inventory",
        })),
        emptyTitle: "Nothing expiring soon",
        emptySubtitle: "No batches expire within 30 days.",
      },
      {
        key: "sensitive",
        label: `Sensitive (${sensitive.length})`,
        items: sensitive.slice(0, 6).map((p) => ({
          key: `tab-sens-${p.id}`,
          title: p.name,
          detail: "Controlled item — verify before dispensing",
          actionLabel: "Verify",
          page: "medicines-inventory",
        })),
        emptyTitle: "No sensitive items flagged",
        emptySubtitle: "No controlled medicines require review.",
      },
    ],
    [lowStock, criticalStock, expiring, sensitive]
  );

  const activeAlertTab = ALERT_TABS.find((t) => t.key === alertTab) || ALERT_TABS[0];

  if (loading) {
    return (
      <div className="flex flex-col gap-5 w-full max-w-[1440px] mx-auto">
        <SkeletonCards count={4} />
        <StaffCard className="p-5">
          <LoadingState label="Loading today's workflow..." />
        </StaffCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1440px] mx-auto">
      {/* ── Greeting row ── */}
      <GreetingHeader
        user={user}
        subtitle="Here's what needs your attention today."
        right={
          <button
            type="button"
            onClick={go("pos")}
            className="staff-focus inline-flex items-center justify-center px-5 min-h-[44px] rounded-xl staff-btn-gradient text-sm font-semibold transition-all duration-200 cursor-pointer"
          >
            Open POS
          </button>
        }
      />
      <ErrorBanner message={error} onRetry={load} />

      {/* ── Workflow hero (4 tiles) ── */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-[15px] font-bold text-[var(--pharvo-ink)] tracking-tight">Today's Workflow</h3>
          <span className="staff-pill staff-pill-neutral tabular-nums">
            {totalTasks} open item{totalTasks === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StaffStatCard
            icon={AlertTriangle}
            tone="staff-icon-accent"
            value={attentionCount}
            label="Attention Required"
            hint="Critical stock · expired"
            onClick={go("medicines-inventory")}
          />
          <StaffStatCard
            icon={ShieldAlert}
            tone="staff-icon-warning"
            value={verificationCount}
            label="Verification"
            hint="Restricted medicines"
            onClick={go("medicines-inventory")}
          />
          <StaffStatCard
            icon={Receipt}
            tone="staff-icon-accent-2"
            value={readyCount}
            label="Sales Today"
            hint="Completed at POS"
            onClick={go("pos")}
          />
          <StaffStatCard
            icon={Clock}
            tone="staff-icon-success"
            value={lowStock.length + expiring.length}
            label="Follow Up"
            hint="Low stock · expiring"
            onClick={go("medicines-inventory")}
          />
        </div>
      </div>

      {/* ── Priority queue (7) + Stock alerts (5) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel
          className="xl:col-span-7"
          title="Priority Queue"
          subtitle="Most urgent first — tap an action to jump there"
          action={
            queue.length > 0 ? (
              <span className="staff-pill staff-pill-accent tabular-nums">{queue.length}</span>
            ) : null
          }
        >
          {queue.length === 0 ? (
            <StaffEmptyState
              icon={CheckCircle2}
              title="All clear — nothing needs attention"
              subtitle="No critical stock, expired, or verification items right now."
            />
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--pharvo-line)]">
              {queue.map((row) => {
                const Icon = row.icon;
                return (
                  <li key={row.key} className="flex items-center gap-3 min-h-[52px] py-1.5 min-w-0">
                    <span className="staff-icon-square staff-icon-neutral shrink-0" aria-hidden="true">
                      <Icon size={17} strokeWidth={1.75} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-[var(--pharvo-ink)] truncate">{row.title}</span>
                      <span className="block text-[11px] text-[var(--pharvo-ink-subtle)] truncate">{row.detail}</span>
                    </span>
                    <SeverityBadge severity={row.severity} />
                    <button
                      type="button"
                      onClick={go(row.page)}
                      className="staff-focus shrink-0 px-3.5 py-1.5 rounded-lg staff-btn-gradient text-xs font-semibold transition-all duration-200 cursor-pointer min-h-[36px]"
                    >
                      {row.action}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          className="xl:col-span-5"
          title="Stock Alerts"
          subtitle="Low stock · expiry · sensitive"
        >
          <div className="staff-segmented w-full mb-3 overflow-x-auto" role="tablist" aria-label="Alert categories">
            {ALERT_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={alertTab === t.key}
                onClick={() => setAlertTab(t.key)}
                className="staff-segmented-btn staff-focus flex-1 whitespace-nowrap"
              >
                {t.label}
              </button>
            ))}
          </div>
          {activeAlertTab.items.length === 0 ? (
            <StaffEmptyState
              icon={activeAlertTab.key === "sensitive" ? ShieldAlert : Package}
              title={activeAlertTab.emptyTitle}
              subtitle={activeAlertTab.emptySubtitle}
            />
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--pharvo-line)] max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
              {activeAlertTab.items.map((row) => (
                <li key={row.key} className="flex items-center gap-3 min-h-[44px] py-1.5 min-w-0">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-[var(--pharvo-ink)] truncate">{row.title}</span>
                    <span className="block text-[11px] text-[var(--pharvo-ink-subtle)] truncate">{row.detail}</span>
                  </span>
                  <button
                    type="button"
                    onClick={go(row.page)}
                    className="staff-focus shrink-0 px-3 py-1.5 rounded-lg border border-[var(--pharvo-line)] bg-[var(--pharvo-surface)] text-[var(--pharvo-accent-2)] text-xs font-semibold hover:border-[var(--pharvo-line-strong)] transition-all duration-200 cursor-pointer min-h-[36px]"
                  >
                    {row.actionLabel}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ── Refills (6) + Sensitive (6) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel
          className="xl:col-span-6"
          title="Refills Due"
          subtitle={`${refillsDueToday.length} reminder${refillsDueToday.length === 1 ? "" : "s"} · ${readyCount} sale${readyCount === 1 ? "" : "s"} at the counter`}
          action={refillsDueToday.length > 0 ? <ViewAllButton onClick={go("crm")} /> : null}
        >
          {refillsDueToday.length === 0 ? (
            <StaffEmptyState icon={Bell} title="No refills due today" subtitle="No active reminders fall due today." />
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--pharvo-line)]">
              {refillsDueToday.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center gap-3 min-h-[48px] py-1.5 min-w-0">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-[var(--pharvo-ink)] truncate">
                      {r.customer?.name || "Customer"}
                    </span>
                    <span className="block text-[11px] text-[var(--pharvo-ink-subtle)] truncate">
                      {r.product?.name || r.title || "Refill"}
                    </span>
                  </span>
                  <span className="staff-pill staff-pill-accent-2 shrink-0">Due today</span>
                  <button
                    type="button"
                    onClick={go("crm")}
                    className="staff-focus shrink-0 px-3 py-1.5 rounded-lg border border-[var(--pharvo-line)] bg-[var(--pharvo-surface)] text-[var(--pharvo-accent-2)] text-xs font-semibold hover:border-[var(--pharvo-line-strong)] transition-all duration-200 cursor-pointer min-h-[36px]"
                  >
                    Open CRM
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="xl:col-span-6 staff-banner staff-banner-warning !items-stretch !p-0 overflow-hidden">
          <div className="p-5 flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-[15px] font-bold text-[var(--pharvo-ink)] tracking-tight">Sensitive Medicines</h3>
                <p className="text-xs text-[var(--pharvo-ink-muted)] font-normal mt-0.5">Restricted items — verify before dispensing</p>
              </div>
              {sensitive.length > 0 && <ViewAllButton onClick={go("medicines-inventory")} />}
            </div>
            {sensitive.length === 0 ? (
              <StaffEmptyState icon={ShieldAlert} title="No restricted medicines flagged" />
            ) : (
              <ul className="flex flex-col divide-y divide-[rgb(245_158_11/0.25)]">
                {sensitive.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 min-h-[48px] py-1.5 min-w-0">
                    <span className="staff-icon-square staff-icon-warning shrink-0" aria-hidden="true">
                      <Pill size={17} strokeWidth={1.75} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-[var(--pharvo-ink)] truncate">{p.name}</span>
                      <span className="block text-[11px] text-[var(--pharvo-ink-muted)]">
                        Stock {Number(p.stock_quantity).toLocaleString()}
                      </span>
                    </span>
                    <SeverityBadge severity="attention" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Stock & expiry watch (two-column split) ── */}
      <Panel
        title="Stock & Expiry Watch"
        subtitle="Reorder and shelf-life actions"
        action={
          criticalStock.length + expiring.length > 0 ? (
            <ViewAllButton onClick={go("medicines-inventory")} />
          ) : null
        }
      >
        {criticalStock.length + expiring.length === 0 ? (
          <StaffEmptyState icon={Package} title="Stock levels healthy" subtitle="Nothing below threshold or near expiry." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <ul className="flex flex-col divide-y divide-[var(--pharvo-line)]">
              {criticalStock.slice(0, 3).map((p) => (
                <li key={`c-${p.id}`} className="flex items-center gap-2.5 min-h-[44px] py-1 min-w-0">
                  <SeverityBadge severity="critical" />
                  <span className="flex-1 min-w-0 text-[13px] font-semibold text-[var(--pharvo-ink)] truncate">{p.name}</span>
                  <span className="text-[11px] text-[var(--pharvo-ink-subtle)] whitespace-nowrap tabular-nums">
                    {Number(p.stock_quantity).toLocaleString()} left
                  </span>
                </li>
              ))}
              {criticalStock.length === 0 && (
                <li className="flex items-center min-h-[44px] text-[13px] text-[var(--pharvo-ink-subtle)]">No critical stock.</li>
              )}
            </ul>
            <ul className="flex flex-col divide-y divide-[var(--pharvo-line)]">
              {expiring.slice(0, 4).map((p) => (
                <li key={`e-${p.id}`} className="flex items-center gap-2.5 min-h-[44px] py-1 min-w-0">
                  <SeverityBadge severity="warning" />
                  <span className="flex-1 min-w-0 text-[13px] font-semibold text-[var(--pharvo-ink)] truncate">{p.name}</span>
                  <span className="text-[11px] text-[var(--pharvo-ink-subtle)] whitespace-nowrap">exp {shortDate(p.expiry_date)}</span>
                </li>
              ))}
              {expiring.length === 0 && (
                <li className="flex items-center min-h-[44px] text-[13px] text-[var(--pharvo-ink-subtle)]">Nothing expiring soon.</li>
              )}
            </ul>
          </div>
        )}
      </Panel>

      {/* ── Recent activity (6) + Notifications (6) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <Panel
          className="xl:col-span-6"
          title="Recent Activity"
          subtitle="Latest sales at the counter"
          action={recentActivity.length > 0 ? <ViewAllButton onClick={go("orders")} /> : null}
        >
          {recentActivity.length === 0 ? (
            <StaffEmptyState icon={Receipt} title="No activity yet today" />
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--pharvo-line)]">
              {recentActivity.map((a) => (
                <li key={a.key} className="flex items-center gap-3 min-h-[40px] py-1 min-w-0">
                  <span className="staff-icon-square staff-icon-accent-2 shrink-0" aria-hidden="true">
                    <Receipt size={16} strokeWidth={1.75} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-[var(--pharvo-ink)] truncate">{a.title}</span>
                    <span className="block text-[11px] text-[var(--pharvo-ink-subtle)] truncate">{a.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          className="xl:col-span-6"
          title="Notifications"
          subtitle={unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          action={<ViewAllButton onClick={go("notifications")} />}
        >
          {unreadCount === 0 ? (
            <StaffEmptyState icon={Bell} title="No unread notifications" />
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--pharvo-line)]">
              {(notifications || [])
                .filter((n) => !n.is_read)
                .slice(0, 4)
                .map((n) => (
                  <li key={n.id} className="flex items-start gap-3 min-h-[40px] py-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-[var(--pharvo-accent-2)] mt-1.5 shrink-0" aria-hidden="true" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-[var(--pharvo-ink)] truncate">
                        {n.title || "Notification"}
                      </span>
                      {n.message && (
                        <span className="block text-[11px] text-[var(--pharvo-ink-subtle)] truncate">{n.message}</span>
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ── POS call-to-action ── */}
      <button
        type="button"
        onClick={go("pos")}
        className="staff-focus w-full flex items-center gap-4 p-5 rounded-[20px] staff-btn-gradient text-white text-left transition-all duration-200 cursor-pointer min-h-[44px]"
      >
        <span className="w-11 h-11 rounded-2xl bg-white/20 inline-flex items-center justify-center shrink-0" aria-hidden="true">
          <ClipboardList size={20} strokeWidth={1.75} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-bold">Ready to serve a customer?</span>
          <span className="block text-[13px] text-white/85 font-normal mt-0.5">
            {readyCount} sale{readyCount === 1 ? "" : "s"} completed today
          </span>
        </span>
        <span className="shrink-0 px-5 py-2.5 rounded-xl bg-white text-[var(--pharvo-accent-2)] text-sm font-bold min-h-[44px] inline-flex items-center">
          Open POS
        </span>
      </button>
    </div>
  );
}
