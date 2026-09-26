import { useState } from "react";
import { Plus } from "lucide-react";
import { formatBreakdownShort, formatEquivalents } from "../../utils/units";
import { SELL_UNITS, UNIT_META, canSellUnit, rowStockSeverity, stockInUnit, unitPriceOf } from "../units";
import { PosButton, PosPill, PosStockDot, PosUnitToggle } from "./PosBlocks";

function defaultUnit(med) {
  if (canSellUnit(med, "pc")) return "pc";
  return SELL_UNITS.find((u) => canSellUnit(med, u)) || "pc";
}

function unitOptions(med) {
  return SELL_UNITS.map((u) => {
    const enabled = canSellUnit(med, u);
    return {
      value: u,
      label: UNIT_META[u].label,
      disabled: !enabled,
      title: enabled
        ? `${UNIT_META[u].full} · ৳${Number(unitPriceOf(med, u)).toLocaleString()}`
        : `${UNIT_META[u].full} not available`,
    };
  });
}

function MedicineTitle({ med }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span style={{ fontWeight: 600, fontSize: 14, color: "var(--pos-ink)", lineHeight: 1.35 }}>{med.name}</span>
        {med.is_sensitive && (
          <PosPill tone="danger" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Restricted
          </PosPill>
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--pos-ink-muted)", marginTop: 2, lineHeight: 1.2 }}>
        {med.brand || "—"}
      </div>
    </div>
  );
}

