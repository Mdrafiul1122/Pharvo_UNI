import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Bot,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Users,
  HeartHandshake,
  ClipboardList,
  BarChart3,
  Settings,
  Shield,
  X,
  User as UserIcon,
  Menu,
  Search,
  CircleHelp,
  Sparkles,
  ChevronsUpDown,
} from "lucide-react";
import { ROLES } from "../../services/auth";
import {
  fetchNotifications,
  markAllNotificationsRead,
} from "../../services/notifications";
import { EntKbd } from "../../components/ui/EnterpriseKit";

const NAV_SECTIONS = [
  {
    label: "MAIN MENU",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { key: "pos", label: "POS / Sales", icon: ShoppingCart },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { key: "medicines-inventory", label: "Medicines & Inventory", icon: Pill },
      { key: "customers", label: "Customers", icon: Users },
      { key: "crm", label: "CRM", icon: HeartHandshake },
    ],
  },
  {
    label: "BUSINESS",
    items: [
      { key: "orders", label: "Orders", icon: ClipboardList },
      { key: "reports", label: "Reports", icon: BarChart3 },
      { key: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "ACCOUNT",
    items: [{ key: "settings", label: "Settings", icon: Settings }],
  },
];

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

function userDisplayName(user) {
  if (!user) return "User";
  if (user.full_name) return user.full_name;
  const joined = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return joined || user.username || "User";
}

function severityDot(severity) {
  if (severity === "critical") return "bg-[var(--pharvo-danger)]";
  if (severity === "warning") return "bg-[var(--pharvo-warning)]";
  if (severity === "success") return "bg-[var(--pharvo-success)]";
  return "bg-[var(--pharvo-accent)]";
}

const todayLabel = () => {
  try {
    return new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
};

export default function AppShell({
  active,
  title,
  subtitle,
  user,
  unreadCount = 0,
  onNavigate,
  onLogout,
  children,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [notifications, setNotifications] = useState([]);

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);
  const orgMenuRef = useRef(null);

  const isAdmin = user?.role === ROLES.ADMIN;
  const displayName = userDisplayName(user);

  const loadNotifications = useCallback(() => {
    fetchNotifications()
      .then((data) => setNotifications(data || []))
      .catch(() => setNotifications([]));
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    setMobileOpen(false);
  }, [active]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
      if (orgMenuRef.current && !orgMenuRef.current.contains(e.target)) setShowOrgMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleMarkAllRead = () => {
    markAllNotificationsRead()
      .catch(() => {})
      .finally(() => {
        setShowNotif(false);
        onNavigate("notifications");
      });
  };

  const initials = (name) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "U";

  const paletteGroups = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    const match = (label) => !q || label.toLowerCase().includes(q);
    const groups = NAV_SECTIONS.map((section) => ({
      label: section.label,
      items: section.items
        .filter((item) => match(item.label))
        .map((item) => ({ key: item.key, label: item.label, icon: <item.icon size={16} strokeWidth={1.75} />, hint: "↵" })),
    })).filter((g) => g.items.length > 0);
    const aiItem = { key: "ai-assistant", label: "AI Assistant", icon: <Bot size={16} strokeWidth={1.75} />, hint: "⌘K" };
    if (match("AI Assistant")) {
      groups.unshift({ label: "AI", items: [aiItem] });
    }
    return groups;
  }, [paletteQuery]);

  const openPalette = () => {
    setPaletteQuery("");
    setPaletteOpen(true);
  };

  const goPalette = (item) => {
    setPaletteOpen(false);
    onNavigate(item.key);
  };

  const renderNavItem = (item, { rail = false } = {}) => {
    const Icon = item.icon;
    const isActive = active === item.key;
    const isNotifications = item.key === "notifications";
    return (
      <button
        key={item.key}
        type="button"
        title={rail ? item.label : undefined}
        onClick={() => onNavigate(item.key)}
        aria-current={isActive ? "page" : undefined}
        className="ent-shell-navitem"
        style={{ justifyContent: rail ? "center" : "flex-start", padding: rail ? "6px" : "6px 12px" }}
      >
        <span className="relative shrink-0" aria-hidden="true" style={{ color: isActive ? "var(--pharvo-ink)" : "var(--pharvo-ink-muted)", display: "inline-flex" }}>
          <Icon size={18} strokeWidth={1.75} />
          {isNotifications && unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--pharvo-danger)] text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </span>
        {!rail && (
          <>
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {item.label}
            </span>
            {isNotifications && unreadCount > 0 && (
              <span className="ent-pill ent-pill-danger shrink-0 tabular-nums" style={{ padding: "1px 8px" }}>
                {unreadCount}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  const sidebar = (
    <aside
      style={{ width: collapsed ? 64 : 240 }}
      className="flex-shrink-0 h-full bg-[var(--pharvo-surface)] border-r border-[var(--pharvo-line)] flex flex-col justify-between transition-all relative z-20"
    >
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        {/* Brand block 64px */}
        <div className={`h-16 flex items-center ${collapsed ? "justify-center px-2" : "justify-between pl-4 pr-2"} border-b border-[var(--pharvo-line)] flex-shrink-0`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-[10px] text-white inline-flex items-center justify-center shrink-0" style={{ background: "var(--pharvo-grad)" }} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m10.5 20.5 9-9a4.5 4.5 0 0 0-6.4-6.4l-9 9a4.5 4.5 0 0 0 6.4 6.4Z"/>
                <path d="m8.5 10.5 5 5"/>
              </svg>
            </span>
            {!collapsed && (
              <div className="min-w-0 flex items-center gap-1.5">
                <span className="text-[15px] font-bold text-[var(--pharvo-ink)] tracking-tight block leading-tight">Pharvo</span>
                <span className="ent-pill ent-pill-accent-2 shrink-0" style={{ fontSize: 10, padding: "1px 6px" }}>Enterprise</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              className="staff-focus p-2 rounded-lg hover:bg-[var(--pharvo-surface-2)] text-[var(--pharvo-ink-subtle)] hover:text-[var(--pharvo-ink)] cursor-pointer flex-shrink-0 transition-colors min-w-[32px] min-h-[32px] inline-flex items-center justify-center"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Org switcher */}
        {!collapsed ? (
          <div ref={orgMenuRef} className="relative px-3 pt-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowOrgMenu((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={showOrgMenu}
              className="staff-focus w-full flex items-center gap-2 px-2.5 py-2 rounded-[10px] border border-[var(--pharvo-line)] bg-[var(--pharvo-surface-2)] hover:border-[var(--pharvo-line-strong)] cursor-pointer transition-colors min-h-[40px]"
            >
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: "var(--pharvo-grad)" }} aria-hidden="true">P</span>
              <span className="min-w-0 flex-1 text-left">
                <span className="text-[12px] font-semibold text-[var(--pharvo-ink)] block leading-tight truncate">Pharvo Pharmacy</span>
                <span className="text-[11px] text-[var(--pharvo-ink-subtle)] block leading-tight truncate">Dhaka</span>
              </span>
              <ChevronsUpDown size={14} className="text-[var(--pharvo-ink-subtle)] shrink-0" />
            </button>
            {showOrgMenu && (
              <div className="absolute left-3 right-3 top-full mt-1 bg-[var(--pharvo-surface)] border border-[var(--pharvo-line)] rounded-[12px] shadow-[var(--pharvo-shadow-lg)] z-50 overflow-hidden py-1" role="menu">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--pharvo-ink-subtle)]">Organizations</div>
                <button type="button" onClick={() => setShowOrgMenu(false)} className="staff-focus w-full text-left px-3 py-2 hover:bg-[var(--pharvo-surface-2)] text-[13px] text-[var(--pharvo-ink)] font-medium cursor-pointer" role="menuitem">
                  Pharvo Pharmacy · Dhaka
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="px-2 pt-3 flex justify-center flex-shrink-0">
            <span className="w-8 h-8 rounded-[10px] text-white inline-flex items-center justify-center text-[12px] font-bold" style={{ background: "var(--pharvo-grad)" }} title="Pharvo Pharmacy · Dhaka" aria-hidden="true">P</span>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-4 scrollbar-thin min-h-0" aria-label="Staff">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              {!collapsed && (
                <span className="ent-shell-section-label">{section.label}</span>
              )}
              {section.items.map((item) => renderNavItem(item, { rail: collapsed }))}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom: AI Assistant pinned + user chip */}
      <div className="p-3 border-t border-[var(--pharvo-line)] flex flex-col gap-2 flex-shrink-0 bg-[var(--pharvo-surface)]">
        <button
          type="button"
          onClick={() => onNavigate("ai-assistant")}
          title={collapsed ? "AI Assistant" : undefined}
          aria-current={active === "ai-assistant" ? "page" : undefined}
          className="ent-shell-navitem"
          style={{ justifyContent: collapsed ? "center" : "flex-start", padding: collapsed ? 6 : "6px 12px", border: active === "ai-assistant" ? "1px solid var(--pharvo-line)" : "1px solid transparent", background: active === "ai-assistant" ? "var(--pharvo-surface-2)" : undefined }}
        >
          <span className="w-7 h-7 rounded-[8px] text-white inline-flex items-center justify-center shrink-0" style={{ background: "var(--pharvo-grad-ai)" }} aria-hidden="true">
            <Sparkles size={15} strokeWidth={1.75} />
          </span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-medium">AI Assistant</span>
              <EntKbd>⌘K</EntKbd>
            </>
          )}
        </button>

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="staff-focus w-full py-2 hover:bg-[var(--pharvo-surface-2)] rounded-[8px] text-[var(--pharvo-ink-subtle)] cursor-pointer flex justify-center transition-colors min-h-[36px] items-center"
          >
            <ChevronRight size={16} />
          </button>
        )}
        {isAdmin && !collapsed && (
          <a
            href="/admin/"
            className="staff-focus w-full flex items-center gap-3 px-3 py-1.5 rounded-[8px] text-[var(--pharvo-ink-muted)] hover:text-[var(--pharvo-ink)] hover:bg-[var(--pharvo-surface-2)] text-[13px] font-medium transition-colors min-h-[36px]"
          >
            <Shield size={15} strokeWidth={1.75} className="shrink-0" />
            <span>User Management</span>
          </a>
        )}

        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="staff-focus w-full flex items-center gap-2.5 p-1.5 rounded-[10px] hover:bg-[var(--pharvo-surface-2)] cursor-pointer select-none transition-colors min-h-[56px]"
            aria-haspopup="menu"
            aria-expanded={showUserMenu}
            title={collapsed ? displayName : undefined}
          >
            <span className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ background: "var(--pharvo-grad)" }} aria-hidden="true">
              {initials(displayName)}
            </span>
            {!collapsed && (
              <>
                <span className="text-left min-w-0 flex-1">
                  <span className="text-[13px] font-semibold text-[var(--pharvo-ink)] block leading-tight truncate">
                    {displayName}
                  </span>
                  <span className="ent-pill ent-pill-neutral capitalize" style={{ fontSize: 10, padding: "0 6px", marginTop: 2 }}>
                    {user?.role || "staff"}
                  </span>
                </span>
                <ChevronDown size={14} className="text-[var(--pharvo-ink-subtle)] shrink-0" />
              </>
            )}
          </button>

          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-[var(--pharvo-surface)] border border-[var(--pharvo-line)] rounded-[12px] shadow-[var(--pharvo-shadow-lg)] z-50 overflow-hidden" role="menu">
              <div className="px-4 py-3 border-b border-[var(--pharvo-line)] bg-[var(--pharvo-surface-2)]">
                <span className="text-[13px] font-bold text-[var(--pharvo-ink)] block truncate">
                  {displayName}
                </span>
                <span className="text-[11px] text-[var(--pharvo-ink-subtle)] font-normal block mt-0.5 truncate">
                  {user?.email || `@${user?.username || ""}`}
                </span>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate("settings");
                  }}
                  className="staff-focus w-full text-left px-4 min-h-[40px] hover:bg-[var(--pharvo-surface-2)] text-[13px] text-[var(--pharvo-ink)] font-medium flex items-center gap-2.5 cursor-pointer transition-colors"
                  role="menuitem"
                >
                  <UserIcon size={15} strokeWidth={1.75} className="text-[var(--pharvo-ink-subtle)]" />
                  <span>Profile Settings</span>
                </button>
              </div>
              <div className="border-t border-[var(--pharvo-line)] py-1">
                <button
                  type="button"
                  onClick={onLogout}
                  className="staff-focus w-full text-left px-4 min-h-[40px] hover:bg-[var(--pharvo-danger-soft)] text-[13px] text-[var(--pharvo-danger)] font-semibold flex items-center gap-2.5 cursor-pointer transition-colors"
                  role="menuitem"
                >
                  <LogOut size={15} strokeWidth={1.75} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--pharvo-bg)] font-sans text-[var(--pharvo-ink)]">
      <div className="hidden lg:block flex-shrink-0 h-screen">{sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="staff-drawer-backdrop absolute inset-0"
            onClick={() => setMobileOpen(false)}
          />
          <div className="staff-drawer-panel absolute inset-y-0 left-0 w-[260px] max-w-[85vw] bg-[var(--pharvo-surface)] shadow-xl">
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 flex-shrink-0 bg-[var(--pharvo-surface)] border-b border-[var(--pharvo-line)] flex items-center justify-between gap-3 px-4 sm:px-6 z-10" style={{ minHeight: 56 }}>
          <div className="min-w-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="staff-focus lg:hidden p-2.5 -ml-1 text-[var(--pharvo-ink-muted)] hover:text-[var(--pharvo-ink)] hover:bg-[var(--pharvo-surface-2)] rounded-xl cursor-pointer transition-colors min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu size={20} strokeWidth={1.75} />
            </button>
            <span className="lg:hidden w-8 h-8 rounded-[10px] text-white inline-flex items-center justify-center shrink-0" style={{ background: "var(--pharvo-grad)" }} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m10.5 20.5 9-9a4.5 4.5 0 0 0-6.4-6.4l-9 9a4.5 4.5 0 0 0 6.4 6.4Z"/>
                <path d="m8.5 10.5 5 5"/>
              </svg>
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 min-w-0">
                <h1 className="text-[15px] font-semibold text-[var(--pharvo-ink)] tracking-tight leading-tight truncate">
                  {title}
                </h1>
                <span className="hidden md:inline text-[12px] text-[var(--pharvo-ink-subtle)] font-normal whitespace-nowrap truncate">
                  Pharvo / {title}
                </span>
              </div>
              <p className="hidden sm:block text-[12px] text-[var(--pharvo-ink-subtle)] font-normal mt-0.5 leading-none truncate">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="hidden md:flex flex-1 justify-center px-4 min-w-0">
            <button
              type="button"
              onClick={openPalette}
              className="ent-cmdk-trigger"
              aria-label="Search or ask AI"
              style={{ width: 320 }}
            >
              <Search size={14} strokeWidth={1.75} />
              <span className="flex-1 text-left truncate">Search or ask AI...</span>
              <EntKbd>⌘K</EntKbd>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <span className="hidden xl:inline-flex items-center px-2.5 py-1.5 rounded-[8px] border border-[var(--pharvo-line)] bg-[var(--pharvo-surface-2)] text-[12px] font-medium text-[var(--pharvo-ink-muted)] tabular-nums whitespace-nowrap">
              {todayLabel()}
            </span>
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setShowNotif(!showNotif)}
                aria-label="Notifications"
                className="staff-focus w-10 h-10 rounded-full hover:bg-[var(--pharvo-surface-2)] flex items-center justify-center text-[var(--pharvo-ink-muted)] hover:text-[var(--pharvo-ink)] relative cursor-pointer transition-colors"
              >
                <Bell size={19} strokeWidth={1.75} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--pharvo-danger)] text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="absolute top-full right-0 mt-2 w-[min(380px,90vw)] bg-[var(--pharvo-surface)] border border-[var(--pharvo-line)] rounded-[12px] shadow-[var(--pharvo-shadow-lg)] z-50 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--pharvo-line)] flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--pharvo-ink)]">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="ent-pill ent-pill-accent-2 tabular-nums" style={{ padding: "1px 8px" }}>
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNotif(false)}
                      aria-label="Close notifications"
                      className="staff-focus text-[var(--pharvo-ink-subtle)] hover:text-[var(--pharvo-ink)] cursor-pointer p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] inline-flex items-center justify-center"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto divide-y divide-[var(--pharvo-line)]">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[var(--pharvo-ink-subtle)]">No notifications yet.</div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setShowNotif(false);
                            onNavigate("notifications");
                          }}
                          className="flex items-start gap-3 p-4 hover:bg-[var(--pharvo-surface-2)] cursor-pointer transition-colors text-left"
                        >
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${severityDot(n.severity)}`} aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-[13px] font-semibold text-[var(--pharvo-ink)] truncate">{n.title || n.message}</span>
                              <span className="text-[11px] text-[var(--pharvo-ink-subtle)] font-normal whitespace-nowrap tabular-nums">{timeAgo(n.created_at)}</span>
                            </div>
                            {n.message && (
                              <p className="text-xs text-[var(--pharvo-ink-muted)] mt-1 leading-relaxed font-normal">{n.message}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 text-center border-t border-[var(--pharvo-line)]">
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="staff-focus text-[13px] font-semibold text-[var(--pharvo-accent)] hover:opacity-80 cursor-pointer inline-flex items-center gap-1 rounded min-h-[44px] px-2 transition-opacity"
                    >
                      View all notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={openPalette}
              aria-label="Help and shortcuts"
              title="Help and shortcuts"
              className="staff-focus hidden sm:inline-flex w-10 h-10 rounded-full hover:bg-[var(--pharvo-surface-2)] items-center justify-center text-[var(--pharvo-ink-muted)] hover:text-[var(--pharvo-ink)] cursor-pointer transition-colors"
            >
              <CircleHelp size={19} strokeWidth={1.75} />
            </button>

            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="staff-focus flex items-center gap-2 p-1 rounded-full hover:bg-[var(--pharvo-surface-2)] cursor-pointer select-none transition-colors min-h-[40px]"
                aria-haspopup="menu"
                aria-expanded={showUserMenu}
                aria-label="Account menu"
              >
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ background: "var(--pharvo-grad)" }} aria-hidden="true">
                  {initials(displayName)}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-[var(--pharvo-surface)] border border-[var(--pharvo-line)] rounded-[12px] shadow-[var(--pharvo-shadow-lg)] z-50 overflow-hidden" role="menu">
                  <div className="px-4 py-3 border-b border-[var(--pharvo-line)] bg-[var(--pharvo-surface-2)]">
                    <span className="text-[13px] font-bold text-[var(--pharvo-ink)] block truncate">
                      {displayName}
                    </span>
                    <span className="text-[11px] text-[var(--pharvo-ink-subtle)] font-normal block mt-0.5 truncate">
                      {user?.email || `@${user?.username || ""}`}
                    </span>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate("settings");
                      }}
                      className="staff-focus w-full text-left px-4 min-h-[40px] hover:bg-[var(--pharvo-surface-2)] text-[13px] text-[var(--pharvo-ink)] font-medium flex items-center gap-2.5 cursor-pointer transition-colors"
                      role="menuitem"
                    >
                      <UserIcon size={15} strokeWidth={1.75} className="text-[var(--pharvo-ink-subtle)]" />
                      <span>Profile Settings</span>
                    </button>
                  </div>
                  <div className="border-t border-[var(--pharvo-line)] py-1">
                    <button
                      type="button"
                      onClick={onLogout}
                      className="staff-focus w-full text-left px-4 min-h-[40px] hover:bg-[var(--pharvo-danger-soft)] text-[13px] text-[var(--pharvo-danger)] font-semibold flex items-center gap-2.5 cursor-pointer transition-colors"
                      role="menuitem"
                    >
                      <LogOut size={15} strokeWidth={1.75} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 bg-[var(--pharvo-bg)] w-full" style={{ paddingTop: 24, paddingBottom: 40 }}>
          <div className="w-full mx-auto" style={{ maxWidth: 1440 }}>{children}</div>
        </main>
      </div>

      {paletteOpen && (
        <div className="ent-cmdk-backdrop" onClick={() => setPaletteOpen(false)}>
          <div className="ent-cmdk-panel" role="dialog" aria-modal="true" aria-label="Search or ask AI" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 12, borderBottom: "1px solid var(--pharvo-line)" }}>
              <input
                autoFocus
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                placeholder="Search or ask AI..."
                aria-label="Search or ask AI"
                className="ent-input"
                style={{ width: "100%", minHeight: 40, padding: "0 12px" }}
              />
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto", paddingBottom: 8 }}>
              {paletteGroups.length === 0 && (
                <div className="ent-cmdk-group-label">No matches — press Enter to ask AI</div>
              )}
              {paletteGroups.map((g) => (
                <div key={g.label}>
                  <div className="ent-cmdk-group-label">{g.label}</div>
                  {g.items.map((item) => (
                    <button key={item.key} type="button" onClick={() => goPalette(item)} className="ent-shell-navitem" style={{ borderRadius: 0, padding: "8px 16px" }}>
                      <span style={{ display: "inline-flex", color: "var(--pharvo-ink-muted)" }}>{item.icon}</span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <EntKbd>{item.hint}</EntKbd>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
