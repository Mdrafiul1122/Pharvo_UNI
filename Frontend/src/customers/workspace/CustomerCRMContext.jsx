import { ArrowRight, Bell, Sparkles } from "lucide-react";
import { formatDate, tierDiscountPercent, tierLabel } from "./customerUtils";
import { EntAIBadge, EntBadge, EntButton, EntSkeleton } from "../../components/ui/EnterpriseKit";
import { tierKey } from "./customerUtils";

const KNOWN_TONE_TIERS = new Set(["gold", "silver", "bronze", "platinum", "regular"]);

function tierAttr(customer) {
  const raw = String(customer?.membership_tier ?? "").trim();
  if (!raw) return "unassigned";
  const key = tierKey(customer);
  return KNOWN_TONE_TIERS.has(key) ? key : "other";
}

export default function CustomerCRMContext({ customer, reminders, loading, onOpenCRM }) {
  const discount = tierDiscountPercent(customer);
  const active = (reminders || []).filter((r) => r.is_active);
  const upcoming = active
    .slice()
    .sort((a, b) => new Date(a.reminder_time || 0) - new Date(b.reminder_time || 0))
    .slice(0, 3);

  return (
    <div className="ent-card cust-ai-card" style={{ padding: 16 }}>
      <div className="flex items-center justify-between gap-2" style={{ marginBottom: 12 }}>
        <span className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-white shrink-0" style={{ background: "var(--ct-grad-ai)" }} aria-hidden="true">
            <Sparkles size={14} strokeWidth={1.75} />
          </span>
          <span className="text-[14px] font-bold" style={{ color: "var(--ct-ink)" }}>Membership</span>
        </span>
        <EntAIBadge>AI</EntAIBadge>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span data-tier={tierAttr(customer)}>
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
      <p className="text-[13px] font-normal rounded-[10px]" style={{ color: "var(--ct-ink-muted)", background: "var(--ct-surface-2)", padding: 12, marginTop: 12, lineHeight: 1.5 }}>
        {discount === null
          ? "No backend auto-discount rate defined for this tier."
          : discount === 0
            ? "Basic tier · no automatic checkout discount."
            : `${discount}% automatic checkout discount on eligible medicines.`}
      </p>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--ct-line)" }}>
        {loading ? (
          <EntSkeleton width={160} height={14} />
        ) : active.length === 0 ? (
          <p className="text-[11px] font-normal" style={{ color: "var(--ct-ink-subtle)" }}>No active medicine reminders.</p>
        ) : (
          <ul className="flex flex-col">
            {upcoming.map((r) => (
              <li key={r.id} className="flex items-center gap-2" style={{ minHeight: 44, borderBottom: "1px solid var(--ct-line)" }}>
                <Bell size={13} strokeWidth={1.75} className="shrink-0" style={{ color: "var(--ct-ink-subtle)" }} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold truncate" style={{ color: "var(--ct-ink)" }}>{r.title || "Reminder"}</span>
                  <span className="block text-[11px] font-normal truncate tabular-nums" style={{ color: "var(--ct-ink-subtle)" }}>
                    {r.product?.name || "Medicine"} · due {formatDate(r.reminder_time)}
                  </span>
                </span>
              </li>
            ))}
            {active.length > upcoming.length && (
              <li className="text-[11px] font-normal" style={{ color: "var(--ct-ink-subtle)", paddingTop: 8 }}>
                +{active.length - upcoming.length} more active reminder{active.length - upcoming.length === 1 ? "" : "s"}
              </li>
            )}
          </ul>
        )}
      </div>
      <div className="flex justify-end" style={{ marginTop: 12 }}>
        <EntButton variant="ghost" size="sm" onClick={onOpenCRM}>
          View CRM reminders <ArrowRight size={13} strokeWidth={1.75} />
        </EntButton>
      </div>
    </div>
  );
}
