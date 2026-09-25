import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Phone, ReceiptText, Repeat, Sparkles } from "lucide-react";
import { clearStoredTokens, fetchMe, getStoredUser } from "../services/auth";
import { fetchSales } from "../services/pos";
import {
  displayName,
  firstName,
  formatMoney,
  greeting,
  initials,
  linkCustomerRecord,
  mySales,
  normaliseTier,
  summarise,
} from "./customerData";
import { useCountUp } from "./components/CountUp";
import "./tokens.css";
import { BottomNav, SideNav, TopBar, scrollToSection } from "./components/PortalChrome";
import WelcomeHero, { HeroStats, timeAgo } from "./components/WelcomeHero";
import MembershipCard from "./components/MembershipCard";
import PurchaseList, { methodLabel } from "./components/PurchaseList";
import ProfileSection, { ProfileCompact } from "./components/ProfileSection";
import { EmptyState, ErrorState, LoadingCards, LoadingState } from "./components/PortalStates";
import {
  PortalActivityRow,
  PortalCard,
  PortalDrawer,
  PortalPill,
  PortalQuickAction,
  PortalSectionHeader,
} from "./components/PortalBlocks";

function SectionHead({ title, subtitle, action }) {
  return <PortalSectionHeader title={title} subtitle={subtitle} action={action} />;
}

function TextButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="portal-focus inline-flex items-center text-[13px] font-semibold text-[var(--portal-accent)] hover:opacity-80 cursor-pointer shrink-0 rounded min-h-[44px]"
    >
      {children}
    </button>
  );
}

function SavingsBanner({ total }) {
  const animated = useCountUp(Number(total) || 0, 1000);
  return (
    <PortalCard className="px-5 py-4" style={{ background: "var(--portal-success-soft)" }}>
      <p className="text-sm font-bold tabular-nums flex items-center gap-2 text-[var(--portal-success)]">
        <Sparkles size={17} strokeWidth={1.75} aria-hidden="true" />
        You have saved ৳{Math.round(animated).toLocaleString()} so far
      </p>
      <p className="text-[12px] font-normal mt-1 text-[var(--portal-success)] opacity-80">Total discounts across your purchases.</p>
    </PortalCard>
  );
}

const SPY_SECTIONS = ["home", "purchases", "benefits", "profile"];

