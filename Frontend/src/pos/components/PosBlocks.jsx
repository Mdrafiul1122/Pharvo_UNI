import { Minus, Plus, X } from "lucide-react";

/* Reusable POS primitives — "Premium Clinical White".
 * Self-contained: no imports from customer-portal or staff UI.
 * API shape mirrors the portal + staff primitives (variant/tone props). */

export function PosCard({ className = "", hover = false, children, style }) {
  return (
    <div className={`pos-card${hover ? " pos-card-hover" : ""}${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}

const BTN_VARIANTS = {
  gradient: "pos-btn-gradient",
  ghost: "pos-btn-ghost",
  "danger-ghost": "pos-btn-danger-ghost",
};

const BTN_SIZES = { sm: "pos-btn-sm", md: "pos-btn-md", lg: "pos-btn-lg" };

export function PosButton({
  variant = "gradient",
  size = "md",
  block = false,
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type="button"
      className={`pos-btn ${BTN_VARIANTS[variant] || BTN_VARIANTS.gradient} ${BTN_SIZES[size] || BTN_SIZES.md}${block ? " pos-btn-block" : ""}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

const PILL_TONES = {
  accent: "pos-pill-accent",
  "accent-2": "pos-pill-accent-2",
  success: "pos-pill-success",
  warning: "pos-pill-warning",
  danger: "pos-pill-danger",
  neutral: "pos-pill-neutral",
};

export function PosPill({ tone = "neutral", className = "", children, style }) {
  return (
    <span className={`pos-pill ${PILL_TONES[tone] || PILL_TONES.neutral}${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </span>
  );
}

/* Segmented PC/Strip/Box toggle. Options carry their own disabled + tooltip
 * state so unit-availability logic stays with the caller (unchanged). */
export function PosUnitToggle({ value, onChange, options, ariaLabel }) {
  return (
    <div role="group" aria-label={ariaLabel} className="pos-seg">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={opt.disabled}
          onClick={() => onChange(opt.value)}
          title={opt.title}
          aria-pressed={value === opt.value}
          className="pos-seg-btn"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function PosStepper({ value, onDec, onInc, decLabel, incLabel }) {
  return (
    <span className="pos-stepper">
      <button type="button" onClick={onDec} aria-label={decLabel} className="pos-stepper-btn">
        <Minus size={12} strokeWidth={1.75} />
      </button>
      <span className="pos-stepper-val">{value}</span>
      <button type="button" onClick={onInc} aria-label={incLabel} className="pos-stepper-btn">
        <Plus size={12} strokeWidth={1.75} />
      </button>
    </span>
  );
}

const STOCK_SEV = { ok: "ok", low: "low", out: "out" };

export function PosStockDot({ severity = "ok", label, title }) {
  const sev = STOCK_SEV[severity] || "ok";
  return (
    <span className={`pos-stock pos-stock-${sev}`} title={title}>
      <span className={`pos-dot pos-dot-${sev}`} />
      <span>{label}</span>
    </span>
  );
}

const BANNER_TONES = {
  amber: "pos-banner-amber",
  rose: "pos-banner-rose",
  info: "pos-banner-info",
  success: "pos-banner-success",
};

export function PosBanner({ tone = "info", icon = null, className = "", children, style }) {
  return (
    <div className={`pos-banner ${BANNER_TONES[tone] || BANNER_TONES.info}${className ? ` ${className}` : ""}`} style={style}>
      {icon}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function PosReceiptRow({ label, value, strong = false, tone = "" }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span style={{ color: "var(--pos-ink-muted)" }}>{label}</span>
      <span
        className="tabular-nums"
        style={{
          fontWeight: strong ? 800 : 600,
          color: tone === "success" ? "var(--pos-success)" : tone === "danger" ? "var(--pos-danger)" : "var(--pos-ink)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function PosModalShell({ title, onClose, children, footer, maxWidth = 520, closeLabel = "Close" }) {
  return (
    <div className="pos-modal-backdrop">
      <div className="pos-modal-panel" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth }}>
        <div className="flex items-center justify-between gap-3" style={{ marginBottom: title ? 16 : 8 }}>
          {title ? (
            <h4 style={{ fontSize: 18, fontWeight: 700, color: "var(--pos-ink)", letterSpacing: "-0.01em" }}>{title}</h4>
          ) : (
            <span />
          )}
          <button type="button" onClick={onClose} aria-label={closeLabel} className="pos-modal-close">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        <div className="min-w-0">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2" style={{ marginTop: 20 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
