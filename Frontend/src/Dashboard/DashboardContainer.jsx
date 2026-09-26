import { useEffect, useState } from "react";
import { Building2, RefreshCw } from "lucide-react";
import { ROLES } from "../services/auth";
import { AdminDashboard } from "./AdminDashboard";
import PharmacistDashboard from "./PharmacistDashboard";

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/* Role-based dashboard entry: single shared container that renders the
 * Admin (business health) or Pharmacist (dispensing workflow) view mode
 * from the authenticated role. Reuses the existing dashboard components
 * and API hooks — no backend changes. */
export default function DashboardContainer({ user, onPageChange, onRefreshNotifications }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const now = useNow();
  const isAdmin = user?.role === ROLES.ADMIN;

  function handleRefresh() {
    if (spinning) return;
    setSpinning(true);
    setRefreshKey((k) => k + 1);
    Promise.resolve()
      .then(() => onRefreshNotifications && onRefreshNotifications())
      .finally(() => setTimeout(() => setSpinning(false), 600));
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1440px] mx-auto">
      <header className="staff-card flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3.5">
        <span className="w-9 h-9 rounded-xl staff-grad-bg text-white inline-flex items-center justify-center shrink-0" aria-hidden="true">
          <Building2 size={18} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 mr-auto">
          <p className="text-sm font-bold text-[var(--pharvo-ink)] leading-tight">PHARVO Pharmacy</p>
          <p className="text-[11px] text-[var(--pharvo-ink-subtle)] font-normal leading-tight mt-0.5 tabular-nums">
            {now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            {" · "}
            {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className={`staff-pill ${isAdmin ? "staff-pill-accent-2" : "staff-pill-success"} uppercase tracking-wider !text-[11px]`}>
          {isAdmin ? "Admin" : "Pharmacist"}
        </span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={spinning}
          className="staff-focus inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--pharvo-line)] bg-[var(--pharvo-surface)] text-[var(--pharvo-ink)] hover:border-[var(--pharvo-line-strong)] text-xs font-semibold transition-all duration-200 cursor-pointer disabled:opacity-60 min-h-[44px]"
        >
          <RefreshCw size={14} className={spinning ? "animate-spin" : ""} />
          Refresh Data
        </button>
      </header>

      <section aria-label={isAdmin ? "Admin dashboard" : "Pharmacist dashboard"}>
        {isAdmin ? (
          <AdminDashboard
            key={`admin-${refreshKey}`}
            user={user || {}}
            onPageChange={onPageChange}
            onRefreshNotifications={onRefreshNotifications}
          />
        ) : (
          <PharmacistDashboard
            key={`pharmacist-${refreshKey}`}
            user={user || {}}
            onPageChange={onPageChange}
            onRefreshNotifications={onRefreshNotifications}
          />
        )}
      </section>
    </div>
  );
}
