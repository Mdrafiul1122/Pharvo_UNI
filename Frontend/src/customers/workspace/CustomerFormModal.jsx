import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { EntButton, EntInput, EntSelect } from "../../components/ui/EnterpriseKit";

const BLANK = {
  name: "",
  phone: "",
  email: "",
  address: "",
  date_of_birth: "",
  member_since: "",
  membership_tier: "",
  loyalty_points: "",
  notes: "",
};

function toForm(customer) {
  if (!customer) return { ...BLANK };
  return {
    name: customer.name || "",
    phone: customer.phone || "",
    email: customer.email || "",
    address: customer.address || "",
    date_of_birth: customer.date_of_birth || "",
    member_since: customer.member_since || "",
    membership_tier: customer.membership_tier || "",
    loyalty_points: customer.loyalty_points === null || customer.loyalty_points === undefined ? "" : String(customer.loyalty_points),
    notes: customer.notes || "",
  };
}

function Field({ label, required, children, error }) {
  return (
    <div className="min-w-0">
      <label className="cust-field-label">
        {label} {required && <span className="cust-field-req">*</span>}
      </label>
      {children}
      {error && (
        <span className="cust-field-error">
          <AlertTriangle size={12} strokeWidth={1.75} className="shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}

export default function CustomerFormModal({ mode, customer, saving, error, onSubmit, onDelete, onClose }) {
  const [form, setForm] = useState(() => toForm(customer));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const firstRef = useRef(null);
  if (!mode) return null;

  useEffect(() => {
    setForm(toForm(customer));
    setConfirmDelete(false);
  }, [mode, customer]);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = () => {
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      date_of_birth: form.date_of_birth || null,
      member_since: form.member_since || null,
      membership_tier: form.membership_tier,
      notes: form.notes.trim(),
    };
    if (form.loyalty_points !== "") payload.loyalty_points = Number(form.loyalty_points);
    else if (mode === "add") payload.loyalty_points = 0;
    onSubmit(payload);
  };

  return (
    <div className="cust-modal-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === "edit" ? "Edit customer" : "Add customer"}
        className="cust-modal-panel"
      >
        <div className="flex items-center justify-between gap-3 shrink-0" style={{ padding: 20, borderBottom: "1px solid var(--ct-line)" }}>
          <h3 className="text-[18px] font-bold" style={{ color: "var(--ct-ink)", letterSpacing: "-0.01em" }}>
            {mode === "edit" ? "Edit Customer" : "Add New Customer"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="ent-modal-close"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="overflow-y-auto flex flex-col scrollbar-thin" style={{ padding: 20, gap: 16 }}>
          {error && (
            <div className="cust-error-banner" role="alert">
              <span className="flex items-center gap-2 min-w-0">
                <AlertTriangle size={14} strokeWidth={1.75} className="shrink-0" />
                <span>{error}</span>
              </span>
            </div>
          )}
          <Field label="Full Name" required>
            <EntInput ref={firstRef} value={form.name} onChange={set("name")} placeholder="e.g. Rafiq Ahmed" className="w-full text-[13px]" style={{ minHeight: 36, padding: "0 12px" }} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone Number" required>
              <EntInput value={form.phone} onChange={set("phone")} placeholder="+880 1711-234567" className="w-full text-[13px] tabular-nums" style={{ minHeight: 36, padding: "0 12px" }} />
            </Field>
            <Field label="Email">
              <EntInput type="email" value={form.email} onChange={set("email")} placeholder="customer@example.com" className="w-full text-[13px]" style={{ minHeight: 36, padding: "0 12px" }} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date of Birth">
              <EntInput type="date" value={form.date_of_birth} onChange={set("date_of_birth")} className="w-full text-[13px]" style={{ minHeight: 36, padding: "0 12px" }} />
            </Field>
            <Field label="Address">
              <EntInput value={form.address} onChange={set("address")} placeholder="e.g. Mirpur-10, Dhaka" className="w-full text-[13px]" style={{ minHeight: 36, padding: "0 12px" }} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Tier">
              <EntSelect value={form.membership_tier} onChange={set("membership_tier")} className="w-full text-[13px] cursor-pointer" style={{ minHeight: 36, padding: "0 12px" }}>
                <option value="">Unassigned</option>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
                <option value="regular">Regular</option>
              </EntSelect>
            </Field>
            <Field label="Member Since">
              <EntInput type="date" value={form.member_since} onChange={set("member_since")} className="w-full text-[13px]" style={{ minHeight: 36, padding: "0 12px" }} />
            </Field>
            <Field label="Loyalty Points">
              <EntInput type="number" min={0} value={form.loyalty_points} onChange={set("loyalty_points")} placeholder="0" className="w-full text-[13px] tabular-nums" style={{ minHeight: 36, padding: "0 12px" }} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={form.notes} onChange={set("notes")} placeholder="Allergies, preferences, care notes..." rows={3} className="ent-input w-full text-[13px]" style={{ minHeight: 80, padding: "10px 12px", resize: "vertical" }} />
          </Field>
        </div>

        {confirmDelete ? (
          <div className="flex items-center justify-between gap-3 shrink-0 flex-wrap" style={{ padding: 20, borderTop: "1px solid var(--ct-line)", background: "var(--ct-danger-soft)" }}>
            <span className="flex items-center gap-2 text-[13px] font-semibold min-w-0" style={{ color: "var(--ct-danger)" }}>
              <AlertTriangle size={15} strokeWidth={1.75} className="shrink-0" />
              Delete this customer? This cannot be undone.
            </span>
            <span className="flex gap-2 shrink-0">
              <EntButton variant="ghost" size="md" onClick={() => setConfirmDelete(false)}>
                Cancel
              </EntButton>
              <EntButton variant="danger" size="md" onClick={() => onDelete()} disabled={saving}>
                Confirm delete
              </EntButton>
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 shrink-0" style={{ padding: 20, borderTop: "1px solid var(--ct-line)" }}>
            <div>
              {mode === "edit" && (
                <EntButton variant="danger" size="md" onClick={() => setConfirmDelete(true)}>
                  Delete
                </EntButton>
              )}
            </div>
            <div className="flex gap-2">
              <EntButton variant="ghost" size="md" onClick={onClose}>
                Cancel
              </EntButton>
              <EntButton variant="primary" size="md" onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Add Customer"}
              </EntButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
