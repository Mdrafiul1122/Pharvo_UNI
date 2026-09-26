import { formatDate } from "./customerUtils";

function Row({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="cust-record-row">
      <span className="text-[12px] font-normal shrink-0" style={{ color: "var(--ct-ink-muted)" }}>{label}</span>
      <span className="text-[13px] font-medium text-right break-words tabular-nums" style={{ color: "var(--ct-ink)" }}>{value}</span>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div className="min-w-0 rounded-[12px]" style={{ background: "var(--ct-surface-2)", padding: 16 }}>
      <h5 className="text-[11px] font-semibold uppercase" style={{ color: "var(--ct-ink-subtle)", letterSpacing: "0.06em", marginBottom: 4 }}>{title}</h5>
      {children}
    </div>
  );
}

export default function CustomerRecord({ customer }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Group title="Contact">
          <Row label="Phone" value={customer.phone} />
          <Row label="Email" value={customer.email} />
        </Group>
        <Group title="Address">
          <Row label="Address" value={customer.address} />
          <Row label="Date of birth" value={customer.date_of_birth ? formatDate(customer.date_of_birth) : null} />
        </Group>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Group title="Account">
          <Row
            label="Loyalty points"
            value={customer.loyalty_points === null || customer.loyalty_points === undefined ? null : String(customer.loyalty_points)}
          />
          <Row label="Member since" value={customer.member_since ? formatDate(customer.member_since) : null} />
        </Group>
        {customer.notes ? (
          <Group title="Notes">
            <p className="text-[13px] font-normal leading-relaxed rounded-[10px]" style={{ color: "var(--ct-ink-muted)", background: "var(--ct-surface)", padding: 12, lineHeight: 1.5 }}>{customer.notes}</p>
          </Group>
        ) : null}
      </div>
    </div>
  );
}
