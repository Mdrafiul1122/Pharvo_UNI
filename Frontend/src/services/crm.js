/**
 * CRM API service.
 *
 * Wraps the Django CRM + customers + sales endpoints:
 *   GET|POST /api/crm/reminders/           - list / create reminders
 *   GET|PATCH|DELETE /api/crm/reminders/<id>/
 *   GET /api/crm/customers/<id>/reminders/ - reminders for one customer
 *   GET /api/customers/                    - customer list (CRM customers)
 *   GET /api/sales/?customer=<id>          - a customer's purchase history
 *
 * Reminder objects use nested `customer` / `product` objects:
 *   { id, title, reminder_time, customer: {id,name,...}, product: {id,name,...},
 *     is_active, created_at, updated_at }
 *
 * A customer's follow-up summary is derived from their live purchase history
 * (real sales data), so no separate backend endpoint is required.
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

export async function fetchReminders(params = {}) {
  const data = await request(`/crm/reminders/${qs(params)}`);
  return Array.isArray(data) ? data : [];
}

export async function createReminder(data) {
  return request("/crm/reminders/", { method: "POST", body: data });
}

export async function fetchReminder(id) {
  return request(`/crm/reminders/${id}/`);
}

export async function updateReminder(id, data) {
  return request(`/crm/reminders/${id}/`, { method: "PATCH", body: data });
}

export async function deleteReminder(id) {
  return request(`/crm/reminders/${id}/`, { method: "DELETE" });
}

export async function fetchCustomerReminders(customerId) {
  const data = await request(`/crm/customers/${customerId}/reminders/`);
  return Array.isArray(data) ? data : [];
}

/**
 * List customers for the CRM. Uses the real customers list endpoint.
 * @returns {Promise<object[]>}
 */
export async function fetchCrmCustomers() {
  const data = await request("/customers/");
  return Array.isArray(data) ? data : [];
}

/**
 * A customer's purchase history, from the real sales list filtered by customer.
 * @param {number|string} customerId
 * @returns {Promise<object[]>} sales (SaleSerializer shape)
 */
export async function fetchCustomerPurchases(customerId) {
  const data = await request(`/sales/${qs({ customer: customerId })}`);
  return Array.isArray(data) ? data : [];
}

/**
 * Derive a customer's follow-up summary from their real purchase history.
 *
 * @param {number|string} customerId
 * @returns {Promise<object>} {
 *   total_purchases, total_spending, recent_purchases, frequently_purchased_products
 * }
 */
export async function fetchCustomerSummary(customerId) {
  const sales = await fetchCustomerPurchases(customerId);

  const totalSpending = sales.reduce(
    (sum, s) => sum + Number(s.payable_amount || s.total_amount || 0),
    0
  );

  const recentPurchases = sales
    .slice()
    .sort((a, b) => new Date(a.created_at || a.sale_date) - new Date(b.created_at || b.sale_date))
    .reverse()
    .slice(0, 10)
    .map((s) => ({
      invoice_number: s.invoice_number,
      sale_date: s.sale_date || s.created_at,
      created_at: s.created_at,
      payable_amount: s.payable_amount,
    }));

  const productCounts = new Map();
  for (const s of sales) {
    for (const item of s.items || []) {
      const name = item.product?.name || item.product_name;
      if (!name) continue;
      productCounts.set(name, (productCounts.get(name) || 0) + Number(item.quantity || 0));
    }
  }
  const frequentlyPurchased = Array.from(productCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([product_name, quantity]) => ({ product_name, quantity }));

  return {
    total_purchases: sales.length,
    total_spending: totalSpending,
    recent_purchases: recentPurchases,
    frequently_purchased_products: frequentlyPurchased,
  };
}
