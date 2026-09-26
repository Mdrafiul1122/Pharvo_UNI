/* Staff-local reusable primitives (Premium Clinical White).
 * Mirrors the portal primitives' API so future refactors are cheap.
 * Staff-only: never import from customer-portal/. */

import { TrendingDown, TrendingUp } from "lucide-react";

export function StaffCard({ children, hover = false, className = "", ...rest }) {
  return (
    <div className={`staff-card${hover ? " staff-card-hover" : ""} ${className}`} {...rest}>
      {children}
    </div>
  );
}

/* 96px KPI / workflow tile: icon top-left, value, label, trend top-right. */
export function StaffStatCard({ icon: Icon, value, label, hint, trend = null, tone = "staff-icon-accent", onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`staff-card${onClick ? " staff-card-hover staff-focus cursor-pointer text-left w-full" : ""} h-24 p-4 flex flex-col justify-between min-w-0`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className={`staff-icon-square ${tone}`} aria-hidden="true">
          {Icon && <Icon size={18} strokeWidth={1.75} />}
        </span>
        {trend !== null && trend !== undefined && (
          <span
            className={`inline-flex items-center gap-1 text-[12px] font-bold tabular-nums shrink-0 ${
              trend < 0 ? "text-[var(--pharvo-danger)]" : "text-[var(--pharvo-success)]"
            }`}
          >
            {trend < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
            {`${trend >= 0 ? "+" : ""}${trend.toFixed(1)}%`}
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-extrabold tracking-tight text-[var(--pharvo-ink)] tabular-nums truncate leading-none">
          {value}
        </span>
        <span className="block text-[12px] font-medium uppercase tracking-wide text-[var(--pharvo-ink-muted)] mt-1 truncate">
          {label}
          {hint ? <span className="normal-case font-normal"> · {hint}</span> : null}
        </span>
      </span>
    </Tag>
  );
}

const PILL_TONES = {
  accent: "staff-pill-accent",
  "accent-2": "staff-pill-accent-2",
  success: "staff-pill-success",
  warning: "staff-pill-warning",
  danger: "staff-pill-danger",
  neutral: "staff-pill-neutral",
};

export function StaffPill({ tone = "neutral", icon: Icon, children, className = "" }) {
  return (
    <span className={`staff-pill ${PILL_TONES[tone] || PILL_TONES.neutral} ${className}`}>
      {Icon && <Icon size={14} strokeWidth={1.75} aria-hidden="true" />}
      {children}
    </span>
  );
}

const BTN_VARIANTS = {
  gradient: "staff-btn-gradient",
  ghost: "staff-btn-ghost",
  danger: "staff-btn-danger",
};

const BTN_SIZES = {
  sm: "staff-btn-sm",
  md: "staff-btn-md",
  lg: "staff-btn-lg",
};

export function StaffButton({ variant = "ghost", size = "md", className = "", ...rest }) {
  return (
    <button
      type="button"
      className={`staff-btn staff-focus ${BTN_VARIANTS[variant] || BTN_VARIANTS.ghost} ${BTN_SIZES[size] || BTN_SIZES.md} ${className}`}
      {...rest}
    />
  );
}

export function StaffProgressBar({ value, height = 8, label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      className="staff-progress-track w-full"
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || "Progress"}
    >
      <div className="staff-progress-fill h-full" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StaffSectionHeader({ title, subtitle, segmented, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold tracking-tight text-[var(--pharvo-ink)]">{title}</h3>
        {subtitle && (
          <p className="text-xs font-normal text-[var(--pharvo-ink-subtle)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {(segmented || action) && (
        <div className="flex items-center gap-2 shrink-0">
          {segmented}
          {action}
        </div>
      )}
    </div>
  );
}

export function StaffSegmented({ options, value, onChange, label }) {
  return (
    <div className="staff-segmented" role="group" aria-label={label || "Range"}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className="staff-segmented-btn staff-focus"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* Table row with hover + divider for data tables. */
export function StaffTableRow({ children, className = "", ...rest }) {
  return (
    <tr
      className={`border-b border-[var(--pharvo-line)] last:border-0 transition-colors duration-200 hover:bg-[var(--pharvo-surface-2)] ${className}`}
      {...rest}
    >
      {children}
    </tr>
  );
}

/* Compact 40-52px list row with optional trailing action. */
export function StaffListRow({ icon, title, subtitle, badge, action, onAction, height = "h-[52px]" }) {
  return (
    <li className={`flex items-center gap-3 ${height} transition-colors duration-200 hover:bg-[var(--pharvo-surface-2)] rounded-xl px-2 -mx-2 min-w-0`}>
      {icon}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-[var(--pharvo-ink)] truncate">{title}</span>
        {subtitle && (
          <span className="block text-[11px] font-normal text-[var(--pharvo-ink-subtle)] truncate">{subtitle}</span>
        )}
      </span>
      {badge}
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="staff-focus shrink-0 px-3 py-1.5 rounded-lg border border-[var(--pharvo-line)] bg-[var(--pharvo-surface)] text-[var(--pharvo-accent-2)] text-xs font-semibold hover:border-[var(--pharvo-line-strong)] transition-all duration-200 cursor-pointer min-h-[36px]"
        >
          {action}
        </button>
      )}
    </li>
  );
}

const BANNER_TONES = {
  info: "staff-banner-info",
  warning: "staff-banner-warning",
  danger: "staff-banner-danger",
  success: "staff-banner-success",
};

const BANNER_ICON_TONES = {
  info: "text-[var(--pharvo-accent-2)]",
  warning: "text-[var(--pharvo-warning)]",
  danger: "text-[var(--pharvo-danger)]",
  success: "text-[var(--pharvo-success)]",
};

export function StaffBanner({ tone = "info", icon: Icon, children, onClick, className = "" }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`staff-banner ${BANNER_TONES[tone] || BANNER_TONES.info} ${onClick ? "staff-focus w-full text-left cursor-pointer staff-card-hover" : ""} ${className}`}
    >
      {Icon && (
        <span className={`shrink-0 mt-0.5 ${BANNER_ICON_TONES[tone] || BANNER_ICON_TONES.info}`} aria-hidden="true">
          <Icon size={18} strokeWidth={1.75} />
        </span>
      )}
      <span className="min-w-0 flex-1">{children}</span>
    </Tag>
  );
}

/* Compact in-card empty state + full-page variant. */
export function StaffEmptyState({ icon: Icon, title, subtitle, action, variant = "compact" }) {
  if (variant === "full") {
    return (
      <div className="flex flex-col items-center justify-center text-center rounded-[20px] border border-dashed border-[var(--pharvo-line-strong)] bg-[var(--pharvo-surface)] px-6 py-14">
        {Icon && (
          <span className="w-12 h-12 rounded-2xl bg-[var(--pharvo-accent-soft)] text-[var(--pharvo-accent)] inline-flex items-center justify-center" aria-hidden="true">
            <Icon size={22} strokeWidth={1.75} />
          </span>
        )}
        <p className="text-sm font-semibold text-[var(--pharvo-ink)] mt-4">{title}</p>
        {subtitle && (
          <p className="text-[13px] font-normal text-[var(--pharvo-ink-muted)] mt-1.5 max-w-[300px] leading-relaxed">{subtitle}</p>
        )}
        {action}
      </div>
    );
  }
  return (
    <div className="py-8 flex flex-col items-center justify-center text-center px-4">
      {Icon && (
        <span className="w-10 h-10 rounded-xl bg-[var(--pharvo-surface-2)] border border-[var(--pharvo-line)] text-[var(--pharvo-ink-subtle)] inline-flex items-center justify-center mb-2.5" aria-hidden="true">
          <Icon size={20} strokeWidth={1.75} />
        </span>
      )}
      <p className="text-[13px] font-semibold text-[var(--pharvo-ink-muted)]">{title}</p>
      {subtitle && (
        <p className="text-xs font-normal text-[var(--pharvo-ink-subtle)] mt-1 max-w-[260px]">{subtitle}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
