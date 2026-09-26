import { Clock, Receipt, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { formatDate, formatMoney } from "./customerUtils";
import { EntEmptyState, EntSkeleton } from "../../components/ui/EnterpriseKit";

function relativeAgo(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const mins = Math.floor(Math.max(0, Date.now() - t) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function StatTile({ label, value, sub, icon: Icon, toneBg, toneFg }) {
  return (
    <div className="ent-card ent-card-hover" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase" style={{ color: "var(--ct-ink-subtle)", letterSpacing: "0.06em" }}>{label}</span>
        <span className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0" style={{ background: toneBg, color: toneFg }} aria-hidden="true">
          <Icon size={14} strokeWidth={1.75} />
        </span>
      </div>
      <span className="text-[24px] font-extrabold tabular-nums truncate" style={{ color: "var(--ct-ink)", lineHeight: 1.15, letterSpacing: "-0.01em" }}>
        {value}
      </span>
      {sub && <span className="text-[11px] font-normal truncate tabular-nums" style={{ color: "var(--ct-ink-subtle)" }}>{sub}</span>}
    </div>
  );
}

export default function CustomerPurchaseSummary({ summary, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="ent-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <EntSkeleton width="55%" height={11} />
            <EntSkeleton width="75%" height={24} radius={8} />
            <EntSkeleton width="60%" height={11} />
          </div>
        ))}
      </div>
    );
  }
  if (!summary) return null;
  if (summary.count === 0) {
    return (
      <div className="flex items-center gap-3 rounded-[12px] px-4 py-6" style={{ border: "1px dashed var(--ct-line-strong)", background: "var(--ct-surface)" }}>
        <ShoppingBag size={20} strokeWidth={1.75} className="shrink-0" style={{ color: "var(--ct-ink-faint)" }} />
        <div>
          <p className="text-[14px] font-semibold" style={{ color: "var(--ct-ink)" }}>No purchases yet</p>
          <p className="text-[13px] font-normal mt-0.5" style={{ color: "var(--ct-ink-muted)" }}>
            Sales recorded for this customer will appear here automatically.
          </p>
        </div>
      </div>
    );
  }
  const average = summary.count > 0 ? summary.totalSpending / summary.count : 0;
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <StatTile label="Total value" value={formatMoney(summary.totalSpending)} icon={Wallet} toneBg="var(--ct-accent-soft)" toneFg="var(--ct-accent)" />
      <StatTile label="Sales" value={String(summary.count)} icon={Receipt} toneBg="var(--ct-accent-2-soft)" toneFg="var(--ct-accent-2)" />
      <StatTile label="Average sale" value={formatMoney(average)} icon={TrendingUp} toneBg="var(--ct-accent-3-soft)" toneFg="var(--ct-accent-3)" />
      <StatTile label="Last purchase" value={relativeAgo(summary.lastDate)} sub={formatDate(summary.lastDate)} icon={Clock} toneBg="var(--ct-surface-inset)" toneFg="var(--ct-ink-muted)" />
    </div>
  );
}
