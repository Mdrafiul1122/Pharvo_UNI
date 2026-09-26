import { Check } from "lucide-react";
import { PosButton, PosModalShell, PosReceiptRow } from "./PosBlocks";

export default function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;
  return (
    <PosModalShell
      title=""
      onClose={onClose}
      maxWidth={480}
      closeLabel="Close receipt"
      footer={null}
    >
      <div className="flex flex-col items-center text-center" style={{ marginTop: -8 }}>
        <span
          className="flex items-center justify-center"
          style={{ width: 48, height: 48, borderRadius: 999, background: "var(--pos-success)", color: "#fff", marginBottom: 12 }}
        >
          <Check size={24} strokeWidth={2} />
        </span>
        <h4 style={{ fontSize: 18, fontWeight: 700, color: "var(--pos-ink)" }}>Sale Completed</h4>
        <p className="tabular-nums" style={{ fontSize: 13, fontFamily: "ui-monospace, monospace", color: "var(--pos-accent)", marginTop: 4 }}>
          Invoice #{receipt.invoice_number}
        </p>
      </div>

      <div style={{ fontSize: 13, color: "var(--pos-ink-muted)", marginTop: 16 }}>
        Customer: <span style={{ fontWeight: 600, color: "var(--pos-ink)" }}>{receipt.customer_name || "Walk-in"}</span>
      </div>

      <div style={{ borderTop: "1px solid var(--pos-line)", margin: "12px 0" }} />

      {receipt.items && (
        <>
          <div className="flex flex-col" style={{ gap: 0 }}>
            {receipt.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between gap-2" style={{ minHeight: 32, fontSize: 13 }}>
                <span className="truncate" style={{ color: "var(--pos-ink)" }}>
                  {it.product_name} × {it.quantity} {(it.unit_display || "pc").toLowerCase()}
                </span>
                <span className="tabular-nums flex-shrink-0" style={{ fontWeight: 600, color: "var(--pos-ink)" }}>৳{Number(it.subtotal).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid var(--pos-line)", margin: "12px 0" }} />
        </>
      )}

      <div className="pos-section-box flex flex-col" style={{ gap: 6, padding: 12, fontSize: 13 }}>
        <PosReceiptRow label="Subtotal" value={`৳${Number(receipt.total_amount).toLocaleString()}`} />
        {receipt.crm_discount && Number(receipt.crm_discount) > 0 && (
          <PosReceiptRow label="CRM Discount" value={`-৳${Number(receipt.crm_discount).toLocaleString()}`} tone="success" />
        )}
        {receipt.manual_discount && Number(receipt.manual_discount) > 0 && (
          <PosReceiptRow label="Manual Discount" value={`-৳${Number(receipt.manual_discount).toLocaleString()}`} tone="success" />
        )}
        {(!receipt.crm_discount || Number(receipt.crm_discount) === 0) &&
         (!receipt.manual_discount || Number(receipt.manual_discount) === 0) && (
          <PosReceiptRow label="Discount" value={`-৳${Number(receipt.discount || 0).toLocaleString()}`} />
        )}
        <div style={{ borderTop: "1px solid var(--pos-line)", paddingTop: 6 }}>
          <PosReceiptRow label="Total Paid" value={`৳${Number(receipt.payable_amount).toLocaleString()}`} strong />
        </div>
        {receipt.payments && (
          <div className="flex flex-col" style={{ gap: 4, marginTop: 2 }}>
            {receipt.payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-2" style={{ fontSize: 12, color: "var(--pos-ink-muted)" }}>
                <span className="capitalize">{p.method_display}</span>
                <span className="tabular-nums">৳{Number(p.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <PosButton size="lg" block onClick={onClose}>
          Start New Sale
        </PosButton>
      </div>
    </PosModalShell>
  );
}
