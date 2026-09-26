import { PackageX } from "lucide-react";
import { MedStatusBadge } from "./MedBlocks";
import { formatBreakdown, formatEquivalents } from "../../utils/units";

function MedicineCell({ product }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span style={{ fontWeight: 600, fontSize: 14, color: "var(--med-ink)", lineHeight: 1.35 }}>{product.name}</span>
        {product.is_sensitive && (
          <span className="med-pill med-pill-danger" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Restricted
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--med-ink-muted)", marginTop: 2, lineHeight: 1.2 }}>
        {product.brand || "—"}
      </div>
    </div>
  );
}

function StockCell({ product, status }) {
  const stock = Number(product.stock_quantity);
  const toneClass = status === "out" ? "med-stock-out" : status === "low" ? "med-stock-low" : "";
  return (
    <div>
      <div className={`whitespace-nowrap ${toneClass}`} style={{ fontSize: 13, fontWeight: 500, color: toneClass ? undefined : "var(--med-ink)" }}>
        {formatBreakdown(stock, product)}
      </div>
      <div style={{ fontSize: 11, color: "var(--med-ink-subtle)", marginTop: 2 }}>≡ {formatEquivalents(stock, product)}</div>
    </div>
  );
}

export function ExpiryCell({ product }) {
  const iso = product.expiry_date;
  if (!iso) return <span style={{ color: "var(--med-ink-subtle)" }}>—</span>;
  const days = Math.ceil((new Date(iso) - new Date()) / 86400000);
  return (
    <span className="whitespace-nowrap">
      {iso}
      {!Number.isNaN(days) && days >= 0 && days <= 30 && (
        <span style={{ marginLeft: 6, fontSize: 11, color: "var(--med-warning)", fontWeight: 600 }}>({days}d)</span>
      )}
      {!Number.isNaN(days) && days < 0 && (
        <span style={{ marginLeft: 6, fontSize: 11, color: "var(--med-danger)", fontWeight: 600 }}>(expired)</span>
      )}
    </span>
  );
}

function rowKeyDown(e, onOpen) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onOpen();
  }
}

export function MedCatalogSkeleton() {
  return (
    <div aria-label="Loading medicines">
      <div className="hidden md:block">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4" style={{ height: 52, borderTop: i === 0 ? "none" : "1px solid var(--med-line)" }}>
            <div className="med-skeleton" style={{ height: 14, width: "22%" }} />
            <div className="med-skeleton" style={{ height: 14, width: "12%" }} />
            <div className="med-skeleton" style={{ height: 14, width: "14%" }} />
            <div className="med-skeleton" style={{ height: 14, width: "10%", marginLeft: "auto" }} />
            <div className="med-skeleton" style={{ height: 14, width: "16%" }} />
          </div>
        ))}
      </div>
      <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12, background: "var(--med-bg)" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="med-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="med-skeleton" style={{ height: 14, width: "60%" }} />
            <div className="med-skeleton" style={{ height: 14, width: "40%" }} />
            <div className="med-skeleton" style={{ height: 12, width: "80%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MedCatalogEmpty() {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ padding: "64px 16px" }}>
      <PackageX size={32} strokeWidth={1.75} style={{ color: "var(--med-ink-subtle)", marginBottom: 8 }} />
      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--med-ink)" }}>No medicines found</p>
      <p style={{ fontSize: 13, color: "var(--med-ink-muted)", marginTop: 4 }}>Try adjusting the search, category, supplier or stock status.</p>
    </div>
  );
}

export function MedCatalogFooter({ shownCount }) {
  return (
    <div className="med-catalog-foot">
      <span style={{ fontWeight: 600 }}>
        {shownCount} {shownCount === 1 ? "medicine shown" : "medicines shown"}
      </span>
      <span className="med-catalog-legend" aria-hidden="true">
        <span className="med-catalog-legend-item"><span className="med-dot med-dot-success" /> In stock</span>
        <span className="med-catalog-legend-item"><span className="med-dot med-dot-warning" /> Low</span>
        <span className="med-catalog-legend-item"><span className="med-dot med-dot-danger" /> Out</span>
        <span className="med-catalog-legend-sep" />
        <span className="med-catalog-legend-item">N/A price not set</span>
      </span>
    </div>
  );
}

