import { PosCard } from "./PosBlocks";
import { EntAIBadge } from "../../components/ui/EnterpriseKit";

/* Explicit discount breakdown. All numbers come from Sales.jsx state,
 * which mirrors the existing manual + CRM preview math exactly. */
export default function TotalsCard({
  totalItemCount,
  subtotal,
  crmDiscount,
  crmRate,
  crmBreakdown,
  crmCustomerName,
  discount,
  onDiscountChange,
  manualDiscountAmount,
  grandTotal,
}) {
  const totalDiscount = crmDiscount + manualDiscountAmount;
  return (
    <PosCard className="pos-card-pad flex flex-col">
      <div className="flex items-center justify-between" style={{ minHeight: 32, fontSize: 13 }}>
        <span style={{ color: "var(--pos-ink-muted)" }}>Subtotal ({totalItemCount} items)</span>
        <span className="tabular-nums" style={{ fontWeight: 600, color: "var(--pos-ink)" }}>৳{subtotal.toLocaleString()}</span>
      </div>
      <div style={{ borderTop: "1px solid var(--pos-line)" }}>
        <div className="flex items-center justify-between" style={{ minHeight: 32, fontSize: 13 }}>
          <span className="flex items-center gap-1.5" style={{ color: "var(--pos-ink-muted)" }} title={crmCustomerName || undefined}>
            CRM Discount{crmCustomerName ? ` · ${crmCustomerName}` : ""}
            <EntAIBadge>AI</EntAIBadge>
          </span>
          <span className="tabular-nums" style={{ fontWeight: 600, color: crmDiscount > 0 ? "var(--pos-success)" : "var(--pos-ink-muted)" }}>
            {crmDiscount > 0 ? `-৳${crmDiscount.toLocaleString()}` : "—"}
            {crmRate > 0 && (
              <span style={{ fontWeight: 400, fontSize: 11, color: "var(--pos-ink-subtle)" }}> ({Math.round(crmRate * 100)}%)</span>
            )}
          </span>
        </div>
        {crmDiscount > 0 && crmBreakdown.length > 0 && (
          <p style={{ fontSize: 11, color: "var(--pos-ink-subtle)", paddingBottom: 6 }}>
            Applies to: {crmBreakdown.filter((b) => b.is_eligible).map((b) => b.product_name).join(", ")}
          </p>
        )}
      </div>
      <div style={{ borderTop: "1px solid var(--pos-line)" }}>
        <div className="flex items-center justify-between" style={{ minHeight: 32, fontSize: 13 }}>
          <span style={{ color: "var(--pos-ink-muted)" }}>Manual rate</span>
          <span className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              value={discount}
              onChange={(e) => onDiscountChange(e.target.value)}
              placeholder="0"
              aria-label="Manual discount percent"
              className="pos-input text-right"
              style={{ width: 72, height: 32, padding: "0 8px", fontSize: 13 }}
            />
            <span style={{ color: "var(--pos-ink-muted)" }}>%</span>
          </span>
        </div>
        <div className="flex items-center justify-between" style={{ minHeight: 32, fontSize: 13 }}>
          <span style={{ color: "var(--pos-ink-muted)" }}>Manual Discount</span>
          <span className="tabular-nums" style={{ fontWeight: 600, color: manualDiscountAmount > 0 ? "var(--pos-success)" : "var(--pos-ink-muted)" }}>
            {manualDiscountAmount > 0 ? `-৳${manualDiscountAmount.toLocaleString()}` : "—"}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between" style={{ minHeight: 32, fontSize: 13, borderTop: "1px solid var(--pos-line)" }}>
        <span style={{ color: "var(--pos-ink-muted)" }}>Total Discount</span>
        <span className="tabular-nums" style={{ fontWeight: 600, color: totalDiscount > 0 ? "var(--pos-success)" : "var(--pos-ink-muted)" }}>
          {totalDiscount > 0 ? `-৳${totalDiscount.toLocaleString()}` : "—"}
        </span>
      </div>
      <div style={{ borderTop: "1px solid var(--pos-line)", paddingTop: 10 }}>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--pos-ink)" }}>Total</span>
          <span className="tabular-nums" style={{ fontSize: 24, fontWeight: 800, color: "var(--pos-accent)" }}>৳{grandTotal.toLocaleString()}</span>
        </div>
        <div className="pos-total-underline" />
      </div>
    </PosCard>
  );
}
