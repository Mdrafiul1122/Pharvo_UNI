import { Search } from "lucide-react";

export const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "low", label: "Low Stock" },
  { key: "out", label: "Out of Stock" },
  { key: "expired", label: "Expired" },
  { key: "near", label: "Near Expiry" },
];

export default function InventoryToolbar({
  search,
  onSearch,
  categories,
  category,
  onCategory,
  suppliers,
  supplier,
  onSupplier,
  status,
  onStatus,
  counts,
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
        <div className="relative min-w-0 flex-1 sm:flex-none">
          <Search size={16} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--med-ink-subtle)" }} />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search medicine or brand..."
            aria-label="Search medicine or brand"
            className="med-input med-search-input pl-9 pr-3 text-[13px]"
          />
        </div>
        <div className="flex gap-3">
          <select value={category} onChange={(e) => onCategory(e.target.value)} aria-label="Filter by category" className="med-select med-select-fixed px-3 text-[13px] cursor-pointer flex-1 sm:flex-none">
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={supplier} onChange={(e) => onSupplier(e.target.value)} aria-label="Filter by supplier" className="med-select med-select-fixed px-3 text-[13px] cursor-pointer flex-1 sm:flex-none">
            <option value="All">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="med-pill-group scrollbar-thin pb-0.5" role="group" aria-label="Filter by stock status">
        {STATUS_FILTERS.map((f) => {
          const active = status === f.key;
          const count = counts?.[f.key];
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onStatus(f.key)}
              aria-pressed={active}
              className="med-status-pill"
            >
              {f.label}
              {count !== undefined && (
                <span className="med-count-badge tabular-nums">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