export default function InventoryTable({ products, statusOf, onOpen }) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="med-table" style={{ fontSize: 13 }}>
        <thead className="med-thead med-thead-sticky">
          <tr>
            <th style={{ paddingLeft: 16 }}>Medicine</th>
            <th>Category</th>
            <th>Supplier</th>
            <th style={{ textAlign: "right" }}>Price</th>
            <th>Stock</th>
            <th style={{ textAlign: "right" }}>Reorder</th>
            <th>Expiry</th>
            <th style={{ paddingRight: 16 }}>Status</th>
          </tr>
        </thead>
        <tbody className="med-tbody-divided">
          {products.map((p) => (
            <tr
              key={p.id}
              tabIndex={0}
              onClick={() => onOpen(p)}
              onKeyDown={(e) => rowKeyDown(e, () => onOpen(p))}
              className="med-row-tr"
              style={{ height: 52 }}
            >
              <td style={{ padding: "8px 12px 8px 16px" }}>
                <MedicineCell product={p} />
              </td>
              <td className="whitespace-nowrap" style={{ padding: "8px 12px", fontSize: 12, color: "var(--med-ink-muted)" }}>{p.category_name || "—"}</td>
              <td className="whitespace-nowrap" style={{ padding: "8px 12px", fontSize: 12, color: "var(--med-ink-muted)" }}>
                {p.supplier?.name || p.supplier_name || "—"}
              </td>
              <td className="whitespace-nowrap tabular-nums" style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, fontSize: 13, color: "var(--med-ink)" }}>
                ৳{Number(p.unit_price).toLocaleString()}
              </td>
              <td style={{ padding: "8px 12px", minWidth: 150 }}>
                <StockCell product={p} status={statusOf[p.id]} />
              </td>
              <td className="whitespace-nowrap tabular-nums" style={{ padding: "8px 12px", textAlign: "right", fontSize: 13, color: "var(--med-ink-muted)" }}>
                {Number(p.reorder_level).toLocaleString()}
              </td>
              <td className="whitespace-nowrap" style={{ padding: "8px 12px", fontSize: 12, color: "var(--med-ink-muted)" }}>
                <ExpiryCell product={p} />
              </td>
              <td style={{ padding: "8px 16px 8px 12px" }}>
                <MedStatusBadge status={statusOf[p.id]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InventoryCards({ products, statusOf, onOpen }) {
  return (
    <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12, background: "var(--med-bg)" }}>
      {products.map((p) => (
        <div
          key={p.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(p)}
          onKeyDown={(e) => rowKeyDown(e, () => onOpen(p))}
          className="med-card med-card-pad"
          style={{ display: "flex", flexDirection: "column", gap: 8, cursor: "pointer" }}
        >
          <div className="flex items-start justify-between gap-2">
            <MedicineCell product={p} />
            <MedStatusBadge status={statusOf[p.id]} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <StockCell product={p} status={statusOf[p.id]} />
            <span className="tabular-nums" style={{ fontWeight: 700, fontSize: 14, color: "var(--med-ink)" }}>
              ৳{Number(p.unit_price).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2" style={{ fontSize: 11, color: "var(--med-ink-subtle)" }}>
            <span className="truncate">
              {[p.category_name, p.supplier?.name || p.supplier_name].filter(Boolean).join(" · ") || "—"}
            </span>
            <span className="whitespace-nowrap shrink-0">
              <ExpiryCell product={p} /> · Reorder {Number(p.reorder_level).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
      {products.length === 0 && (
        <div className="med-card flex flex-col items-center text-center" style={{ padding: "32px 16px", gap: 8 }}>
          <PackageX size={28} strokeWidth={1.75} style={{ color: "var(--med-ink-subtle)" }} />
          <span style={{ fontSize: 12, color: "var(--med-ink-muted)" }}>No medicines match these filters.</span>
        </div>
      )}
    </div>
  );
}
