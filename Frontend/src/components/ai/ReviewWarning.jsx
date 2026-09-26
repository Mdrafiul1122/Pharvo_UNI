import { TriangleAlert } from "lucide-react";

/**
 * Amber pharmacist-review notice. Rendered with every AI result.
 * Informational only — the AI never recommends, prescribes, approves,
 * or dispenses medicine; the pharmacist/owner remains responsible.
 */
export default function ReviewWarning() {
  return (
    <div className="rounded-[12px] p-3 sm:p-4 transition-colors" style={{ border: "1px solid var(--pharvo-warning)", background: "var(--pharvo-warning-soft)" }}>
      <p className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "var(--pharvo-warning)" }}>
        <TriangleAlert size={15} />
        Pharmacist Review Required
      </p>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--pharvo-ink-muted)" }}>
        This AI output is informational only and must be reviewed by a
        pharmacist before any medicine is supplied.
      </p>
    </div>
  );
}
