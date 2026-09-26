import { Info, ShieldAlert } from "lucide-react";
import { PosButton, PosModalShell, PosPill } from "./PosBlocks";

const INTERACTION_LEVELS = {
  caution: { label: "Caution", tone: "warning" },
  avoid: { label: "Avoid", tone: "warning" },
  high_risk: { label: "High Risk", tone: "danger" },
  contraindicated: { label: "Contraindicated", tone: "danger" },
};

export default function InteractionReviewModal({ warnings, checkingOut, onConfirm, onClose }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <PosModalShell
      title="Drug Interaction Warning"
      onClose={onClose}
      maxWidth={640}
      closeLabel="Close interaction review"
      footer={
        <>
          <PosButton variant="ghost" size="md" onClick={onClose}>
            Cancel
          </PosButton>
          <PosButton size="md" onClick={onConfirm} disabled={checkingOut}>
            {checkingOut ? "Processing..." : "I’ve Reviewed — Complete Sale"}
          </PosButton>
        </>
      }
    >
      <div
        className="flex items-center gap-2.5"
        style={{ background: "var(--pos-danger-soft)", border: "1px solid rgba(244,63,94,.3)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}
      >
        <span className="pos-icon-square pos-icon-danger" style={{ width: 36, height: 36 }}>
          <ShieldAlert size={18} strokeWidth={1.75} />
        </span>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--pos-ink)" }}>
          {warnings.length} interaction warning{warnings.length > 1 ? "s" : ""} detected — review before completing the sale.
        </p>
      </div>
      <div className="flex flex-col scrollbar-thin" style={{ gap: 10, maxHeight: "50vh", overflowY: "auto" }}>
        {warnings.map((ix, i) => {
          const level = INTERACTION_LEVELS[ix.level] || INTERACTION_LEVELS.caution;
          return (
            <div key={`${ix.interaction_id ?? ix.drug_a}-${i}`} className="pos-section-box" style={{ borderRadius: 12, padding: 16 }}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--pos-ink)" }}>
                  {ix.products?.map((p) => p.name).join("  +  ")}
                </span>
                <PosPill tone={level.tone}>
                  {level.label}
                </PosPill>
              </div>
              <p style={{ fontSize: 13, color: "var(--pos-ink-muted)", marginTop: 8 }}>
                {ix.description || `Known interaction between ${ix.drug_a || "these medicines"} and ${ix.drug_b || "these medicines"}.`}
              </p>
              <div className="flex items-start gap-1.5" style={{ marginTop: 8, background: "var(--pos-surface)", border: "1px solid var(--pos-line)", borderRadius: 8, padding: 8 }}>
                <Info size={16} strokeWidth={1.75} style={{ color: "var(--pos-ink-subtle)", marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--pos-ink)", lineHeight: 1.5 }}>{ix.recommendation}</p>
              </div>
            </div>
          );
        })}
      </div>
    </PosModalShell>
  );
}
