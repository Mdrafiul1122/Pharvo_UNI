import { X } from "lucide-react";
import { UNIT_META } from "../units";
import { PosPill, PosStepper } from "./PosBlocks";

export default function CartItem({ item, onQty, onRemove }) {
  return (
    <tr className="pos-row" style={{ minHeight: 56 }}>
      <td style={{ padding: "10px 8px 10px 0" }}>
        <div
          className="truncate"
          title={item.name}
          style={{ fontSize: 13, fontWeight: 600, color: "var(--pos-ink)" }}
        >
          {item.name}
        </div>
        <div className="flex items-center gap-1.5" style={{ marginTop: 4 }}>
          <PosPill tone="accent-2">
            {item.qty} × {item.unitLabel}
          </PosPill>
        </div>
      </td>
      <td className="text-center" style={{ padding: "10px 4px" }}>
        <PosStepper
          value={item.qty}
          onDec={() => onQty(item.id, -1)}
          onInc={() => onQty(item.id, 1)}
          decLabel={`Decrease quantity of ${item.name}`}
          incLabel={`Increase quantity of ${item.name}`}
        />
      </td>
      <td className="text-right whitespace-nowrap tabular-nums" style={{ padding: "10px 4px", fontSize: 13, color: "var(--pos-ink-muted)" }}>
        ৳{item.unitPrice.toLocaleString()}
      </td>
      <td className="text-right whitespace-nowrap" style={{ padding: "10px 4px" }}>
        <div className="tabular-nums" style={{ fontSize: 13, fontWeight: 700, color: "var(--pos-ink)" }}>
          ৳{item.total.toLocaleString()}
        </div>
        <div
          style={{
            fontSize: 10,
            marginTop: 2,
            color: item.qty > item.availableStock ? "var(--pos-danger)" : "var(--pos-ink-subtle)",
            fontWeight: item.qty > item.availableStock ? 600 : 400,
          }}
        >
          {item.availableStock.toLocaleString()} {UNIT_META[item.unit].plural.toLowerCase()} in stock
        </div>
      </td>
      <td className="text-center" style={{ padding: "10px 0 10px 4px", width: 28 }}>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${item.name} from cart`}
          title={`Remove ${item.name}`}
          className="pos-modal-close"
          style={{ width: 20, height: 20 }}
        >
          <X size={12} strokeWidth={1.75} />
        </button>
      </td>
    </tr>
  );
}
