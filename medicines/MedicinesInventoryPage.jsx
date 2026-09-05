import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search, Package, Pill, AlertTriangle, PackageX, Clock } from "lucide-react";
import { fetchProducts, fetchCategories } from "../services/medicine";
import { ApiError } from "../services/api";
import { formatBreakdown, formatEquivalents } from "../utils/units";
import { Card, CardHeader, StatCard, StatusBadge, LoadingState, EmptyState } from "../components/ui/Blocks";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "low", label: "Low Stock" },
  { key: "out", label: "Out of Stock" },
  { key: "expired", label: "Expired" },
  { key: "near", label: "Near Expiry" },
];

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / (1000 * 60 * 60 * 24));
}

function inventoryStatus(p) {
  const stock = Number(p.stock_quantity);
  const today = new Date().toISOString().slice(0, 10);
  if (stock <= 0) return "out";
  if (p.expiry_date && p.expiry_date < today) return "expired";
  if (stock <= Number(p.reorder_level)) return "low";
  return "ok";
}

const STATUS_BADGE = {
  out: "Out of stock",
  low: "Low",
  expired: "Expired",
  ok: "In stock",
};

export default function MedicinesInventoryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("all");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const timer = useRef(null);
  const productsReqSeq = useRef(0);
  const categoriesRef = useRef([]);
  const initialSearchRun = useRef(true);

  const loadProducts = useCallback(async (q = "", cat = "All") => {
    const seq = ++productsReqSeq.current;
    setLoading(true);
    setError("");
    try {
      const params = { search: q || undefined, is_active: "" };
      if (cat !== "All") {
        const match = categoriesRef.current.find((c) => c.name === cat);
        if (match) params.category = match.id;
      }
      const data = await fetchProducts(params);
      if (seq !== productsReqSeq.current) return;
      setProducts(data || []);
    } catch (err) {
      if (seq !== productsReqSeq.current) return;
      setError(err instanceof ApiError ? err.message : "Unable to load medicines.");
      setProducts([]);
    } finally {
      if (seq === productsReqSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data || []))
      .catch(() => setCategories([]));
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (initialSearchRun.current) {
      initialSearchRun.current = false;
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => loadProducts(search, category), 350);
    return () => clearTimeout(timer.current);
  }, [search, category, loadProducts]);

  const categoryOptions = useMemo(
    () => ["All", ...categories.map((c) => c.name)],
    [categories]
  );

  const statusOf = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[p.id] = inventoryStatus(p);
    });
    return map;
  }, [products]);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (status === "all") return true;
        return statusOf[p.id] === status;
      }),
    [products, status, statusOf]
  );

  const counts = useMemo(() => {
    const active = products.filter((p) => p.is_active).length;
    const low = products.filter((p) => statusOf[p.id] === "low").length;
    const out = products.filter((p) => statusOf[p.id] === "out").length;
    const expired = products.filter((p) => statusOf[p.id] === "expired").length;
    const near = products.filter((p) => {
      const d = daysUntil(p.expiry_date);
      return d != null && d >= 0 && d <= 30;
    }).length;
    return { total: products.length, active, low, out, expired, near };
  }, [products, statusOf]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Medicines" value={counts.total.toLocaleString()} sub="In catalogue" icon={Pill} tone="blue" />
        <StatCard label="Active" value={counts.active.toLocaleString()} sub="Currently sellable" icon={Package} tone="green" />
        <StatCard label="Low Stock" value={counts.low.toLocaleString()} sub="Below reorder level" icon={AlertTriangle} tone="amber" />
        <StatCard label="Out of Stock" value={counts.out.toLocaleString()} sub="Zero quantity" icon={PackageX} tone="red" />
        <StatCard label="Expired / Near" value={(counts.expired + counts.near).toLocaleString()} sub={`${counts.expired} expired · ${counts.near} near`} icon={Clock} tone="violet" />
      </div>

      <Card>
        <CardHeader
          title="Medicine Catalogue"
          subtitle="Search, filter and review stock, pricing and expiry"
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, brand or barcode..."
                  className="w-48 sm:w-64 pl-9 pr-3 py-2 text-xs font-normal rounded-lg border border-slate-200 outline-none focus:border-blue-400 bg-white"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          }
        />

        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatus(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                status === f.key
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-200 text-xs text-red-700 font-medium">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <LoadingState label="Loading medicines..." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={PackageX} title="No medicines found" subtitle="Try adjusting the search, category or stock status." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-2.5">Medicine</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5 text-right">Price</th>
                  <th className="px-3 py-2.5">Stock Level</th>
                  <th className="px-3 py-2.5 text-right">Reorder Level</th>
                  <th className="px-3 py-2.5">Expiry</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {filtered.map((p) => {
                  const stock = Number(p.stock_quantity);
                  const reorder = Number(p.reorder_level);
                  const st = statusOf[p.id];
                  const expiryDays = daysUntil(p.expiry_date);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[13px] text-slate-900 leading-snug">{p.name}</span>
                          {p.is_sensitive && (
                            <span className="text-[11px] font-medium bg-red-100 text-red-600 px-1.5 py-0.5 rounded tracking-wide">RESTRICTED</span>
                          )}
                        </div>
                        <div className="text-[12px] text-slate-400 font-normal mt-0.5">{p.brand || p.barcode}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-500 font-normal whitespace-nowrap">{p.category_name || "—"}</td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">৳{Number(p.unit_price).toLocaleString()}</td>
                      <td className="px-3 py-3 min-w-[150px]">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold whitespace-nowrap ${st === "out" ? "text-red-600" : st === "low" ? "text-amber-600" : "text-slate-700"}`}>
                            {formatBreakdown(stock, p)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          ≡ {formatEquivalents(stock, p)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-slate-500 font-normal whitespace-nowrap">{reorder.toLocaleString()}</td>
                      <td className="px-3 py-3 text-slate-500 font-normal whitespace-nowrap">
                        {p.expiry_date || "—"}
                        {expiryDays != null && expiryDays >= 0 && expiryDays <= 30 && (
                          <span className="ml-1.5 text-[11px] text-amber-600 font-semibold">({expiryDays}d)</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={STATUS_BADGE[st]} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
