import { Clock, ShoppingBag, Star, Wallet, Sparkles } from "lucide-react";
import { firstName, formatDate, greeting, initials, normaliseTier } from "../customerData";
import { formatCountMoney, useCountUp } from "./CountUp";
import { PortalPill, PortalStatTile } from "./PortalBlocks";

/* Relative "last visit" label — presentation only, absolute date kept as sub. */
export function timeAgo(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return formatDate(value);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return formatDate(value);
}

/* Compact greeting card (hero, 5 cols on desktop). Greeting + pills only. */
export default function WelcomeHero({ user, record }) {
  const tier = normaliseTier(record?.membership_tier);
  const points = record?.loyalty_points ?? 0;
  const name = firstName(user);

  return (
    <section aria-label="Welcome" className="portal-card p-5 h-full flex flex-col justify-center gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="portal-avatar-ring" aria-hidden="true">
          <span className="w-12 h-12 bg-[var(--portal-accent-soft)] text-[var(--portal-accent)] inline-flex items-center justify-center text-sm font-bold border-2 border-white">
            {initials(name)}
          </span>
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-normal text-[var(--portal-ink-muted)]">{greeting()},</p>
          <h1 className="text-2xl font-bold tracking-tight leading-[1.2] text-[var(--portal-ink)] truncate">
            {name} <span aria-hidden="true">👋</span>
          </h1>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PortalPill tone="accent" icon={Star}>
          {tier ? `${tier}` : "Member"}
        </PortalPill>
        <PortalPill tone="accent-2" icon={Sparkles}>
          <span className="tabular-nums">{Number(points).toLocaleString()} pts</span>
        </PortalPill>
      </div>
    </section>
  );
}

/* 3-up stat tiles (hero, 7 cols on desktop). CountUp preserved. */
export function HeroStats({ summary, loading }) {
  const count = useCountUp(Number(summary.count ?? 0), 900);
  const spent = useCountUp(Number(summary.totalSpent ?? 0), 900);
  const latestAt = summary.latest ? summary.latest.created_at || summary.latest.sale_date : null;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-[14px] border border-[var(--portal-line)] bg-[var(--portal-surface)] p-4">
            <div className="cp-skeleton h-5 w-16 rounded-md" />
            <div className="cp-skeleton h-3 w-20 rounded mt-2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full content-center">
      <PortalStatTile
        icon={ShoppingBag}
        value={Math.round(count).toLocaleString()}
        label="Purchases"
      />
      <PortalStatTile
        icon={Wallet}
        value={formatCountMoney(0, spent)}
        label="Total spent"
      />
      <PortalStatTile
        icon={Clock}
        value={latestAt ? timeAgo(latestAt) : "—"}
        label="Last visit"
        sub={latestAt ? formatDate(latestAt) : undefined}
      />
    </div>
  );
}
