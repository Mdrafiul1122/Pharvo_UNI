import { Bell, Receipt, UserPlus } from "lucide-react";
import { formatDate, formatMoney } from "./customerUtils";
import { EntSkeleton } from "../../components/ui/EnterpriseKit";

const EVENT_TONE = {
  purchase: "var(--ct-accent)",
  reminder: "var(--ct-accent-2)",
  joined: "var(--ct-success)",
};

function TimelineRow({ icon: Icon, title, detail, tone }) {
  return (
    <li className="relative flex items-start" style={{ minHeight: 56 }}>
      <span className="cust-timeline-dot shrink-0" style={{ background: tone }} aria-hidden="true" />
      <span className="flex items-center gap-2 min-w-0" style={{ padding: "2px 0" }}>
        <Icon size={14} strokeWidth={1.75} className="shrink-0" style={{ color: "var(--ct-ink-subtle)" }} />
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold truncate" style={{ color: "var(--ct-ink)" }}>{title}</span>
          {detail && <span className="block text-[11px] font-normal mt-0.5 truncate tabular-nums" style={{ color: "var(--ct-ink-subtle)" }}>{detail}</span>}
        </span>
      </span>
    </li>
  );
}

export default function CustomerActivity({ sales, reminders, memberSince, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3" style={{ padding: "4px 0" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <EntSkeleton width={10} height={10} radius={999} className="shrink-0" />
            <div className="flex-1">
              <EntSkeleton width="55%" height={13} />
              <div style={{ marginTop: 6 }}><EntSkeleton width="35%" height={11} /></div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  const events = [];
  (sales || []).forEach((s) => {
    const when = s.created_at || s.sale_date;
    const itemCount = (s.items || []).reduce((n, it) => n + Number(it.quantity || 0), 0);
    events.push({
      key: `sale-${s.id}`,
      when,
      icon: Receipt,
      tone: EVENT_TONE.purchase,
      title: `Purchased ${itemCount} item${itemCount === 1 ? "" : "s"} · ${formatMoney(s.payable_amount ?? s.total_amount)}`,
      detail: `${s.invoice_number || "Sale"} · ${formatDate(when)}`,
    });
  });
  (reminders || [])
    .filter((r) => r.is_active)
    .forEach((r) => {
      events.push({
        key: `rem-${r.id}`,
        when: r.created_at,
        icon: Bell,
        tone: EVENT_TONE.reminder,
        title: `Reminder: ${r.title || "Medicine reminder"}`,
        detail: `${r.product?.name || "Medicine"} · due ${formatDate(r.reminder_time)}`,
      });
    });
  if (memberSince) {
    events.push({
      key: "joined",
      when: memberSince,
      icon: UserPlus,
      tone: EVENT_TONE.joined,
      title: "Became a customer",
      detail: formatDate(memberSince),
    });
  }
  events.sort((a, b) => new Date(b.when || 0) - new Date(a.when || 0));
  const shown = events.slice(0, 8);

  if (shown.length === 0) {
    return <p className="text-[13px] font-normal" style={{ color: "var(--ct-ink-muted)", padding: "48px 0", textAlign: "center" }}>No activity recorded yet.</p>;
  }
  return (
    <ul className="cust-timeline">
      <span aria-hidden="true" className="cust-timeline-rail" />
      {shown.map((e) => (
        <TimelineRow key={e.key} icon={e.icon} title={e.title} detail={e.detail} tone={e.tone} />
      ))}
    </ul>
  );
}
