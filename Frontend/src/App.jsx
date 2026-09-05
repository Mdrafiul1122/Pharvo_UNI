import { useEffect, useState } from "react";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import StaffApp from "./components/StaffApp";
import CustomerPortal from "./Dashboard/CustomerPortal";
import { clearStoredTokens, fetchMe, getAccessToken, ROLES } from "./services/auth";

const KNOWN_ROLES = [ROLES.ADMIN, ROLES.PHARMACIST, ROLES.CUSTOMER];

const loaderStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "14px",
  background: "#fff",
  color: "#6b6375",
  fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif",
};

const spinnerStyle = {
  width: "34px",
  height: "34px",
  borderRadius: "50%",
  border: "3px solid #e5e4e7",
  borderTopColor: "#2563eb",
  animation: "pharvo-spin 0.8s linear infinite",
};

function InitialAuthLoading() {
  return (
    <div style={loaderStyle}>
      <div style={spinnerStyle} aria-hidden="true" />
      <div>Checking session&hellip;</div>
      <style>{`@keyframes pharvo-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  const path = window.location.pathname;
  const token = getAccessToken();
  const [status, setStatus] = useState(token ? "verifying" : "anonymous");
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    fetchMe()
      .then((me) => {
        if (cancelled) {
          return;
        }
        if (KNOWN_ROLES.includes(me?.role)) {
          setRole(me.role);
          setStatus("authenticated");
        } else {
          // Server returned a role we do not recognise - treat as invalid.
          clearStoredTokens();
          setRole(null);
          setStatus("anonymous");
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        // Invalid/expired token (401/403) or an unreachable session (no
        // status) - never assume the user is logged in; clear and log out.
        clearStoredTokens();
        setRole(null);
        setStatus("anonymous");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "anonymous") {
    return path === "/signup" ? <Signup /> : <Login />;
  }

  if (status === "verifying") {
    return <InitialAuthLoading />;
  }

  if (role === ROLES.CUSTOMER) {
    return <CustomerPortal />;
  }

  return <StaffApp />;
}
