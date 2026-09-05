import React from "react";

export function Card({ className = "", children }) {
  return (
    <div
      className={`bg-white border border-slate-100 rounded-2xl shadow-xs ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
      <div>
        <div className="text-[17px] font-semibold text-slate-900">{title}</div>
        {subtitle && <div className="text-xs text-slate-400 font-normal mt-1">{subtitle}</div>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

const TONES = {
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
  green: { bg: "bg-emerald-50", text: "text-emerald-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-600" },
  red: { bg: "bg-red-50", text: "text-red-600" },
  violet: { bg: "bg-violet-50", text: "text-violet-600" },
  slate: { bg: "bg-slate-100", text: "text-slate-500" },
};

export function StatCard({ label, value, sub, icon: Icon, tone = "blue" }) {
  const t = TONES[tone] || TONES.blue;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 leading-tight">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${t.bg}`}>
          <Icon size={18} className={t.text} />
        </div>
      </div>
      <div className="text-[28px] font-bold text-slate-900 tracking-tight mt-2.5">{value}</div>
      {sub && <div className="text-xs font-medium text-slate-400 mt-1.5">{sub}</div>}
    </Card>
  );
}

export function StatusBadge({ status }) {
  const text = String(status || "—");
  const lower = text.toLowerCase();
  let tone = "bg-slate-100 text-slate-500 border-slate-200";
  if (["active", "paid", "completed", "managed", "in stock", "ok"].some((s) => lower.includes(s))) {
    tone = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (
    ["low", "ending", "pending", "at risk", "near", "warning"].some((s) => lower.includes(s))
  ) {
    tone = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (["expired", "out", "inactive", "failed", "restricted", "sensitive"].some((s) => lower.includes(s))) {
    tone = "bg-red-50 text-red-700 border-red-200";
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border whitespace-nowrap ${tone}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          tone.startsWith("bg-emerald")
            ? "bg-emerald-500"
            : tone.startsWith("bg-amber")
            ? "bg-amber-500"
            : tone.startsWith("bg-red")
            ? "bg-red-500"
            : "bg-slate-400"
        }`}
      />
      {text}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center px-4">
      {Icon && <Icon size={44} className="text-slate-200 mb-3" strokeWidth={1.5} />}
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 font-normal mt-1.5">{subtitle}</p>}
    </div>
  );
}

export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400">
      <span className="w-4 h-4 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function PageTitle({ title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 font-normal mt-1">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}