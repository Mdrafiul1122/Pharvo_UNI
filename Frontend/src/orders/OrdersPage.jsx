import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Banknote, ListChecks, Receipt, Search } from "lucide-react";
import "../pos/pos.css";
import { fetchSales } from "../services/pos";
import { ApiError } from "../services/api";

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

function paymentTone(method) {
  const m = String(method || "").toLowerCase();
  if (m === "bkash" || m === "nagad" || m === "split") return "pos-pill-accent-2";
  if (m === "card") return "pos-pill-accent";
  return "pos-pill-neutral";
}

function PosStatCard({ icon: Icon, value, label, sub }) {
  return (
    <div className="pos-card pos-card-hover pos-card-pad flex items-center gap-3" style={{ height: 96 }}>
      <span className="pos-icon-square pos-icon-accent" style={{ width: 40, height: 40 }}>
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <div className="tabular-nums" style={{ fontSize: 24, fontWeight: 800, color: "var(--pos-ink)", lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--pos-ink-muted)", marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--pos-ink-subtle)", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="flex flex-col" style={{ gap: 0 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center" style={{ gap: 12, height: 52, padding: "0 16px", borderTop: i > 0 ? "1px solid var(--pos-line)" : "none" }}>
          <div className="pos-skeleton" style={{ height: 12, width: 110 }} />
          <div className="pos-skeleton" style={{ height: 12, width: 130 }} />
          <div className="pos-skeleton" style={{ height: 12, width: 80 }} />
          <div className="pos-skeleton" style={{ height: 12, width: 40 }} />
          <div className="pos-skeleton" style={{ height: 20, width: 76, borderRadius: 999 }} />
          <div className="pos-skeleton" style={{ height: 12, width: 70, marginLeft: "auto" }} />
          <div className="pos-skeleton" style={{ height: 12, width: 80 }} />
        </div>
      ))}
    </div>
  );
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
    <div className="pos-scope flex flex-col" style={{ gap: 12 }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--pos-ink)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>Sales Orders</h2>
        <p style={{ fontSize: 13, color: "var(--pos-ink-muted)", marginTop: 2 }}>All invoices recorded in the POS</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 12 }}>
        <PosStatCard icon={Receipt} value={orders.length.toLocaleString()} label="Orders" sub="Recorded sales" />
        <PosStatCard icon={Banknote} value={`৳${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} label="Revenue" sub="Filtered orders total" />
        <PosStatCard icon={ListChecks} value={totalItems.toLocaleString()} label="Line Items" sub="Across filtered orders" />
      </div>

      <div className="pos-card pos-card-pad">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-0" style={{ width: 320, maxWidth: "100%" }}>
            <Search
              size={16}
              strokeWidth={1.75}
              className="absolute pointer-events-none"
              style={{ left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--pos-ink-subtle)" }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Invoice no. or customer..."
              aria-label="Search orders"
              className="pos-input w-full"
              style={{ height: 40, paddingLeft: 36, paddingRight: 12, fontSize: 13 }}
            />
          </div>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            aria-label="Filter by payment method"
            className="pos-select"
            style={{ width: 180, height: 40, padding: "0 12px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            {METHOD_FILTERS.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="pos-card" style={{ overflow: "hidden" }}>
        {error && (
          <div className="flex items-center justify-between gap-2" style={{ padding: "10px 16px", background: "var(--pos-danger-soft)", borderBottom: "1px solid rgba(244,63,94,.3)", fontSize: 12, fontWeight: 500, color: "var(--pos-ink)" }}>
            <span>{error}</span>
            <button type="button" onClick={() => loadOrders(search, method)} className="pos-btn pos-btn-ghost pos-btn-sm flex-shrink-0">
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <SkeletonRows />
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center" style={{ padding: "64px 16px" }}>
            <Receipt size={32} strokeWidth={1.75} style={{ color: "var(--pos-ink-subtle)", marginBottom: 8 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--pos-ink-muted)" }}>No orders found</p>
            <p style={{ fontSize: 12, color: "var(--pos-ink-subtle)", marginTop: 4 }}>Complete a sale from the POS to see it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="pos-table" style={{ fontSize: 13, minWidth: 760 }}>
              <thead className="pos-thead pos-thead-sticky">
                <tr>
                  <th style={{ paddingLeft: 16 }}>Invoice</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th style={{ textAlign: "center" }}>Items</th>
                  <th>Payment</th>
                  <th style={{ textAlign: "right" }}>Discount</th>
                  <th style={{ textAlign: "right", paddingRight: 16 }}>Total</th>
                </tr>
              </thead>
              <tbody className="pos-tbody-divided">
                {orders.map((o) => (
                  <tr key={o.id} className="pos-row" style={{ height: 52 }}>
                    <td className="tabular-nums" style={{ padding: "6px 12px 6px 16px", fontFamily: "ui-monospace, monospace", fontSize: 13, fontWeight: 600, color: "var(--pos-accent)" }}>{o.invoice_number}</td>
                    <td style={{ padding: "6px 12px", fontWeight: 500, color: "var(--pos-ink)" }}>{o.customer_name || "Walk-in"}</td>
                    <td className="whitespace-nowrap" style={{ padding: "6px 12px", color: "var(--pos-ink-muted)" }}>
                      {o.sale_date || (o.created_at || "").slice(0, 10)}
                    </td>
                    <td className="text-center tabular-nums" style={{ padding: "6px 12px", color: "var(--pos-ink-muted)" }}>{o.items?.length ?? 0}</td>
                    <td style={{ padding: "6px 12px" }}>
                      <span className={`pos-pill ${paymentTone(o.payment_method)}`} style={{ fontSize: 11 }}>
                        {methodDisplay(o.payment_method)}
                      </span>
                    </td>
                    <td className="text-right whitespace-nowrap tabular-nums" style={{ padding: "6px 12px", fontWeight: Number(o.discount || 0) > 0 ? 600 : 400, color: Number(o.discount || 0) > 0 ? "var(--pos-success)" : "var(--pos-ink-subtle)" }}>
                      {Number(o.discount || 0) > 0 ? `-৳${Number(o.discount).toLocaleString()}` : "—"}
                    </td>
                    <td className="text-right whitespace-nowrap tabular-nums" style={{ padding: "6px 16px 6px 12px", fontWeight: 700, color: "var(--pos-ink)" }}>
                      ৳{Number(o.payable_amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
