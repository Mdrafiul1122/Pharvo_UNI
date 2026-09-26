/* Portal-local reusable primitives (Premium Clinical White).
 * Portal-only: never import staff-side components/ui/Blocks.jsx. */

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function PortalCard({ children, hover = false, className = "", ...rest }) {
  return (
    <div className={`portal-card${hover ? " portal-card-hover" : ""} ${className}`} {...rest}>
      {children}
    </div>
  );
}

/* Compact horizontal stat tile, fixed 96px height for dense dashboards. */
export function PortalStatTile({ icon: Icon, value, label, sub, tone = "portal-icon-accent" }) {
  return (
    <div className="h-24 rounded-[14px] border border-[var(--portal-line)] bg-[var(--portal-surface)] flex items-center gap-3 px-4 min-w-0">
      <span className={`portal-icon-square ${tone}`} aria-hidden="true">
        {Icon && <Icon size={18} strokeWidth={1.75} />}
      </span>
      <div className="min-w-0">
        <p className="text-xl font-extrabold tracking-tight text-[var(--portal-ink)] tabular-nums truncate leading-none">
          {value}
        </p>
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--portal-ink-muted)] mt-1.5 truncate">
          {label}
        </p>
        {sub && (
          <p className="text-[11px] font-normal text-[var(--portal-ink-subtle)] mt-0.5 truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

const PILL_TONES = {
  accent: "portal-pill-accent",
  "accent-2": "portal-pill-accent-2",
  success: "portal-pill-success",
  warning: "portal-pill-warning",
  danger: "portal-pill-danger",
  neutral: "portal-pill-neutral",
};

export function PortalPill({ tone = "neutral", icon: Icon, children, className = "" }) {
  return (
    <span className={`portal-pill ${PILL_TONES[tone] || PILL_TONES.neutral} ${className}`}>
      {Icon && <Icon size={14} strokeWidth={1.75} aria-hidden="true" />}
      {children}
    </span>
  );
}

const BTN_VARIANTS = {
  gradient: "portal-btn-gradient",
  ghost: "portal-btn-ghost",
  danger: "portal-btn-danger",
};

const BTN_SIZES = {
  sm: "portal-btn-sm",
  md: "portal-btn-md",
  lg: "portal-btn-lg",
};

export function PortalButton({ variant = "ghost", size = "md", className = "", ...rest }) {
  return (
    <button
      type="button"
      className={`portal-btn portal-focus ${BTN_VARIANTS[variant] || BTN_VARIANTS.ghost} ${BTN_SIZES[size] || BTN_SIZES.md} ${className}`}
      {...rest}
    />
  );
}

export function PortalProgressBar({ value, height = 8, label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      className="portal-progress-track w-full"
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || "Progress"}
    >
      <div className="portal-progress-fill h-full" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PortalSectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h2 className="text-base font-bold tracking-tight text-[var(--portal-ink)]">{title}</h2>
        {subtitle && (
          <p className="text-[13px] font-normal text-[var(--portal-ink-muted)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/* 120px-tall quick action chip: icon + label, white card. */
export function PortalQuickAction({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="portal-focus portal-card portal-card-hover h-[120px] flex flex-col items-center justify-center gap-2 p-3 text-center cursor-pointer min-w-0"
    >
      <span className="portal-icon-square portal-icon-accent-2" aria-hidden="true">
        {Icon && <Icon size={20} strokeWidth={1.75} />}
      </span>
      <span className="text-[13px] font-semibold text-[var(--portal-ink)] leading-tight">{label}</span>
    </button>
  );
}

/* 48px-tall activity row: status dot + text + relative time. */
const DOT_TONES = {
  accent: "bg-[var(--portal-accent)]",
  "accent-2": "bg-[var(--portal-accent-2)]",
  success: "bg-[var(--portal-success)]",
  warning: "bg-[var(--portal-warning)]",
  neutral: "bg-[var(--portal-ink-subtle)]",
};

export function PortalActivityRow({ tone = "neutral", text, time }) {
  return (
    <li className="h-12 flex items-center gap-3 px-1 min-w-0">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${DOT_TONES[tone] || DOT_TONES.neutral}`}
        aria-hidden="true"
      />
      <span className="flex-1 min-w-0 text-[13px] font-medium text-[var(--portal-ink)] truncate">
        {text}
      </span>
      <span className="text-[12px] font-normal text-[var(--portal-ink-subtle)] shrink-0 tabular-nums">
        {time}
      </span>
    </li>
  );
}

/* Thin full-width info bar (membership strip, banners). */
export function PortalStrip({ children, className = "", ...rest }) {
  return (
    <div className={`portal-card px-5 py-4 ${className}`} {...rest}>
      {children}
    </div>
  );
}

/* Right-side drawer on desktop, bottom sheet on mobile. */
export function PortalDrawer({ open, onClose, title, children }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="portal-drawer-overlay absolute inset-0 bg-[rgb(11_18_32/0.4)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="portal-drawer-panel absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[20px] bg-[var(--portal-bg)] p-4 sm:p-5 pb-8 lg:inset-y-0 lg:left-auto lg:right-0 lg:bottom-auto lg:w-[480px] lg:max-h-none lg:rounded-l-[20px] lg:rounded-tr-none lg:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-bold tracking-tight text-[var(--portal-ink)]">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="portal-focus p-2.5 rounded-xl text-[var(--portal-ink-muted)] hover:bg-[var(--portal-surface-2)] hover:text-[var(--portal-ink)] transition-colors duration-200 cursor-pointer min-w-[44px] min-h-[44px] inline-flex items-center justify-center bg-[var(--portal-surface)] border border-[var(--portal-line)]"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
