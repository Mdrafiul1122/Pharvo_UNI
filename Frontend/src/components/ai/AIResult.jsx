import MedicineResults from "./MedicineResults";
import ReviewWarning from "./ReviewWarning";

/**
 * One assistant answer: predicted health-problem category (neutral,
 * non-diagnostic wording), candidate generics, matching inventory,
 * and the mandatory pharmacist-review warning.
 * Tolerates missing/optional API fields without crashing.
 */
export default function AIResult({ result = {} }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-semibold uppercase" style={{ color: "var(--pharvo-ink-subtle)", letterSpacing: "0.06em" }}>
          Predicted Health Problem
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {result.problem_id && (
            <span className="ent-badge ent-pill-ai">
              {result.problem_id}
            </span>
          )}
          <span className="text-[15px] font-semibold" style={{ color: "var(--pharvo-ink)" }}>
            {result.health_problem || "Unknown category"}
          </span>
        </div>
      </div>

      {(result.candidate_generics || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.candidate_generics.map((generic) => (
            <span
              key={generic}
              className="ent-pill ent-pill-accent-2"
            >
              {generic}
            </span>
          ))}
        </div>
      )}

      <MedicineResults groups={result.inventory_matches || []} />
      <ReviewWarning />
    </div>
  );
}
