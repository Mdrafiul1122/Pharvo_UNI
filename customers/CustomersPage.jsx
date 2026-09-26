import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search,
  Users,
  Heart,
  UserPlus,
  Eye,
  Edit2,
  X,
  AlertTriangle,
  PackageX,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShoppingBag,
  CreditCard,
  Award,
} from "lucide-react";
import { fetchCustomers, createCustomer, updateCustomer } from "../services/customer";
import { fetchSales } from "../services/pos";
import { ApiError } from "../services/api";
import { Card, CardHeader, StatCard, EmptyState, LoadingState, PageTitle } from "../components/ui/Blocks";

const TIER_OPTIONS = ["All", "Bronze", "Silver", "Gold", "Non-member"];
const STATUS_OPTIONS = ["All", "New", "Active", "Inactive"];

const TIER_META = {
  bronze: { label: "Bronze", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  silver: { label: "Silver", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  gold: { label: "Gold", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
};

const STATUS_META = {
  New: "bg-blue-50 text-blue-700 border-blue-200",
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Inactive: "bg-red-50 text-red-700 border-red-200",
};

const PAYMENT_LABEL = { cash: "Cash", card: "Card", bkash: "bKash", nagad: "Nagad" };

function tierLabel(tier) {
  return (TIER_META[tier] || {}).label || "Non-member";
}

function Badge({ cls, children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${cls}`}>
      {children}
    </span>
  );
}

function initials(name) {
  return name ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "CU";
}

const BLANK_FORM = {
  name: "",
  phone: "",
  email: "",
  address: "",
  date_of_birth: "",
  membership_tier: "",
  notes: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [profileSales, setProfileSales] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);

  const [modalMode, setModalMode] = useState(null); // null | "add" | "edit"
  const [form, setForm] = useState(BLANK_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const timer = useRef(null);
  const reqSeq = useRef(0);
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

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const tierMatch =
        tierFilter === "All" ||
        (tierFilter === "Non-member" ? !c.is_member : tierLabel(c.membership_tier) === tierFilter);
      const statusMatch = statusFilter === "All" || c.status === statusFilter;
      return tierMatch && statusMatch;
    });
  }, [customers, tierFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: customers.length,
      members: customers.filter((c) => c.is_member).length,
      active: customers.filter((c) => c.status === "Active").length,
      new: customers.filter((c) => c.status === "New").length,
    };
  }, [customers]);

  const openProfile = async (customer) => {
    setSelectedCustomer(customer);
    setProfileSales([]);
    setProfileLoading(true);
    try {
      const sales = await fetchSales({ customer: customer.id });
      setProfileSales(sales || []);
    } catch (err) {
      setProfileSales([]);
    } finally {
      setProfileLoading(false);
    }
  };

  const openAdd = () => {
    setForm(BLANK_FORM);
    setFormError("");
    setModalMode("add");
  };

  const openEdit = (customer) => {
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      date_of_birth: customer.date_of_birth || "",
      membership_tier: customer.membership_tier || "",
      notes: customer.notes || "",
    });
    setEditingId(customer.id);
    setFormError("");
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormError("");
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setFormError("Name and phone are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || `${form.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        address: form.address.trim() || "—",
        date_of_birth: form.date_of_birth || null,
        membership_tier: form.membership_tier,
        notes: form.notes.trim(),
      };
      if (modalMode === "edit" && editingId) {
        await updateCustomer(editingId, payload);
      } else {
        await createCustomer(payload);
      }
      closeModal();
      loadCustomers(search);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Unable to save the customer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        title="Customer Management"
        subtitle="Search, filter and manage customer profiles, membership and purchase history"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Customers" value={stats.total.toLocaleString()} sub="Registered customers" icon={Users} tone="blue" />
        <StatCard label="Loyalty Members" value={stats.members.toLocaleString()} sub="Bronze / Silver / Gold" icon={Award} tone="amber" />
        <StatCard label="Active" value={stats.active.toLocaleString()} sub="Purchased recently" icon={Heart} tone="green" />
        <StatCard label="New" value={stats.new.toLocaleString()} sub="No purchases yet" icon={UserPlus} tone="violet" />
      </div>

      <Card>
        <CardHeader
          title="Customers"
          subtitle="All registered customer profiles"
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, phone or email..."
                  className="w-44 sm:w-56 pl-9 pr-3 py-2 text-xs font-normal rounded-lg border border-slate-200 outline-none focus:border-blue-400 bg-white"
                />
              </div>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer"
              >
                {TIER_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t === "All" ? "All Tiers" : t}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s === "All" ? "All Status" : s}</option>
                ))}
              </select>
              <button
                onClick={openAdd}
                className="h-[34px] px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <UserPlus size={14} />
                Add Customer
              </button>
            </div>
          }
        />

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-200 text-xs text-red-700 font-medium">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <LoadingState label="Loading customers..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={PackageX}
            title={customers.length === 0 ? "No customers yet" : "No customers match"}
            subtitle={
              customers.length === 0
                ? "Add your first customer to get started."
                : "Try adjusting the search or filters."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Phone</th>
                  <th className="px-3 py-2.5">Email</th>
                  <th className="px-3 py-2.5">Membership</th>
                  <th className="px-3 py-2.5 text-right">Purchases</th>
                  <th className="px-3 py-2.5">Last Purchase</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-[11px] flex items-center justify-center shrink-0">
                          {initials(c.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[13px] text-slate-900 leading-snug">{c.name}</div>
                          <div className="text-[11px] text-slate-400 font-normal">ID #{c.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600 font-normal whitespace-nowrap">{c.phone}</td>
                    <td className="px-3 py-3 text-slate-500 font-normal">{c.email || "—"}</td>
                    <td className="px-3 py-3">
                      {c.is_member ? (
                        <Badge cls={TIER_META[c.membership_tier]?.cls || "bg-slate-100 text-slate-600 border-slate-200"}>
                          {tierLabel(c.membership_tier)}
                        </Badge>
                      ) : (
                        <Badge cls="bg-slate-100 text-slate-500 border-slate-200">Non-member</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                      {Number(c.total_purchases || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-slate-500 font-normal whitespace-nowrap">{c.last_purchase || "—"}</td>
                    <td className="px-3 py-3">
                      <Badge cls={STATUS_META[c.status] || "bg-slate-100 text-slate-500 border-slate-200"}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openProfile(c)}
                          title="View profile"
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          title="Edit customer"
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-slate-100 text-[12px] text-slate-400 font-normal flex items-center justify-between">
              <span>{filtered.length} of {customers.length} customers</span>
              <span>Members receive tier-based benefits at checkout</span>
            </div>
          </div>
        )}
      </Card>

      {/* ─── Customer Profile Modal ─── */}
      {selectedCustomer && !modalMode && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {initials(selectedCustomer.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {selectedCustomer.is_member ? (
                      <Badge cls={TIER_META[selectedCustomer.membership_tier]?.cls || "bg-slate-100 text-slate-600 border-slate-200"}>
                        {tierLabel(selectedCustomer.membership_tier)} Member
                      </Badge>
                    ) : (
                      <Badge cls="bg-slate-100 text-slate-500 border-slate-200">Non-member</Badge>
                    )}
                    <Badge cls={STATUS_META[selectedCustomer.status] || "bg-slate-100 text-slate-500 border-slate-200"}>
                      {selectedCustomer.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => openEdit(selectedCustomer)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="flex items-center gap-2.5 bg-slate-50/70 border border-slate-100 rounded-xl p-3">
                  <Phone size={15} className="text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Phone</div>
                    <div className="text-xs font-medium text-slate-800 truncate">{selectedCustomer.phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50/70 border border-slate-100 rounded-xl p-3">
                  <Mail size={15} className="text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Email</div>
                    <div className="text-xs font-medium text-slate-800 truncate">{selectedCustomer.email || "—"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50/70 border border-slate-100 rounded-xl p-3">
                  <MapPin size={15} className="text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Address</div>
                    <div className="text-xs font-medium text-slate-800 truncate">{selectedCustomer.address || "—"}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-2xl font-bold text-blue-600 tracking-tight">{Number(selectedCustomer.total_purchases || 0).toLocaleString()}</div>
                  <div className="text-[12px] text-slate-500 font-normal mt-0.5">Total Purchases</div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">{selectedCustomer.last_purchase || "—"}</div>
                  <div className="text-[12px] text-slate-500 font-normal mt-0.5">Last Purchase</div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">{selectedCustomer.member_since || "—"}</div>
                  <div className="text-[12px] text-slate-500 font-normal mt-0.5">Member Since</div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">{Number(selectedCustomer.loyalty_points || 0).toLocaleString()}</div>
                  <div className="text-[12px] text-slate-500 font-normal mt-0.5">Loyalty Points</div>
                </div>
              </div>

              {selectedCustomer.date_of_birth && (
                <div className="flex items-center gap-2 text-xs text-slate-600 font-normal">
                  <Calendar size={13} className="text-slate-400" />
                  <span>Date of Birth: {selectedCustomer.date_of_birth}</span>
                </div>
              )}

              {selectedCustomer.notes && (
                <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</div>
                  <p className="text-xs text-slate-700 font-normal leading-relaxed">{selectedCustomer.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Purchase History</h4>
                <span className="text-[12px] text-slate-400 font-normal">{profileSales.length} sale(s)</span>
              </div>

              {profileLoading ? (
                <LoadingState label="Loading purchase history..." />
              ) : profileSales.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <ShoppingBag size={32} className="text-slate-200 mb-2" strokeWidth={1.5} />
                  <p className="text-xs font-normal">No purchases recorded for this customer.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {profileSales.map((s) => (
                    <div key={s.id} className="border border-slate-200 rounded-xl p-3.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px] font-semibold text-blue-600">{s.invoice_number}</span>
                          <span className="text-[12px] text-slate-400 font-normal">{s.sale_date}</span>
                        </div>
                        <span className="font-semibold text-slate-900">৳{Number(s.payable_amount).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 text-[12px] text-slate-500 font-normal flex-wrap">
                        <CreditCard size={12} className="text-slate-400" />
                        <span className="capitalize">{PAYMENT_LABEL[s.payment_method] || s.payment_method}</span>
                        <span className="text-slate-300">•</span>
                        <span>{Array.isArray(s.items) ? s.items.length : 0} item(s)</span>
                      </div>
                      {Array.isArray(s.items) && s.items.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1">
                          {s.items.map((it, i) => (
                            <div key={i} className="flex justify-between text-[12px] font-normal text-slate-600">
                              <span>{it.product_name} × {it.quantity}</span>
                              <span>৳{Number(it.subtotal).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Add / Edit Customer Modal ─── */}
      {modalMode && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-slate-900">{modalMode === "edit" ? "Edit Customer" : "Add New Customer"}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-4">
              {formError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Full Name <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Rafiq Ahmed"
                  className="w-full px-3 py-2 text-xs font-normal rounded-lg border border-slate-200 outline-none focus:border-blue-400 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Phone Number <span className="text-red-500">*</span></label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+880 1711-234567"
                  className="w-full px-3 py-2 text-xs font-normal rounded-lg border border-slate-200 outline-none focus:border-blue-400 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 text-xs font-normal rounded-lg border border-slate-200 outline-none focus:border-blue-400 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Address</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="e.g. Mirpur-10, Dhaka"
                  className="w-full px-3 py-2 text-xs font-normal rounded-lg border border-slate-200 outline-none focus:border-blue-400 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-normal rounded-lg border border-slate-200 outline-none focus:border-blue-400 bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Membership Tier</label>
                <select
                  value={form.membership_tier}
                  onChange={(e) => setForm((f) => ({ ...f, membership_tier: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 outline-none cursor-pointer"
                >
                  <option value="">Non-member</option>
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Allergies, preferences, care notes..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs font-normal rounded-lg border border-slate-200 outline-none focus:border-blue-400 bg-white resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Add Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
