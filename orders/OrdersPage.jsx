import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Search, ClipboardList, Receipt } from "lucide-react";
import { fetchSales } from "../services/pos";
import { ApiError } from "../services/api";
import { Card, CardHeader, StatCard, StatusBadge, LoadingState, EmptyState } from "../components/ui/Blocks";

const METHOD_FILTERS = [
  { key: "all", label: "All Methods" },
  { key: "cash", label: "Cash" },
  { key: "bkash", label: "bKash" },
  { key: "card", label: "Card" },
];

function methodDisplay(method) {
  const map = { cash: "Cash", bkash: "bKash / Digital", card: "Card", nagad: "Nagad", split: "Split" };
  return map[method] || method || "Cash";
}

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async (q = "", m = "all") => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSales({
        search: q || undefined,
        payment_method: m === "all" ? undefined : m,
      });
      setOrders(data || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadOrders(search, method), 350);
    return () => clearTimeout(t);
  }, [search, method, loadOrders]);

  const totalRevenue = useMemo(
    () => orders.reduce((sum, o) => sum + Number(o.payable_amount || 0), 0),
    [orders]
  );
  const totalItems = useMemo(
    () => orders.reduce((sum, o) => sum + (o.items?.length || 0), 0),
    [orders]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Orders" value={orders.length.toLocaleString()} sub="Recorded sales" icon={Receipt} tone="blue" />
        <StatCard label="Revenue" value={`৳${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub="Filtered orders total" icon={ClipboardList} tone="green" />
        <StatCard label="Line Items" value={totalItems.toLocaleString()} sub="Across filtered orders" icon={ClipboardList} tone="violet" />
      </div>

      <Card>
        <CardHeader
          title="Sales Orders"
          subtitle="All invoices recorded in the POS"
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Invoice no. or customer..."
                  className="w-44 sm:w-60 pl-9 pr-3 py-2 text-xs font-normal rounded-lg border border-slate-200 outline-none focus:border-blue-400 bg-white"
                />
              </div>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer"
              >
                {METHOD_FILTERS.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
          }
        />

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-200 text-xs text-red-700 font-medium">
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <LoadingState label="Loading orders..." />
        ) : orders.length === 0 ? (
          <EmptyState icon={Receipt} title="No orders found" subtitle="Complete a sale from the POS to see it here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-2.5">Invoice</th>
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5 text-center">Items</th>
                  <th className="px-3 py-2.5">Payment</th>
                  <th className="px-3 py-2.5 text-right">Discount</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-blue-600 font-semibold">{o.invoice_number}</td>
                    <td className="px-3 py-3 font-medium text-slate-800">{o.customer_name || "Walk-in"}</td>
                    <td className="px-3 py-3 text-slate-500 font-normal whitespace-nowrap">
                      {o.sale_date || (o.created_at || "").slice(0, 10)}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-500">{o.items?.length ?? 0}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={methodDisplay(o.payment_method)} />
                    </td>
                    <td className="px-3 py-3 text-right text-slate-500 font-normal whitespace-nowrap">
                      {Number(o.discount || 0) > 0 ? `-৳${Number(o.discount).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                      ৳{Number(o.payable_amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
