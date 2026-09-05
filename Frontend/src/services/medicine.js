/**
 * Medicine / inventory API service.
 *
 * Wraps the current Django `inventory` app endpoints:
 *   GET|POST  /api/inventory/
 *   GET|PATCH /api/inventory/<id>/
 *
 * The backend returns products with nested `category` / `supplier` / `group`
 * objects (e.g. category: {id, name}). The UI expects a flattened
 * `category_name` convenience field, so products are normalised on the way
 * out. Categories are not exposed as a dedicated endpoint in the current
 * backend, so `fetchCategories` derives the unique category list from the
 * product catalogue.
 */

import { request } from "./api";

function normalizeProduct(p) {
  if (!p) return p;
  return {
    ...p,
    category_name: p.category?.name ?? null,
    supplier_name: p.supplier?.name ?? null,
  };
}

function query(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined)
    )
  ).toString();
  return qs ? `?${qs}` : "";
}

/**
 * List products. Supports the current backend filters: search, category,
 * supplier, is_active.
 * @param {object} params - query parameters (any of the backend filters)
 * @returns {Promise<object[]>}
 */
export async function fetchProducts(params = {}) {
  const data = await request(`/inventory/${query(params)}`);
  return (Array.isArray(data) ? data : []).map(normalizeProduct);
}

/**
 * List product categories.
 *
 * The current backend has no category endpoint, so the list is derived from
 * the unique categories present in the product catalogue.
 * @returns {Promise<Array<{id: number, name: string}>>}
 */
export async function fetchCategories() {
  const products = await fetchProducts({ is_active: "" });
  const seen = new Map();
  for (const p of products) {
    if (p.category && !seen.has(p.category.id)) {
      seen.set(p.category.id, p.category);
    }
  }
  return Array.from(seen.values());
}

/**
 * Create a new product (staff only).
 * @param {object} data - ProductSerializer writable fields
 * @returns {Promise<object>}
 */
export async function createProduct(data) {
  return normalizeProduct(await request("/inventory/", { method: "POST", body: data }));
}
