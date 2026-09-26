import { Plus, Search, UserPlus, X } from "lucide-react";
import { initials, tierKey, tierLabel, tierFilterOptions, formatMoney } from "./customerUtils";
import { EntBadge, EntButton, EntEmptyState, EntInput, EntSkeleton } from "../../components/ui/EnterpriseKit";

const KNOWN_TONE_TIERS = new Set(["gold", "silver", "bronze", "platinum", "regular"]);

function tierAttr(customer) {
  const raw = String(customer?.membership_tier ?? "").trim();
  if (!raw) return "unassigned";
  const key = tierKey(customer);
  return KNOWN_TONE_TIERS.has(key) ? key : "other";
}

function DirectoryRow({ customer, selected, summary, onSelect }) {
  const active = selected?.id === customer.id;
  const tier = tierAttr(customer);
  return (
    <button
      type="button"
      onClick={() => onSelect(customer)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(customer);
        }
      }}
      aria-current={active ? "true" : undefined}
      className="cust-row"
    >
      <span
        data-tier={tier}
        className="cust-tier-avatar w-10 h-10 rounded-full font-bold text-[14px] flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        {initials(customer.name)}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold truncate" style={{ color: "var(--ct-ink)" }}>{customer.name}</span>
        <span className="block text-xs font-normal truncate mt-0.5 tabular-nums" style={{ color: "var(--ct-ink-muted)" }}>{customer.phone}</span>
      </span>
      <span className="flex flex-col items-end gap-1 shrink-0">
        <span data-tier={tier}>
          <EntBadge tone="neutral" className="cust-tier-badge capitalize" style={{ fontSize: 10 }}>
            {tierLabel(customer)}
          </EntBadge>
        </span>
        {summary && (
          <span className="text-[13px] font-bold tabular-nums" style={{ color: "var(--ct-ink)" }}>
            {formatMoney(summary.totalSpending)}
          </span>
        )}
      </span>
    </button>
  );
}

export default function CustomerDirectory({
  customers,
  selected,
  summary,
  loading,
  search,
  onSearch,
  tierFilter,
  onTierFilter,
  onAdd,
  onSelect,
}) {
  const options = tierFilterOptions(customers);
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0" style={{ padding: 16, borderBottom: "1px solid var(--ct-line)" }}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <h2 className="text-[15px] font-bold tracking-tight" style={{ color: "var(--ct-ink)" }}>Customers</h2>
            <EntBadge tone="neutral" style={{ fontSize: 11 }}>
              {customers.length} record{customers.length === 1 ? "" : "s"}
            </EntBadge>
          </div>
          <EntButton variant="primary" size="sm" onClick={onAdd} aria-label="Add customer" icon={<Plus size={14} strokeWidth={1.75} />} className="shrink-0">
            <span className="hidden sm:inline">Customer</span>
          </EntButton>
        </div>
        <div className="relative mt-3">
          <Search size={16} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--ct-ink-subtle)" }} />
          <EntInput
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search customers by name, phone or email..."
            aria-label="Search customers by name, phone or email"
            className="w-full text-[13px]"
            style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, minHeight: 36 }}
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md cursor-pointer"
              style={{ color: "var(--ct-ink-subtle)" }}
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto shrink-0" style={{ padding: "8px 12px" }} role="group" aria-label="Filter by tier">
        {options.map((o) => {
          const active = tierFilter === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onTierFilter(o.key)}
              aria-pressed={active}
              className="cust-tier-pill"
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0" role="group" aria-label="Customers">
        {loading ? (
          <div className="flex flex-col" style={{ padding: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3" style={{ minHeight: 64, padding: "12px 0" }}>
                <EntSkeleton width={40} height={40} radius={999} className="shrink-0" />
                <div className="flex-1">
                  <EntSkeleton width="65%" height={13} />
                  <div style={{ marginTop: 6 }}><EntSkeleton width="45%" height={11} /></div>
                </div>
                <EntSkeleton width={64} height={18} radius={6} className="shrink-0" />
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <EntEmptyState
            icon={UserPlus}
            title="No customers found"
            description="Try adjusting your search or tier filter."
          />
        ) : (
          customers.map((c) => (
            <DirectoryRow
              key={c.id}
              customer={c}
              selected={selected}
              summary={selected?.id === c.id ? summary : null}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
