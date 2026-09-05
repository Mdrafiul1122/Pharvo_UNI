/**
 * POS / sales API service.
 *
 * Wraps the current Django `sales` + `inventory` endpoints:
 *   POST /api/pos/checkout/            - create a sale
 *   GET  /api/sales/                   - list sales
 *   POST /api/interactions/check/      - drug interaction check
 *
 * The backend returns canonical SaleSerializer/ProductBriefSerializer shapes.
 * The UI consumes a flattened receipt/order shape (customer_name, product_name,
 * unit_display, method_display), so responses are normalised here.
 */

import { request } from "./api";

const UNIT_DISPLAY = { pc: "PC", strip: "Strip", box: "Box" };

function mapSale(s) {
  if (!s) return s;
  const items = Array.isArray(s.items)
    ? s.items.map((it) => ({
        ...it,
        product_name: it.product?.name ?? it.product_name ?? "",
        product_barcode: it.product?.barcode ?? "",
        unit_display: UNIT_DISPLAY[it.unit] ?? it.unit ?? "pc",
      }))
    : [];
  const payments = Array.isArray(s.payments)
    ? s.payments.map((p) => ({
        ...p,
        method_display: (p.method ?? "").toUpperCase(),
      }))
    : [];
  return {
    ...s,
    customer_name: s.customer?.name ?? "Walk-in",
    customer_id: s.customer?.id ?? s.customer ?? null,
    items,
    payments,
  };
}

/**
 * Create a sale via the POS checkout endpoint.
 *
 * @param {object} payload - { customer, items:[{product,quantity,unit,unit_price}],
 *                            discount, payments:[{method,amount}] }
 * @returns {Promise<object>} the completed sale (receipt) normalised to the
 *                            UI shape the POS page expects.
 */
export async function checkout(payload) {
  // The current backend has no sensitive-item approval gate; it completes the
  // sale immediately and returns the sale receipt.
  const result = await request("/pos/checkout/", { method: "POST", body: payload });
  return mapSale(result);
}

const INTERACTION_LEVELS = ["caution", "avoid", "high_risk", "contraindicated"];

function mapInteractionLevel(level) {
  const l = String(level || "").toLowerCase();
  return INTERACTION_LEVELS.includes(l) ? l : "caution";
}

/**
 * Check a set of cart products for known drug interactions.
 *
 * @param {Array<{product:number, quantity?:number}>} items
 * @returns {Promise<{interactions: Array<object>, count: number}>} interactions
 *          normalised to the UI shape (level, products, description, recommendation).
 */
export async function checkInteractions(items) {
  const productIds = (items || [])
    .map((i) => (typeof i === "object" ? i.product ?? i.product_id : i))
    .filter((n) => n != null);
  if (productIds.length < 2) {
    return { interactions: [], count: 0, message: "Two or more medicines are required for an interaction check." };
  }
  const data = await request("/interactions/check/", {
    method: "POST",
    body: { product_ids: productIds },
  });
  const rows = Array.isArray(data?.interactions) ? data.interactions : [];
  const interactions = [];
  for (const row of rows) {
    const matches = Array.isArray(row.interactions) ? row.interactions : [];
    for (const ix of matches) {
      const drugA = ix.drug_a ?? "";
      const drugB = ix.drug_b ?? "";
      interactions.push({
        level: mapInteractionLevel(ix.interaction_level),
        products: [
          { id: row.product_a_id, name: row.product_a_name || drugA },
          { id: row.product_b_id, name: row.product_b_name || drugB },
        ],
        drug_a: drugA,
        drug_b: drugB,
        description: ix.description || `Known interaction between ${drugA} and ${drugB}.`,
        recommendation: `Review this combination before dispensing ${drugA} and ${drugB}.`,
      });
    }
  }
  return { interactions, count: interactions.length, message: data?.message };
}

/**
 * List sales.
 * @param {object} params - optional filters (the current backend ignores most)
 * @returns {Promise<object[]>} normalised sale objects
 */
export async function fetchSales(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined)
    )
  ).toString();
  const data = await request(`/sales/${query ? `?${query}` : ""}`);
  return (Array.isArray(data) ? data : []).map(mapSale);
}

/**
 * Preview CRM automatic discount for a given customer + cart.
 *
 * @param {number|null} customerId
 * @param {Array<{product:number, quantity:number, unit_price:number}>} items
 * @returns {Promise<{crm_discount:string, breakdown:Array, eligible:boolean, rate:string}>}
 */
export async function fetchDiscountPreview(customerId, items) {
  if (customerId == null || !items.length) {
    return { crm_discount: "0.00", breakdown: [], eligible: false };
  }
  return request("/pos/discount-preview/", {
    method: "POST",
    body: { customer: customerId, items },
  });
}
