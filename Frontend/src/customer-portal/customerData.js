/* Pure data helpers for the customer portal.
 * All values derive from GET /api/auth/me/ + GET /api/sales/ responses.
 * Customer users cannot read /api/customers/ or /api/crm/* (staff-only),
 * so the pharmacy record is linked via the customer object embedded
 * on each sale. Nothing is mocked or invented. */

export function displayName(user) {
  if (!user) return "Customer";
  const joined = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return joined || user.username || "Customer";
}

export function firstName(user) {
  const name = displayName(user);
  return name.split(" ")[0] || name;
}

export function initials(name) {
  if (!name) return "C";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function formatMoney(value) {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return "৳0";
  return `৳${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatDate(value)} · ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

export function normaliseTier(raw) {
  const tier = String(raw || "").trim().toLowerCase();
  if (!tier) return "";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/* Discount rates verified against Backend/crm/services.py
 * CRM_TIER_DISCOUNT_RATES. null = backend defines no rate: no claim made. */
const TIER_DISCOUNT = { bronze: 0, silver: 5, gold: 10 };

export function tierDiscountPercent(raw) {
  const rate = TIER_DISCOUNT[String(raw || "").trim().toLowerCase()];
  return rate === undefined ? null : rate;
}

/* Link the signed-in user to their pharmacy customer record using the
 * customer object embedded on sales (email first, then name). */
export function linkCustomerRecord(user, sales) {
  const list = Array.isArray(sales) ? sales : [];
  const email = String(user?.email || "").trim().toLowerCase();
  if (email) {
    const match = list.find(
      (s) => String(s?.customer?.email || "").trim().toLowerCase() === email
    );
    if (match?.customer) return match.customer;
  }
  const name = displayName(user).toLowerCase();
  if (name && name !== "customer") {
    const match = list.find(
      (s) => String(s?.customer?.name || "").trim().toLowerCase() === name
    );
    if (match?.customer) return match.customer;
  }
  return null;
}

export function mySales(user, sales) {
  const record = linkCustomerRecord(user, sales);
  if (!record) return [];
  return (Array.isArray(sales) ? sales : []).filter((s) => s?.customer?.id === record.id);
}

export function summarise(sales) {
  const list = Array.isArray(sales) ? sales : [];
  const totalSpent = list.reduce((n, s) => n + Number(s.payable_amount ?? s.total_amount ?? 0), 0);
  const totalSaved = list.reduce((n, s) => n + Number(s.discount ?? 0), 0);
  const sorted = list
    .slice()
    .sort((a, b) => new Date(b.created_at || b.sale_date) - new Date(a.created_at || a.sale_date));
  return {
    count: list.length,
    totalSpent,
    totalSaved,
    average: list.length > 0 ? totalSpent / list.length : 0,
    latest: sorted[0] || null,
    sorted,
  };
}
