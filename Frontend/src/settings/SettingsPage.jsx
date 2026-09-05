import React, { useEffect, useState } from "react";
import { User, Shield, Mail, AtSign, LogOut, CheckCircle2 } from "lucide-react";
import { fetchMe, clearStoredTokens, ROLES } from "../services/auth";
import { ApiError } from "../services/api";
import { Card, CardHeader, LoadingState } from "../components/ui/Blocks";

const ROLE_LABELS = {
  [ROLES.ADMIN]: "Administrator",
  [ROLES.PHARMACIST]: "Pharmacist",
  [ROLES.CUSTOMER]: "Customer",
};

export default function SettingsPage({ user, onLogout }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMe()
      .then((data) => setMe(data))
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Unable to load your account.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const profile = me || user || {};

  if (loading) return <LoadingState label="Loading your account..." />;

  const rows = [
    { icon: User, label: "Full Name", value: profile.full_name || profile.first_name || "—" },
    { icon: AtSign, label: "Username", value: profile.username || "—" },
    { icon: Mail, label: "Email", value: profile.email || "—" },
    { icon: Shield, label: "Role", value: ROLE_LABELS[profile.role] || profile.role || "—" },
  ];

  return (
    <div className="flex flex-col gap-5 w-full max-w-5xl">
      {error && (
        <div className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
          <span>{error}</span>
        </div>
      )}

      <Card>
        <CardHeader
          title="Account Information"
          subtitle="Your PHARVO profile"
          action={
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-lg text-[13px] font-medium text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 cursor-pointer flex items-center gap-1.5"
            >
              <LogOut size={16} />
              Sign out
            </button>
          }
        />
        <div className="p-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white text-xl font-bold flex items-center justify-center shrink-0">
              {(profile.full_name || profile.username || "U")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">{profile.full_name || profile.username || "User"}</div>
              <div className="text-sm text-slate-500 font-normal mt-0.5">{ROLE_LABELS[profile.role] || profile.role}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="p-4 bg-slate-50/70 border border-slate-100 rounded-lg flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{row.label}</div>
                    <div className="text-[15px] font-medium text-slate-800 truncate">{row.value}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 p-4 rounded-lg border border-emerald-100 bg-emerald-50/60 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <p className="text-[13px] text-slate-600 font-normal m-0">
              You're signed in with a valid session. Your data is synced to the PHARVO backend.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}