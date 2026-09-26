import { CircleAlert, Sparkles, User as UserIcon } from "lucide-react";
import AIResult from "./AIResult";

export function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function BubbleShell({ side, children, toneClass, label, time, style }) {
  const align = side === "user" ? "justify-end" : "justify-start";
  return (
    <div className={`flex ${align}`}>
      <div
        className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          side === "user" ? "rounded-br-md" : "rounded-bl-md"
        } ${toneClass}`}
        style={{ animation: "pharvo-msg-in 250ms ease-out", boxShadow: "var(--pharvo-shadow-sm)", ...style }}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-medium mb-1">
          {label}
          {time && <span className="font-normal opacity-70">{time}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Right-side user query bubble (portal blue). */
export function UserMessage({ message }) {
  return (
    <BubbleShell
      side="user"
      toneClass="text-white"
      time={formatTime(message.time)}
      style={{ background: "var(--pharvo-grad)" }}
      label={
        <>
          <UserIcon size={12} />
      <span className="text-blue-100" style={{ color: "rgb(255 255 255 / 0.8)" }}>You</span>
        </>
      }
    >
      {message.text}
    </BubbleShell>
  );
}

/** Left-side assistant answer bubble (portal white card). */
export function AssistantMessage({ message }) {
  return (
    <div className="flex justify-start">
      <div
        className="max-w-full sm:max-w-[92%] w-full sm:w-auto sm:min-w-[320px] rounded-2xl rounded-bl-md px-4 py-3.5"
        style={{ animation: "pharvo-msg-in 250ms ease-out", background: "var(--pharvo-surface)", border: "1px solid var(--pharvo-line)", boxShadow: "var(--pharvo-shadow-ai)" }}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-medium mb-2.5" style={{ color: "var(--pharvo-ink-subtle)" }}>
          <Sparkles size={13} style={{ color: "var(--pharvo-accent-3)" }} />
          AI Assistant
          <span className="font-normal tabular-nums">{formatTime(message.time)}</span>
        </div>
        <AIResult result={message.result} />
      </div>
    </div>
  );
}

/** Left-side error bubble. Generic text only — never raw server errors. */
export function ErrorMessage({ message, sending, onRetry }) {
  return (
    <BubbleShell
      side="assistant"
      toneClass=""
      time={formatTime(message.time)}
      style={{ background: "var(--pharvo-danger-soft)", border: "1px solid var(--pharvo-danger)", color: "var(--pharvo-danger)" }}
      label={
        <>
          <CircleAlert size={15} />
          <span className="text-[13px] font-semibold">Request failed</span>
        </>
      }
    >
      <p className="mt-1 text-[13px]">
        Unable to process your request right now. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={sending}
        className="ent-btn ent-btn-sm"
        style={{ marginTop: 10, background: "var(--pharvo-surface)", border: "1px solid currentColor" }}
      >
        Retry
      </button>
    </BubbleShell>
  );
}

/** Typing indicator while the API request is in flight. */
export function TypingMessage() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md px-4 py-3.5" style={{ background: "var(--pharvo-surface)", border: "1px solid var(--pharvo-line)", boxShadow: "var(--pharvo-shadow-sm)" }}>
        <div className="flex items-center gap-1.5 text-[11px] font-medium mb-2" style={{ color: "var(--pharvo-ink-subtle)" }}>
          <Sparkles size={13} style={{ color: "var(--pharvo-accent-3)" }} />
          AI Assistant
        </div>
        <div className="flex items-center gap-1.5 py-1" aria-label="Assistant is typing">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: "var(--pharvo-accent-3)", animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
