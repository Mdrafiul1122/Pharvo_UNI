import { Pause, ShieldAlert, ShoppingCart } from "lucide-react";
import CartItem from "./CartItem";
import { PosBanner, PosButton, PosCard, PosPill } from "./PosBlocks";
import { EntAIBadge } from "../../components/ui/EnterpriseKit";

export default function CartPanel({
  cart,
  heldSale,
  interactionWarnings,
  onQty,
  onRemove,
  onClear,
  onResumeHeld,
  onDismissHeld,
  onReviewInteractions,
}) {
  return (
    <PosCard className="pos-card-pad flex flex-col">
      <div className="flex items-center justify-between" style={{ paddingBottom: 12, borderBottom: "1px solid var(--pos-line)" }}>
        <div className="flex items-center gap-2">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--pos-ink)" }}>Current Sale</h3>
          {cart.length > 0 && (
            <PosPill tone="accent">{cart.length}</PosPill>
          )}
        </div>
        {cart.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="pos-btn"
            style={{ fontSize: 12, fontWeight: 500, color: "var(--pos-danger)", padding: "4px 6px", borderRadius: 8 }}
          >
            Clear all
          </button>
        )}
      </div>

      {heldSale && (
        <div style={{ marginTop: 12 }}>
          <PosBanner
            tone="amber"
            icon={<Pause size={16} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 2 }} />}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="min-w-0" style={{ fontSize: 12, fontWeight: 500 }}>
                Sale for {heldSale.customer?.name || "Walk-in"} with {heldSale.cart.length} item(s) held at {heldSale.time}.
              </span>
              <span className="flex items-center gap-1.5 flex-shrink-0">
                <PosButton size="sm" onClick={onResumeHeld}>
                  Resume
                </PosButton>
                <button
                  type="button"
                  onClick={onDismissHeld}
                  className="pos-btn pos-btn-sm"
                  style={{ background: "transparent", borderColor: "transparent", color: "var(--pos-ink-muted)" }}
                >
                  Dismiss
                </button>
              </span>
            </div>
          </PosBanner>
        </div>
      )}

      {interactionWarnings.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <PosBanner
            tone="rose"
            icon={<ShieldAlert size={16} strokeWidth={1.75} style={{ color: "var(--pos-danger)", flexShrink: 0, marginTop: 2 }} />}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 700, color: "var(--pos-danger)" }}>
                  Interaction detected — {interactionWarnings.length} warning{interactionWarnings.length > 1 ? "s" : ""}
                  <EntAIBadge>AI</EntAIBadge>
                </p>
                <p className="truncate" style={{ fontSize: 11, color: "var(--pos-ink-muted)" }}>
                  Review before completing this sale.
                </p>
              </div>
              <PosButton size="sm" onClick={onReviewInteractions} className="flex-shrink-0">
                Review →
              </PosButton>
            </div>
          </PosBanner>
        </div>
      )}

      <div className="scrollbar-thin" style={{ minHeight: 220, maxHeight: 320, overflowY: "auto", marginTop: 4 }}>
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center" style={{ minHeight: 220, padding: "64px 16px" }}>
            <ShoppingCart size={32} strokeWidth={1.75} style={{ color: "var(--pos-ink-subtle)", marginBottom: 8 }} />
            <p style={{ fontSize: 13, color: "var(--pos-ink-muted)" }}>Cart is empty</p>
            <p style={{ fontSize: 11, color: "var(--pos-ink-subtle)", marginTop: 4 }}>Choose a unit and press Add on any medicine</p>
          </div>
        ) : (
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--pos-ink-subtle)", borderBottom: "1px solid var(--pos-line)" }}>
                <th className="text-left" style={{ padding: "10px 8px 10px 0" }}>Medicine</th>
                <th className="text-center" style={{ padding: "10px 4px" }}>Qty</th>
                <th className="text-right" style={{ padding: "10px 4px" }}>Price</th>
                <th className="text-right" style={{ padding: "10px 4px" }}>Total</th>
                <th className="text-center" style={{ width: 28, padding: "10px 0 10px 4px" }}>
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody className="pos-tbody-divided">
              {cart.map((item) => (
                <CartItem key={item.id} item={item} onQty={onQty} onRemove={onRemove} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PosCard>
  );
}

