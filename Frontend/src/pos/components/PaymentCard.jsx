import { Check, TriangleAlert } from "lucide-react";
import { PosBanner, PosButton, PosCard } from "./PosBlocks";

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash" },
  { id: "digital", label: "bKash" },
  { id: "split", label: "Split" },
];

export default function PaymentCard({
  payMethod,
  onPayMethod,
  cashReceived,
  onCashReceived,
  digitalReceived,
  onDigitalReceived,
  grandTotal,
  checkoutError,
  cartEmpty,
  checkingOut,
  onHold,
  onClear,
  onComplete,
}) {
  const cash = Number(cashReceived) || 0;
  const digital = Number(digitalReceived) || 0;
  const splitTotal = cash + digital;
  const splitMismatch = payMethod === "split" && !cartEmpty && splitTotal !== grandTotal;
  const change = cash - grandTotal;

  return (
    <PosCard className="pos-card-pad flex flex-col" style={{ gap: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--pos-ink-subtle)" }}>
        Payment Method
      </span>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Payment method">
        {PAYMENT_METHODS.map((m) => {
          const isSelected = payMethod === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onPayMethod(m.id)}
              aria-pressed={isSelected}
              className="pos-btn pos-btn-md"
              style={
                isSelected
                  ? { height: 40, background: "var(--pos-accent-soft)", color: "var(--pos-accent)", borderColor: "var(--pos-accent)" }
                  : { height: 40, background: "var(--pos-surface)", borderColor: "var(--pos-line)", color: "var(--pos-ink)" }
              }
            >
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {payMethod === "cash" && (
        <div>
          <label className="block" style={{ fontSize: 12, color: "var(--pos-ink-muted)", marginBottom: 4 }} htmlFor="pos-cash">
            Cash Received
          </label>
          <div className="relative">
            <span className="absolute" style={{ left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, fontWeight: 700, color: "var(--pos-ink-subtle)" }}>৳</span>
            <input
              id="pos-cash"
              value={cashReceived}
              onChange={(e) => onCashReceived(e.target.value)}
              placeholder={`${grandTotal}`}
              inputMode="decimal"
              className="pos-input w-full text-right tabular-nums"
              style={{ height: 48, paddingLeft: 32, paddingRight: 12, fontSize: 16, fontWeight: 700 }}
            />
          </div>
          <p className="tabular-nums" style={{ fontSize: 12, marginTop: 4, color: change >= 0 ? "var(--pos-success)" : "var(--pos-danger)", fontWeight: 600 }}>
            {change >= 0 ? `Change ৳${change.toLocaleString()}` : `Remaining ৳${Math.abs(change).toLocaleString()}`}
          </p>
        </div>
      )}

      {payMethod === "digital" && (
        <div>
          <label className="block" style={{ fontSize: 12, color: "var(--pos-ink-muted)", marginBottom: 4 }} htmlFor="pos-digital">
            bKash Payment
          </label>
          <div className="relative">
            <span className="absolute" style={{ left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, fontWeight: 700, color: "var(--pos-ink-subtle)" }}>৳</span>
            <input
              id="pos-digital"
              value={digitalReceived}
              onChange={(e) => onDigitalReceived(e.target.value)}
              placeholder={`${grandTotal}`}
              inputMode="decimal"
              className="pos-input w-full text-right tabular-nums"
              style={{ height: 48, paddingLeft: 32, paddingRight: 12, fontSize: 16, fontWeight: 700 }}
            />
          </div>
        </div>
      )}

      {payMethod === "split" && (
        <div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block" style={{ fontSize: 12, color: "var(--pos-ink-muted)", marginBottom: 4 }} htmlFor="pos-split-cash">
                Cash ৳
              </label>
              <input
                id="pos-split-cash"
                value={cashReceived}
                onChange={(e) => onCashReceived(e.target.value)}
                placeholder="৳0"
                inputMode="decimal"
                className="pos-input w-full text-right tabular-nums"
                style={{ height: 44, padding: "0 12px", fontSize: 14, fontWeight: 600 }}
              />
            </div>
            <div>
              <label className="block" style={{ fontSize: 12, color: "var(--pos-ink-muted)", marginBottom: 4 }} htmlFor="pos-split-digital">
                bKash ৳
              </label>
              <input
                id="pos-split-digital"
                value={digitalReceived}
                onChange={(e) => onDigitalReceived(e.target.value)}
                placeholder={`৳${grandTotal}`}
                inputMode="decimal"
                className="pos-input w-full text-right tabular-nums"
                style={{ height: 44, padding: "0 12px", fontSize: 14, fontWeight: 600 }}
              />
            </div>
          </div>
          <p className="tabular-nums" style={{ fontSize: 12, marginTop: 6, fontWeight: 600, color: splitMismatch ? "var(--pos-danger)" : "var(--pos-success)" }}>
            Total ৳{splitTotal.toLocaleString()} of ৳{grandTotal.toLocaleString()}
            {splitMismatch ? " — amounts must match the total" : ""}
          </p>
        </div>
      )}

      {checkoutError && (
        <PosBanner
          tone="rose"
          icon={<TriangleAlert size={16} strokeWidth={1.75} style={{ color: "var(--pos-danger)", flexShrink: 0, marginTop: 2 }} />}
        >
          <span role="alert" style={{ fontSize: 12, fontWeight: 500 }}>{checkoutError}</span>
        </PosBanner>
      )}

      <div className="flex flex-col" style={{ gap: 8, marginTop: 2 }}>
        <PosButton size="lg" block onClick={onComplete} disabled={cartEmpty || checkingOut}>
          <Check size={16} strokeWidth={1.75} />
          <span>{checkingOut ? "Processing..." : `Complete Sale · ৳${grandTotal.toLocaleString()}`}</span>
        </PosButton>
        <div className="grid grid-cols-2 gap-2">
          <PosButton variant="ghost" size="md" onClick={onHold} disabled={cartEmpty} style={{ height: 40 }}>
            Hold
          </PosButton>
          <PosButton variant="danger-ghost" size="md" onClick={onClear} disabled={cartEmpty} style={{ height: 40 }}>
            Clear
          </PosButton>
        </div>
      </div>
    </PosCard>
  );
}
