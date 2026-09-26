import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, EmptyState, LoadingState, StatusBadge } from "../components/ui/Blocks";

/* Shared PHARVO dashboard kit (Admin + Pharmacist).
 * Visual system: Premium Clinical White — bg #F7F9FC · surface #FFFFFF ·
 * ink #0B1220 / #64748B / #94A3B8 · line #EEF1F5 · accent teal #0EA5A4 ·
 * accent-2 indigo #6366F1 · success #22C55E · warning #F59E0B ·
 * danger #F43F5E. Status color is used for meaning only, never decoration.
 * Data helpers below are logic — do not change their behavior.
 */

export function formatMoney(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "৳0";
  return `৳${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function shortDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function displayName(user) {
  if (!user) return "";
  const joined = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return joined || user.username || "";
}

export function GreetingHeader({ user, subtitle, right }) {
  const name = displayName(user);
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold text-[var(--pharvo-ink)] tracking-tight">
          {greetingFor()}
          {name ? `, ${name.split(" ")[0]}` : ""}
        </h2>
        {subtitle && (
          <p className="text-[13px] text-[var(--pharvo-ink-muted)] font-normal mt-1">{subtitle}</p>
        )}
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}

const KPI_TONES = {
  blue: "staff-icon-accent-2",
  green: "staff-icon-success",
  amber: "staff-icon-warning",
  red: "staff-icon-danger",
  slate: "staff-icon-neutral",
};

export function KpiCard({ label, value, hint, icon: Icon, tone = "blue", trend = null }) {
  const showTrend = trend !== null && trend !== undefined;
  const down = showTrend && trend < 0;
  return (
    <div className="staff-card staff-card-hover h-24 px-4 py-3 flex flex-col justify-center gap-1 min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <span className={`staff-icon-square ${KPI_TONES[tone] || KPI_TONES.blue}`} aria-hidden="true">
            <Icon size={18} strokeWidth={1.75} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div
            className="text-[24px] font-extrabold text-[var(--pharvo-ink)] tracking-tight leading-none tabular-nums truncate"
            title={typeof value === "string" ? value : String(value ?? "")}
          >
            {value}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--pharvo-ink-muted)] mt-1 truncate">
            {label}
          </div>
        </div>
        {showTrend && (
          <span
            className={`staff-pill shrink-0 !px-2.5 tabular-nums ${down ? "staff-pill-danger" : "staff-pill-success"}`}
            title={hint || undefined}
          >
            {down ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
            {`${trend >= 0 ? "+" : ""}${trend.toFixed(1)}%`}
          </span>
        )}
      </div>
      {hint && (
        <p className="text-[11px] font-normal text-[var(--pharvo-ink-subtle)] truncate leading-tight pl-[44px]">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold text-[var(--pharvo-ink)] tracking-tight">{title}</h3>
        {subtitle && (
          <p className="text-xs text-[var(--pharvo-ink-subtle)] font-normal mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

export function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    <div className={`staff-card p-5 ${className}`}>
      <SectionHeader title={title} subtitle={subtitle} action={action} />
      {children}
    </div>
  );
}

export function ViewAllButton({ onClick, children = "View all" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="staff-focus inline-flex items-center text-[13px] font-semibold text-[var(--pharvo-accent)] hover:opacity-80 cursor-pointer transition-opacity rounded min-h-[44px]"
    >
      {children} →
    </button>
  );
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="staff-card h-24 p-4" aria-hidden="true">
          <div className="h-3 w-24 rounded bg-[var(--pharvo-line)] animate-pulse" />
          <div className="h-6 w-32 rounded bg-[var(--pharvo-line)] animate-pulse mt-3" />
          <div className="h-3 w-20 rounded bg-[var(--pharvo-line)] animate-pulse mt-2" />
        </div>
      ))}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="staff-banner staff-banner-danger" role="alert">
      <span className="flex-1 min-w-0 text-[13px] font-medium">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="staff-focus shrink-0 px-3 py-1.5 rounded-lg bg-[var(--pharvo-surface)] border border-[var(--pharvo-line)] text-[var(--pharvo-danger)] font-semibold hover:border-[var(--pharvo-line-strong)] transition-colors cursor-pointer min-h-[36px] text-xs"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export { Card, EmptyState, LoadingState, StatusBadge };

export function daysUntil(iso) {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso) - new Date()) / 86400000);
  return Number.isNaN(days) ? null : days;
}

/** Severity derived from stock vs reorder threshold. */
export function stockSeverity(product) {
  const stock = Number(product.stock_quantity);
  const reorder = Number(product.reorder_level) || 0;
  if (stock <= 0) return "critical";
  if (reorder > 0 && stock <= reorder * 0.4) return "critical";
  if (reorder > 0 && stock <= reorder) return "warning";
  return "normal";
}

const SEVERITY_TONE = {
  critical: "staff-pill-danger",
  warning: "staff-pill-warning",
  attention: "staff-pill-accent-2",
  normal: "staff-pill-neutral",
  info: "staff-pill-neutral",
};

const SEVERITY_LABEL = {
  critical: "Critical",
  warning: "Warning",
  attention: "Attention",
  normal: "Normal",
  info: "Activity",
};

export function SeverityBadge({ severity }) {
  const tone = SEVERITY_TONE[severity] || SEVERITY_TONE.normal;
  return (
    <span className={`staff-pill ${tone}`}>
      {SEVERITY_LABEL[severity] || severity}
    </span>
  );
}
