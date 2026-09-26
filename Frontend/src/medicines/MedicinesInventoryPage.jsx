import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import "./medicines.css";
import { fetchProducts, fetchCategories } from "../services/medicine";
import { ApiError } from "../services/api";
import { MedCard } from "./components/MedBlocks";
import InventoryStats from "./components/InventoryStats";
import InventoryToolbar from "./components/InventoryToolbar";
import InventoryTable, { InventoryCards, MedCatalogEmpty, MedCatalogFooter, MedCatalogSkeleton } from "./components/InventoryTable";
import MedicineDetailDrawer from "./components/MedicineDetailDrawer";

function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / (1000 * 60 * 60 * 24));
}

/* Existing business meaning, unchanged:
 * out = zero stock (red) · expired = past date (red) ·
 * low = at/below reorder (amber) · near = 0–30 days (amber) · ok (green). */
function inventoryStatus(p) {
  const stock = Number(p.stock_quantity);
  const today = new Date().toISOString().slice(0, 10);
  if (stock <= 0) return "out";
  if (p.expiry_date && p.expiry_date < today) return "expired";
  if (stock <= Number(p.reorder_level)) return "low";
  return "ok";
}

export default function MedicinesInventoryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [supplier, setSupplier] = useState("All");
  const [status, setStatus] = useState("all");
  const [categories, setCategories] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const timer = useRef(null);
  const productsReqSeq = useRef(0);
  const categoriesRef = useRef([]);
  const initialSearchRun = useRef(true);

  const loadProducts = useCallback(async (q = "", cat = "All", sup = "All") => {
    const seq = ++productsReqSeq.current;
    setLoading(true);
    setError("");
    try {
      const params = { search: q || undefined, is_active: "" };
      if (cat !== "All") {
        const match = categoriesRef.current.find((c) => c.name === cat);
        if (match) params.category = match.id;
      }
      if (sup !== "All") params.supplier = sup;
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
    // Supplier options come from loaded inventory records (no list endpoint).
    fetchProducts({ is_active: "" })
      .then((all) => {
        const seen = new Map();
        (all || []).forEach((p) => {
          const s = p.supplier;
          if (s && s.id != null && !seen.has(s.id)) seen.set(s.id, { id: s.id, name: s.name || `Supplier ${s.id}` });
        });
        setSupplierOptions(Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setSupplierOptions([]));
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (initialSearchRun.current) {
      initialSearchRun.current = false;
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => loadProducts(search, category, supplier), 350);
    return () => clearTimeout(timer.current);
  }, [search, category, supplier, loadProducts]);

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
        if (status === "near") {
          if (statusOf[p.id] === "expired") return false;
          const d = daysUntil(p.expiry_date);
          return d != null && d >= 0 && d <= 30;
        }
        return statusOf[p.id] === status;
      }),
    [products, status, statusOf]
  );

  const counts = useMemo(() => {
    const c = { total: products.length, active: 0, low: 0, out: 0, expired: 0, near: 0, all: products.length };
    products.forEach((p) => {
      if (p.is_active) c.active += 1;
      const st = statusOf[p.id];
      if (st === "low") c.low += 1;
      else if (st === "out") c.out += 1;
      else if (st === "expired") c.expired += 1;
      const d = daysUntil(p.expiry_date);
      if (d != null && d >= 0 && d <= 30 && st !== "expired") c.near += 1;
    });
    return c;
  }, [products, statusOf]);

  return (
    <div className="med-scope flex flex-col gap-4 w-full max-w-[1440px] mx-auto min-h-[calc(100vh-64px)] px-4 py-4">
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--med-ink)", letterSpacing: "-0.01em", lineHeight: 1.2 }}>Inventory</h2>
        <p style={{ fontSize: 13, color: "var(--med-ink-muted)", marginTop: 4 }}>
          Browse medicines, check stock levels, pricing and expiry.
        </p>
      </div>

      <InventoryStats counts={counts} />

      <MedCard className="med-card-pad">
        <InventoryToolbar
          search={search}
          onSearch={setSearch}
          categories={categoryOptions}
          category={category}
          onCategory={setCategory}
          suppliers={supplierOptions}
          supplier={supplier}
          onSupplier={setSupplier}
          status={status}
          onStatus={setStatus}
          counts={counts}
        />
      </MedCard>

      {error && (
        <div className="med-error-banner" role="alert">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={16} strokeWidth={1.75} className="shrink-0" />
            <span className="truncate">{error}</span>
          </span>
          <button
            type="button"
            onClick={() => loadProducts(search, category, supplier)}
            className="med-retry-btn"
          >
            Retry
          </button>
        </div>
      )}

      <MedCard className="h-full" style={{ overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 480, flex: 1 }}>
        <div style={{ padding: 16, borderBottom: "1px solid var(--med-line)" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--med-ink)" }}>Medicine Catalogue</div>
          <div style={{ fontSize: 12, color: "var(--med-ink-muted)", marginTop: 2 }}>{`${filtered.length} of ${products.length} medicines`}</div>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          {loading ? (
            <MedCatalogSkeleton />
          ) : filtered.length === 0 ? (
            <>
              <div className="hidden md:block">
                <MedCatalogEmpty />
              </div>
              <InventoryCards products={filtered} statusOf={statusOf} onOpen={setSelected} />
            </>
          ) : (
            <>
              <InventoryTable products={filtered} statusOf={statusOf} onOpen={setSelected} />
              <InventoryCards products={filtered} statusOf={statusOf} onOpen={setSelected} />
            </>
          )}
        </div>
        <MedCatalogFooter shownCount={loading ? 0 : filtered.length} />
      </MedCard>

      <MedicineDetailDrawer
        product={selected}
        status={selected ? statusOf[selected.id] : null}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
