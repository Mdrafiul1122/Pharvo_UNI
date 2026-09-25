import { AlertTriangle, Inbox } from "lucide-react";
import { PortalButton, PortalCard } from "./PortalBlocks";

export function LoadingState({ label = "Loading..." }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite" aria-label={label}>
      <PortalCard className="p-5 sm:p-6">
        <div className="flex items-center gap-3.5">
          <div className="cp-skeleton w-[52px] h-[52px] rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="cp-skeleton h-4 w-32 rounded-md" />
            <div className="cp-skeleton h-6 w-48 rounded-md mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-[14px] border border-[var(--portal-line)] bg-[var(--portal-surface-2)] p-3.5">
              <div className="cp-skeleton h-6 w-16 rounded-md" />
              <div className="cp-skeleton h-3 w-20 rounded mt-2" />
            </div>
          ))}
        </div>
      </PortalCard>
      <LoadingCards count={2} />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function LoadingCards({ count = 3 }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <PortalCard key={i} className="p-4 sm:p-5">
          <div className="cp-skeleton h-4 w-1/3 rounded-md" />
          <div className="cp-skeleton h-3 w-2/3 rounded mt-2.5" />
          <div className="cp-skeleton h-3 w-1/2 rounded mt-2" />
        </PortalCard>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, subtitle, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-[20px] border border-dashed border-[var(--portal-line-strong)] bg-[var(--portal-surface)] px-6 py-10">
      <span className="w-12 h-12 rounded-2xl bg-[var(--portal-accent-soft)] text-[var(--portal-accent)] inline-flex items-center justify-center" aria-hidden="true">
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <p className="text-sm font-semibold text-[var(--portal-ink)] mt-4">{title}</p>
      {subtitle && <p className="text-[13px] font-normal text-[var(--portal-ink-muted)] mt-1.5 max-w-[300px] leading-relaxed">{subtitle}</p>}
      {(actionLabel || onAction) && (
        <PortalButton variant="ghost" size="sm" onClick={onAction} className="mt-5">
          {actionLabel || "Start shopping"}
        </PortalButton>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-[20px] border border-[var(--portal-line)] bg-[var(--portal-danger-soft)] px-6 py-14" role="alert">
      <span className="w-12 h-12 rounded-2xl bg-white border border-[var(--portal-line)] text-[var(--portal-danger)] inline-flex items-center justify-center" aria-hidden="true">
        <AlertTriangle size={22} strokeWidth={1.75} />
      </span>
      <p className="text-sm font-semibold text-[var(--portal-ink)] mt-4">Something went wrong</p>
      <p className="text-[13px] font-normal text-[var(--portal-ink-muted)] mt-1.5 max-w-[300px] leading-relaxed">
        {message || "We could not load this section. Please try again."}
      </p>
      {onRetry && (
        <PortalButton variant="gradient" size="md" onClick={onRetry} className="mt-5 px-6">
          Try again
        </PortalButton>
      )}
    </div>
  );
}
