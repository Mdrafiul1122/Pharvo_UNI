import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserX } from "lucide-react";
import {
  createCustomer,
  deleteCustomer,
  fetchCustomers,
  updateCustomer,
} from "../services/customer";
import { fetchCustomerPurchases } from "../services/crm";
import { fetchCustomerReminders } from "../services/crm";
import { ApiError } from "../services/api";
import { matchesTier } from "./workspace/customerUtils";
import CustomerDirectory from "./workspace/CustomerDirectory";
import CustomerWorkspace from "./workspace/CustomerWorkspace";
import CustomerFormModal from "./workspace/CustomerFormModal";
import "./workspace/customers.css";

const FIELD_LABELS = {
  name: "Full Name",
  phone: "Phone Number",
  email: "Email",
  address: "Address",
  date_of_birth: "Date of Birth",
  member_since: "Member Since",
  membership_tier: "Membership Tier",
  loyalty_points: "Loyalty Points",
  notes: "Notes",
};

function formatFieldErrors(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const lines = [];
  for (const [field, messages] of Object.entries(data)) {
    if (field === "non_field_errors" || field === "detail") continue;
    if (!Array.isArray(messages) || messages.length === 0) continue;
    lines.push(`${FIELD_LABELS[field] || field}: ${messages[0]}`);
  }
  return lines.length ? lines.join(" ") : null;
}

export default function CustomersPage({ onNavigateModule }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");

  const [selectedId, setSelectedId] = useState(null);
  const [sales, setSales] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [mobileView, setMobileView] = useState("directory");

  const [formMode, setFormMode] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const timer = useRef(null);
  const reqSeq = useRef(0);
  const detailSeq = useRef(0);
  const initialSearchRun = useRef(true);

  const loadCustomers = useCallback(async (q = "") => {
    const seq = ++reqSeq.current;
    setLoading(true);
    setError("");
    try {
      const data = await fetchCustomers(q);
      if (seq !== reqSeq.current) return;
      setCustomers(data || []);
    } catch (err) {
      if (seq !== reqSeq.current) return;
      setError(err instanceof ApiError ? err.message : "Unable to load customers.");
      setCustomers([]);
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (initialSearchRun.current) {
      initialSearchRun.current = false;
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => loadCustomers(search), 350);
    return () => clearTimeout(timer.current);
  }, [search, loadCustomers]);

  const filtered = useMemo(
    () => customers.filter((c) => matchesTier(c, tierFilter)),
    [customers, tierFilter]
  );

  const selected = useMemo(
    () => customers.find((c) => c.id === selectedId) || null,
    [customers, selectedId]
  );

  const loadDetail = useCallback(async (id) => {
    const seq = ++detailSeq.current;
    setDetailLoading(true);
    setDetailError(false);
    setSales(null);
    setReminders(null);
    try {
      const [s, r] = await Promise.all([fetchCustomerPurchases(id), fetchCustomerReminders(id)]);
      if (seq !== detailSeq.current) return;
      setSales(s || []);
      setReminders(r || []);
    } catch {
      if (seq !== detailSeq.current) return;
      setSales([]);
      setReminders([]);
      setDetailError(true);
    } finally {
      if (seq === detailSeq.current) setDetailLoading(false);
    }
  }, []);

  const selectCustomer = useCallback(
    (customer) => {
      setSelectedId(customer.id);
      setMobileView("workspace");
      loadDetail(customer.id);
    },
    [loadDetail]
  );

  const summary = useMemo(() => {
    if (!sales) return null;
    const totalSpending = sales.reduce((n, s) => n + Number(s.payable_amount ?? s.total_amount ?? 0), 0);
    return { totalSpending };
  }, [sales]);

  const openAdd = () => {
    setFormError("");
    setFormMode("add");
  };

  const openEdit = () => setFormMode("edit");

  const handleSubmit = async (payload) => {
    if (!payload.name || !payload.phone) {
      setFormError("Name and phone are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (formMode === "edit" && selected) {
        const updated = await updateCustomer(selected.id, payload);
        setCustomers((prev) => prev.map((c) => (c.id === selected.id ? { ...c, ...updated } : c)));
      } else {
        const created = await createCustomer(payload);
        setCustomers((prev) => [created, ...prev]);
        if (created?.id) {
          setSelectedId(created.id);
          setMobileView("workspace");
          loadDetail(created.id);
        }
      }
      setFormMode(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? formatFieldErrors(err.data) || err.message : "Unable to save the customer.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    setFormError("");
    try {
      await deleteCustomer(selected.id);
      setCustomers((prev) => prev.filter((c) => c.id !== selected.id));
      setSelectedId(null);
      setMobileView("directory");
      setFormMode(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Unable to delete the customer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cust-scope flex flex-col gap-4 w-full max-w-[1440px] mx-auto min-h-[calc(100vh-56px)]">
      {error && (
        <div className="cust-error-banner mx-5 mt-5 shrink-0" style={{ margin: "20px 20px 0" }}>
          <span>Could not load customers: {error}</span>
          <button
            type="button"
            onClick={() => loadCustomers(search)}
            className="ent-btn ent-btn-ghost ent-btn-sm shrink-0"
          >
            Retry
          </button>
        </div>
      )}
      <div className="cust-page flex-1 min-h-0" style={{ paddingTop: error ? 0 : 20 }}>
        <div className={`cust-dir-col min-h-0 ent-card ${mobileView === "directory" ? "flex" : "hidden"} lg:flex`} style={{ flexDirection: "column", overflow: "hidden" }}>
          <CustomerDirectory
            customers={filtered}
            selected={selected}
            summary={summary}
            loading={loading}
            search={search}
            onSearch={setSearch}
            tierFilter={tierFilter}
            onTierFilter={setTierFilter}
            onAdd={openAdd}
            onSelect={selectCustomer}
          />
        </div>
        <div className={`cust-ws-col min-h-0 ent-card ${mobileView === "workspace" && selected ? "flex" : "hidden"} lg:flex`} style={{ flexDirection: "column", overflow: "hidden" }}>
          {selected ? (
            <CustomerWorkspace
              customer={selected}
              sales={sales}
              reminders={reminders}
              detailLoading={detailLoading}
              detailError={detailError}
              onRetry={() => loadDetail(selected.id)}
              onEdit={openEdit}
              onOpenCRM={() => onNavigateModule && onNavigateModule("crm")}
              onBack={() => setMobileView("directory")}
            />
          ) : (
            <div className="flex-1 hidden lg:flex flex-col items-center justify-center text-center" style={{ padding: 40 }}>
              <span className="ent-empty-icon" style={{ width: 48, height: 48 }}>
                <UserX size={24} strokeWidth={1.75} />
              </span>
              <p className="text-[15px] font-semibold" style={{ color: "var(--ct-ink)" }}>Select a customer</p>
              <p className="text-[13px] font-normal mt-1 max-w-[300px]" style={{ color: "var(--ct-ink-muted)" }}>
                Choose someone from the directory to view their profile, purchases and membership.
              </p>
            </div>
          )}
        </div>
      </div>
      <CustomerFormModal
        mode={formMode}
        customer={formMode === "edit" ? selected : null}
        saving={saving}
        error={formError}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        onClose={() => setFormMode(null)}
      />
    </div>
  );
}
