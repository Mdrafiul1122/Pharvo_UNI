/* Pure selling-unit helpers shared by the POS catalog and cart.
 * Extracted verbatim from Sales.jsx — pricing/stock math unchanged:
 * PC uses unit_price; Strip/Box require configured pack prices and
 * pcs_per_* counts, otherwise the unit cannot be sold. */

export const UNIT_META = {
  pc: { label: "PC", plural: "PCs", short: "pc", full: "Piece" },
  strip: { label: "Strip", plural: "Strips", short: "str", full: "Strip" },
  box: { label: "Box", plural: "Boxes", short: "box", full: "Box" },
};

export const SELL_UNITS = ["pc", "strip", "box"];

export function unitPriceOf(med, unit) {
  if (unit === "pc") return Number(med.unit_price);
  if (unit === "strip") return med.strip_price == null ? null : Number(med.strip_price);
  if (unit === "box") return med.box_price == null ? null : Number(med.box_price);
  return null;
}

export function unitsPerUnitOf(med, unit) {
  if (unit === "strip") return Number(med.pcs_per_strip) || null;
  if (unit === "box") return Number(med.pcs_per_box) || null;
  return 1;
}

export function stockInUnit(med, unit) {
  const stock = Number(med.stock_quantity) || 0;
  const per = unitsPerUnitOf(med, unit);
  return per ? Math.floor(stock / per) : 0;
}

export function canSellUnit(med, unit) {
  return (
    stockInUnit(med, unit) > 0 &&
    unitPriceOf(med, unit) != null &&
    unitsPerUnitOf(med, unit) != null
  );
}

/** Stock severity from the existing reorder threshold (no invented rules). */
export function rowStockSeverity(med) {
  const stock = Number(med.stock_quantity) || 0;
  const reorder = Number(med.reorder_level) || 0;
  if (stock <= 0) return "out";
  if (reorder > 0 && stock <= reorder) return "low";
  return "ok";
}
