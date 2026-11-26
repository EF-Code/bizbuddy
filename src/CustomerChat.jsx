import { useEffect, useRef, useState } from "react";
import "./OperationsWorkspace.css";

export default function CustomerChat() {
  const publicId = window.location.pathname.split("/")[2];
  const storageKey = `bizbuddy-chat-${publicId}`;
  const [config, setConfig] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const conversation = useRef(
    sessionStorage.getItem(storageKey) || crypto.randomUUID(),
  );
  const last = useRef(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(
          `/api/public/chat/${encodeURIComponent(publicId)}`,
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.detail || "Chat is unavailable.");
        if (active) setConfig(result);
      } catch (e) {
        if (active) setError(e.message);
      }
    }
    async function poll() {
      if (!sessionStorage.getItem(storageKey)) return;
      try {
        const response = await fetch(
          `/api/public/chat/${encodeURIComponent(publicId)}/${conversation.current}?after=${last.current}`,
        );
        if (!response.ok) return;
        const result = await response.json();
        if (active) {
          const fresh = result.messages.filter((m) => m.id > last.current);
          if (fresh.length) {
            last.current = Math.max(...fresh.map((m) => m.id));
            setMessages((current) => [
              ...current,
              ...fresh.map((m) => ({ ...m, sender: "assistant" })),
            ]);
          }
        }
      } catch {
        /* Retry at next poll; sending errors are shown separately. */
      }
    }
    load();
    poll();
    const timer = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [publicId, storageKey]);
  async function send(event) {
    event.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true);
    setError("");
    const content = text.trim();
    try {
      const response = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_id: publicId,
          conversation_id: conversation.current,
          message: content,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.detail || "Could not send this message.");
      conversation.current =
        result.external_conversation_id || conversation.current;
      sessionStorage.setItem(storageKey, conversation.current);
      last.current = Math.max(last.current, result.message_id || 0);
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), sender: "customer", content },
        {
          id: result.message_id || crypto.randomUUID(),
          sender: "assistant",
          content:
            result.reply || "Your message is saved. The owner will reply here.",
        },
      ]);
      setText("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="ops" style={{ maxWidth: 700, margin: "30px auto" }}>
      <article className="ops-card">
        <header className="ops-heading">
          <div>
            <p>POWERED BY BIZBUDDY</p>
            <h2>{config?.name || "Business chat"}</h2>
            <span>
              Product questions, delivery information and order requests.
            </span>
          </div>
        </header>
        {config && <p>{config.welcome_message || "Hello! How can we help?"}</p>}
        <div className="ops-thread" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`ops-message ops-${m.sender}`}>
              <small>
                {m.sender === "customer" ? "You" : "Business assistant"}
              </small>
              <p>{m.content}</p>
            </div>
          ))}
        </div>
        {error && (
          <p role="alert" className="ops-error">
            {error}
          </p>
        )}
        <form className="ops-form" onSubmit={send}>
          <label>
            Your message
            <textarea
              required
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask about a product…"
            />
          </label>
          <button disabled={!config || busy || !text.trim()}>
            {busy ? "Sending…" : "Send message"}
          </button>
        </form>
        <p className="ops-muted">
          Orders and payments are confirmed by the owner. Keep this page open
          for replies.
        </p>
      </article>
    </main>
  );
}
