/* Shared helpers + honest tier metadata for the Customers workspace.
 * Tier values come from real stored data. Only bronze/silver/gold have a
 * backend-supported auto-discount rate (0%/5%/10%); every other stored
 * value is displayed verbatim with no discount claim. */

export function norm(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

export function tierKey(customer) {
  return norm(customer?.membership_tier);
}

export function tierLabel(customer) {
  const raw = String(customer?.membership_tier ?? "").trim();
  if (!raw) return "Unassigned";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const TIER_TONE = {
  gold: "bg-yellow-50 text-yellow-800 border-yellow-200",
  silver: "bg-slate-100 text-slate-600 border-slate-200",
  bronze: "bg-amber-50 text-amber-800 border-amber-200",
  platinum: "bg-blue-50 text-blue-700 border-blue-200",
  regular: "bg-slate-50 text-slate-500 border-slate-200",
};

export function tierTone(customer) {
  return TIER_TONE[tierKey(customer)] || "bg-slate-50 text-slate-500 border-slate-200";
}

/* Discount rates verified against Backend/crm/services.py
 * CRM_TIER_DISCOUNT_RATES. Returns null when the backend defines no rate. */
const TIER_DISCOUNT = { bronze: 0, silver: 5, gold: 10 };

export function tierDiscountPercent(customer) {
  const rate = TIER_DISCOUNT[tierKey(customer)];
  return rate === undefined ? null : rate;
}

export function initials(name) {
  if (!name) return "CU";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatMoney(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "৳0";
  return `৳${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* Tier filter options: fixed known values first, then anything else the
 * data actually contains. Never invents tiers. */
const KNOWN_TIERS = ["bronze", "silver", "gold", "platinum", "regular"];

export function tierFilterOptions(customers) {
  const seen = new Set();
  (customers || []).forEach((c) => {
    const raw = String(c?.membership_tier ?? "").trim();
    if (raw && !KNOWN_TIERS.includes(norm(raw))) seen.add(raw);
  });
  const options = [{ key: "all", label: "All tiers" }];
  KNOWN_TIERS.forEach((t) => options.push({ key: t, label: t.charAt(0).toUpperCase() + t.slice(1) }));
  Array.from(seen)
    .sort((a, b) => a.localeCompare(b))
    .forEach((raw) => options.push({ key: norm(raw), label: raw }));
  options.push({ key: "unassigned", label: "Unassigned" });
  return options;
}

export function matchesTier(customer, filter) {
  if (filter === "all") return true;
  const raw = String(customer?.membership_tier ?? "").trim();
  if (filter === "unassigned") return raw === "";
  return norm(raw) === filter;
}
