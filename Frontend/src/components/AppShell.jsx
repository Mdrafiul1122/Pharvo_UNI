import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
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
} from "lucide-react";
import { ROLES } from "../services/auth";
import {
  fetchNotifications,
  markAllNotificationsRead,
} from "../services/notifications";

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
  const [notifications, setNotifications] = useState([]);

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

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
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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

  const sidebar = (
    <aside
      style={{ width: collapsed ? 68 : 272 }}
      className="flex-shrink-0 h-full bg-white border-r border-slate-100 flex flex-col justify-between transition-all duration-200 shadow-xs relative z-20"
    >
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="h-[76px] flex items-center justify-between px-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-2xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m10.5 20.5 9-9a4.5 4.5 0 0 0-6.4-6.4l-9 9a4.5 4.5 0 0 0 6.4 6.4Z"/>
                <path d="m8.5 10.5 5 5"/>
              </svg>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="text-lg font-bold text-slate-900 tracking-tight block">PHARVO</span>
                <span className="text-[11px] text-slate-400 font-medium mt-1 block leading-none">Pharmacy Management</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer flex-shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-5 scrollbar-thin">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              {!collapsed && (
                <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase px-3.5 mb-1 block">
                  {section.label}
                </span>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.key;
                const isNotifications = item.key === "notifications";
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onNavigate(item.key)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-all duration-100 ease-in-out cursor-pointer ${
                      isActive
                        ? "bg-blue-50/70 text-blue-600 font-semibold"
                        : "text-slate-600 font-normal hover:bg-slate-50 hover:text-slate-900 hover:font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        size={18}
                        className={isActive ? "text-blue-600" : "text-slate-400"}
                        strokeWidth={isActive ? 2 : 1.75}
                      />
                      {!collapsed && (
                        <span className="text-[14px] tracking-normal overflow-hidden text-ellipsis whitespace-nowrap">
                          {item.label}
                        </span>
                      )}
                    </div>
                    {!collapsed && isNotifications && unreadCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="p-3 border-t border-slate-100 flex flex-col gap-2 flex-shrink-0 bg-white">
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full py-2 hover:bg-slate-50 rounded-lg text-slate-400 cursor-pointer flex justify-center mb-1"
          >
            <ChevronRight size={16} />
          </button>
        )}
        {isAdmin && (
          <a
            href="/admin/"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-blue-600 bg-blue-50/70 hover:bg-blue-100/70 text-blue-600 text-[13px] font-semibold transition-all duration-100"
          >
            <Shield size={15} />
            {!collapsed && <span>User Management</span>}
          </a>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-rose-50/50 hover:bg-rose-100/50 text-red-600 text-[13px] font-semibold transition-all duration-100 cursor-pointer"
        >
          <LogOut size={15} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      <div className="hidden lg:block flex-shrink-0 h-screen">{sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-[76px] flex-shrink-0 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-8 z-10">
          <div className="min-w-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight truncate">
                {title}
              </h1>
              <p className="text-sm text-slate-400 font-normal mt-0.5 leading-none truncate">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setShowNotif(!showNotif)}
                className="w-10 h-10 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 relative cursor-pointer block transition-all duration-100"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="absolute top-full right-0 mt-2 w-[380px] sm:w-[400px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0 bg-white">
                    <div className="flex items-center">
                      <span className="text-sm font-semibold text-slate-900">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="ml-2 bg-blue-600 text-white font-medium text-[11px] px-2 py-0.5 rounded-full inline-block">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNotif(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">No notifications yet.</div>
                    ) : (
                      notifications.slice(0, 8).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setShowNotif(false);
                            onNavigate("notifications");
                          }}
                          className="flex items-start gap-3 p-4 hover:bg-slate-50/60 cursor-pointer transition-colors duration-75 text-left"
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              n.severity === "critical" ? "bg-red-500" : n.severity === "warning" ? "bg-amber-600" : "bg-blue-600"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-[13px] font-semibold text-slate-900 truncate">{n.title || n.message}</span>
                              <span className="text-[11px] text-slate-400 font-normal whitespace-nowrap">{timeAgo(n.created_at)}</span>
                            </div>
                            {n.message && (
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-normal">{n.message}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 text-center border-t border-slate-100 bg-white">
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer inline-flex items-center gap-1"
                    >
                      View all notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 rounded-lg bg-white cursor-pointer select-none transition-all duration-100"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-semibold text-[13px]">
                  {initials(displayName)}
                </div>
                <div className="text-left hidden md:block">
                  <span className="text-[13px] font-semibold text-slate-800 block leading-tight">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal block leading-none mt-0.5 capitalize">
                    {user?.role || "staff"}
                  </span>
                </div>
                <ChevronDown size={14} className="text-slate-400 ml-0.5" />
              </button>

              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-100 rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="p-3.5 border-b border-slate-50 bg-slate-50/50">
                    <span className="text-xs font-semibold text-slate-800 block">
                      {displayName}
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal block mt-0.5">
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
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-xs text-slate-700 font-normal flex items-center gap-2.5 cursor-pointer"
                    >
                      <UserIcon size={14} className="text-slate-400" />
                      <span>Profile Settings</span>
                    </button>
                  </div>
                  <div className="border-t border-slate-100 py-1">
                    <button
                      type="button"
                      onClick={onLogout}
                      className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-xs text-red-600 font-medium flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut size={14} className="text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-7 bg-slate-50/40 w-full">
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
