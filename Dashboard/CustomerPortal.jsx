import { useEffect, useState } from "react";
import Logo from "../components/Logo";
import { AlertIcon, LogoutIcon, RoleBadgeIcon } from "../components/Icons";
import { clearStoredTokens, fetchMe, roleHomePath } from "../services/auth";
import "../styles/dashboard.css";

export default function CustomerPortal() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetchMe()
      .then((me) => {
        if (cancelled) {
          return;
        }
        if (me.role !== "customer") {
          window.location.assign(roleHomePath(me.role));
          return;
        }
        setUser(me);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        if (err?.status === 401 || err?.status === 403) {
          clearStoredTokens();
          window.location.assign("/");
          return;
        }
        setError(err?.message || "Unable to load your account.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogout() {
    clearStoredTokens();
    window.location.assign("/");
  }

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <Logo />
        <span className="role-badge">
          <RoleBadgeIcon />
          Customer
        </span>
        <button type="button" className="btn btn--ghost" onClick={handleLogout}>
          <LogoutIcon className="btn__icon" />
          Sign out
        </button>
      </header>

      <main className="dashboard__content">
        <div className="dashboard__titlebar">
          <h1 className="dashboard__title">Customer Portal</h1>
          <p className="dashboard__subtitle">
            {user?.full_name || user?.email
              ? `Welcome, ${user.full_name || user.email}`
              : "Welcome"}
          </p>
        </div>

        {error && (
          <div className="state-panel state-panel--error" role="alert">
            <AlertIcon />
            <p>{error}</p>
          </div>
        )}

        {!error && (
          <div className="empty-banner" role="status">
            <AlertIcon />
            <p>
              Your purchase history and customer profile will appear here. Only
              Customer accounts can access this portal.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}