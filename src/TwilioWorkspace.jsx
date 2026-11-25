import { useEffect, useMemo, useRef, useState } from 'react'
import './TwilioWorkspace.css'

const demoAccount = {
  account_sid: 'ACDEMO••••••••••••••••••••••••',
  account_name: 'BizBuddy Demo Workspace',
  sms_sender: '+14155550199',
  whatsapp_sender: '+14155550199',
}

const makeSid = () => `SM${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase()}`
const hoursAgo = hours => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

const makeSampleMessages = () => [
  {
    message_sid: 'SM11111111111111111111111111111111',
    sender: 'whatsapp:+14155550124',
    recipient: 'whatsapp:+14155550199',
    body: 'Hi! Do you have the blue ankara fabric in stock?',
    direction: 'inbound',
    status: 'received',
    channel: 'whatsapp',
    media: [],
    created_at: hoursAgo(1),
  },
  {
    message_sid: 'SM22222222222222222222222222222222',
    sender: 'whatsapp:+14155550199',
    recipient: 'whatsapp:+14155550124',
    body: 'Hello Ada! Yes, we have it available. Would you like us to reserve some for you?',
    direction: 'outbound',
    status: 'delivered',
    channel: 'whatsapp',
    media: [],
    created_at: hoursAgo(1),
  },
  {
    message_sid: 'SM33333333333333333333333333333333',
    sender: '+14155550199',
    recipient: '+14155550125',
    body: 'Your order is ready for collection. Thank you for shopping with us!',
    direction: 'outbound',
    status: 'delivered',
    channel: 'sms',
    media: [],
    created_at: hoursAgo(4),
  },
  {
    message_sid: 'SM44444444444444444444444444444444',
    sender: '+14155550126',
    recipient: '+14155550199',
    body: 'Thanks, I have attached a photo of the pattern I want.',
    direction: 'inbound',
    status: 'received',
    channel: 'sms',
    media: [{ sid: 'MMDEMO1', url: '', content_type: 'image/jpeg' }],
    created_at: hoursAgo(8),
  },
  {
    message_sid: 'SM55555555555555555555555555555555',
    sender: 'whatsapp:+14155550199',
    recipient: 'whatsapp:+14155550127',
    body: 'Your payment has been received. We will prepare your order shortly.',
    direction: 'outbound',
    status: 'sent',
    channel: 'whatsapp',
    media: [],
    created_at: hoursAgo(24),
  },
]

const initialFilters = { phone: '', direction: '', status: '', channel: '', date_after: '', date_before: '' }

