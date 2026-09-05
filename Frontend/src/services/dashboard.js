/**
 * Dashboard API service.
 *
 * Wraps the current Django `dashboard` endpoint:
 *   GET /api/dashboard/
 *
 * Backend shape:
 *   { total_products, active_products, low_stock_count, out_of_stock_count,
 *     expired_count, near_expiry_count, total_customers, today_sales,
 *     today_revenue, total_revenue, recent_sales, sales_trend }
 *
 * The UI expects extra fields (top_selling_products, inventory_health,
 * weekly_sales), which the backend does not return. These are derived where
 * possible or defaulted so the dashboard renders.
 */

import { request } from "./api";

export async function fetchDashboard() {
  const data = await request("/dashboard/");

  const inventoryHealth = [
    { label: "Low stock", value: data?.low_stock_count ?? 0 },
    { label: "Out of stock", value: data?.out_of_stock_count ?? 0 },
    { label: "Expired", value: data?.expired_count ?? 0 },
    { label: "Near expiry", value: data?.near_expiry_count ?? 0 },
  ];

  const salesTrend = Array.isArray(data?.sales_trend) ? data.sales_trend : [];

  return {
    ...data,
    total_products: data?.total_products ?? 0,
    active_products: data?.active_products ?? 0,
    total_customers: data?.total_customers ?? 0,
    today_sales: data?.today_sales ?? 0,
    today_revenue: data?.today_revenue ?? 0,
    total_revenue: data?.total_revenue ?? 0,
    recent_sales: Array.isArray(data?.recent_sales) ? data.recent_sales : [],
    sales_trend: salesTrend,
    weekly_sales: [],
    top_selling_products: [],
    inventory_health: inventoryHealth,
  };
}
