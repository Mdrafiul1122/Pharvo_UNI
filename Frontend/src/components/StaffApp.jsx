import { useCallback, useEffect, useState } from "react";
import { getStoredUser, clearStoredTokens, ROLES } from "../services/auth";
import { fetchUnreadCount } from "../services/notifications";
import AppShell from "./AppShell";
import { AdminDashboard } from "../Dashboard/AdminDashboard";
import PharmacistDashboard from "../Dashboard/PharmacistDashboard";
import { SalesModule } from "../pos/Sales";
import CustomersPage from "../customers/CustomersPage";
import CRMModule from "../crm/CRMModule";
import MedicinesInventoryPage from "../medicines/MedicinesInventoryPage";
import OrdersPage from "../orders/OrdersPage";
import ReportsPage from "../reports/ReportsPage";
import NotificationsPage from "../notifications/NotificationsPage";
import SettingsPage from "../settings/SettingsPage";

const PAGE_META = {
  dashboard: { title: "Dashboard", subtitle: "Overview of your pharmacy operations today" },
  pos: { title: "POS / Sales", subtitle: "Point of sale and transaction history" },
  "medicines-inventory": { title: "Medicines & Inventory", subtitle: "Manage medicines, stock levels, pricing and expiry status" },
  customers: { title: "Customer Management", subtitle: "Customer profiles, membership & purchase history" },
  crm: { title: "CRM", subtitle: "Customer relationship management" },
  orders: { title: "Orders", subtitle: "All recorded sales and invoices" },
  reports: { title: "Reports", subtitle: "Sales, profit and performance reports" },
  notifications: { title: "Notifications", subtitle: "Alerts, expiry and stock notifications" },
  settings: { title: "Settings", subtitle: "Manage your personal settings" },
};

export default function StaffApp() {
  const [activeModule, setActiveModule] = useState("dashboard");
  const [unreadCount, setUnreadCount] = useState(0);
  const user = getStoredUser();

  const loadUnread = useCallback(() => {
    fetchUnreadCount()
      .then((data) => setUnreadCount(Number(data?.unread_count) || 0))
      .catch(() => setUnreadCount(0));
  }, []);

  useEffect(() => {
    loadUnread();
  }, [loadUnread]);

  useEffect(() => {
    if (activeModule === "notifications") {
      loadUnread();
    }
  }, [activeModule, loadUnread]);

  function handlePageChange(page) {
    setActiveModule(page);
  }

  function handleLogout() {
    clearStoredTokens();
    window.location.assign("/");
  }

  const meta = PAGE_META[activeModule] || PAGE_META.dashboard;

  return (
    <AppShell
      active={activeModule}
      title={meta.title}
      subtitle={meta.subtitle}
      user={user || {}}
      unreadCount={unreadCount}
      onNavigate={handlePageChange}
      onLogout={handleLogout}
    >
      {activeModule === "dashboard" && user?.role === ROLES.ADMIN && (
        <AdminDashboard
          user={user || {}}
          onPageChange={handlePageChange}
          onRefreshNotifications={loadUnread}
        />
      )}
      {activeModule === "dashboard" && user?.role !== ROLES.ADMIN && (
        <PharmacistDashboard
          user={user || {}}
          onPageChange={handlePageChange}
          onRefreshNotifications={loadUnread}
        />
      )}
      {activeModule === "pos" && <SalesModule />}
      {activeModule === "medicines-inventory" && <MedicinesInventoryPage />}
      {activeModule === "customers" && <CustomersPage />}
      {activeModule === "crm" && <CRMModule onNavigate={handlePageChange} />}
      {activeModule === "orders" && <OrdersPage />}
      {activeModule === "reports" && <ReportsPage />}
      {activeModule === "notifications" && <NotificationsPage onChanged={loadUnread} />}
      {activeModule === "settings" && <SettingsPage user={user || {}} onLogout={handleLogout} />}
    </AppShell>
  );
}

export { ROLES };