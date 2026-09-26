import { Award, Home, LogOut, ReceiptText, UserRound } from "lucide-react";
import { displayName, initials } from "../customerData";

export const NAV_ITEMS = [
  { key: "home", label: "Home", icon: Home, target: "portal-home" },
  { key: "purchases", label: "Purchases", icon: ReceiptText, target: "portal-purchases" },
  { key: "benefits", label: "Benefits", icon: Award, target: "portal-benefits" },
  { key: "profile", label: "Profile", icon: UserRound, target: "portal-profile" },
];

/* Portal-scoped smooth scroll (no global CSS — staff app unaffected). */
export function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

function handleAnchorClick(e, target) {
  e.preventDefault();
  scrollToSection(target);
}

function BrandMark({ size = 36 }) {
  return (
    <span
      className="portal-grad-bg text-white inline-flex items-center justify-center shrink-0 rounded-xl"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m10.5 20.5 9-9a4.5 4.5 0 0 0-6.4-6.4l-9 9a4.5 4.5 0 0 0 6.4 6.4Z" />
        <path d="m8.5 10.5 5 5" />
      </svg>
    </span>
  );
}

export { BrandMark };

export function SideNav({ active, user, onLogout }) {
  const name = displayName(user);
  return (
    <aside className="hidden lg:flex w-[260px] shrink-0 flex-col bg-[var(--portal-surface)] border-r border-[var(--portal-line)] min-h-screen sticky top-0 h-screen">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-2">
        <BrandMark />
        <div className="min-w-0">
          <p className="text-[15px] font-bold tracking-tight leading-tight text-[var(--portal-ink)]">Pharvo</p>
          <p className="text-[11px] font-medium leading-tight mt-0.5 text-[var(--portal-ink-subtle)]">My Pharmacy</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1 px-3 mt-5" aria-label="Customer portal">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <a
              key={item.key}
              href={`#${item.target}`}
              onClick={(e) => handleAnchorClick(e, item.target)}
              aria-current={isActive ? "true" : undefined}
              className={`portal-focus relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer min-h-[44px] ${
                isActive
                  ? "bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]"
                  : "text-[var(--portal-ink-muted)] hover:bg-[var(--portal-surface-2)] hover:text-[var(--portal-ink)]"
              }`}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-full bg-[var(--portal-accent)]"
                  aria-hidden="true"
                />
              )}
              <Icon size={19} strokeWidth={1.75} />
              {item.label}
            </a>
          );
        })}
      </nav>
      <div className="mt-auto p-4 border-t border-[var(--portal-line)]">
        <div className="flex items-center gap-2.5 px-1.5 pb-3 min-w-0">
          <span className="w-9 h-9 rounded-full bg-[var(--portal-accent-soft)] text-[var(--portal-accent)] inline-flex items-center justify-center text-xs font-bold shrink-0">
            {initials(name)}
          </span>
          <p className="text-[13px] font-semibold truncate min-w-0 text-[var(--portal-ink)]">{name}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="portal-focus w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--portal-surface-2)] border border-[var(--portal-line)] hover:border-[var(--portal-line-strong)] text-[var(--portal-ink-muted)] hover:text-[var(--portal-ink)] text-[13px] font-semibold transition-all duration-200 cursor-pointer min-h-[44px]"
        >
          <LogOut size={16} strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function TopBar({ user, onLogout }) {
  const name = displayName(user);
  return (
    <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-[var(--portal-line)]">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <BrandMark size={32} />
        <p className="text-[15px] font-bold tracking-tight text-[var(--portal-ink)]">Pharvo</p>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-8 h-8 rounded-full bg-[var(--portal-accent-soft)] text-[var(--portal-accent)] inline-flex items-center justify-center text-[11px] font-bold">
            {initials(name)}
          </span>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Sign out"
            className="portal-focus p-2.5 rounded-xl text-[var(--portal-ink-muted)] hover:bg-[var(--portal-surface-2)] hover:text-[var(--portal-ink)] transition-colors duration-200 cursor-pointer min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
          >
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}

export function BottomNav({ active }) {
  return (
    <nav
      aria-label="Customer portal"
      className="lg:hidden fixed bottom-0 inset-x-0 z-20 portal-glass border-t border-[var(--portal-line)] px-2 pt-1.5"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      <div className="grid grid-cols-4 gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <a
              key={item.key}
              href={`#${item.target}`}
              onClick={(e) => handleAnchorClick(e, item.target)}
              aria-current={isActive ? "true" : undefined}
              className={`portal-focus relative flex flex-col items-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition-all duration-200 cursor-pointer min-h-[52px] justify-center ${
                isActive ? "text-[var(--portal-accent)]" : "text-[var(--portal-ink-subtle)] hover:text-[var(--portal-ink-muted)]"
              }`}
            >
              {isActive && (
                <span
                  className="absolute top-0.5 w-1 h-1 rounded-full bg-[var(--portal-accent)]"
                  aria-hidden="true"
                />
              )}
              <Icon size={20} strokeWidth={1.75} />
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