function PriceCell({ med, unit }) {
  const price = unitPriceOf(med, unit);
  if (price == null) {
    return (
      <span className="pos-price-na" title={`${UNIT_META[unit].full} price not configured`}>
        —
      </span>
    );
  }
  return (
    <span className="tabular-nums pos-price-val">
      ৳{Number(price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
    </span>
  );
}

function StockCell({ med }) {
  const sev = rowStockSeverity(med);
  const stock = Number(med.stock_quantity) || 0;
  return (
    <div>
      <PosStockDot severity={sev} label={formatBreakdownShort(stock, med)} />
      <div style={{ fontSize: 11, color: "var(--pos-ink-subtle)", marginTop: 2 }}>{formatEquivalents(stock, med)}</div>
    </div>
  );
}

function CatalogRow({ med, onAdd }) {
  const [unit, setUnit] = useState(() => defaultUnit(med));
  const enabled = canSellUnit(med, unit);
  return (
    <tr className="pos-row" style={{ minHeight: 56 }}>
      <td style={{ padding: "10px 12px 10px 16px" }}>
        <MedicineTitle med={med} />
      </td>
      <td className="whitespace-nowrap" style={{ padding: "10px 12px", fontSize: 12, color: "var(--pos-ink-muted)" }}>
        {med.category_name || "—"}
      </td>
      <td className="whitespace-nowrap tabular-nums" style={{ padding: "10px 8px", fontSize: 13 }}>
        <PriceCell med={med} unit="pc" />
      </td>
      <td className="whitespace-nowrap tabular-nums" style={{ padding: "10px 8px", fontSize: 13 }}>
        <PriceCell med={med} unit="strip" />
      </td>
      <td className="whitespace-nowrap tabular-nums" style={{ padding: "10px 8px", fontSize: 13 }}>
        <PriceCell med={med} unit="box" />
      </td>
      <td className="whitespace-nowrap" style={{ padding: "10px 12px" }}>
        <StockCell med={med} />
      </td>
      <td className="whitespace-nowrap" style={{ padding: "10px 16px 10px 12px", textAlign: "right" }}>
        <div className="pos-unit-add">
          <PosUnitToggle value={unit} onChange={setUnit} options={unitOptions(med)} ariaLabel={`Choose unit for ${med.name}`} />
          <PosButton
            size="sm"
            onClick={() => onAdd(med, unit)}
            disabled={!enabled}
            title={enabled ? `Add 1 ${UNIT_META[unit].full} · ${stockInUnit(med, unit)} in stock` : `${UNIT_META[unit].full} not available`}
            style={{ height: 32 }}
          >
            <Plus size={16} strokeWidth={1.75} />
            Add
          </PosButton>
        </div>
      </td>
    </tr>
  );
}

function PriceChip({ label, med, unit }) {
  const price = unitPriceOf(med, unit);
  const empty = price == null;
  return (
    <div className={`pos-price-chip${empty ? " pos-price-chip-empty" : ""}`}>
      <div className="pos-price-chip-label">{label}</div>
      {empty ? (
        <div className="pos-price-chip-val pos-price-chip-na" title={`${label} price not configured`}>—</div>
      ) : (
        <div className="pos-price-chip-val tabular-nums">৳{Number(price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      )}
    </div>
  );
}

function CatalogCard({ med, onAdd }) {
  const [unit, setUnit] = useState(() => defaultUnit(med));
  const enabled = canSellUnit(med, unit);
  return (
    <div className="pos-card pos-card-pad flex flex-col" style={{ gap: 12 }}>
      <div className="flex items-start justify-between gap-2">
        <MedicineTitle med={med} />
        <span style={{ fontSize: 12, color: "var(--pos-ink-muted)" }}>{med.category_name || "—"}</span>
      </div>
      <div className="flex gap-2">
        <PriceChip label="PC" med={med} unit="pc" />
        <PriceChip label="Strip" med={med} unit="strip" />
        <PriceChip label="Box" med={med} unit="box" />
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <StockCell med={med} />
        <span className="pos-unit-add pos-unit-add-card">
          <PosUnitToggle value={unit} onChange={setUnit} options={unitOptions(med)} ariaLabel={`Choose unit for ${med.name}`} />
          <PosButton
            size="sm"
            onClick={() => onAdd(med, unit)}
            disabled={!enabled}
            title={enabled ? `Add 1 ${UNIT_META[unit].full} · ${stockInUnit(med, unit)} in stock` : `${UNIT_META[unit].full} not available`}
            style={{ height: 32 }}
          >
            <Plus size={16} strokeWidth={1.75} />
            Add
          </PosButton>
        </span>
      </div>
    </div>
  );
}

export default function CatalogTable({ medicines, loading, error, countLabel, onAdd }) {
  return (
    <div className="pos-card pos-catalog-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Desktop table */}
      <div className="pos-catalog-scroll hidden lg:block overflow-x-auto scrollbar-thin">
        <table className="pos-table" style={{ fontSize: 13 }}>
          <thead className="pos-thead pos-thead-sticky">
            <tr>
              <th style={{ paddingLeft: 16 }}>Medicine</th>
              <th>Category</th>
              <th>PC Price</th>
              <th>Strip Price</th>
              <th>Box Price</th>
              <th>Stock</th>
              <th style={{ textAlign: "right", paddingRight: 16 }}>Unit &amp; Add</th>
            </tr>
          </thead>
          <tbody className="pos-tbody-divided">
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: "80px 16px", textAlign: "center", color: "var(--pos-ink-subtle)" }}>Loading medicines...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} style={{ padding: "80px 16px", textAlign: "center", color: "var(--pos-danger)" }}>{error}</td>
              </tr>
            ) : medicines.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "80px 16px", textAlign: "center", color: "var(--pos-ink-subtle)" }}>
                  No medicines match the selected search or filters
                </td>
              </tr>
            ) : (
              medicines.map((m) => <CatalogRow key={m.id} med={m} onAdd={onAdd} />)
            )}
          </tbody>
        </table>
      </div>
      {/* Mobile / tablet cards (<1024px) */}
      <div className="pos-catalog-scroll-mobile lg:hidden flex flex-col scrollbar-thin" style={{ gap: 12, padding: 12, background: "var(--pos-bg)" }}>
        {loading ? (
          <div style={{ padding: "64px 16px", textAlign: "center", color: "var(--pos-ink-subtle)", fontSize: 13 }}>Loading medicines...</div>
        ) : error ? (
          <div style={{ padding: "64px 16px", textAlign: "center", color: "var(--pos-danger)", fontSize: 13 }}>{error}</div>
        ) : medicines.length === 0 ? (
          <div style={{ padding: "64px 16px", textAlign: "center", color: "var(--pos-ink-subtle)", fontSize: 13 }}>No medicines match the selected search or filters</div>
        ) : (
          medicines.map((m) => <CatalogCard key={m.id} med={m} onAdd={onAdd} />)
        )}
      </div>
      <div className="pos-catalog-foot">
        <span className="pos-catalog-count">
          <span className="pos-catalog-count-num">{medicines.length}</span>
          {medicines.length === 1 ? " medicine shown" : " medicines shown"}
        </span>
        <span className="pos-catalog-legend" aria-hidden="true">
          <span className="pos-catalog-legend-item"><span className="pos-dot pos-dot-ok" /> In stock</span>
          <span className="pos-catalog-legend-item"><span className="pos-dot pos-dot-low" /> Low</span>
          <span className="pos-catalog-legend-item"><span className="pos-dot pos-dot-out" /> Out</span>
          <span className="pos-catalog-legend-sep" />
          <span className="pos-catalog-legend-item"><span className="pos-price-na pos-price-na-inline">—</span> price not set</span>
        </span>
      </div>
    </div>
  );
}
