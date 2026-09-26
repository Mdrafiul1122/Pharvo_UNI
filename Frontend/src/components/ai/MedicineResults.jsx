import { Pill } from "lucide-react";
import { StatusBadge } from "../ui/Blocks";

/**
 * Matching available medicines from the live `/api/ai/query/` response.
 * Renders only fields that exist in the API response
 * (name, brand, stock_quantity, unit_price, expiry_date).
 * No dosage, prescription, codes, or invented values.
 */
export default function MedicineResults({ groups = [] }) {
  const hasStock = groups.some((g) => (g.available_medicines || []).length > 0);

  return (
    <div className="rounded-[12px] p-3 sm:p-4" style={{ border: "1px solid var(--pharvo-line)", background: "var(--pharvo-surface-2)" }}>
      <p className="flex items-center gap-1.5 text-[13px] font-semibold mb-3" style={{ color: "var(--pharvo-ink)" }}>
        <Pill size={15} style={{ color: "var(--pharvo-accent-3)" }} />
        Matching Available Medicines
      </p>
      {!hasStock ? (
        <p className="text-[13px]" style={{ color: "var(--pharvo-ink-muted)" }}>
          No matching medicines available in inventory.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => {
            const available = (group.available_medicines || []).length > 0;
            const status =
              group.status || (available ? "available" : "stock_out");
            return (
            <div key={group.candidate_generic}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold uppercase" style={{ color: "var(--pharvo-ink-muted)", letterSpacing: "0.06em" }}>
                  {group.candidate_generic}
                </p>
                <StatusBadge
                  status={status === "stock_out" ? "Stock Out" : "Available"}
                />
              </div>
              {!available ? (
                <p className="text-xs font-normal" style={{ color: "var(--pharvo-ink-subtle)" }}>
                  Stock Out — no alternative medicine available.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg bg-white" style={{ border: "1px solid var(--pharvo-line)", background: "var(--pharvo-surface)" }}>
                  <table className="w-full text-sm min-w-[420px] tabular-nums">
                    <thead>
                      <tr style={{ background: "var(--pharvo-surface-2)", borderBottom: "1px solid var(--pharvo-line)" }}>
                        <th className="text-left py-2 px-3 font-medium text-xs" style={{ color: "var(--pharvo-ink-muted)" }}>
                          Product
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-xs" style={{ color: "var(--pharvo-ink-muted)" }}>
                          Stock
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-xs" style={{ color: "var(--pharvo-ink-muted)" }}>
                          Price
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-xs" style={{ color: "var(--pharvo-ink-muted)" }}>
                          Expiry
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.available_medicines.map((medicine) => (
                        <tr
                          key={medicine.product_id}
                          className="transition-colors hover:bg-[var(--pharvo-surface-2)]"
                          style={{ borderBottom: "1px solid var(--pharvo-line)" }}
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-[13px]" style={{ color: "var(--pharvo-ink)" }}>
                              {medicine.name}
                            </div>
                            <div className="text-[11px]" style={{ color: "var(--pharvo-ink-subtle)" }}>
                              {medicine.brand}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusBadge
                              status={
                                medicine.is_low_stock
                                  ? `Low stock (${medicine.stock_quantity})`
                                  : `In stock (${medicine.stock_quantity})`
                              }
                            />
                          </td>
                          <td className="py-2.5 px-3 text-[13px] whitespace-nowrap tabular-nums" style={{ color: "var(--pharvo-ink)" }}>
                            {medicine.unit_price}
                          </td>
                          <td className="py-2.5 px-3 text-[13px] whitespace-nowrap tabular-nums" style={{ color: "var(--pharvo-ink)" }}>
                            {medicine.expiry_date || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
