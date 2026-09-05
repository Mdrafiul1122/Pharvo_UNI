import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Receipt, Package, Wallet, AlertTriangle, BarChart3 } from "lucide-react";
import { fetchSalesReport, fetchProfitReport, fetchStockReport } from "../services/reports";
import { ApiError } from "../services/api";
import { Card, CardHeader, StatCard, LoadingState, EmptyState } from "../components/ui/Blocks";

const PERIODS = [
  { value: 7, label: "7 Days" },
  { value: 30, label: "30 Days" },
  { value: 90, label: "3 Months" },
];

function formatMoney(value) {
  return `৳${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function shortDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ReportsPage() {
  const [days, setDays] = useState(30);
  const [salesReport, setSalesReport] = useState(null);
  const [profitReport, setProfitReport] = useState(null);
  const [stockReport, setStockReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async (period) => {
    setLoading(true);
    setError("");
    try {
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - (period - 1));
      const params = {
        start_date: start.toISOString().slice(0, 10),
        end_date: today.toISOString().slice(0, 10),
      };
      const [sales, profit, stock] = await Promise.all([
        fetchSalesReport(params),
        fetchProfitReport(params),
        fetchStockReport(),
      ]);
      setSalesReport(sales);
      setProfitReport(profit);
      setStockReport(stock);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports(days);
  }, [days, loadReports]);

  const chartData = useMemo(
    () =>
      (salesReport?.daily_sales_summary || []).map((d) => ({
        label: shortDate(d.sale_date),
        revenue: Number(d.revenue || 0),
        sales: d.sales_count,
      })),
    [salesReport]
  );

  const topProducts = salesReport?.top_selling_products || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {salesReport
            ? `${salesReport.start_date} → ${salesReport.end_date}`
            : "Select a reporting period"}
        </div>
        <div className="inline-flex gap-1 p-1 bg-blue-50 border border-blue-100 rounded-lg">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setDays(p.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                days === p.value
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingState label="Loading reports..." />}

      {!loading && error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && salesReport && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Revenue" value={formatMoney(salesReport.total_revenue)} sub="Total in period" icon={Wallet} tone="blue" />
            <StatCard label="Sales" value={String(salesReport.total_sales)} sub="Invoices in period" icon={Receipt} tone="green" />
            <StatCard label="Items Sold" value={String(salesReport.items_sold)} sub="Units in period" icon={Package} tone="violet" />
            <StatCard
              label="Profit"
              value={formatMoney(profitReport?.profit)}
              sub={`${Number(profitReport?.profit_margin || 0).toFixed(1)}% margin`}
              icon={TrendingUp}
              tone="amber"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
            <Card className="xl:col-span-2">
              <CardHeader title="Daily Sales Trend" subtitle="Revenue per day in the period" />
              <div className="p-4">
                {chartData.length === 0 ? (
                  <EmptyState icon={BarChart3} title="No sales in this period" />
                ) : (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="reportRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} minTickGap={24} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94A3B8" }} width={38} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                        <Tooltip
                          contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #E2E8F0" }}
                          formatter={(value, name) => [formatMoney(value), name === "revenue" ? "Revenue" : "Sales"]}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#reportRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Stock Report" subtitle="Inventory health summary" />
              <div className="p-4 flex flex-col gap-3">
                {[
                  { label: "Active Products", value: String(stockReport?.active_products ?? 0), tone: "text-slate-900" },
                  { label: "Low Stock", value: String(stockReport?.low_stock_products ?? 0), tone: "text-amber-600" },
                  { label: "Out of Stock", value: String(stockReport?.out_of_stock_products ?? 0), tone: "text-red-600" },
                  { label: "Expired", value: String(stockReport?.expired_products ?? 0), tone: "text-red-600" },
                  { label: "Near Expiry", value: String(stockReport?.near_expiry_products ?? 0), tone: "text-violet-600" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-normal">{row.label}</span>
                    <span className={`text-sm font-bold ${row.tone}`}>{row.value}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-normal">Stock Value (retail)</span>
                    <span className="text-sm font-bold text-slate-900">{formatMoney(stockReport?.stock_value?.retail)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Top Selling Products" subtitle="By units sold in the period" />
            {topProducts.length === 0 ? (
              <EmptyState icon={Package} title="No product sales in this period" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-3 py-2.5">Product</th>
                      <th className="px-3 py-2.5">Barcode</th>
                      <th className="px-3 py-2.5 text-right">Units Sold</th>
                      <th className="px-4 py-2.5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {topProducts.map((p, i) => (
                      <tr key={p.product} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="w-6 h-6 rounded-md bg-blue-600 text-white text-[11px] font-bold inline-flex items-center justify-center">
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-800">{p.product_name}</td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{p.product_barcode}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{p.total_quantity}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{formatMoney(p.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}