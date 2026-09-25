import { ArrowRight, Award, BadgePercent, Check } from "lucide-react";
import { normaliseTier, tierDiscountPercent } from "../customerData";
import { PortalCard, PortalPill, PortalProgressBar } from "./PortalBlocks";

const TIERS = [
  {
    key: "bronze",
    label: "Bronze",
    place: "Starting tier",
    perks: ["Full purchase history", "Counter-linked account"],
  },
  {
    key: "silver",
    label: "Silver",
    place: "Mid tier",
    perks: ["5% automatic checkout discount", "Everything in Bronze"],
  },
  {
    key: "gold",
    label: "Gold",
    place: "Top tier",
    perks: ["10% automatic checkout discount", "Everything in Silver"],
  },
];

/* Display-only illustrative progress toward the next tier.
 * Actual tier placement is managed by pharmacy staff; these
 * thresholds only drive the pass progress bar, never any charge. */
const NEXT_STEP = {
  bronze: { next: "Silver", at: 1000 },
  silver: { next: "Gold", at: 2500 },
};

function TierProgress({ tierKey, points }) {
  const step = NEXT_STEP[tierKey];
  if (!step) return null;
  const pct = Math.max(0, Math.min(100, (Number(points) || 0) / step.at * 100));
  const remaining = Math.max(0, step.at - (Number(points) || 0));
  return (
    <div className="mt-5">
      <PortalProgressBar value={pct} height={8} label={`Progress toward ${step.next}`} />
      <p className="text-[13px] font-normal text-[var(--portal-ink-muted)] mt-2 tabular-nums">
        <strong className="font-bold text-[var(--portal-ink)]">{remaining.toLocaleString()} pts</strong>{" "}
        to {step.next}
      </p>
    </div>
  );
}

function DiscountNote({ discount }) {
  return (
    <div className="mt-4 rounded-[14px] bg-[var(--portal-accent-2-soft)] px-4 py-3.5 flex items-start gap-2.5">
      <BadgePercent size={19} strokeWidth={1.75} className="text-[var(--portal-accent-2)] shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-[13px] leading-relaxed text-[var(--portal-ink)]">
        {discount === null ? (
          <>No published automatic discount rate applies to this tier. Your pharmacist can explain your benefits.</>
        ) : discount === 0 ? (
          <>As a Bronze member you keep full access to your account and history. Higher tiers unlock automatic checkout discounts.</>
        ) : (
          <><strong className="font-bold text-[var(--portal-accent-2)]">{discount}% automatic checkout discount</strong> on eligible medicines, applied by the pharmacy when you qualify.</>
        )}
      </p>
    </div>
  );
}

export default function MembershipCard({ record, compact = false, onAction }) {
  const tier = normaliseTier(record?.membership_tier);
  const tierKey = String(record?.membership_tier || "").trim().toLowerCase();
  const discount = tierDiscountPercent(record?.membership_tier);
  const points = record?.loyalty_points ?? 0;

  if (compact) {
    const step = NEXT_STEP[tierKey];
    const pct = step ? Math.max(0, Math.min(100, (Number(points) || 0) / step.at * 100)) : 100;
    return (
      <PortalCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-medium uppercase tracking-wide text-[var(--portal-ink-muted)]">
              Membership
            </p>
            <p className="text-base font-bold text-[var(--portal-ink)] mt-1 truncate">
              {tier || "Member"} · <span className="tabular-nums">{Number(points).toLocaleString()} pts</span>
            </p>
          </div>
          {onAction && (
            <button
              type="button"
              onClick={onAction}
              className="portal-focus inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--portal-accent)] hover:opacity-80 cursor-pointer rounded min-h-[44px]"
            >
              View benefits
              <ArrowRight size={15} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="mt-3">
          <PortalProgressBar value={pct} height={6} label="Progress toward next tier" />
        </div>
      </PortalCard>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="portal-ring-wrap">
        <section aria-label="Membership and benefits" className="portal-ring-inner p-5 sm:p-6">
          <p className="text-[12px] font-semibold uppercase tracking-widest text-[var(--portal-ink-muted)]">
            Pharvo Membership
          </p>
          <div className="flex flex-wrap items-center gap-3.5 mt-3">
            <span className="w-12 h-12 rounded-2xl bg-[var(--portal-accent-soft)] text-[var(--portal-accent)] inline-flex items-center justify-center shrink-0" aria-hidden="true">
              <Award size={22} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="portal-gradient-text text-[32px] font-extrabold tracking-tight leading-[1.2]">
                {tier || "Member"}
              </h2>
            </div>
            {tier && (
              <PortalPill tone="accent" className="ml-auto uppercase tracking-widest text-[10px]">
                Active
              </PortalPill>
            )}
          </div>
          <p className="mt-4 tabular-nums leading-none">
            <span className="text-[40px] font-extrabold tracking-tight text-[var(--portal-ink)]">
              {Number(points).toLocaleString()}
            </span>{" "}
            <span className="text-sm font-medium text-[var(--portal-ink-muted)]">pts</span>
          </p>
          <TierProgress tierKey={tierKey} points={points} />
          <DiscountNote discount={discount} />
        </section>
      </div>

      <div>
        <h3 className="text-base font-bold tracking-tight text-[var(--portal-ink)] mb-3">Tier ladder</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((t) => {
            const isMine = tierKey === t.key;
            const card = (
              <article
                aria-current={isMine ? "true" : undefined}
                className={`p-5 min-w-0 h-full ${
                  isMine
                    ? "rounded-[20px] bg-[var(--portal-accent-soft)]"
                    : "portal-card p-5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[var(--portal-ink)]">{t.label}</p>
                  {isMine ? (
                    <PortalPill tone="accent" className="uppercase tracking-wider text-[10px]">
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                      Current
                    </PortalPill>
                  ) : (
                    <span
                      className="w-6 h-6 rounded-full bg-[var(--portal-surface-2)] border border-[var(--portal-line)] inline-flex items-center justify-center shrink-0"
                      aria-hidden="true"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--portal-ink-subtle)]" />
                    </span>
                  )}
                </div>
                <p className="text-[12px] font-medium text-[var(--portal-ink-muted)] mt-1">{t.place}</p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {t.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-[13px] font-normal text-[var(--portal-ink)]">
                      <Check size={14} strokeWidth={2.5} className="text-[var(--portal-accent)] shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="min-w-0">{perk}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
            return isMine ? (
              <div key={t.key} className="portal-ring-wrap">
                <div className="portal-ring-inner">{card}</div>
              </div>
            ) : (
              <div key={t.key}>{card}</div>
            );
          })}
        </div>
        <p className="text-[12px] font-normal leading-relaxed text-[var(--portal-ink-subtle)] mt-3">
          Discounts apply only to eligible medicines and are calculated by the pharmacy at checkout. Tiers are managed by pharmacy staff.
        </p>
      </div>
    </div>
  );
}