export default function CustomerPortal() {
  const [user, setUser] = useState(() => getStoredUser());
  const [allSales, setAllSales] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [showAllPurchases, setShowAllPurchases] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      setError("");
      try {
        const [me, sales] = await Promise.all([fetchMe(), fetchSales()]);
        if (cancelled) return;
        setUser(me);
        setAllSales(Array.isArray(sales) ? sales : []);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || "We could not reach the pharmacy service. Please try again.");
        setStatus("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const record = useMemo(() => linkCustomerRecord(user, allSales), [user, allSales]);
  const mine = useMemo(() => mySales(user, allSales), [user, allSales]);
  const summary = useMemo(() => summarise(mine), [mine]);

  /* Scroll-spy: highlight the nav item for the section in view. */
  useEffect(() => {
    if (status !== "ready") return;
    const els = SPY_SECTIONS.map((key) => document.getElementById(`portal-${key}`)).filter(Boolean);
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.dataset.section);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [status, summary.count]);

  const closeDrawer = useCallback(() => setDrawer(null), []);

  function handleLogout() {
    clearStoredTokens();
    window.location.assign("/");
  }

  /* Activity timeline derived honestly from sales data only:
   * purchase + payment events from the latest receipts, capped at 5. */
  const timeline = useMemo(() => {
    const events = [];
    for (const sale of summary.sorted.slice(0, 3)) {
      const at = sale.created_at || sale.sale_date;
      const items = Array.isArray(sale.items) ? sale.items : [];
      const itemCount = items.reduce((n, it) => n + Number(it.quantity || 0), 0);
      const payments = Array.isArray(sale.payments) ? sale.payments : [];
      const paidVia =
        payments.length > 0
          ? payments.map((p) => methodLabel(p.method)).filter(Boolean).join(", ")
          : methodLabel(sale.payment_method);
      const key = sale.id ?? sale.invoice_number;
      events.push({
        id: `${key}-placed`,
        tone: "accent",
        text: `Purchase · ${itemCount} item${itemCount === 1 ? "" : "s"}${sale.invoice_number ? ` · #${sale.invoice_number}` : ""}`,
        at,
      });
      events.push({
        id: `${key}-paid`,
        tone: "success",
        text: `Paid ${formatMoney(sale.payable_amount ?? sale.total_amount)}${paidVia ? ` via ${paidVia}` : ""}`,
        at,
      });
    }
    return events.slice(0, 5);
  }, [summary]);

  const hasRecentActivity = useMemo(() => {
    const latest = summary.latest;
    if (!latest) return false;
    const at = new Date(latest.created_at || latest.sale_date).getTime();
    return !Number.isNaN(at) && Date.now() - at < 7 * 86400000;
  }, [summary]);

  const name = displayName(user);
  const tier = normaliseTier(record?.membership_tier);
  const points = record?.loyalty_points ?? 0;
  const latestSale = summary.sorted[0] || null;
  const latestId = latestSale ? latestSale.id ?? latestSale.invoice_number : null;
  const visibleSales = showAllPurchases ? summary.sorted : summary.sorted.slice(0, 3);

  const quickActions = [
    {
      icon: Repeat,
      label: "Reorder last",
      onClick: () => {
        if (latestId) setExpandedId(latestId);
        scrollToSection("portal-purchases");
      },
    },
    {
      icon: ReceiptText,
      label: "View invoice",
      onClick: () => scrollToSection("portal-purchases"),
    },
    {
      icon: Phone,
      label: "Contact pharmacy",
      onClick: () => scrollToSection("portal-profile"),
    },
  ];

  return (
    <div className="portal-root min-h-screen font-sans lg:flex lg:items-stretch">
      <SideNav active={activeSection} user={user} onLogout={handleLogout} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar user={user} onLogout={handleLogout} />
        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 lg:pb-12">
          <div className="flex flex-col gap-5">
          {status === "loading" && (
            <>
              <LoadingState label="Preparing your pharmacy space..." />
              <div className="mt-6">
                <LoadingCards count={3} />
              </div>
            </>
          )}

          {status === "error" && (
            <ErrorState message={error} onRetry={() => window.location.reload()} />
          )}

          {status === "ready" && (
            <>
              {/* Header bar */}
              <div id="portal-home" data-section="home" className="portal-section flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="w-9 h-9 rounded-full bg-[var(--portal-accent-soft)] text-[var(--portal-accent)] inline-flex items-center justify-center text-xs font-bold shrink-0" aria-hidden="true">
                  {initials(name)}
                </span>
                <p className="text-sm font-semibold text-[var(--portal-ink)] truncate flex-1 min-w-[120px]">
                  {greeting()}, {firstName(user)}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <PortalPill tone="accent">{tier || "Member"}</PortalPill>
                  <PortalPill tone="accent-2">
                    <span className="tabular-nums">{Number(points).toLocaleString()} pts</span>
                  </PortalPill>
                  <button
                    type="button"
                    onClick={() => scrollToSection(timeline.length > 0 ? "portal-activity" : "portal-purchases")}
                    aria-label="Recent activity"
                    className="portal-focus relative p-2.5 rounded-xl bg-[var(--portal-surface)] border border-[var(--portal-line)] text-[var(--portal-ink-muted)] hover:text-[var(--portal-ink)] transition-colors duration-200 cursor-pointer min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
                  >
                    <Bell size={18} strokeWidth={1.75} />
                    {hasRecentActivity && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--portal-danger)]" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Hero row: greeting (5) + stats (7) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5 min-w-0">
                  <WelcomeHero user={user} record={record} />
                </div>
                <div className="lg:col-span-7 min-w-0">
                  <HeroStats summary={summary} loading={false} />
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {quickActions.map((action) => (
                  <PortalQuickAction
                    key={action.label}
                    icon={action.icon}
                    label={action.label}
                    onClick={action.onClick}
                  />
                ))}
              </div>

              {/* Recent purchases */}
              <section id="portal-purchases" data-section="purchases" className="portal-section" aria-label="Recent purchases">
                <SectionHead
                  title="Recent purchases"
                  subtitle={
                    summary.count > 0
                      ? showAllPurchases
                        ? `All ${summary.count} purchase${summary.count === 1 ? "" : "s"}`
                        : `Latest ${Math.min(3, summary.count)} of ${summary.count}`
                      : undefined
                  }
                  action={
                    summary.count > 3 ? (
                      <TextButton onClick={() => setShowAllPurchases((v) => !v)}>
                        {showAllPurchases ? "Show less" : "View all →"}
                      </TextButton>
                    ) : undefined
                  }
                />
                <PurchaseList
                  sales={visibleSales}
                  loading={false}
                  expandedId={expandedId}
                  onToggle={(id) => setExpandedId((p) => (p === id ? null : id))}
                  layout="grid"
                />
              </section>

              {/* Membership strip + savings */}
              <section id="portal-benefits" data-section="benefits" className="portal-section flex flex-col gap-5" aria-label="Benefits">
                <MembershipCard record={record} compact onAction={() => setDrawer("benefits")} />
                {summary.count > 0 && summary.totalSaved > 0 && (
                  <SavingsBanner total={summary.totalSaved} />
                )}
                {summary.count === 0 && (
                  <EmptyState
                    icon={ReceiptText}
                    title="Benefits grow with your visits"
                    subtitle="Make your first counter purchase and your totals, savings and history will bloom here."
                  />
                )}
              </section>

              {/* Activity timeline */}
              {timeline.length > 0 && (
                <section id="portal-activity" aria-label="Recent activity">
                  <SectionHead title="Recent activity" subtitle="Your latest pharmacy events" />
                  <ul className="portal-card px-4 py-1.5 divide-y divide-[var(--portal-line)]">
                    {timeline.map((event) => (
                      <PortalActivityRow
                        key={event.id}
                        tone={event.tone}
                        text={event.text}
                        time={timeAgo(event.at)}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {/* Profile block */}
              <section id="portal-profile" data-section="profile" className="portal-section" aria-label="Profile">
                <div className="mb-3">
                  <h2 className="text-base font-bold tracking-tight text-[var(--portal-ink)]">Profile</h2>
                </div>
                <ProfileCompact user={user} record={record} onEdit={() => setDrawer("profile")} />
              </section>
            </>
          )}
          </div>
        </main>
        <BottomNav active={activeSection} />
      </div>

      <PortalDrawer open={drawer === "benefits"} onClose={closeDrawer} title="Benefits">
        <MembershipCard record={record} />
        {summary.count > 0 && summary.totalSaved > 0 && (
          <div className="mt-4">
            <SavingsBanner total={summary.totalSaved} />
          </div>
        )}
      </PortalDrawer>

      <PortalDrawer open={drawer === "profile"} onClose={closeDrawer} title="Profile">
        <ProfileSection user={user} record={record} onLogout={handleLogout} />
      </PortalDrawer>
    </div>
  );
}
