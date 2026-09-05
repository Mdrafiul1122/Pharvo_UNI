/**
 * Reports API service.
 *
 * Wraps the current Django `dashboard` app report endpoints:
 *   GET /api/reports/sales/       -> {total_sales, total_discount, total_payable,
 *                                     sales_count, date_trend:[{date,count,revenue}]}
 *   GET /api/reports/purchases/   -> {total_purchases, total_discount, total_payable,
 *                                     purchase_count, date_trend}
 *   GET /api/reports/stock/       -> {total_products, total_stock, low_stock,
 *                                     out_of_stock, expired, near_expiry}
 *   GET /api/reports/customers/   -> {total_customers, membership_tiers, top_customers}
 *
 * The UI expects the beta shape (daily_sales_summary, top_selling_products,
 * active_products, ...). The current backend has no profit report and no
 * top-selling-products breakdown, so responses are mapped to the closest
 * available data and missing bits degrade gracefully.
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
 * Fetch the sales report for a date range.
 * @param {object} params - { start_date, end_date } (YYYY-MM-DD)
 * @returns {Promise<object>} normalised to the beta UI shape.
 */
export async function fetchSalesReport(params = {}) {
  const data = await request(`/reports/sales/${qs(params)}`);
  const daily = Array.isArray(data?.date_trend)
    ? data.date_trend.map((d) => ({
        sale_date: d.date,
        revenue: d.revenue,
        sales_count: d.count,
      }))
    : [];
  return {
    start_date: data?.start_date ?? params.start_date ?? "",
    end_date: data?.end_date ?? params.end_date ?? "",
    total_revenue: data?.total_sales ?? 0,
    total_sales: data?.sales_count ?? 0,
    items_sold: "",
    daily_sales_summary: daily,
    top_selling_products: [],
  };
}

/**
 * Fetch the profit report for a date range.
 *
 * The backend exposes no dedicated profit endpoint, so profit is computed from
 * the two real report endpoints: net revenue (sales report) minus the cost of
 * goods purchased in the same period (purchases report).
 * @param {object} params - { start_date, end_date } (YYYY-MM-DD)
 * @returns {Promise<{profit: number, profit_margin: number}>}
 */
export async function fetchProfitReport(params = {}) {
  const [sales, purchases] = await Promise.all([
    fetchSalesReport(params),
    fetchPurchasesReport(params),
  ]);
  const revenue = Number(sales?.total_revenue || 0);
  const cost = Number(purchases?.total_purchases || 0);
  const profit = revenue - cost;
  return {
    profit,
    profit_margin: revenue > 0 ? (profit / revenue) * 100 : 0,
  };
}

/**
 * Fetch the stock report (inventory health summary).
 * @returns {Promise<object>} normalised to the beta UI shape.
 */
export async function fetchStockReport() {
  const data = await request("/reports/stock/");
  return {
    active_products: data?.total_products ?? 0,
    low_stock_products: data?.low_stock ?? 0,
    out_of_stock_products: data?.out_of_stock ?? 0,
    expired_products: data?.expired ?? 0,
    near_expiry_products: data?.near_expiry ?? 0,
    stock_value: { retail: data?.total_stock ?? null },
  };
}

/**
 * Fetch the purchases report.
 * @param {object} params - { start_date, end_date }
 * @returns {Promise<object>}
 */
export async function fetchPurchasesReport(params = {}) {
  const data = await request(`/reports/purchases/${qs(params)}`);
  const daily = Array.isArray(data?.date_trend)
    ? data.date_trend.map((d) => ({ date: d.date, count: d.count, revenue: d.revenue }))
    : [];
  return {
    ...data,
    total_purchases: data?.total_purchases ?? 0,
    purchase_count: data?.purchase_count ?? 0,
    date_trend: daily,
  };
}

/**
 * Fetch the customers report.
 * @returns {Promise<object>} { total_customers, membership_tiers, top_customers }
 */
export async function fetchCustomersReport() {
  return request("/reports/customers/");
}
