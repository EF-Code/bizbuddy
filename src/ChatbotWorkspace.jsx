import { useEffect, useState } from 'react'
import './ChatbotWorkspace.css'

async function request(path, method = 'GET', data) {
  const response = await fetch(`/api/chatbot${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('bizbuddyToken') || ''}` },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Please check the settings and try again.')
  return result
}

export default function ChatbotWorkspace({ setNotice }) {
  const [settings, setSettings] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [reply, setReply] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([request(''), request('/dashboard')]).then(([config, data]) => {
      if (cancelled) return
      setSettings(config)
      setDashboard(data)
      setError('')
    }).catch(err => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [reload])

  useEffect(() => {
    let cancelled = false
    let loading = false
    const timer = setInterval(async () => {
      if (loading || document.hidden) return
      loading = true
      try {
        const data = await request('/dashboard')
        if (!cancelled) { setDashboard(data); setError('') }
      } catch (err) { if (!cancelled) setError(`Inbox refresh failed: ${err.message}`) }
      finally { loading = false }
    }, 3000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])

  async function perform(action, success) {
    setBusy(true)
    setError('')
    try { await action(); setNotice(success) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  const update = (field, value) => setSettings(current => ({ ...current, [field]: value }))
  const conversations = dashboard?.conversations.filter(item => item.channel === 'website') || []
  const selected = conversations.find(item => item.id === selectedId) || conversations[0]
  const connected = dashboard?.channels.some(item => item.channel === 'website' && item.status === 'connected')
  const apiOrigin = dashboard?.public_api_url || window.location.origin
  const widgetUrl = `${apiOrigin}/chatbot-widget.js?bot=${encodeURIComponent(settings?.public_id || '')}`
  const snippet = `<script src="${widgetUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}" defer></script>`

  return <div className="chatbot-workspace webchat-workspace">
    <section className="chatbot-summary">
      <div className="chatbot-summary-copy">
        <span className={`chatbot-status ${dashboard?.enabled && connected ? 'is-live' : ''}`}><i />{dashboard?.enabled && connected ? 'Website chat is live' : 'Website chat is offline'}</span>
        <h2>A real conversation starts here.</h2>
        <p>Receive website messages, answer customers, and keep every conversation in one place.</p>
      </div>
      <button className="chatbot-secondary" disabled={busy} onClick={() => setReload(value => value + 1)}>Refresh</button>
    </section>
    {error && <div role="alert" className="webchat-error">{error}</div>}
    {!settings || !dashboard ? <p role="status">Loading website chat…</p> : <>
      <section className="chatbot-metrics">
        <article><span>Website conversations</span><strong>{conversations.length}</strong><small>Most recent 50 conversations</small></article>
        <article><span>Needs your attention</span><strong>{conversations.filter(item => item.status === 'human_attention').length}</strong><small>Waiting for an owner reply</small></article>
        <article><span>AI provider</span><strong>{dashboard.ai_configured ? 'Configured' : 'Not configured'}</strong><small>Owner replies work without AI</small></article>
        <article><span>Other channels</span><strong>Coming later</strong><small>WhatsApp · Telegram · Instagram</small></article>
      </section>
      <section className="chatbot-section">
        <div className="chatbot-section-heading"><div><p>WEBSITE CHAT</p><h2>Set up your business assistant</h2></div><span className="chatbot-muted">{connected ? 'Website connected' : 'Website not connected'}</span></div>
        <form className="webchat-settings" onSubmit={event => {
          event.preventDefault()
          perform(async () => {
            const saved = await request('', 'PUT', settings)
            setSettings(saved)
            await request('/automation', 'PATCH', { auto_responses: settings.auto_responses })
            const data = await request('/dashboard')
            setDashboard(data)
          }, 'Website chat settings saved.')
        }}>
          <label>Business name<input required maxLength={255} value={settings.business_name} onChange={event => update('business_name', event.target.value)} /></label>
          <label>Assistant name<input required maxLength={255} value={settings.name} onChange={event => update('name', event.target.value)} /></label>
          <label className="webchat-wide">Website origin<input type="url" required placeholder="https://your-shop.com" value={settings.website_domain} onChange={event => update('website_domain', event.target.value)} /><small>Exact website address, including https://, without a page path. For local testing: {window.location.origin}</small></label>
          <label className="webchat-wide">Welcome message<textarea maxLength={2000} value={settings.welcome_message} onChange={event => update('welcome_message', event.target.value)} /></label>
          <label className="webchat-wide">Business knowledge<textarea maxLength={5000} placeholder="Describe your business and anything customers should know. Add confirmed product prices below." value={settings.business_description} onChange={event => update('business_description', event.target.value)} /></label>
          <label>Opening hours<input maxLength={2000} value={settings.operating_hours} onChange={event => update('operating_hours', event.target.value)} /></label>
          <label>Delivery policy<input maxLength={2000} value={settings.delivery_policy} onChange={event => update('delivery_policy', event.target.value)} /></label>
          <label className="webchat-wide">Payment policy<input maxLength={2000} value={settings.payment_policy} onChange={event => update('payment_policy', event.target.value)} /></label>
          <fieldset className="webchat-wide webchat-products"><legend>Products and confirmed prices</legend>
            {settings.products.map((product, index) => <div className="webchat-product" key={index}>
              {['name', 'price', 'availability', 'description'].map(field => <label key={field}>{field === 'name' ? 'Product name' : field === 'price' ? 'Confirmed price' : field === 'availability' ? 'Availability' : 'Description'}<input required={field === 'name'} maxLength={field === 'price' ? 100 : field === 'description' ? 2000 : 255} value={product[field]} onChange={event => update('products', settings.products.map((item, position) => position === index ? { ...item, [field]: event.target.value } : item))} /></label>)}
              <button type="button" className="chatbot-secondary" onClick={() => update('products', settings.products.filter((_, position) => position !== index))}>Remove product {index + 1}</button>
            </div>)}
            <button type="button" className="chatbot-secondary" disabled={settings.products.length >= 100} onClick={() => update('products', [...settings.products, { name: '', price: '', availability: '', description: '' }])}>Add product</button>
          </fieldset>
          <label className="webchat-wide webchat-checkbox"><input type="checkbox" checked={settings.auto_responses} onChange={event => update('auto_responses', event.target.checked)} />Automatic AI replies</label>
          <p className="webchat-wide">Turn off automatic replies for owner-only chat. If AI is unavailable, incoming messages are saved for you to answer.</p>
          <button className="chatbot-primary" disabled={busy}>Save settings</button>
        </form>
        <div className="webchat-actions">
          <button className="chatbot-secondary" disabled={busy || !settings.id} onClick={() => perform(async () => {
            await request('/channels', 'POST', { channel: 'website' })
            setDashboard(await request('/dashboard'))
          }, 'Website channel connected.')}>Connect website</button>
          <button className="chatbot-primary" disabled={busy || !connected} onClick={() => perform(async () => {
            const result = await request(dashboard.enabled ? '/deactivate' : '/activate', 'POST')
            setSettings(result)
            setDashboard(await request('/dashboard'))
          }, dashboard.enabled ? 'Website chat stopped.' : 'Website chat started.')}>{dashboard.enabled ? 'Stop website chat' : 'Start website chat'}</button>
        </div>
      </section>
      <section className="chatbot-section">
        <div className="chatbot-section-heading"><div><p>INSTALL ON YOUR WEBSITE</p><h2>Bring the chat to your customers</h2></div></div>
        <p>Save your settings, connect, and start chat. Then paste this snippet before your website’s closing body tag.</p>
        <pre className="webchat-snippet">{settings.public_id ? snippet : 'Save settings to generate your widget.'}</pre>
        <p>For an external website, set PUBLIC_API_URL on the backend to its public HTTPS address. The website origin above must match the website embedding the widget.</p>
      </section>
      <section className="chatbot-section">
        <div className="chatbot-section-heading"><div><p>LIVE WEBSITE INBOX</p><h2>Customer conversations</h2></div><span className="chatbot-muted">Updates every 3 seconds</span></div>
        {!conversations.length ? <p>No website messages yet. Install the widget and send your first message.</p> : <div className="chatbot-inbox">
          <div className="chatbot-conversation-list" aria-label="Website conversations">{conversations.map(item => <button key={item.id} className={selected?.id === item.id ? 'selected' : ''} onClick={() => { setSelectedId(item.id); setReply('') }}>
            <span className="chatbot-customer-avatar">⌂</span><span className="chatbot-conversation-summary"><strong>{item.customer_name || 'Website visitor'}</strong><span className="chatbot-conversation-preview">{item.messages.at(-1)?.content}</span><small>{item.status === 'human_attention' ? 'Needs reply' : item.status}</small></span>
          </button>)}</div>
          {selected && <div className="chatbot-conversation-view">
            <div className="chatbot-conversation-heading"><strong>{selected.customer_name || 'Website visitor'}</strong><span>{selected.status === 'human_attention' ? 'Needs reply' : selected.status}</span></div>
            <div className="chatbot-message-list" role="log" aria-label="Conversation messages">{selected.messages.map(message => <article key={message.id} className={`chatbot-message ${message.sender}`}><span>{message.sender === 'owner' ? 'You' : message.sender === 'assistant' ? 'AI assistant' : 'Visitor'}</span><p>{message.content}</p></article>)}</div>
            <form className="chatbot-owner-reply" onSubmit={event => {
              event.preventDefault()
              if (!reply.trim()) return
              perform(async () => {
                await request(`/conversations/${selected.id}/reply`, 'POST', { content: reply.trim() })
                setReply('')
                setDashboard(await request('/dashboard'))
              }, 'Reply sent to the website visitor.')
            }}><input aria-label="Reply to website visitor" required maxLength={2000} value={reply} onChange={event => setReply(event.target.value)} placeholder="Write a reply…" /><button className="chatbot-primary" disabled={busy || !connected || !reply.trim()}>Send reply</button></form>
          </div>}
        </div>}
      </section>
    </>}
  </div>
}
