import { useEffect, useRef } from "react";
import { Search } from "lucide-react";

/* POS medicine search: autofocus on mount, Escape clears.
 * Backend matches name/brand only — placeholder says exactly that. */
export default function CatalogSearch({ value, onChange, categories, selectedCategory, onCategoryChange }) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div className="relative min-w-0" style={{ width: 360, maxWidth: "100%" }}>
        <Search
          size={16}
          strokeWidth={1.75}
          className="absolute pointer-events-none"
          style={{ left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--pos-ink-subtle)" }}
        />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onChange("");
          }}
          placeholder="Search medicine or brand..."
          aria-label="Search medicine or brand"
          className="pos-input w-full"
          style={{ height: 40, paddingLeft: 36, paddingRight: 12, fontSize: 13 }}
        />
      </div>
      <select
        value={selectedCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        aria-label="Filter by category"
        className="pos-select flex-shrink-0"
        style={{ width: 180, height: 40, padding: "0 12px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
      >
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
