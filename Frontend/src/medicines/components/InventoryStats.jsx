import { AlertTriangle, Clock, Package, PackageX, Pill } from "lucide-react";
import { MedCard } from "./MedBlocks";

function KpiCard({ label, value, sub, icon: Icon, iconBg, iconColor, valueColor }) {
  return (
    <MedCard hover className="med-card-pad med-kpi">
      <span className="med-icon-square" style={{ background: iconBg, color: iconColor }}>
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="med-kpi-value tabular-nums" style={{ color: valueColor }}>
        {value}
      </span>
      <span className="med-kpi-label">{label}</span>
      <span className="med-kpi-sub">{sub}</span>
    </MedCard>
  );
}

export default function InventoryStats({ counts }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      <KpiCard
        label="Total Medicines"
        value={counts.total.toLocaleString()}
        sub="In catalogue"
        icon={Pill}
        iconBg="var(--med-accent-soft)"
        iconColor="var(--med-accent)"
        valueColor="var(--med-ink)"
      />
      <KpiCard
        label="Low Stock"
        value={counts.low.toLocaleString()}
        sub="Below reorder level"
        icon={AlertTriangle}
        iconBg="var(--med-amber-bg)"
        iconColor="var(--med-warning)"
        valueColor="var(--med-ink)"
      />
      <KpiCard
        label="Out of Stock"
        value={counts.out.toLocaleString()}
        sub="Zero quantity"
        icon={PackageX}
        iconBg="var(--med-rose-bg)"
        iconColor="var(--med-danger)"
        valueColor="var(--med-ink)"
      />
      <KpiCard
        label="Expired"
        value={counts.expired.toLocaleString()}
        sub="Past expiry date"
        icon={Package}
        iconBg="var(--med-rose-bg)"
        iconColor="var(--med-danger)"
        valueColor="var(--med-ink)"
      />
      <KpiCard
        label="Near Expiry"
        value={counts.near.toLocaleString()}
        sub="Within 30 days"
        icon={Clock}
        iconBg="var(--med-amber-bg)"
        iconColor="var(--med-warning)"
        valueColor="var(--med-ink)"
      />
    </div>
  );
}
