import React from "react";

/* Medicines-local primitives — "Premium Clinical White".
 * Self-contained: no imports from customer-portal, staff UI, or pos.
 * Tokens alias the shared --pharvo-* values (see ../medicines.css). */

export function MedCard({ className = "", hover = false, children, style }) {
  return (
    <div
      className={`med-card${hover ? " med-card-hover" : ""}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

const PILL_TONES = {
  success: "med-pill-success",
  warning: "med-pill-warning",
  danger: "med-pill-danger",
  neutral: "med-pill-neutral",
  accent: "med-pill-accent",
};

export function MedPill({ tone = "neutral", className = "", children, style }) {
  return (
    <span
      className={`med-pill ${PILL_TONES[tone] || PILL_TONES.neutral}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {children}
    </span>
  );
}

/* Label-left / value-right fact row, 32px tall with divider. */
export function MedRow({ label, value, mono = false }) {
  return (
    <div className="med-row">
      <span className="med-row-label">{label}</span>
      <span className={`med-row-value${mono ? " tabular-nums" : ""}`}>{value}</span>
    </div>
  );
}

/* Body section wrapper with uppercase title. */
export function MedSection({ title, children }) {
  return (
    <div className="med-section">
      <h5 className="med-section-title">{title}</h5>
      {children}
    </div>
  );
}

/* Single source of truth for inventory status → label + tone.
 * Keys mirror the page's inventoryStatus(): out → expired → low → ok,
 * plus "near" for near-expiry display. */
const MED_STATUS_META = {
  ok: { label: "In stock", tone: "success" },
  low: { label: "Low", tone: "warning" },
  out: { label: "Out of stock", tone: "danger" },
  expired: { label: "Expired", tone: "danger" },
  near: { label: "Near expiry", tone: "warning" },
};

export function MedStatusBadge({ status }) {
  const meta = MED_STATUS_META[status] || MED_STATUS_META.ok;
  return (
    <span className={`med-badge med-badge-${meta.tone}`}>
      <span className={`med-dot med-dot-${meta.tone}`} />
      {meta.label}
    </span>
  );
}
