import { Pencil } from "lucide-react";
import { initials, tierKey, tierLabel, formatDate } from "./customerUtils";
import { EntBadge, EntButton } from "../../components/ui/EnterpriseKit";

const KNOWN_TONE_TIERS = new Set(["gold", "silver", "bronze", "platinum", "regular"]);

function tierAttr(customer) {
  const raw = String(customer?.membership_tier ?? "").trim();
  if (!raw) return "unassigned";
  const key = tierKey(customer);
  return KNOWN_TONE_TIERS.has(key) ? key : "other";
}

export default function CustomerIdentity({ customer, onEdit }) {
  const tier = tierAttr(customer);
  return (
    <div style={{ padding: 24, borderBottom: "1px solid var(--ct-line)" }}>
      <div className="grid gap-4 items-center" style={{ gridTemplateColumns: "64px minmax(0,1fr) auto" }}>
        <span
          data-tier={tier}
          className="cust-tier-avatar w-16 h-16 rounded-full font-bold text-[22px] flex items-center justify-center shrink-0"
          aria-hidden="true"
        >
          {initials(customer.name)}
        </span>
        <div className="min-w-0">
          <h3 className="text-[20px] font-bold tracking-tight truncate tabular-nums" style={{ color: "var(--ct-ink-strong)" }}>{customer.name}</h3>
          <p className="text-[13px] font-normal mt-1 truncate tabular-nums" style={{ color: "var(--ct-ink-muted)" }}>
            {[customer.phone, customer.email].filter(Boolean).join("  ·  ") || "—"}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span data-tier={tier}>
              <EntBadge tone="neutral" className="cust-tier-badge" style={{ fontSize: 10 }}>
                {tierLabel(customer)}
              </EntBadge>
            </span>
            {customer.member_since && (
              <span className="text-[11px] font-normal tabular-nums" style={{ color: "var(--ct-ink-subtle)" }}>
                Customer since {formatDate(customer.member_since)}
              </span>
            )}
          </div>
        </div>
        <EntButton variant="secondary" size="sm" onClick={onEdit} icon={<Pencil size={13} strokeWidth={1.75} />} className="shrink-0">
          Edit
        </EntButton>
      </div>
    </div>
  );
}
