/**
 * Customer API service.
 *
 * Wraps the Django `customers` app endpoints:
 *   GET|POST   /api/customers/              - list / create (supports ?search=)
 *   GET|PUT|PATCH|DELETE /api/customers/<id>/ - detail / update / delete
 *
 * Permission: the backend gates these on pharmacy staff roles (admin /
 * pharmacist / staff) via `IsCrmStaff`.
 *
 * Customer objects use the CustomerSerializer shape:
 *   { id, name, phone, email, address, loyalty_points, created_at,
 *     date_of_birth, member_since, membership_tier, notes }
 */

import { request } from "./api";

function qs(params = {}) {
  const s = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined)
    )
  ).toString();
  return s ? `?${s}` : "";
}

/**
 * List customers. Supports the backend ?search= filter.
 * @param {string} [search] - optional term matched against name/phone/email
 * @returns {Promise<object[]>}
 */
export async function fetchCustomers(search) {
  const data = await request(`/customers/${qs(search ? { search } : {})}`);
  return Array.isArray(data) ? data : [];
}

/**
 * Create a customer.
 * @param {object} data - CustomerSerializer writable fields
 * @returns {Promise<object>}
 */
export async function createCustomer(data) {
  return request("/customers/", { method: "POST", body: data });
}

/**
 * Update a customer (full replace).
 * @param {number|string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function updateCustomer(id, data) {
  return request(`/customers/${id}/`, { method: "PUT", body: data });
}

/**
 * Partially update a customer.
 * @param {number|string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function patchCustomer(id, data) {
  return request(`/customers/${id}/`, { method: "PATCH", body: data });
}

/**
 * Delete a customer.
 * @param {number|string} id
 * @returns {Promise<void>}
 */
export async function deleteCustomer(id) {
  return request(`/customers/${id}/`, { method: "DELETE" });
}

/**
 * Fetch a single customer by id.
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export async function fetchCustomer(id) {
  return request(`/customers/${id}/`);
}

/**
 * Fetch the customer demographics report (aggregate totals / tier breakdown).
 * @returns {Promise<object>} { total_customers, membership_tiers, top_customers }
 */
export async function fetchCustomerSummary() {
  return request("/reports/customers/");
}
