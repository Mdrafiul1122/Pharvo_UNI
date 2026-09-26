import { Check, Search, User, Users, X } from "lucide-react";
import { PosButton, PosCard, PosModalShell, PosPill } from "./PosBlocks";

function initials(name) {
  return String(name || "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CustomerBar({ customer, onOpen, onClear }) {
  if (customer.id === null) {
    return (
      <PosCard className="flex items-center justify-between" style={{ minHeight: 48, padding: "6px 8px 6px 14px", borderRadius: 10 }}>
        <div className="flex items-center gap-2 min-w-0">
          <User size={16} strokeWidth={1.75} style={{ color: "var(--pos-ink-subtle)", flexShrink: 0 }} />
          <div className="min-w-0">
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--pos-ink)", lineHeight: 1.3 }}>Walk-in Customer</div>
            <div style={{ fontSize: 11, color: "var(--pos-ink-subtle)", lineHeight: 1.3 }}>No membership · no automatic discount</div>
          </div>
        </div>
        <PosButton size="sm" onClick={onOpen} className="flex-shrink-0">
          Select Customer
        </PosButton>
      </PosCard>
    );
  }
  return (
    <PosCard className="flex items-center justify-between gap-2" style={{ minHeight: 48, padding: "6px 8px 6px 12px", borderRadius: 10 }}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 28, height: 28, borderRadius: 999, background: "var(--pos-grad)", color: "#fff", fontWeight: 700, fontSize: 11 }}
        >
          {initials(customer.name)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "var(--pos-ink)" }}>{customer.name}</span>
            {customer.is_member && (
              <PosPill tone="accent">{customer.membership_tier || "Member"}</PosPill>
            )}
          </div>
          <span className="block" style={{ fontSize: 11, color: "var(--pos-ink-muted)", marginTop: 1 }}>{customer.phone}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <PosButton variant="ghost" size="sm" onClick={onOpen}>
          Change
        </PosButton>
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove customer"
          title="Remove customer"
          className="pos-modal-close"
          style={{ width: 28, height: 28, border: "1px solid var(--pos-line)" }}
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>
    </PosCard>
  );
}

export function CustomerModal({
  open,
  customer,
  customers,
  customerSearch,
  onSearch,
  onSelect,
  onClose,
  onClear,
}) {
  if (!open) return null;
  return (
    <PosModalShell
      title="Select Customer"
      onClose={onClose}
      maxWidth={520}
      closeLabel="Close customer picker"
      footer={
        customer.id !== null ? (
          <button
            type="button"
            onClick={onClear}
            className="pos-btn pos-btn-sm"
            style={{ background: "transparent", borderColor: "transparent", color: "var(--pos-danger)", marginRight: "auto" }}
          >
            Remove customer (use Walk-in)
          </button>
        ) : null
      }
    >
      <div className="relative" style={{ marginBottom: 12 }}>
        <Search
          size={16}
          strokeWidth={1.75}
          className="absolute pointer-events-none"
          style={{ left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--pos-ink-subtle)" }}
        />
        <input
          autoFocus
          value={customerSearch}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="pos-input w-full"
          style={{ height: 44, paddingLeft: 36, paddingRight: 12, fontSize: 13 }}
        />
      </div>
      <div className="pos-section-box scrollbar-thin" style={{ maxHeight: 320, overflowY: "auto" }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelect(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onSelect(null);
          }}
          className="pos-row flex items-center justify-between"
          style={{ padding: "0 16px", height: 60, cursor: "pointer", background: customer.id === null ? "var(--pos-accent-soft)" : undefined }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="pos-icon-square pos-icon-neutral" style={{ width: 36, height: 36, borderRadius: 999 }}>
              <Users size={18} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--pos-ink)" }}>Walk-in Customer</div>
              <span className="block" style={{ fontSize: 12, color: "var(--pos-ink-muted)", marginTop: 1 }}>No membership · no automatic discount</span>
            </div>
          </div>
          {customer.id === null && <Check size={18} strokeWidth={1.75} style={{ color: "var(--pos-accent)", marginLeft: 4 }} />}
        </div>
        {customers.map((c) => {
          const isSelected = customer.id === c.id;
          return (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(c)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(c);
              }}
              className="pos-row flex items-center justify-between"
              style={{ padding: "0 16px", height: 60, cursor: "pointer", borderTop: "1px solid var(--pos-line)", background: isSelected ? "var(--pos-accent-soft)" : undefined }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{ width: 36, height: 36, borderRadius: 999, background: "var(--pos-grad)", color: "#fff", fontWeight: 700, fontSize: 12 }}
                >
                  {initials(c.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "var(--pos-ink)" }}>{c.name}</div>
                  <span className="block" style={{ fontSize: 12, color: "var(--pos-ink-muted)", marginTop: 1 }}>{c.phone}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.is_member && (
                  <PosPill tone="accent">{c.membership_tier || "Member"}</PosPill>
                )}
                {isSelected && <Check size={18} strokeWidth={1.75} style={{ color: "var(--pos-accent)", marginLeft: 4 }} />}
              </div>
            </div>
          );
        })}
        {customers.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--pos-ink-muted)" }}>No customers found.</div>
        )}
      </div>
    </PosModalShell>
  );
}
