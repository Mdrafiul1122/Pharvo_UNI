import { Link2, LogOut, Pencil, UserRound } from "lucide-react";
import { displayName, initials } from "../customerData";
import { PortalButton, PortalCard, PortalPill } from "./PortalBlocks";

function Field({ label, value }) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--portal-line)] last:border-0">
      <span className="text-[12px] font-medium uppercase tracking-wide text-[var(--portal-ink-muted)] shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-[var(--portal-ink)] text-right break-words min-w-0">{value}</span>
    </div>
  );
}

/* Compact dashboard block: avatar, name, contact, linked pill, edit CTA. */
export function ProfileCompact({ user, record, onEdit }) {
  const name = displayName(user);
  return (
    <PortalCard className="p-5">
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="portal-avatar-ring" aria-hidden="true">
          <span className="w-12 h-12 bg-[var(--portal-accent-soft)] text-[var(--portal-accent)] inline-flex items-center justify-center text-sm font-bold border-2 border-white">
            {initials(name)}
          </span>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--portal-ink)] truncate">{name}</p>
          <p className="text-[13px] font-normal text-[var(--portal-ink-muted)] truncate mt-0.5">
            {[user?.email, record?.phone].filter(Boolean).join(" · ") || "Pharvo customer"}
          </p>
        </div>
        <PortalPill tone={record ? "success" : "warning"} className="shrink-0">
          {record ? "Linked" : "Not linked"}
        </PortalPill>
      </div>
      {onEdit && (
        <PortalButton variant="ghost" size="sm" onClick={onEdit} className="mt-4 w-full sm:w-auto">
          <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
          Edit profile
        </PortalButton>
      )}
    </PortalCard>
  );
}

export default function ProfileSection({ user, record, onLogout, onLinkRecord }) {
  const name = displayName(user);
  return (
    <div className="flex flex-col gap-5">
      <PortalCard className="p-5 flex items-center gap-4">
        <span className="portal-avatar-ring" aria-hidden="true">
          <span className="w-20 h-20 bg-[var(--portal-accent-soft)] text-[var(--portal-accent)] inline-flex items-center justify-center text-xl font-bold border-[3px] border-white">
            {initials(name)}
          </span>
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-[var(--portal-ink)] truncate">{name}</h2>
          <p className="text-[13px] font-normal text-[var(--portal-ink-muted)] mt-1 truncate">
            {user?.username ? `@${user.username}` : "Pharvo customer account"}
          </p>
        </div>
      </PortalCard>

      <PortalCard className="px-5 py-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--portal-ink-subtle)] mt-3 mb-1">Sign-in account</h3>
        <Field label="Name" value={name} />
        <Field label="Username" value={user?.username} />
        <Field label="Email" value={user?.email} />
      </PortalCard>

      <PortalCard className="px-5 py-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--portal-ink-subtle)] mt-3 mb-1">Linked pharmacy record</h3>
        {record ? (
          <>
            <Field label="Name" value={record.name} />
            <Field label="Phone" value={record.phone} />
            <Field label="Email" value={record.email} />
            <Field
              label="Loyalty points"
              value={record.loyalty_points === null || record.loyalty_points === undefined ? null : Number(record.loyalty_points).toLocaleString()}
            />
            <div className="flex items-start gap-2.5 rounded-[14px] bg-[var(--portal-accent-soft)] px-4 py-3.5 my-4">
              <UserRound size={18} strokeWidth={1.75} className="text-[var(--portal-accent)] shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[13px] leading-relaxed text-[var(--portal-ink)]">
                Everything looks good — linked automatically from your counter purchases. To update this record, please ask the pharmacy staff.
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 rounded-[14px] bg-[var(--portal-accent-2-soft)] px-4 py-4 my-4">
            <div className="flex items-start gap-2.5">
              <Link2 size={18} strokeWidth={1.75} className="text-[var(--portal-accent-2)] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--portal-ink)]">Link your pharmacy record</p>
                <p className="text-[13px] font-normal text-[var(--portal-ink-muted)] mt-1 leading-relaxed">
                  No pharmacy record is linked yet. One appears here automatically after your first purchase at the counter.
                </p>
              </div>
            </div>
            {onLinkRecord && (
              <PortalButton variant="ghost" size="sm" onClick={onLinkRecord} className="self-start">
                Link your pharmacy record
              </PortalButton>
            )}
          </div>
        )}
      </PortalCard>

      {record?.latest_health && (
        <PortalCard className="px-5 py-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--portal-ink-subtle)] mt-3 mb-1">Latest Health Information</h3>
          <Field label="Diabetes" value={record.latest_health.diabetes ? "Yes" : "No"} />
          <Field label="Diabetes type" value={record.latest_health.diabetes_type} />
          <Field label="Blood pressure" value={record.latest_health.blood_pressure} />
          <Field label="Blood sugar" value={record.latest_health.blood_sugar} />
          <Field label="Recorded date" value={record.latest_health.recorded_date} />
          <Field label="Health notes" value={record.latest_health.health_notes} />
        </PortalCard>
      )}

      {onLogout && (
        <PortalButton variant="danger" size="lg" onClick={onLogout}>
          <LogOut size={17} strokeWidth={1.75} aria-hidden="true" />
          Sign out
        </PortalButton>
      )}
    </div>
  );
}
