import React from "react";
import { Sparkles } from "lucide-react";
import "./enterprise.css";

/* PHARVO EnterpriseKit — shared primitives for staff + portal + pos + medicines.
 * Visual layer only. Same data, same props, same events as callers pass.
 * All colors resolve from src/theme/tokens.css (--pharvo-*). */

/* ---------- 1. EntCard ---------- */
export function EntCard({ variant = "default", hover = false, className = "", children, style }) {
  const variants = { default: "", inset: "ent-card-inset", elevated: "ent-card-elevated", ai: "ent-card-ai" };
  return (
    <div className={`ent-card ${variants[variant] || ""}${hover ? " ent-card-hover" : ""}${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}

/* ---------- 2. EntStatCard ---------- */
const TONE_BG = {
  accent: "var(--pharvo-accent-soft)", accent2: "var(--pharvo-accent-2-soft)", ai: "var(--pharvo-accent-3-soft)",
  success: "var(--pharvo-success-soft)", warning: "var(--pharvo-warning-soft)",
  danger: "var(--pharvo-danger-soft)", info: "var(--pharvo-info-soft)", neutral: "var(--pharvo-surface-3)",
};
const TONE_FG = {
  accent: "var(--pharvo-accent)", accent2: "var(--pharvo-accent-2)", ai: "var(--pharvo-accent-3)",
  success: "var(--pharvo-success)", warning: "var(--pharvo-warning)",
  danger: "var(--pharvo-danger)", info: "var(--pharvo-info)", neutral: "var(--pharvo-ink-muted)",
};

export function EntStatCard({ label, value, caption, icon: Icon, tone = "accent", trend, sparkPoints, hover = true, style }) {
  const spark = Array.isArray(sparkPoints) && sparkPoints.length > 1 ? sparkPoints : null;
  let sparkPath = "";
  if (spark) {
    const w = 120, h = 28, max = Math.max(...spark), min = Math.min(...spark), span = max - min || 1;
    sparkPath = spark.map((v, i) => `${i === 0 ? "M" : "L"}${(i / (spark.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`).join(" ");
  }
  return (
    <EntCard hover={hover} style={style}>
      <div className="ent-stat">
        <div className="ent-stat-top">
          <span className="ent-stat-label">{label}</span>
          {Icon && (
            <span className="ent-stat-icon" style={{ background: TONE_BG[tone] || TONE_BG.accent, color: TONE_FG[tone] || TONE_FG.accent }}>
              <Icon size={16} strokeWidth={1.75} />
            </span>
          )}
        </div>
        <span className="ent-stat-value">{value}</span>
        {sparkPath && (
          <svg className="ent-spark" width="120" height="28" viewBox="0 0 120 28" fill="none" aria-hidden="true">
            <path d={sparkPath} stroke="var(--pharvo-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
          </svg>
        )}
        {(trend || caption) && (
          <span className="ent-stat-foot">
            {trend && (
              <span className={`ent-trend ${trend.dir === "down" ? "ent-trend-down" : "ent-trend-up"}`}>
                {trend.dir === "down" ? "▼" : "▲"} {trend.text}
              </span>
            )}
            {caption && <span className="ent-stat-caption">{caption}</span>}
          </span>
        )}
      </div>
    </EntCard>
  );
}

/* ---------- 3. EntButton ---------- */
const BTN_VARIANTS = { primary: "ent-btn-primary", secondary: "ent-btn-secondary", ghost: "ent-btn-ghost", danger: "ent-btn-danger", ai: "ent-btn-ai" };
const BTN_SIZES = { xs: "ent-btn-xs", sm: "ent-btn-sm", md: "ent-btn-md", lg: "ent-btn-lg" };

export function EntButton({ variant = "secondary", size = "md", block = false, icon = null, className = "", children, ...props }) {
  return (
    <button
      type="button"
      className={`ent-btn ${BTN_VARIANTS[variant] || BTN_VARIANTS.secondary} ${BTN_SIZES[size] || BTN_SIZES.md}${block ? " ent-btn-block" : ""}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {variant === "ai" && !icon && <Sparkles size={14} strokeWidth={1.75} />}
      {icon}
      {children}
    </button>
  );
}

/* ---------- 4. EntInput ---------- */
export function EntInput({ leadIcon = null, trail = null, className = "", style, ...props }) {
  if (!leadIcon && !trail) {
    return <input className={`ent-input${className ? ` ${className}` : ""}`} style={style} {...props} />;
  }
  return (
    <span className={`ent-input-wrap${className ? ` ${className}` : ""}`} style={style}>
      {leadIcon && <span className="ent-input-lead">{leadIcon}</span>}
      <input className="ent-input" style={{ border: "none", boxShadow: "none", background: "transparent", minHeight: 0, padding: 0 }} {...props} />
      {trail && <span className="ent-input-trail">{trail}</span>}
    </span>
  );
}

/* ---------- 5. EntSelect ---------- */
export function EntSelect({ className = "", children, ...props }) {
  return (
    <select className={`ent-select${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </select>
  );
}

/* ---------- 6. EntPill ---------- */
const PILL_TONES = {
  neutral: "ent-pill-neutral", accent: "ent-pill-accent", "accent-2": "ent-pill-accent-2", ai: "ent-pill-ai",
  success: "ent-pill-success", warning: "ent-pill-warning", danger: "ent-pill-danger", info: "ent-pill-info",
};

export function EntPill({ tone = "neutral", className = "", children, style }) {
  return (
    <span className={`ent-pill ${PILL_TONES[tone] || PILL_TONES.neutral}${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </span>
  );
}

/* ---------- 7. EntBadge ---------- */
export function EntBadge({ tone = "neutral", className = "", children, style }) {
  return (
    <span className={`ent-badge ${PILL_TONES[tone] || PILL_TONES.neutral}${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </span>
  );
}

/* ---------- 8. EntTable ---------- */
export function EntTable({ columns = [], children, sticky = true, className = "", style }) {
  return (
    <table className={`ent-table${className ? ` ${className}` : ""}`} style={style}>
      {columns.length > 0 && (
        <thead className={`ent-thead${sticky ? " ent-thead-sticky" : ""}`}>
          <tr>
            {columns.map((c) => (
              <th key={c.key || c.label} style={{ textAlign: c.numeric ? "right" : "left", ...(c.thStyle || {}) }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
      )}
      {children}
    </table>
  );
}

export function EntTbody({ className = "", children }) {
  return <tbody className={`ent-tbody${className ? ` ${className}` : ""}`}>{children}</tbody>;
}

export function EntRowAction({ children }) {
  return <span className="ent-row-lead">{children}</span>;
}

/* ---------- 9. EntTabs ---------- */
export function EntTabs({ options = [], value, onChange, ariaLabel = "Tabs", className = "", style }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={`ent-tabs${className ? ` ${className}` : ""}`} style={style}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.title}
          className="ent-tab"
        >
          {opt.label}
          {opt.count !== undefined && <span className="ent-tab-count">{opt.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- 10. EntModal ---------- */
export function EntModal({ title, onClose, children, footer, maxWidth = 520, closeLabel = "Close" }) {
  return (
    <div className="ent-modal-backdrop" onClick={onClose}>
      <div
        className="ent-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ent-modal-head">
          <span className="ent-modal-title">{title}</span>
          <button type="button" onClick={onClose} aria-label={closeLabel} className="ent-modal-close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="ent-modal-body">{children}</div>
        {footer && <div className="ent-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- 11. EntDrawer ---------- */
export function EntDrawer({ title, onClose, children, width = 420, closeLabel = "Close" }) {
  return (
    <div className="ent-drawer-backdrop">
      <div className="absolute inset-0" onClick={onClose} />
      <aside className="ent-drawer-panel" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} style={{ maxWidth: width }}>
        {(title || onClose) && (
          <div className="ent-modal-head">
            <span className="ent-modal-title">{title}</span>
            <button type="button" onClick={onClose} aria-label={closeLabel} className="ent-drawer-close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        <div className="ent-modal-body" style={{ flex: 1 }}>{children}</div>
      </aside>
    </div>
  );
}

/* ---------- 12. EntEmptyState ---------- */
export function EntEmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="ent-empty">
      {Icon && (
        <span className="ent-empty-icon">
          <Icon size={24} strokeWidth={1.75} />
        </span>
      )}
      <p className="ent-empty-title">{title}</p>
      {description && <p className="ent-empty-desc">{description}</p>}
      {action && <div className="ent-empty-cta">{action}</div>}
    </div>
  );
}

/* ---------- 13. EntSkeleton ---------- */
export function EntSkeleton({ width = "100%", height = 14, radius = 6, className = "", style }) {
  return <div className={`ent-skeleton${className ? ` ${className}` : ""}`} style={{ width, height, borderRadius: radius, ...style }} aria-hidden="true" />;
}

/* ---------- 14. EntToast ---------- */
export function EntToastStack({ toasts = [], onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="ent-toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`ent-toast ent-toast-${t.tone || "info"}`}>
          <div className="min-w-0 flex-1">
            {t.title && <p style={{ fontSize: 13, fontWeight: 700, color: "var(--pharvo-ink)" }}>{t.title}</p>}
            {t.message && <p style={{ fontSize: 12, color: "var(--pharvo-ink-muted)", marginTop: 2, lineHeight: 1.5 }}>{t.message}</p>}
          </div>
          {onDismiss && (
            <button type="button" onClick={() => onDismiss(t.id)} aria-label="Dismiss" className="ent-modal-close" style={{ width: 24, height: 24 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- 15. EntAIBadge ---------- */
export function EntAIBadge({ children = "AI", className = "", style }) {
  return (
    <span className={`ent-ai-badge${className ? ` ${className}` : ""}`} style={style}>
      <Sparkles size={11} strokeWidth={1.75} />
      {children}
    </span>
  );
}

/* ---------- 16. EntAIPanel ---------- */
export function EntAIPanel({ title = "AI Assistant", timestamp, thinking = false, className = "", children, footer, style }) {
  return (
    <div className={`ent-ai-panel${className ? ` ${className}` : ""}`} style={style}>
      <div className={`flex items-center gap-2.5 ${thinking ? "ent-ai-thinking" : ""}`} style={{ padding: "14px 16px", borderBottom: "1px solid var(--pharvo-line)" }}>
        <span className="ent-ai-icon">
          <Sparkles size={16} strokeWidth={1.75} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--pharvo-ink)" }}>{title}</span>
        {timestamp && <span style={{ fontSize: 11, color: "var(--pharvo-ink-subtle)", marginLeft: "auto" }} className="tabular-nums">{timestamp}</span>}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
      {footer && <div style={{ padding: 12, borderTop: "1px solid var(--pharvo-line)" }}>{footer}</div>}
    </div>
  );
}

/* ---------- 17. EntCommandPalette ---------- */
export function EntCommandPaletteTrigger({ onOpen, className = "", style }) {
  return (
    <button type="button" onClick={onOpen} className={`ent-cmdk-trigger${className ? ` ${className}` : ""}`} style={style} aria-label="Search or ask AI">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <span className="flex-1 text-left truncate">Search or ask AI...</span>
      <EntKbd>⌘K</EntKbd>
    </button>
  );
}

export function EntCommandPalette({ open, onClose, query, onQuery, groups = [], onSelect, placeholder = "Search or ask AI..." }) {
  if (!open) return null;
  return (
    <div className="ent-cmdk-backdrop" onClick={onClose}>
      <div className="ent-cmdk-panel" role="dialog" aria-modal="true" aria-label="Command palette" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 12, borderBottom: "1px solid var(--pharvo-line)" }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="ent-input"
            style={{ width: "100%", minHeight: 40, padding: "0 12px" }}
          />
        </div>
        <div style={{ maxHeight: 320, overflowY: "auto", paddingBottom: 8 }}>
          {groups.map((g) => (
            <div key={g.label}>
              <div className="ent-cmdk-group-label">{g.label}</div>
              {g.items.map((item) => (
                <button key={item.key} type="button" onClick={() => onSelect(item)} className="ent-shell-navitem" style={{ borderRadius: 0, padding: "8px 16px" }}>
                  {item.icon}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && <EntKbd>{item.hint}</EntKbd>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- 18. EntKbd ---------- */
export function EntKbd({ children, className = "", style }) {
  return (
    <kbd className={`ent-kbd${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </kbd>
  );
}

export { TONE_BG, TONE_FG };
