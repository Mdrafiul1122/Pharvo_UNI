import { ChevronDown, ReceiptText } from "lucide-react";
import { EmptyState } from "./PortalStates";
import { PortalPill } from "./PortalBlocks";
import { formatDateTime, formatMoney } from "../customerData";

export function methodLabel(method) {
  if (!method) return null;
  const m = String(method).toLowerCase();
  if (m === "cash") return "Cash";
  if (m === "bkash") return "bKash";
  if (m === "card") return "Card";
  if (m === "split") return "Split";
  return String(method).charAt(0).toUpperCase() + String(method).slice(1);
}

function PurchaseCard({ sale, expanded, onToggle }) {
  const items = Array.isArray(sale.items) ? sale.items : [];
  const itemCount = items.reduce((n, it) => n + Number(it.quantity || 0), 0);
  const payments = Array.isArray(sale.payments) ? sale.payments : [];
  const paidVia = payments.length > 0
    ? payments.map((p) => `${methodLabel(p.method) || "—"} (${formatMoney(p.amount)})`).join(", ")
    : methodLabel(sale.payment_method);
  return (
    <article className="portal-card portal-card-hover overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="portal-focus w-full flex items-center gap-3.5 px-4 sm:px-5 py-4 text-left cursor-pointer rounded-[20px]"
      >
        <span className="w-10 h-10 rounded-xl bg-[var(--portal-accent-soft)] text-[var(--portal-accent)] inline-flex items-center justify-center shrink-0" aria-hidden="true">
          <ReceiptText size={18} strokeWidth={1.75} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold text-[var(--portal-ink)] truncate">
              {sale.invoice_number ? `#${sale.invoice_number}` : "Receipt"}
            </span>
            <span className="text-sm font-bold text-[var(--portal-ink)] tabular-nums shrink-0">
              {formatMoney(sale.payable_amount ?? sale.total_amount)}
            </span>
          </span>
          <span className="block text-[12px] font-normal text-[var(--portal-ink-muted)] mt-0.5 truncate">
            {formatDateTime(sale.created_at || sale.sale_date)} · {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
        </span>
        <ChevronDown
          size={17}
          strokeWidth={1.75}
          aria-hidden="true"
          className={`text-[var(--portal-ink-subtle)] shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          <ul className="rounded-[14px] bg-[var(--portal-surface-2)] border border-[var(--portal-line)] divide-y divide-[var(--portal-line)]">
            {items.map((it) => (
              <li key={it.id ?? `${it.product?.id}-${it.unit}`} className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-[var(--portal-ink)] truncate">
                    {it.product?.name || "Medicine"}
                    {it.product?.brand ? <span className="text-[var(--portal-ink-subtle)] font-normal"> · {it.product.brand}</span> : null}
                  </span>
                  <span className="block text-[11px] font-normal text-[var(--portal-ink-subtle)] mt-0.5">
                    {it.quantity} × {formatMoney(it.unit_price)}
                    {it.unit && it.unit !== "pc" ? ` (${it.unit})` : ""}
                  </span>
                </span>
                <span className="text-[13px] font-semibold text-[var(--portal-ink)] tabular-nums shrink-0">
                  {formatMoney(it.subtotal)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2 mt-3 px-0.5">
            {paidVia && <PortalPill tone="neutral">{paidVia}</PortalPill>}
            {Number(sale.discount) > 0 && (
              <span className="text-[12px] font-semibold text-[var(--portal-success)]">
                You saved {formatMoney(sale.discount)}
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export default function PurchaseList({ sales, loading, expandedId, onToggle, layout = "list" }) {
  const list = Array.isArray(sales) ? sales : [];
  if (!loading && list.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No purchases yet"
        subtitle="Medicines you buy at the pharmacy counter will appear here automatically — nothing to do."
        actionLabel="Start shopping"
      />
    );
  }
  if (layout === "grid") {
    return (
      <div className="flex gap-4 overflow-x-auto snap-x portal-no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0 items-start">
        {list.map((sale) => (
          <div key={sale.id ?? sale.invoice_number} className="min-w-[270px] snap-start sm:min-w-[300px] lg:min-w-0">
            <PurchaseCard
              sale={sale}
              expanded={expandedId === (sale.id ?? sale.invoice_number)}
              onToggle={() => onToggle(sale.id ?? sale.invoice_number)}
            />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {list.map((sale) => (
        <PurchaseCard
          key={sale.id ?? sale.invoice_number}
          sale={sale}
          expanded={expandedId === (sale.id ?? sale.invoice_number)}
          onToggle={() => onToggle(sale.id ?? sale.invoice_number)}
        />
      ))}
    </div>
  );
}