function TwilioWorkspace({ setNotice }) {
  const [connected, setConnected] = useState(true)
  const [messages, setMessages] = useState(makeSampleMessages)
  const [filters, setFilters] = useState(initialFilters)
  const [compose, setCompose] = useState({ to: '', body: '', channel: 'sms' })
  const statusTimers = useRef([])

  useEffect(() => () => statusTimers.current.forEach(window.clearTimeout), [])

  const visibleMessages = useMemo(() => messages.filter(message => {
    const phone = filters.phone.trim().replace(/^whatsapp:/i, '')
    const matchesPhone = !phone || `${message.sender} ${message.recipient}`.toLowerCase().includes(phone.toLowerCase())
    const matchesDirection = !filters.direction || message.direction === filters.direction
    const matchesStatus = !filters.status || message.status === filters.status
    const matchesChannel = !filters.channel || message.channel === filters.channel
    const timestamp = new Date(message.created_at).getTime()
    const after = filters.date_after ? new Date(`${filters.date_after}T00:00:00`).getTime() : 0
    const before = filters.date_before ? new Date(`${filters.date_before}T23:59:59`).getTime() : Infinity
    return matchesPhone && matchesDirection && matchesStatus && matchesChannel && timestamp >= after && timestamp <= before
  }), [filters, messages])

  const updateMessageStatus = (messageSid, status) => {
    setMessages(current => current.map(message => (
      message.message_sid === messageSid ? { ...message, status } : message
    )))
  }

  const sendDemoMessage = event => {
    event.preventDefault()
    if (!compose.to.trim() || !compose.body.trim()) return
    const prefix = compose.channel === 'whatsapp' ? 'whatsapp:' : ''
    const to = compose.to.trim().replace(/^whatsapp:/i, '')
    const message = {
      message_sid: makeSid(),
      sender: `${prefix}${demoAccount[compose.channel === 'whatsapp' ? 'whatsapp_sender' : 'sms_sender']}`,
      recipient: `${prefix}${to}`,
      body: compose.body.trim(),
      direction: 'outbound',
      status: 'sending',
      channel: compose.channel,
      media: [],
      created_at: new Date().toISOString(),
    }
    setMessages(current => [message, ...current])
    setCompose(current => ({ ...current, body: '' }))
    setNotice('Demo message added. No message was sent to Twilio.')

    statusTimers.current.push(window.setTimeout(() => updateMessageStatus(message.message_sid, 'sent'), 900))
    statusTimers.current.push(window.setTimeout(() => updateMessageStatus(message.message_sid, 'delivered'), 2100))
  }

  const simulateIncoming = () => {
    const senderNumber = compose.to.trim().replace(/^whatsapp:/i, '') || '+14155550128'
    const prefix = compose.channel === 'whatsapp' ? 'whatsapp:' : ''
    const message = {
      message_sid: makeSid(),
      sender: `${prefix}${senderNumber}`,
      recipient: `${prefix}${demoAccount[compose.channel === 'whatsapp' ? 'whatsapp_sender' : 'sms_sender']}`,
      body: 'That sounds great, thank you! I would like to place an order.',
      direction: 'inbound',
      status: 'received',
      channel: compose.channel,
      media: [],
      created_at: new Date().toISOString(),
    }
    setMessages(current => [message, ...current])
    setNotice('Sample incoming reply added to the demo inbox.')
  }

  const testConnection = () => setNotice('Demo connection is healthy. This is a simulated account.')

  const reconnect = () => {
    setConnected(true)
    setNotice('Demo Twilio account connected.')
  }

  const disconnect = () => {
    setConnected(false)
    setNotice('Demo account disconnected. Sample message history is still available.')
  }

  return (
    <div className="twilio-workspace">
      <div className="twilio-demo-banner"><span>DEMO PREVIEW</span> Sample account and messages only. No Twilio credentials or real message delivery required.</div>

      <section className="twilio-overview">
        <div>
          <span className={`twilio-connection-badge ${connected ? 'connected' : ''}`}>
            <i />{connected ? 'Connected · Demo' : 'Disconnected'}
          </span>
          <h2>{connected ? demoAccount.account_name : 'Connect a messaging account'}</h2>
          <p>Preview SMS and WhatsApp conversations, message delivery, and customer replies.</p>
        </div>
        <div className="twilio-overview-actions">
          {connected ? <>
            <button type="button" className="twilio-button secondary" onClick={testConnection}>Test connection</button>
            <button type="button" className="twilio-button secondary" onClick={reconnect}>Reconnect</button>
            <button type="button" className="twilio-button danger" onClick={disconnect}>Disconnect</button>
          </> : <button type="button" className="twilio-button primary" onClick={reconnect}>Connect demo account</button>}
        </div>
      </section>

      {connected && <section className="twilio-account-card">
        <div><span>ACCOUNT SID</span><strong>{demoAccount.account_sid}</strong></div>
        <div><span>SMS SENDER</span><strong>{demoAccount.sms_sender}</strong></div>
        <div><span>WHATSAPP SENDER</span><strong>{demoAccount.whatsapp_sender}</strong></div>
      </section>}

      <div className="twilio-demo-metrics">
        <article><span>MESSAGES</span><strong>{messages.length}</strong></article>
        <article><span>INCOMING</span><strong>{messages.filter(message => message.direction === 'inbound').length}</strong></article>
        <article><span>DELIVERED</span><strong>{messages.filter(message => message.status === 'delivered').length}</strong></article>
      </div>

      <div className={`twilio-content-grid ${connected ? '' : 'disconnected'}`}>
        <section className="twilio-panel">
          <div className="twilio-panel-heading"><div><span>MESSAGE COMPOSER</span><h3>Send a demo message</h3></div></div>
          {!connected && <p className="twilio-panel-copy">Reconnect the demo account to try the message composer.</p>}
          <form className="twilio-form" onSubmit={sendDemoMessage}>
            <label>Channel<select value={compose.channel} onChange={event => setCompose(current => ({ ...current, channel: event.target.value }))} disabled={!connected}>
              <option value="sms">SMS</option><option value="whatsapp">WhatsApp</option>
            </select></label>
            <label>Customer number<input type="tel" value={compose.to} onChange={event => setCompose(current => ({ ...current, to: event.target.value }))} placeholder="+14155550128" required disabled={!connected} /></label>
            <label>Message<textarea value={compose.body} onChange={event => setCompose(current => ({ ...current, body: event.target.value }))} rows="4" maxLength="1600" placeholder="Write a sample message…" required disabled={!connected} /></label>
            <button className="twilio-button primary" type="submit" disabled={!connected}>Send demo message</button>
          </form>
        </section>

        <section className="twilio-panel twilio-history-panel">
          <div className="twilio-panel-heading">
            <div><span>MESSAGE ACTIVITY</span><h3>Sample message history</h3></div>
            <button type="button" className="twilio-button secondary" onClick={simulateIncoming} disabled={!connected}>Simulate reply</button>
          </div>
          <form className="twilio-filters" onSubmit={event => event.preventDefault()}>
            <input aria-label="Filter by phone number" type="tel" placeholder="Phone number" value={filters.phone} onChange={event => setFilters(current => ({ ...current, phone: event.target.value }))} />
            <select aria-label="Filter by direction" value={filters.direction} onChange={event => setFilters(current => ({ ...current, direction: event.target.value }))}><option value="">All directions</option><option value="inbound">Incoming</option><option value="outbound">Outgoing</option></select>
            <select aria-label="Filter by status" value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="">All statuses</option><option>queued</option><option>sending</option><option>sent</option><option>delivered</option><option>received</option><option>failed</option><option>undelivered</option></select>
            <select aria-label="Filter by channel" value={filters.channel} onChange={event => setFilters(current => ({ ...current, channel: event.target.value }))}><option value="">All channels</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option></select>
            <label>From<input type="date" value={filters.date_after} onChange={event => setFilters(current => ({ ...current, date_after: event.target.value }))} /></label>
            <label>To<input type="date" value={filters.date_before} onChange={event => setFilters(current => ({ ...current, date_before: event.target.value }))} /></label>
            <button type="button" className="twilio-button secondary" onClick={() => setFilters(initialFilters)}>Clear filters</button>
          </form>

          <div className="twilio-message-list">
            {visibleMessages.length === 0 && <p className="twilio-empty">No demo messages match these filters.</p>}
            {visibleMessages.map(message => <article className="twilio-message-row" key={message.message_sid}>
              <div className="twilio-message-top">
                <span className={`twilio-direction ${message.direction}`}>{message.direction === 'inbound' ? 'Incoming' : 'Outgoing'}</span>
                <span className={`twilio-status ${message.status}`}>{message.status}</span>
                <span className="twilio-channel">{message.channel}</span>
              </div>
              <p>{message.body || (message.media.length ? 'Media message' : '(empty message)')}</p>
              {message.media.length > 0 && <div className="twilio-media">{message.media.map((item, index) => <span key={item.sid || index}>{item.content_type || 'Media attachment'}</span>)}</div>}
              <div className="twilio-message-meta"><span>{message.direction === 'inbound' ? message.sender : `To ${message.recipient}`}</span><span>{new Date(message.created_at).toLocaleString()}</span><code>{message.message_sid}</code></div>
            </article>)}
          </div>
        </section>
      </div>
    </div>
  )
}

export default TwilioWorkspace
