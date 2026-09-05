import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  ShoppingCart,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { fetchDashboard } from "../services/dashboard";
import { fetchProducts } from "../services/medicine";
import { fetchSales } from "../services/pos";
import { ApiError } from "../services/api";
import { Card, LoadingState, EmptyState } from "../components/ui/Blocks";

const RANGE_OPTIONS = [
  { value: 7, label: "7 Days" },
  { value: 30, label: "30 Days" },
  { value: 90, label: "3 Months" },
];

function formatMoney(value) {
  const num = Number(value || 0);
  return `৳${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function shortDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

function pctChange(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export function AdminDashboard({ user, onPageChange }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (period) => {
    setLoading(true);
    setError("");
    try {
      const [dash, prods, salesList] = await Promise.all([
        fetchDashboard(period),
        fetchProducts({ is_active: "true" }),
        fetchSales(),
      ]);
      setData(dash);
      setProducts(prods || []);
      setSales(salesList || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  const costMap = useMemo(() => {
    const map = {};
    (products || []).forEach((p) => {
      map[p.id] = Number(p.cost_price) || 0;
    });
    return map;
  }, [products]);

  const saleCost = useCallback(
    (s) =>
      (s.items || []).reduce(
        (sum, it) => sum + Number(it.quantity || 0) * (costMap[it.product] || 0),
        0
      ),
    [costMap]
  );

  const todayISO = isoDay(new Date());
  const yesterdayISO = isoDay(new Date(Date.now() - 86400000));

  const todayStats = useMemo(() => {
    let todayRev = 0,
      todayCost = 0,
      yestRev = 0,
      yestCost = 0;
    (sales || []).forEach((s) => {
      const d = (s.sale_date || s.created_at || "").slice(0, 10);
      const rev = Number(s.payable_amount || 0);
      const cost = saleCost(s);
      if (d === todayISO) {
        todayRev += rev;
        todayCost += cost;
      } else if (d === yesterdayISO) {
        yestRev += rev;
        yestCost += cost;
      }
    });
    return {
      todayRev,
      todayProfit: todayRev - todayCost,
      yestRev,
      yestProfit: yestRev - yestCost,
    };
  }, [sales, saleCost, todayISO, yesterdayISO]);

  const chartSeries = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    const buckets = {};
    (sales || []).forEach((s) => {
      const d = new Date(s.sale_date || s.created_at);
      if (d < start) return;
      let key, label;
      if (days === 7) {
        key = isoDay(d);
        label = d.toLocaleDateString("en-US", { weekday: "short" });
      } else if (days === 30) {
        const diff = Math.floor((d - start) / 86400000);
        const week = Math.min(Math.floor(diff / 7), 4);
        key = `w${week}`;
        label = `W${week + 1}`;
      } else {
        key = isoDay(d).slice(0, 7);
        label = d.toLocaleDateString("en-US", { month: "short" });
      }
      buckets[key] = buckets[key] || { _k: key, day: label, Sales: 0, Profit: 0 };
      buckets[key].Sales += Number(s.payable_amount || 0);
      buckets[key].Profit += Number(s.payable_amount || 0) - saleCost(s);
    });
    return Object.values(buckets)
      .sort((a, b) => (a._k < b._k ? -1 : 1))
      .map(({ _k, ...rest }) => rest);
  }, [sales, saleCost, days]);

  const lowStockProducts = useMemo(
    () => (products || []).filter((p) => Number(p.stock_quantity) <= Number(p.reorder_level)),
    [products]
  );
  const nearExpiryProducts = useMemo(
    () =>
      (products || []).filter((p) => {
        if (!p.expiry_date) return false;
        const daysLeft = Math.ceil((new Date(p.expiry_date) - new Date()) / 86400000);
        return daysLeft >= 0 && daysLeft <= 30;
      }),
    [products]
  );
  const sensitiveProducts = useMemo(
    () => (products || []).filter((p) => p.is_sensitive),
    [products]
  );

  const topMedicines = useMemo(() => {
    const list = (data?.top_selling_products || []).map((p) => {
      const prod = (products || []).find((pr) => pr.id === p.product);
      const unitPrice = prod ? Number(prod.unit_price) : 0;
      return {
        id: p.product,
        name: p.product_name,
        units: Number(p.total_quantity || 0),
        sales: Number(p.total_quantity || 0) * unitPrice,
      };
    });
    const last = new Date();
    last.setDate(last.getDate() - 7);
    const prev = new Date();
    prev.setDate(prev.getDate() - 14);
    const unitsIn = (from, to, productId) =>
      (sales || []).reduce((sum, s) => {
        const d = new Date(s.sale_date || s.created_at);
        if (d < from || d > to) return sum;
        const item = (s.items || []).find((it) => it.product === productId);
        return sum + (item ? Number(item.quantity || 0) : 0);
      }, 0);
    return list.map((m) => {
      const cur = unitsIn(prev, last, m.id);
      const prevWeek = unitsIn(new Date(prev - 7 * 86400000), prev, m.id);
      let trend = "flat";
      if (cur > prevWeek && prevWeek > 0) trend = "up";
      else if (cur < prevWeek && prevWeek > 0) trend = "down";
      return { ...m, trend };
    });
  }, [data, sales, costMap]);

  const mostOrdered = useMemo(() => {
    const agg = {};
    (sales || []).forEach((s) => {
      const d = s.sale_date || s.created_at || "";
      (s.items || []).forEach((it) => {
        const rec = (agg[it.product] =
          agg[it.product] || { id: it.product, orders: 0, qty: 0, last: "" });
        rec.orders += 1;
        rec.qty += Number(it.quantity || 0);
        if (d > rec.last) rec.last = d;
      });
    });
    return Object.values(agg)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 4)
      .map((m) => ({
        ...m,
        name: (products || []).find((p) => p.id === m.id)?.name || "Unknown",
      }));
  }, [sales, products]);

  const profitLeaders = useMemo(() => {
    const agg = {};
    (sales || []).forEach((s) => {
      (s.items || []).forEach((it) => {
        const rec = (agg[it.product] =
          agg[it.product] || { id: it.product, revenue: 0, cost: 0 });
        rec.revenue += Number(it.subtotal || 0);
        rec.cost += Number(it.quantity || 0) * (costMap[it.product] || 0);
      });
    });
    return Object.values(agg)
      .map((m) => ({
        ...m,
        profit: m.revenue - m.cost,
        margin: m.revenue ? ((m.revenue - m.cost) / m.revenue) * 100 : 0,
        name: (products || []).find((p) => p.id === m.id)?.name || "Unknown",
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 4);
  }, [sales, costMap, products]);

  const salesPct = pctChange(todayStats.todayRev, todayStats.yestRev);
  const profitPct = pctChange(todayStats.todayProfit, todayStats.yestProfit);

  return (
    <div className="flex flex-col gap-6">
      {loading && <LoadingState label="Loading dashboard data..." />}

      {!loading && error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* ─── ROW 1: STATS CARDS ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-slate-500">Today's Sales</span>
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <ShoppingCart size={20} />
                </div>
              </div>
              <div className="mt-5">
                <span className="text-[30px] font-bold text-slate-900 tracking-tight">
                  {formatMoney(todayStats.todayRev)}
                </span>
                <div className={`flex items-center gap-1.5 mt-1.5 text-xs font-medium ${salesPct !== null && salesPct < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {salesPct !== null && salesPct < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                  <span>{salesPct === null ? "vs yesterday" : `${salesPct >= 0 ? "+" : ""}${salesPct.toFixed(1)}% vs yesterday`}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-slate-500">Today's Profit</span>
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="mt-5">
                <span className="text-[30px] font-bold text-slate-900 tracking-tight">
                  {formatMoney(todayStats.todayProfit)}
                </span>
                <div className={`flex items-center gap-1.5 mt-1.5 text-xs font-medium ${profitPct !== null && profitPct < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {profitPct !== null && profitPct < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                  <span>{profitPct === null ? "vs yesterday" : `${profitPct >= 0 ? "+" : ""}${profitPct.toFixed(1)}% vs yesterday`}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-slate-500">Low Stock</span>
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                  <Package size={20} />
                </div>
              </div>
              <div className="mt-5">
                <span className="text-[30px] font-bold text-slate-900 tracking-tight">{lowStockProducts.length}</span>
                <div className="flex items-center gap-1.5 mt-2 text-[13px] font-medium text-amber-600">
                  <AlertTriangle size={14} />
                  <span>Medicines need attention</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-slate-500">Expiring Soon</span>
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                  <Clock size={20} />
                </div>
              </div>
              <div className="mt-5">
                <span className="text-[30px] font-bold text-slate-900 tracking-tight">{nearExpiryProducts.length}</span>
                <div className="flex items-center gap-1.5 mt-2 text-[13px] font-medium text-rose-600">
                  <Clock size={14} />
                  <span>Medicines within 30 days</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── ROW 2: CHART & ALERTS ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs lg:col-span-2 flex flex-col justify-between">
              <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Sales & Profit Overview</h3>
                  <div className="flex items-center gap-4 mt-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-normal">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                      <span>Sales</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-normal">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span>Profit</span>
                    </div>
                  </div>
                </div>
                <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDays(opt.value)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                        days === opt.value
                          ? "bg-white text-slate-900 shadow-2xs font-semibold"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {chartSeries.length === 0 ? (
                <EmptyState icon={TrendingUp} title="No sales in this period yet" />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11, fill: "#64748B", fontWeight: 400 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748B", fontWeight: 400 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => (v === 0 ? "৳0" : `৳${v / 1000}k`)}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: "10px", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", fontFamily: "Inter, sans-serif" }}
                        formatter={(value, name) => [formatMoney(value), name]}
                      />
                      <Area type="monotone" dataKey="Sales" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                      <Area type="monotone" dataKey="Profit" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Important Alerts</h3>
                <p className="text-xs text-slate-400 mt-0.5">Needs your attention today</p>
              </div>

              <div className="flex flex-col gap-3 my-4 overflow-y-auto max-h-64 pr-1 scrollbar-thin">
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-amber-100 bg-amber-50/50">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Stock</span>
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Immediate</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 mt-1 leading-snug">
                      {lowStockProducts.length} medicines below minimum stock
                    </p>
                    <p className="text-[12px] text-slate-500 mt-0.5 font-normal">Immediate restock required</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-rose-100 bg-rose-50/30">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                    <Clock size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Expiry</span>
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">30 Days</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 mt-1 leading-snug">
                      {nearExpiryProducts.length} medicines expire within 30 days
                    </p>
                    <p className="text-[12px] text-slate-500 mt-0.5 font-normal">Review & discount before disposal</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-red-100 bg-red-50/30">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                    <ShieldAlert size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Security</span>
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700">Flagged</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 mt-1 leading-snug">
                      {sensitiveProducts.length} restricted medicine(s) require approval
                    </p>
                    <p className="text-[12px] text-slate-500 mt-0.5 font-normal">Needs compliance review</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onPageChange("notifications")}
                className="w-full py-2.5 bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-all cursor-pointer text-center"
              >
                Manage Smart Alerts
              </button>
            </div>
          </div>

          {/* ─── ROW 3: SUMMARY TABLES (2x2 Grid) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-semibold text-slate-900">Top Selling Medicines</h3>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600">Today</span>
              </div>
              {topMedicines.length === 0 ? (
                <EmptyState icon={Package} title="No sales recorded yet" />
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm table-fixed">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[42%] text-left">Medicine</th>
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[22%] text-right">Units Sold</th>
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[22%] text-right">Sales</th>
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[14%] text-center">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topMedicines.map((m, i) => (
                        <tr key={`${m.id}-${i}`} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 font-semibold text-slate-800 text-left truncate">{m.name}</td>
                          <td className="py-3 font-normal text-slate-600 text-right">{m.units.toLocaleString()}</td>
                          <td className="py-3 font-medium text-slate-900 text-right">{formatMoney(m.sales)}</td>
                          <td className="py-3 text-center">
                            {m.trend === "up" && <TrendingUp size={16} className="inline-block align-middle text-emerald-500" />}
                            {m.trend === "down" && <TrendingDown size={16} className="inline-block align-middle text-rose-500" />}
                            {m.trend === "flat" && <span className="text-slate-400">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-semibold text-slate-900">Running Low on Stock</h3>
                <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block animate-pulse"></span>
                  Needs restock
                </span>
              </div>
              {lowStockProducts.length === 0 ? (
                <EmptyState icon={Package} title="No low-stock items" />
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm table-fixed">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[28%] text-left">Medicine</th>
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[17%] text-right">Current</th>
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[17%] text-right">Min.</th>
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[25%] text-left pl-4">Stock Level</th>
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[13%] text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockProducts.slice(0, 4).map((p) => {
                        const stock = Number(p.stock_quantity);
                        const reorder = Number(p.reorder_level) || 1;
                        const pct = Math.max(0, Math.min(100, Math.round((stock / reorder) * 100)));
                        const critical = pct <= 40;
                        return (
                          <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 font-semibold text-slate-800 text-left truncate">{p.name}</td>
                            <td className={`py-3 font-medium text-right ${critical ? "text-rose-600" : "text-amber-600"}`}>
                              {stock.toLocaleString()}
                            </td>
                            <td className="py-3 font-normal text-slate-500 text-right">{reorder.toLocaleString()}</td>
                            <td className="py-3 pl-4">
                              <div className="flex items-center gap-2 pr-2">
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div className={`h-full ${critical ? "bg-rose-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }}></div>
                                </div>
                                <span className="text-[12px] font-normal text-slate-500 whitespace-nowrap">{pct}%</span>
                              </div>
                            </td>
                            <td className="py-3 text-right">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium rounded ${critical ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>
                                <span className={`w-1 h-1 rounded-full ${critical ? "bg-rose-600" : "bg-amber-600"}`}></span>
                                {critical ? "Critical" : "Low"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-semibold text-slate-900">Most Ordered Medicines</h3>
              </div>
              {mostOrdered.length === 0 ? (
                <EmptyState icon={Package} title="No order data yet" />
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm table-fixed">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[40%] text-left">Medicine</th>
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[15%] text-right">Orders</th>
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[25%] text-right">Quantity</th>
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[20%] text-right">Last Ordered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mostOrdered.map((m) => (
                        <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 font-semibold text-slate-800 text-left truncate">{m.name}</td>
                          <td className="py-3 font-medium text-blue-600 text-right">{m.orders}</td>
                          <td className="py-3 font-normal text-slate-600 text-right">{m.qty.toLocaleString()} units</td>
                          <td className="py-3 text-slate-400 text-right font-normal">{shortDate(m.last)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-semibold text-slate-900">Highest Profit Medicines</h3>
              </div>
              {profitLeaders.length === 0 ? (
                <EmptyState icon={Package} title="No profit data yet" />
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm table-fixed">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[32%] text-left">Medicine</th>
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[17%] text-right">Revenue</th>
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[17%] text-right">Cost</th>
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[16%] text-right">Profit</th>
                        <th className="text-xs font-medium text-slate-400 uppercase tracking-wider pb-3 w-[18%] text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitLeaders.map((m) => (
                        <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 font-semibold text-slate-800 text-left truncate">{m.name}</td>
                          <td className="py-3 font-normal text-slate-600 text-right">{formatMoney(m.revenue)}</td>
                          <td className="py-3 font-normal text-slate-500 text-right">{formatMoney(m.cost)}</td>
                          <td className="py-3 font-medium text-emerald-600 text-right">{formatMoney(m.profit)}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2 justify-end pr-1">
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden max-w-[64px]">
                                <div
                                  className={`h-full ${m.margin >= 40 ? "bg-emerald-500" : m.margin >= 25 ? "bg-blue-600" : "bg-amber-500"}`}
                                  style={{ width: `${Math.min(100, Math.round(m.margin))}%` }}
                                ></div>
                              </div>
                              <span className="text-[12px] font-medium text-slate-700 whitespace-nowrap w-[32px] text-right">
                                {Math.round(m.margin)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;