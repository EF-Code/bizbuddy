import { useEffect, useRef, useState } from "react";
import { Brand, Button, Icon, Status } from "./components/ui";
import { initials } from "./components/format";
import "./Workspace.css";

export default function CustomerChat() {
  const publicId = window.location.pathname.split("/")[2];
  const storageKey = `bizbuddy-chat-${publicId}`;
  const [config, setConfig] = useState(null),
    [messages, setMessages] = useState(() => {
      try {
        return JSON.parse(
          sessionStorage.getItem(storageKey + "-messages") || "[]",
        ).slice(-100);
      } catch {
        return [];
      }
    }),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const conversation = useRef(
    sessionStorage.getItem(storageKey) || crypto.randomUUID(),
  );
  const last = useRef(
    Math.max(0, ...messages.map((m) => (typeof m.id === "number" ? m.id : 0))),
  );
  const list = useRef(null);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(
          `/api/public/chat/${encodeURIComponent(publicId)}`,
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.detail || "This business chat is currently unavailable.",
          );
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
              ...fresh
                .filter((m) => !current.some((p) => p.id === m.id))
                .map((m) => ({ ...m, sender: "business" })),
            ]);
          }
        }
      } catch {
        /* Next polling cycle will retry. */
      }
    }
    load();
    poll();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [publicId, storageKey]);
  useEffect(() => {
    try {
      sessionStorage.setItem(
        storageKey + "-messages",
        JSON.stringify(messages.slice(-100)),
      );
    } catch {
      /* Storage availability does not prevent a conversation. */
    }
    list.current?.scrollTo({
      top: list.current.scrollHeight,
      behavior: "instant",
    });
  }, [messages, storageKey]);
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
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "We couldn’t send this message. Please try again.",
        );
      conversation.current =
        result.external_conversation_id || conversation.current;
      sessionStorage.setItem(storageKey, conversation.current);
      last.current = Math.max(last.current, result.message_id || 0);
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), sender: "customer", content },
        ...(!result.message_id ||
        !current.some((m) => m.id === result.message_id)
          ? [
              {
                id: result.message_id || crypto.randomUUID(),
                sender: "business",
                content:
                  result.reply ||
                  "Your message is saved. The owner will reply here.",
              },
            ]
          : []),
      ]);
      setText("");
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Delivery could not be confirmed. Check for replies before sending again."
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="bb bb-public-chat">
      <header className="bb-public-brand">
        <a href="/" aria-label="BizBuddy home">
          <Brand />
        </a>
        <span>Every chat. One inbox.</span>
      </header>
      <section className="bb-chat-window">
        <header>
          <span className="bb-avatar">
            {initials(config?.name || "Business")}
          </span>
          <div>
            <h1>{config?.name || "Business chat"}</h1>
            <span>Product questions, delivery and order requests.</span>
          </div>
          <Status tone={config ? "success" : "neutral"}>
            {config ? "Chat available" : "Connecting"}
          </Status>
        </header>
        <div
          className="bb-public-messages"
          ref={list}
          aria-live="polite"
          aria-relevant="additions"
        >
          <div className="bb-chat-date">
            Your conversation with {config?.name || "this business"}
          </div>
          {config && (
            <article className="bb-bubble">
              <small>Business assistant</small>
              <p>
                {config.welcome_message || "Hello! How can we help you today?"}
              </p>
            </article>
          )}
          {messages.map((m) => (
            <article
              className={`bb-bubble ${m.sender === "customer" ? "bb-bubble-owner" : ""}`}
              key={m.id}
            >
              <small>
                {m.sender === "customer" ? "You" : config?.name || "Business"}
              </small>
              <p>{m.content}</p>
            </article>
          ))}
          {!config && !error && (
            <p className="bb-form-help">Opening your conversation…</p>
          )}
        </div>
        <form className="bb-public-composer" onSubmit={send}>
          {error && (
            <p className="bb-alert bb-alert-error" role="alert">
              <Icon name="warning" size={18} />
              {error}
            </p>
          )}
          <label htmlFor="customer-message" className="bb-sr-only">
            Your message
          </label>
          <div>
            <textarea
              id="customer-message"
              required
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your message…"
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  e.currentTarget.form.requestSubmit();
                }
              }}
            />
            <Button
              busy={busy}
              icon="send"
              disabled={!config || !text.trim()}
              aria-label="Send message"
            >
              Send
            </Button>
          </div>
          <p>
            <Icon name="shield" size={13} />
            Orders and payments are confirmed by the owner.
          </p>
        </form>
      </section>
      <footer>
        Powered by <strong>BizBuddy</strong> · Keep this page open for replies.
      </footer>
    </main>
  );
}
