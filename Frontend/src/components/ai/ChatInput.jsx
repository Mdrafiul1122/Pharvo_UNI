import { useState } from "react";
import { SendHorizontal } from "lucide-react";

/**
 * Bottom query input. Single-line: Enter sends.
 * Disabled while a request is in flight to prevent duplicates.
 */
export default function ChatInput({ sending, onSend }) {
  const [draft, setDraft] = useState("");

  function submit(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    onSend(text);
  }

  return (
    <div className="shrink-0 px-4 sm:px-5 py-3.5" style={{ borderTop: "1px solid var(--pharvo-line)", background: "var(--pharvo-surface)" }}>
      <form onSubmit={submit} className="flex items-center gap-2.5">
        <label htmlFor="ai-chat-input" className="sr-only">
          Type a health-related query
        </label>
        <input
          id="ai-chat-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your query…"
          disabled={sending}
          autoComplete="off"
          className="ent-input flex-1 min-w-0"
          style={{ padding: "10px 16px", borderRadius: 10 }}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="ent-btn ent-btn-md shrink-0"
          style={{ background: "var(--pharvo-grad-ai)", color: "#fff", boxShadow: "var(--pharvo-shadow-ai)", borderRadius: 10, padding: "10px 20px" }}
        >
          <SendHorizontal size={16} />
          <span className="hidden sm:inline">{sending ? "Sending…" : "Send"}</span>
        </button>
      </form>
      <p className="text-[11px] mt-2 leading-relaxed" style={{ color: "var(--pharvo-ink-subtle)" }}>
        Informational decision support only — predicted categories and stock
        information require pharmacist review. No diagnosis, prescription, or
        dosage.
      </p>
    </div>
  );
}
