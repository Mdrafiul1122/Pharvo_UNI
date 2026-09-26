import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { MedRow, MedSection, MedStatusBadge } from "./MedBlocks";
import { formatBreakdown, formatEquivalents } from "../../utils/units";

export default function MedicineDetailDrawer({ product, status, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!product) return;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [product, onClose]);

  if (!product) return null;

  const stock = Number(product.stock_quantity);
  const packLines = [
    ["PC", product.unit_price, null],
    ["Strip", product.strip_price, product.pcs_per_strip],
    ["Box", product.box_price, product.pcs_per_box],
  ];

  return (
    <div className="med-drawer-backdrop" role="dialog" aria-modal="true" aria-label={`${product.name} details`}>
      <style>{`@keyframes pharvo-drawer-in { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
@media (max-width: 767.98px) { @keyframes pharvo-drawer-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } } }
@media (prefers-reduced-motion: reduce) { @keyframes pharvo-drawer-in { from { opacity: 1; } to { opacity: 1; } } }`}</style>
      <div className="absolute inset-0" onClick={onClose} />
      <aside
        className="med-drawer-panel"
        style={{ animation: "pharvo-drawer-in 220ms ease-out" }}
      >
        <div className="flex items-start gap-3 shrink-0" style={{ padding: 16, borderBottom: "1px solid var(--med-line)" }}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 style={{ fontSize: 18, fontWeight: 700, color: "var(--med-ink)", letterSpacing: "-0.01em" }}>{product.name}</h4>
              {product.is_sensitive && (
                <span className="med-pill med-pill-danger" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Restricted
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: "var(--med-ink-muted)", marginTop: 2 }}>{product.brand || "—"}</p>
            <div style={{ marginTop: 8 }}>
              <MedStatusBadge status={status} />
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="med-drawer-close"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 scrollbar-thin" style={{ overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          <MedSection title="Stock">
            <div className="med-stock-box">
              <p className="tabular-nums" style={{ fontSize: 24, fontWeight: 800, color: "var(--med-ink)", lineHeight: 1.2 }}>{formatBreakdown(stock, product)}</p>
              <p style={{ fontSize: 12, color: "var(--med-ink-muted)", marginTop: 2 }}>≡ {formatEquivalents(stock, product)}</p>
              <p style={{ fontSize: 12, color: "var(--med-ink-subtle)", marginTop: 6 }}>
                Reorder level: <strong className="tabular-nums" style={{ color: "var(--med-ink)" }}>{Number(product.reorder_level).toLocaleString()}</strong>
                {" · "}Expiry: <strong style={{ color: "var(--med-ink)" }}>{product.expiry_date || "—"}</strong>
              </p>
            </div>
          </MedSection>

          <MedSection title="Pricing & packs">
            {packLines.map(([label, price, pcs]) => (
              <MedRow
                key={label}
                label={label + (pcs ? ` (${pcs} pcs)` : "")}
                value={price != null ? `৳${Number(price).toLocaleString()}` : "N/A"}
                mono
              />
            ))}
            <MedRow label="Cost price" value={`৳${Number(product.cost_price).toLocaleString()}`} mono />
          </MedSection>

          <MedSection title="Classification">
            <MedRow label="Category" value={product.category?.name || product.category_name || "—"} />
            <MedRow label="Supplier" value={product.supplier?.name || product.supplier_name || "—"} />
            <MedRow label="Group" value={product.group?.name || "—"} />
            {product.generic_name ? <MedRow label="Generic" value={product.generic_name} /> : null}
            {product.company_name ? <MedRow label="Company" value={product.company_name} /> : null}
            {product.dosage_form ? <MedRow label="Dosage form" value={product.dosage_form} /> : null}
          </MedSection>

          {product.description ? (
            <MedSection title="Description">
              <p style={{ fontSize: 13, color: "var(--med-ink-muted)", lineHeight: 1.5 }}>{product.description}</p>
            </MedSection>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
