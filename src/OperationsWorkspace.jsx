import { useCallback, useEffect, useState } from "react";
import { request } from "./operationsApi";
import "./OperationsWorkspace.css";

const money = (amount) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(
    amount / 100,
  );
const emptyProduct = {
  name: "",
  price: "",
  stock: "",
  threshold: 5,
  description: "",
};

export default function OperationsWorkspace({ page, setNotice }) {
  const [data, setData] = useState(null);
  const [inbox, setInbox] = useState(null);
  const [bot, setBot] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [reply, setReply] = useState("");
  const [product, setProduct] = useState(emptyProduct);
  const [editId, setEditId] = useState("");
  const [links, setLinks] = useState([]);
  const [draftEdits, setDraftEdits] = useState({});
  const refresh = useCallback(async () => {
    try {
      const [next, conversations, settings] = await Promise.all([
        request("/operations"),
        request("/chatbot/dashboard"),
        request("/chatbot"),
      ]);
      setData(next);
      setInbox(conversations);
      setBot(settings);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!cancelled) await refresh();
    };
    load();
    const timer = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [refresh]);
  async function action(fn, message) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
      if (message) setNotice(message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!data || !inbox || !bot)
    return (
      <section className="ops">
        <p role="status">{error || "Loading your business workspace…"}</p>
        {error && <button onClick={refresh}>Retry</button>}
      </section>
    );
  const conversation =
    inbox.conversations.find((c) => c.id === selected) ||
    inbox.conversations[0];
  const customerGroup = data.customers.find(
    (c) => c.id === conversation?.customer_id,
  )?.group_id;
  const linkedIds = data.customers
    .filter((c) => c.group_id === customerGroup)
    .map((c) => c.id);
  const related = conversation
    ? inbox.conversations.filter(
        (c) => c.id === conversation.id || linkedIds.includes(c.customer_id),
      )
    : [];
  const thread = related
    .flatMap((c) => c.messages.map((m) => ({ ...m, channel: c.channel })))
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
  const settingsPage = [
    "AI Chatbot Connection",
    "Channels & Sync",
    "AI Atelier Tone",
  ].includes(page);
  const inboxPage = page === "Unified Concierge";
  const invoicesPage = page === "Invoices & Reminders";
  const stockPage = page === "Fabrics & Stock";
  const customersPage = page === "Client Profiles";
  const summary = data.summary;
  const chatLink = bot.public_id
    ? `${window.location.origin}/chat/${bot.public_id}`
    : "";

  async function saveProduct(event) {
    event.preventDefault();
    await action(async () => {
      await request(
        `/operations/products${editId ? `/${editId}` : ""}`,
        {
          ...product,
          price: Math.round(Number(product.price) * 100),
          stock: Number(product.stock),
          threshold: Number(product.threshold),
        },
        editId ? "PUT" : "POST",
      );
      setProduct(emptyProduct);
      setEditId("");
    }, "Inventory saved. Assistant knowledge updated.");
  }
  async function downloadDraft(draft) {
    await action(async () => {
      const response = await fetch(`/api/operations/drafts/${draft.id}/email`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("bizbuddyToken")}`,
        },
      });
      if (!response.ok) throw new Error("Could not download this draft.");
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${draft.invoice_id.slice(0, 8)}.eml`;
      a.click();
      URL.revokeObjectURL(url);
    }, "Email draft downloaded. Open it in your email app to send.");
  }
  return (
    <section className="ops" aria-label="Business workspace">
      <header className="ops-heading">
        <div>
          <p>BIZBUDDY BACK OFFICE</p>
          <h2>
            {inboxPage
              ? "Every conversation. One inbox."
              : settingsPage
                ? "Your business, connected."
                : invoicesPage
                  ? "Get paid, without the chasing."
                  : stockPage
                    ? "Know what’s on your shelves."
                    : customersPage
                      ? "One customer across channels."
                      : "Your business at a glance."}
          </h2>
          <span>Persistent records · {data.reply_engine} replies · NGN</span>
        </div>
        <button
          disabled={busy}
          onClick={() =>
            action(
              () => request("/operations/automation", {}),
              "Summary refreshed and overdue reminders prepared.",
            )
          }
        >
          Refresh summary
        </button>
      </header>
      {error && (
        <div className="ops-error" role="alert">
          {error}
        </div>
      )}
      {page === "Atelier Dashboard" && (
        <>
          <div className="ops-stats">
            {[
              ["Order requests today", summary.order_requests],
              ["Outstanding", money(summary.unpaid_total)],
              ["Overdue invoices", summary.overdue_count],
              ["Needs your attention", summary.needs_attention],
            ].map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <div className="ops-grid">
            <article className="ops-card">
              <h3>
                Daily briefing <small>{summary.date}</small>
              </h3>
              <p>
                {summary.order_requests} order requests across{" "}
                {Object.keys(summary.by_channel).length} channels.{" "}
                {money(summary.overdue_total)} overdue.{" "}
                {summary.needs_attention} conversations need your review.
              </p>
              {Object.entries(summary.by_channel).map(([channel, count]) => (
                <p key={channel}>
                  {channel}: {count} order requests
                </p>
              ))}
              <h4>Stock to watch</h4>
              {summary.low_stock.length ? (
                summary.low_stock.map((p) => (
                  <p key={p.name}>
                    {p.name}: {p.stock} remaining
                  </p>
                ))
              ) : (
                <p>No low-stock products.</p>
              )}
              <p className="ops-muted">
                Updated every minute. Summaries are saved by date; all reminders
                wait for owner approval.
              </p>
            </article>
            <article className="ops-card">
              <h3>Start here</h3>
              <ol>
                <li>Add your products under Fabrics & Stock.</li>
                <li>Enable free web chat in AI Chatbot Connection.</li>
                <li>Share the customer chat link or connect Telegram.</li>
                <li>Review requests in Unified Concierge.</li>
                <li>Create invoices and review reminders.</li>
              </ol>
              <p>
                No paid API key is required. Unrecognized questions go to you.
              </p>
            </article>
          </div>
          <article className="ops-card">
            <h3>Recent daily summaries</h3>
            {data.summaries.map((s) => (
              <p key={s.date}>
                {s.date} · {s.order_requests} order requests ·{" "}
                {money(s.unpaid_total)} outstanding · {s.needs_attention} need
                attention
              </p>
            ))}
          </article>
        </>
      )}
      {stockPage && (
        <div className="ops-grid">
          <form className="ops-card ops-form" onSubmit={saveProduct}>
            <h3>{editId ? "Edit product" : "Add a product"}</h3>
            {[
              ["name", "Product name", "text"],
              ["price", "Price (NGN)", "number"],
              ["stock", "Units in stock", "number"],
              ["threshold", "Low-stock threshold", "number"],
            ].map(([key, label, type]) => (
              <label key={key}>
                {label}
                <input
                  required
                  type={type}
                  min={type === "number" ? 0 : undefined}
                  step={key === "price" ? ".01" : undefined}
                  value={product[key]}
                  onChange={(e) =>
                    setProduct({ ...product, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <label>
              Description
              <textarea
                value={product.description}
                onChange={(e) =>
                  setProduct({ ...product, description: e.target.value })
                }
              />
            </label>
            <button disabled={busy}>Save product</button>
            {editId && (
              <button
                type="button"
                onClick={() => {
                  setEditId("");
                  setProduct(emptyProduct);
                }}
              >
                Cancel edit
              </button>
            )}
          </form>
          <article className="ops-card">
            <h3>Product catalogue</h3>
            <p className="ops-muted">
              Prices and availability feed the reply engine. Confirming inbox
              order requests reduces stock automatically. You can also edit
              stock here.
            </p>
            {data.products.length ? (
              data.products.map((p) => (
                <div className="ops-row" key={p.id}>
                  <div>
                    <strong>{p.name}</strong>
                    <p>
                      {money(p.price)} · {p.stock} units{" "}
                      {p.stock <= p.threshold && (
                        <span className="ops-badge">Low stock</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditId(p.id);
                      setProduct({ ...p, price: p.price / 100 });
                    }}
                  >
                    Edit
                  </button>
                </div>
              ))
            ) : (
              <p>Add your first product to start answering price questions.</p>
            )}
          </article>
        </div>
      )}
      {inboxPage && (
        <>
          <div className="ops-toolbar">
            <label>
              Channel{" "}
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
              >
                <option value="all">All channels</option>
                {[...new Set(inbox.conversations.map((c) => c.channel))].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={attentionOnly}
                onChange={(e) => setAttentionOnly(e.target.checked)}
              />{" "}
              Needs attention only
            </label>
            <span>
              {inbox.ai_handled_count} assistant replies ·{" "}
              {inbox.pending_order_count} pending order requests
            </span>
          </div>
          <div className="ops-inbox">
            <aside className="ops-card">
              {inbox.conversations
                .filter(
                  (c) =>
                    (channelFilter === "all" || c.channel === channelFilter) &&
                    (!attentionOnly || c.status === "human_attention"),
                )
                .map((c) => (
                  <button
                    className={`ops-conversation ${conversation?.id === c.id ? "selected" : ""}`}
                    key={c.id}
                    onClick={() => setSelected(c.id)}
                  >
                    <strong>{c.customer_name || "Customer"}</strong>
                    <span>
                      {c.channel} · {c.status.replaceAll("_", " ")}
                    </span>
                    <p>{c.messages.at(-1)?.content}</p>
                  </button>
                ))}
              {!inbox.conversations.length && (
                <p>
                  No conversations yet. Enable web chat and send a test message.
                </p>
              )}
            </aside>
            <article className="ops-card">
              {conversation ? (
                <>
                  <h3>
                    {conversation.customer_name || "Customer"}{" "}
                    <small>{conversation.channel}</small>
                  </h3>
                  <div className="ops-thread" aria-live="polite">
                    {thread.map((m) => (
                      <div className={`ops-message ops-${m.sender}`} key={m.id}>
                        <small>
                          {m.sender} · {m.channel} ·{" "}
                          {new Date(m.created_at + "Z").toLocaleString()} ·{" "}
                          {m.delivery_status}
                        </small>
                        <p>{m.content}</p>
                      </div>
                    ))}
                  </div>
                  <form
                    className="ops-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      action(async () => {
                        await request(
                          `/chatbot/conversations/${conversation.id}/reply`,
                          { content: reply },
                        );
                        setReply("");
                      }, "Reply sent.");
                    }}
                  >
                    <label>
                      Reply as the owner
                      <textarea
                        required
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        maxLength={2000}
                      />
                    </label>
                    <button disabled={busy || !reply.trim()}>Send reply</button>
                  </form>
                  <button
                    disabled={busy}
                    onClick={() =>
                      action(
                        () =>
                          request(
                            `/chatbot/conversations/${conversation.id}/status`,
                            { status: "closed" },
                            "PATCH",
                          ),
                        "Conversation closed.",
                      )
                    }
                  >
                    Mark resolved
                  </button>
                  {inbox.order_requests
                    .filter((o) => o.conversation_id === conversation.id)
                    .map((o) => (
                      <div className="ops-request" key={o.id}>
                        <h4>Order request awaiting confirmation</h4>
                        <p>{o.request}</p>
                        <form
                          className="ops-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            action(async () => {
                              const result = await request(
                                `/operations/order-requests/${o.id}/confirm`,
                                {
                                  product_id: f.get("product_id"),
                                  quantity: Number(f.get("quantity")),
                                },
                              );
                              if (result.notification_failed)
                                setNotice(
                                  "Order saved and stock updated. Customer notification failed; reply manually.",
                                );
                              else
                                setNotice(
                                  "Order confirmed, stock updated and customer notified.",
                                );
                            });
                          }}
                        >
                          <label>
                            Confirm product
                            <select
                              aria-label="Confirm product"
                              required
                              name="product_id"
                            >
                              <option value="">Select a product</option>
                              {data.products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} · {money(p.price)} · {p.stock} in
                                  stock
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Quantity
                            <input
                              required
                              name="quantity"
                              type="number"
                              min="1"
                              step="1"
                              defaultValue="1"
                            />
                          </label>
                          <button disabled={busy}>
                            Confirm order & adjust stock
                          </button>
                        </form>
                        <small>
                          Verify the requested item and quantity first. Delivery
                          is arranged separately.
                        </small>
                      </div>
                    ))}
                </>
              ) : (
                <p>Your customer messages will appear here.</p>
              )}
            </article>
          </div>
        </>
      )}
      {invoicesPage && (
        <>
          <div className="ops-grid">
            <form
              className="ops-card ops-form"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const f = new FormData(form);
                action(async () => {
                  await request("/operations/invoices", {
                    customer: f.get("customer"),
                    email: f.get("email"),
                    amount: Math.round(Number(f.get("amount")) * 100),
                    due: f.get("due"),
                    conversation_id: f.get("conversation_id"),
                    confirmed: f.get("confirmed") === "on",
                  });
                  form.reset();
                }, "Invoice saved and email draft prepared.");
              }}
            >
              <h3>Create an invoice</h3>
              <label>
                Customer
                <input name="customer" required maxLength={255} />
              </label>
              <label>
                Email (optional)
                <input name="email" type="email" />
              </label>
              <label>
                Amount (NGN)
                <input
                  name="amount"
                  type="number"
                  required
                  min=".01"
                  step=".01"
                />
              </label>
              <label>
                Due date
                <input name="due" type="date" required />
              </label>
              <label>
                Reminder channel
                <select name="conversation_id">
                  <option value="">Email draft only</option>
                  {inbox.conversations
                    .filter((c) =>
                      ["website", "telegram", "email"].includes(c.channel),
                    )
                    .map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.customer_name || "Customer"} · {c.channel}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <input type="checkbox" name="confirmed" /> I verified this
                invoice and customer
              </label>
              <button disabled={busy}>Create invoice</button>
            </form>
            <article className="ops-card">
              <h3>Invoices</h3>
              {data.invoices.length ? (
                data.invoices.map((i) => (
                  <div className="ops-row" key={i.id}>
                    <div>
                      <strong>
                        {i.customer} · {money(i.amount)}
                      </strong>
                      <p>
                        #{i.id.slice(0, 8)} · Due {i.due} · {i.status}
                        {!i.confirmed && " · Unconfirmed"}
                      </p>
                    </div>
                    {i.status !== "paid" && (
                      <div>
                        {!i.confirmed && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              action(
                                () =>
                                  request(
                                    `/operations/invoices/${i.id}/confirm`,
                                    {},
                                  ),
                                "Invoice confirmed.",
                              )
                            }
                          >
                            Confirm
                          </button>
                        )}
                        <button
                          disabled={busy}
                          onClick={() =>
                            action(
                              () =>
                                request(
                                  `/operations/invoices/${i.id}/paid`,
                                  {},
                                ),
                              "Payment recorded. Pending reminders cancelled.",
                            )
                          }
                        >
                          Mark paid
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p>No invoices yet.</p>
              )}
            </article>
          </div>
          <article className="ops-card">
            <h3>Drafts & reminders</h3>
            <p className="ops-muted">
              Overdue confirmed invoices create reminders automatically. Review
              every message before delivery. Download email drafts to send from
              your mail app.
            </p>
            {data.drafts.map((d) => (
              <div className="ops-draft" key={d.id}>
                <h4>
                  {d.subject} {d.recipient && <small>To: {d.recipient} </small>}
                  <span className="ops-badge">
                    {d.status.replaceAll("_", " ")}
                  </span>
                </h4>
                <label className="ops-form">
                  Message
                  <textarea
                    value={draftEdits[d.id] ?? d.content}
                    disabled={d.status !== "awaiting_approval"}
                    onChange={(e) =>
                      setDraftEdits({ ...draftEdits, [d.id]: e.target.value })
                    }
                  />
                </label>
                {d.status === "awaiting_approval" && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      action(
                        () =>
                          request(`/operations/drafts/${d.id}/approve`, {
                            content: draftEdits[d.id] ?? d.content,
                          }),
                        d.conversation_id
                          ? "Message delivered."
                          : "Email draft saved. Download it to send.",
                      )
                    }
                  >
                    {d.conversation_id
                      ? "Approve & send to original chat"
                      : "Save reviewed email draft"}
                  </button>
                )}
                {!d.conversation_id && (
                  <button disabled={busy} onClick={() => downloadDraft(d)}>
                    Download email draft
                  </button>
                )}
                {!d.conversation_id &&
                  d.status === "email_ready" &&
                  inbox.channels.some(
                    (c) => c.channel === "email" && c.status === "connected",
                  ) && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        action(
                          () =>
                            request(
                              `/operations/email/drafts/${d.id}/send`,
                              {},
                            ),
                          "Email sent through Gmail.",
                        )
                      }
                    >
                      Send approved email with Gmail
                    </button>
                  )}
              </div>
            ))}
          </article>
        </>
      )}
      {settingsPage && (
        <>
          <article className="ops-card">
            <h3>
              Assistant status:{" "}
              {bot.enabled && bot.auto_responses ? "active" : "paused"}
            </h3>
            <button
              disabled={busy}
              onClick={() =>
                action(
                  async () => {
                    if (!bot.enabled) await request("/chatbot/activate", {});
                    await request(
                      "/chatbot/automation",
                      { auto_responses: !(bot.enabled && bot.auto_responses) },
                      "PATCH",
                    );
                  },
                  bot.enabled && bot.auto_responses
                    ? "Assistant paused. New messages wait for you."
                    : "Assistant activated.",
                )
              }
            >
              {bot.enabled && bot.auto_responses
                ? "Pause automatic replies"
                : "Activate automatic replies"}
            </button>
            <p className="ops-muted">
              Unknown questions and order requests always require your review.
              Email replies always wait for approval.
            </p>
          </article>
          <div className="ops-grid">
            <article className="ops-card">
              <h3>Free website chat</h3>
              <p>
                Enable a real customer chat page. Messages, handoffs and order
                requests appear in your inbox.
              </p>
              <button
                disabled={busy}
                onClick={() =>
                  action(
                    () => request("/operations/website/setup", {}),
                    "Website chat enabled.",
                  )
                }
              >
                {bot.enabled
                  ? "Enable / refresh website chat"
                  : "Enable website chat"}
              </button>
              {chatLink && (
                <p>
                  <a href={chatLink} target="_blank" rel="noreferrer">
                    Open customer chat ↗
                  </a>
                  <br />
                  <code className="ops-link">{chatLink}</code>
                </p>
              )}
              <h4>Try your assistant</h4>
              <form
                className="ops-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  action(
                    () =>
                      request("/operations/website/message", {
                        customer: f.get("customer"),
                        content: f.get("content"),
                      }),
                    "Test message saved. Check Unified Concierge for the reply.",
                  );
                }}
              >
                <label>
                  Customer name
                  <input
                    name="customer"
                    required
                    defaultValue="Test customer"
                  />
                </label>
                <label>
                  Message
                  <textarea
                    name="content"
                    required
                    placeholder="What is the price of Blue ankara?"
                  />
                </label>
                <button disabled={busy}>Send test message</button>
              </form>
            </article>
            <article className="ops-card">
              <h3>Telegram · free Bot API</h3>
              <p>
                Create a bot with @BotFather, paste its token here, and BizBuddy
                registers the webhook for you.
              </p>
              <form
                className="ops-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const f = new FormData(form);
                  action(async () => {
                    await request("/chatbot/channels", {
                      channel: "telegram",
                      bot_token: f.get("token"),
                    });
                    await request("/chatbot/activate", {});
                    form.reset();
                  }, "Telegram connected. Message your bot to start.");
                }}
              >
                <label>
                  Bot token
                  <input
                    type="password"
                    name="token"
                    required
                    autoComplete="off"
                  />
                </label>
                <button disabled={busy}>Connect Telegram</button>
              </form>
              <h4>Connections</h4>
              {inbox.channels.map((c) => (
                <div className="ops-row" key={c.channel}>
                  <span>
                    {c.channel} · {c.status}
                  </span>
                  <button
                    disabled={busy}
                    onClick={() =>
                      action(
                        () =>
                          request(
                            ["twilio_whatsapp", "sms"].includes(c.channel)
                              ? "/twilio/disconnect"
                              : `/chatbot/channels/${c.channel}`,
                            {},
                            "DELETE",
                          ),
                        "Channel disconnected.",
                      )
                    }
                  >
                    Disconnect
                  </button>
                </div>
              ))}
              <p className="ops-muted">
                WhatsApp / SMS need a Twilio account and may incur charges.
                Instagram / Facebook need Meta approval. Gmail syncs unread
                plain-text email once a minute; every generated reply waits for
                your approval.
              </p>
            </article>
          </div>
          <article className="ops-card">
            <h3>Gmail · optional free email channel</h3>
            <p>
              Use a dedicated Gmail inbox and a Google app password. Two-step
              verification is required by Google. BizBuddy reads unread
              plain-text messages and prepares replies for approval; it does not
              read attachments.
            </p>
            <form
              className="ops-form"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const values = Object.fromEntries(new FormData(form));
                action(async () => {
                  await request("/operations/email/connect", values);
                  form.reset();
                }, "Gmail connected. Unread messages will sync every minute.");
              }}
            >
              <div className="ops-grid">
                <label>
                  Gmail address
                  <input
                    required
                    name="address"
                    type="email"
                    autoComplete="off"
                  />
                </label>
                <label>
                  Google app password
                  <input
                    required
                    name="app_password"
                    type="password"
                    autoComplete="off"
                  />
                </label>
              </div>
              <button disabled={busy}>Verify & connect Gmail</button>
            </form>
            <button
              disabled={busy}
              onClick={() =>
                action(
                  () => request("/operations/email/sync", {}),
                  "Gmail sync completed. Review your inbox and drafts.",
                )
              }
            >
              Sync Gmail now
            </button>
            <p className="ops-muted">
              Replies can be reviewed under Invoices & Reminders or sent
              manually from Unified Concierge. Credentials are encrypted on the
              server. No Google Cloud project or OAuth app setup is needed for
              this dedicated-inbox option.
            </p>
          </article>
          <form
            className="ops-card ops-form"
            key={`notifications-${data.notifications.channel}-${data.notifications.recipient}-${data.notifications.hour_utc}`}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              action(
                () =>
                  request(
                    "/operations/notifications",
                    {
                      channel: f.get("channel"),
                      recipient: f.get("recipient"),
                      hour_utc: Number(f.get("hour_utc")),
                    },
                    "PUT",
                  ),
                "Daily summary preference saved.",
              );
            }}
          >
            <h3>Your daily summary</h3>
            <p>
              Keep summaries in your dashboard or opt in to one daily message
              through a connected channel.
            </p>
            <div className="ops-grid">
              <label>
                Delivery
                <select
                  name="channel"
                  defaultValue={data.notifications.channel}
                >
                  <option value="dashboard">Dashboard only</option>
                  <option value="telegram">Telegram</option>
                  <option value="email">Gmail</option>
                </select>
              </label>
              <label>
                Owner email or Telegram chat ID
                <input
                  name="recipient"
                  defaultValue={data.notifications.recipient}
                  maxLength={255}
                />
              </label>
              <label>
                Hour (UTC, 0–23)
                <input
                  name="hour_utc"
                  type="number"
                  min="0"
                  max="23"
                  required
                  defaultValue={data.notifications.hour_utc}
                />
              </label>
            </div>
            <p className="ops-muted">
              Telegram: message your bot first; your numeric chat ID appears in
              Client Profiles. Last delivery:{" "}
              {data.notifications.sent_day || "none"} ·{" "}
              {data.notifications.last_status.replaceAll("_", " ")}. Uncertain
              deliveries are not retried automatically.
            </p>
            <button disabled={busy}>Save summary delivery</button>
          </form>
          <article className="ops-card">
            <h3>Frequently asked questions</h3>
            {bot.faqs.map((faq, index) => (
              <div className="ops-row" key={index}>
                <div>
                  <strong>{faq.question}</strong>
                  <p>{faq.answer}</p>
                </div>
                <button
                  disabled={busy}
                  onClick={() =>
                    action(
                      () =>
                        request(
                          "/chatbot",
                          {
                            ...bot,
                            faqs: bot.faqs.filter((_, i) => i !== index),
                          },
                          "PUT",
                        ),
                      "FAQ removed.",
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <form
              className="ops-form"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const f = new FormData(form);
                action(async () => {
                  await request(
                    "/chatbot",
                    {
                      ...bot,
                      faqs: [
                        ...bot.faqs,
                        {
                          question: f.get("question"),
                          answer: f.get("answer"),
                        },
                      ],
                    },
                    "PUT",
                  );
                  form.reset();
                }, "FAQ saved.");
              }}
            >
              <label>
                Customer question
                <input required name="question" maxLength={1000} />
              </label>
              <label>
                Verified answer
                <textarea required name="answer" maxLength={2000} />
              </label>
              <button disabled={busy || bot.faqs.length >= 100}>Add FAQ</button>
            </form>
          </article>
          <form
            className="ops-card ops-form"
            key={bot.updated_at}
            onSubmit={(e) => {
              e.preventDefault();
              const fields = Object.fromEntries(new FormData(e.currentTarget));
              action(
                () => request("/chatbot", { ...bot, ...fields }, "PUT"),
                "Business knowledge saved.",
              );
            }}
          >
            <h3>Business knowledge & tone</h3>
            <p className="ops-muted">
              The free engine quotes this information directly. Unknown
              questions are handed to you. Add prices and availability through
              inventory.
            </p>
            <div className="ops-grid">
              {[
                ["name", "Assistant name"],
                ["business_name", "Business name"],
                ["operating_hours", "Opening hours"],
                ["delivery_policy", "Delivery policy"],
                ["payment_policy", "Payment policy"],
                ["welcome_message", "Welcome message"],
                ["response_tone", "Reply tone"],
                ["business_description", "About the business"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <textarea
                    name={key}
                    defaultValue={bot[key] || ""}
                    required={["name", "business_name"].includes(key)}
                    maxLength={2000}
                  />
                </label>
              ))}
            </div>
            <button disabled={busy}>Save business knowledge</button>
          </form>
        </>
      )}
      {customersPage && (
        <article className="ops-card">
          <h3>Customer directory</h3>
          <p>
            Link records only after verifying they belong to the same person.
            Channel identities and full conversation history stay intact.
          </p>
          {data.customers.map((c) => (
            <label className="ops-row" key={c.id}>
              <input
                type="checkbox"
                checked={links.includes(String(c.id))}
                onChange={(e) =>
                  setLinks(
                    e.target.checked
                      ? [...links, String(c.id)]
                      : links.filter((id) => id !== String(c.id)),
                  )
                }
              />
              <span>
                <strong>{c.name || "Customer"}</strong>
                <br />
                {c.channel} · {c.email || c.phone || c.external_id}
                <br />
                <small>Customer group: {c.group_id}</small>
              </span>
            </label>
          ))}
          {!data.customers.length && (
            <p>
              No customers yet. Start a website chat to create the first record.
            </p>
          )}
          <button
            disabled={busy || links.length < 2}
            onClick={() =>
              action(async () => {
                await request("/operations/customers/link", {
                  customer_ids: links.map(Number),
                });
                setLinks([]);
              }, "Customer records linked.")
            }
          >
            Link selected customers
          </button>
        </article>
      )}
    </section>
  );
}
