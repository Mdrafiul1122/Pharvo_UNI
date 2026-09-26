import { useEffect, useRef, useState } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { sendAiQuery } from "../services/ai";
import { EmptyState } from "./ui/Blocks";
import ChatInput from "./ai/ChatInput";
import {
  AssistantMessage,
  ErrorMessage,
  TypingMessage,
  UserMessage,
} from "./ai/ChatMessage";

/**
 * AI Assistant page (staff portal: Owner/Admin + Pharmacist).
 *
 * Chat container over POST /api/ai/query/. Sends `{ text }` via the
 * existing authenticated API client and renders the unchanged response.
 * Informational decision support only — no diagnosis, prescription,
 * dosage, or automatic medicine recommendation.
 */
let nextId = 1;
const makeId = () => nextId++;

export default function AiAssistant() {
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, sending]);

  async function send(text) {
    const query = (text || "").trim();
    if (!query || sending) return;

    const userMsg = { id: makeId(), role: "user", text: query, time: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const data = await sendAiQuery(query);
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: "assistant", text: query, time: Date.now(), result: data },
      ]);
    } catch {
      // Generic message only — raw server errors are never exposed.
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: "error", text: query, time: Date.now() },
      ]);
    } finally {
      setSending(false);
    }
  }

  function retry(message) {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    send(message.text);
  }

  function clearChat() {
    if (sending) return;
    setMessages([]);
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <style>{`@keyframes pharvo-msg-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="ent-ai-panel overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[480px]">
        <div className={`px-4 sm:px-5 py-4 border-b flex items-center justify-between gap-3 shrink-0 ${sending ? "ent-ai-thinking" : ""}`} style={{ borderColor: "var(--pharvo-line)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white shrink-0" style={{ background: "var(--pharvo-grad-ai)", boxShadow: "var(--pharvo-shadow-ai)" }}>
              <Sparkles size={20} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold leading-tight" style={{ color: "var(--pharvo-ink)" }}>
                AI Assistant
              </div>
              <div className="text-xs font-normal mt-0.5 truncate" style={{ color: "var(--pharvo-ink-subtle)" }}>
                {sending ? "Thinking…" : "Complaint classification + in-stock lookup"}
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              disabled={sending}
              className="ent-btn ent-btn-ghost ent-btn-sm shrink-0"
              style={{ border: "1px solid var(--pharvo-line)" }}
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">New chat</span>
            </button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-5 py-5" aria-live="polite">
          {messages.length === 0 && !sending && (
            <EmptyState
              icon={Sparkles}
              title="How can I help?"
              subtitle="Enter a health-related query to check the available AI information and matching inventory."
            />
          )}

          <div className="flex flex-col gap-4">
            {messages.map((message) => {
              if (message.role === "user") {
                return <UserMessage key={message.id} message={message} />;
              }
              if (message.role === "error") {
                return (
                  <ErrorMessage
                    key={message.id}
                    message={message}
                    sending={sending}
                    onRetry={() => retry(message)}
                  />
                );
              }
              return <AssistantMessage key={message.id} message={message} />;
            })}
            {sending && <TypingMessage />}
          </div>
        </div>

        <ChatInput sending={sending} onSend={send} />
      </div>
    </div>
  );
}
