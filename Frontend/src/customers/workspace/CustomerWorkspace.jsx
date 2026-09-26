import { ArrowLeft } from "lucide-react";
import CustomerIdentity from "./CustomerIdentity";
import CustomerPurchaseSummary from "./CustomerPurchaseSummary";
import CustomerActivity from "./CustomerActivity";
import CustomerCRMContext from "./CustomerCRMContext";
import CustomerRecord from "./CustomerRecord";
import { EntButton } from "../../components/ui/EnterpriseKit";

function Section({ title, meta, children }) {
  return (
    <section style={{ padding: "20px 0", borderBottom: "1px solid var(--ct-line)" }}>
      <div className="flex items-center justify-between gap-2" style={{ marginBottom: 12 }}>
        <h4 className="text-[14px] font-bold" style={{ color: "var(--ct-ink)" }}>{title}</h4>
        {meta && <span className="text-[11px] font-normal" style={{ color: "var(--ct-ink-subtle)" }}>{meta}</span>}
      </div>
      {children}
    </section>
  );
}

export default function CustomerWorkspace({
  customer,
  sales,
  reminders,
  detailLoading,
  detailError,
  onRetry,
  onEdit,
  onOpenCRM,
  onBack,
}) {
  const summary = (() => {
    if (!sales) return null;
    const totalSpending = sales.reduce((n, s) => n + Number(s.payable_amount ?? s.total_amount ?? 0), 0);
    const latest = sales
      .slice()
      .sort((a, b) => new Date(b.created_at || b.sale_date) - new Date(a.created_at || a.sale_date))[0];
    return { count: sales.length, totalSpending, lastDate: latest ? latest.created_at || latest.sale_date : null };
  })();

  return (
    <div className="h-full min-h-0 overflow-y-auto scrollbar-thin flex-1">
      <div className="w-full mx-auto" style={{ maxWidth: 880, padding: 24 }}>
        {onBack && (
          <div className="cust-back-btn" style={{ marginBottom: 12 }}>
            <EntButton variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft size={14} strokeWidth={1.75} />}>
              Back to customers
            </EntButton>
          </div>
        )}
        <CustomerIdentity customer={customer} onEdit={onEdit} />
        {detailError && (
          <div className="cust-error-banner" style={{ marginTop: 16 }}>
            <span>Could not load purchase activity. Customer record is unaffected.</span>
            <EntButton variant="ghost" size="sm" onClick={onRetry} className="shrink-0">
              Retry
            </EntButton>
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          <Section title="Purchase summary">
            <CustomerPurchaseSummary summary={summary} loading={detailLoading} />
          </Section>
          <Section title="Recent activity" meta="Last 8 events">
            <CustomerActivity
              sales={sales || []}
              reminders={reminders || []}
              memberSince={customer.member_since}
              loading={detailLoading}
            />
          </Section>
          <div style={{ padding: "20px 0", borderBottom: "1px solid var(--ct-line)" }}>
            <h4 className="text-[14px] font-bold" style={{ color: "var(--ct-ink)", marginBottom: 12 }}>Record</h4>
            <CustomerRecord customer={customer} />
          </div>
          <div style={{ padding: "20px 0" }}>
            <CustomerCRMContext customer={customer} reminders={reminders || []} loading={detailLoading} onOpenCRM={onOpenCRM} />
          </div>
        </div>
      </div>
    </div>
  );
}
