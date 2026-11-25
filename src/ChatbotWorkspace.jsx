import { useMemo, useRef, useState } from 'react'
import './ChatbotWorkspace.css'

const demoChannels = [
  { id: 'whatsapp', name: 'WhatsApp Business', icon: 'W', activity: '12 chats today' },
  { id: 'instagram', name: 'Instagram', icon: '◎', activity: '8 conversations today' },
  { id: 'messenger', name: 'Facebook Messenger', icon: 'f', activity: '5 conversations today' },
  { id: 'telegram', name: 'Telegram', icon: '➤', activity: '3 conversations today' },
  { id: 'website', name: 'Website chat', icon: '⌂', activity: 'Live on your website' },
]

const startingConversations = [
  {
    id: 'adaeze',
    name: 'Adaeze Okafor',
    initials: 'AO',
    channel: 'whatsapp',
    phone: '+234 803 ••• ••24',
    preview: 'Can you reserve 6 yards for me?',
    time: '2 min ago',
    status: 'Needs reply',
    messages: [
      { id: 'a1', sender: 'customer', text: 'Hi, is the blue ankara fabric still available?', time: '10:34 AM' },
      { id: 'a2', sender: 'assistant', text: 'Hello Adaeze! Yes, we have the blue ankara in stock at ₦8,000 per yard.', time: '10:35 AM' },
      { id: 'a3', sender: 'customer', text: 'Can you reserve 6 yards for me?', time: '10:38 AM' },
    ],
  },
  {
    id: 'chidi',
    name: 'Chidi Nwosu',
    initials: 'CN',
    channel: 'instagram',
    phone: '@chidistyles',
    preview: 'Do you deliver to Ikeja?',
    time: '18 min ago',
    status: 'Open',
    messages: [
      { id: 'c1', sender: 'customer', text: 'I love the new aso-oke collection.', time: '10:12 AM' },
      { id: 'c2', sender: 'assistant', text: 'Thank you, Chidi! Would you like the collection details?', time: '10:13 AM' },
      { id: 'c3', sender: 'customer', text: 'Do you deliver to Ikeja?', time: '10:19 AM' },
    ],
  },
  {
    id: 'amara',
    name: 'Amara Bello',
    initials: 'AB',
    channel: 'messenger',
    phone: 'Facebook customer',
    preview: 'I have made the transfer, please confirm.',
    time: '41 min ago',
    status: 'Needs reply',
    messages: [
      { id: 'm1', sender: 'customer', text: 'Please send the invoice for my fabric order.', time: '9:48 AM' },
      { id: 'm2', sender: 'owner', text: 'Invoice INV-2046 is ready. I have sent the payment details.', time: '9:51 AM' },
      { id: 'm3', sender: 'customer', text: 'I have made the transfer, please confirm.', time: '10:02 AM' },
    ],
  },
  {
    id: 'tolu',
    name: 'Tolu James',
    initials: 'TJ',
    channel: 'website',
    phone: 'Website visitor',
    preview: 'What are your opening hours?',
    time: '1 hr ago',
    status: 'Open',
    messages: [
      { id: 't1', sender: 'customer', text: 'What are your opening hours?', time: '9:06 AM' },
      { id: 't2', sender: 'assistant', text: 'We are open Monday to Saturday, 9 AM to 6 PM.', time: '9:06 AM' },
    ],
  },
]

const startingInvoices = [
  { id: 'INV-2048', customer: 'Adaeze Okafor', description: 'Blue ankara · 6 yards', amount: 48000, status: 'Awaiting payment', date: 'Today' },
  { id: 'INV-2047', customer: 'Chidi Nwosu', description: 'Aso-oke set · deposit', amount: 125000, status: 'Paid', date: 'Today' },
  { id: 'INV-2046', customer: 'Amara Bello', description: 'Chiffon · 8 yards', amount: 72000, status: 'Paid', date: 'Yesterday' },
  { id: 'INV-2045', customer: 'Tolu James', description: 'Tailoring · balance', amount: 35000, status: 'Overdue', date: 'Nov 21' },
]

const startingPayments = [
  { id: 'PAY-8351', customer: 'Chidi Nwosu', method: 'Paystack · Card', amount: 125000, time: '10:42 AM', status: 'Successful' },
  { id: 'PAY-8350', customer: 'Amara Bello', method: 'Bank transfer', amount: 72000, time: '10:16 AM', status: 'Successful' },
  { id: 'PAY-8349', customer: 'Somto Fabrics', method: 'Paystack · Transfer', amount: 31000, time: '9:38 AM', status: 'Successful' },
]

const formatNaira = amount => `₦${Number(amount).toLocaleString('en-NG')}`
const channelLabel = id => demoChannels.find(channel => channel.id === id)?.name ?? 'Customer'

function ChatbotWorkspace({ setNotice }) {
  const [assistantActive, setAssistantActive] = useState(true)
  const [channels, setChannels] = useState(() => demoChannels.map(channel => ({ ...channel, connected: true })))
  const [conversations, setConversations] = useState(startingConversations)
  const [selectedId, setSelectedId] = useState('adaeze')
  const [reply, setReply] = useState('')
  const [invoices, setInvoices] = useState(startingInvoices)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [invoiceDraft, setInvoiceDraft] = useState({ customer: 'Adaeze Okafor', description: '', amount: '' })
  const nextInvoiceNumber = useRef(2049)

  const selectedConversation = conversations.find(conversation => conversation.id === selectedId)
  const paidTotal = useMemo(
    () => invoices.filter(invoice => invoice.status === 'Paid').reduce((total, invoice) => total + invoice.amount, 0),
    [invoices],
  )
  const outstandingTotal = useMemo(
    () => invoices.filter(invoice => invoice.status !== 'Paid').reduce((total, invoice) => total + invoice.amount, 0),
    [invoices],
  )
  const updateConversation = (id, updater) => {
    setConversations(current => current.map(conversation => (
      conversation.id === id ? updater(conversation) : conversation
    )))
  }

  const toggleChannel = channel => {
    setChannels(current => current.map(item => (
      item.id === channel.id ? { ...item, connected: !item.connected } : item
    )))
    setNotice(`${channel.name} demo connection updated. No external account was changed.`)
  }

  const toggleAssistant = () => {
    setAssistantActive(active => !active)
    setNotice(assistantActive ? 'Demo assistant paused.' : 'Demo assistant activated.')
  }

  const simulateIncoming = () => {
    if (!selectedConversation) return
    const message = {
      id: `demo-${Date.now()}`,
      sender: 'customer',
      text: 'Could you also send me an invoice for this order?',
      time: 'Just now',
    }
    updateConversation(selectedConversation.id, conversation => ({
      ...conversation,
      preview: message.text,
      time: 'Just now',
      status: 'Needs reply',
      messages: [...conversation.messages, message],
    }))
    setNotice(`A sample customer message was added to ${selectedConversation.name}'s conversation.`)
  }

  const draftReply = () => {
    setReply('Absolutely! I can prepare that for you now. Please confirm the items and quantities you would like included.')
  }

  const sendReply = event => {
    event.preventDefault()
    if (!selectedConversation || !reply.trim()) return
    const message = { id: `reply-${Date.now()}`, sender: 'owner', text: reply.trim(), time: 'Just now' }
    updateConversation(selectedConversation.id, conversation => ({
      ...conversation,
      preview: message.text,
      time: 'Just now',
      status: 'Open',
      messages: [...conversation.messages, message],
    }))
    setReply('')
    setNotice('Demo reply added to the conversation. No customer was contacted.')
  }

  const createInvoice = event => {
    event.preventDefault()
    const amount = Number(invoiceDraft.amount)
    if (!invoiceDraft.description.trim() || !Number.isFinite(amount) || amount <= 0) return
    const invoice = {
      id: `INV-${nextInvoiceNumber.current++}`,
      customer: invoiceDraft.customer,
      description: invoiceDraft.description.trim(),
      amount,
      status: 'Awaiting payment',
      date: 'Just now',
    }
    setInvoices(current => [invoice, ...current])
    setShowInvoiceForm(false)
    setInvoiceDraft(current => ({ ...current, description: '', amount: '' }))
    setNotice(`${invoice.id} created in the demo. No invoice or payment request was sent.`)
  }

  const markInvoicePaid = invoice => {
    setInvoices(current => current.map(item => item.id === invoice.id ? { ...item, status: 'Paid' } : item))
    setNotice(`${invoice.id} marked paid in the demo.`)
  }

  const sendReminder = invoice => setNotice(`Demo payment reminder prepared for ${invoice.customer}.`)

  const channelsConnected = channels.filter(channel => channel.connected).length
  const paidInvoiceCount = invoices.filter(invoice => invoice.status === 'Paid').length

  return (
    <div className="chatbot-workspace">
      <div className="chatbot-demo-banner"><span>PITCH DEMO</span> Sample apps, conversations, invoices, and payments. No real accounts or transactions are connected.</div>

      <section className="chatbot-summary">
        <div className="chatbot-summary-copy">
          <span className={`chatbot-status ${assistantActive ? 'is-live' : ''}`}>
            <i />{assistantActive ? 'AI assistant active · Demo' : 'AI assistant paused'}
          </span>
          <h2>One inbox. Your whole business.</h2>
          <p>Preview customer chats, AI replies, invoices, and payments together in one workspace.</p>
        </div>
        <button className={`chatbot-primary ${assistantActive ? 'chatbot-pause' : ''}`} onClick={toggleAssistant}>
          {assistantActive ? 'Pause demo assistant' : 'Activate demo assistant'}
        </button>
      </section>

      <section className="chatbot-metrics">
        <article><span>Customer conversations</span><strong>{conversations.length + 20}</strong><small>Across {channelsConnected} connected apps</small></article>
        <article><span>AI replies today</span><strong>186</strong><small>Helpful answers, around the clock</small></article>
        <article><span>Payments received</span><strong>{formatNaira(paidTotal)}</strong><small>{paidInvoiceCount} invoices paid</small></article>
        <article><span>Awaiting payment</span><strong>{formatNaira(outstandingTotal)}</strong><small>{invoices.filter(invoice => invoice.status !== 'Paid').length} invoices to follow up</small></article>
      </section>

      <section className="chatbot-section">
        <div className="chatbot-section-heading">
          <div><p>CONNECTED APPS</p><h2>Every channel in sync</h2></div>
          <span className="chatbot-muted">{channelsConnected} of {channels.length} connected</span>
        </div>
        <div className="chatbot-channel-grid">
          {channels.map(channel => <article className="chatbot-channel-card" key={channel.id}>
            <div className="chatbot-channel-top">
              <span className={`chatbot-channel-icon ${channel.id}`}>{channel.icon}</span>
              <span className={`chatbot-channel-status ${channel.connected ? 'connected' : ''}`}><i />{channel.connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <h3>{channel.name}</h3>
            <p>{channel.activity}</p>
            <button className={`chatbot-channel-action ${channel.connected ? '' : 'connect'}`} onClick={() => toggleChannel(channel)}>
              {channel.connected ? 'Disconnect demo' : 'Connect demo'}
            </button>
          </article>)}
        </div>
      </section>

      <section className="chatbot-section">
        <div className="chatbot-section-heading">
          <div><p>LIVE CUSTOMER INBOX</p><h2>Recent conversations</h2></div>
          <button className="chatbot-secondary" onClick={simulateIncoming}>Simulate customer message</button>
        </div>
        <div className="chatbot-inbox">
          <div className="chatbot-conversation-list" aria-label="Demo conversation list">
            {conversations.map(conversation => <button key={conversation.id} className={conversation.id === selectedId ? 'selected' : ''} onClick={() => setSelectedId(conversation.id)}>
              <span className="chatbot-customer-avatar">{conversation.initials}</span>
              <span className="chatbot-conversation-summary">
                <span className="chatbot-conversation-topline"><strong>{conversation.name}</strong><small>{conversation.time}</small></span>
                <span className="chatbot-conversation-channel">{channelLabel(conversation.channel)}</span>
                <span className="chatbot-conversation-preview">{conversation.preview}</span>
              </span>
              {conversation.status === 'Needs reply' && <i className="chatbot-unread-dot" aria-label="Needs reply" />}
            </button>)}
          </div>

          {selectedConversation && <div className="chatbot-conversation-view">
            <div className="chatbot-conversation-heading">
              <div><strong>{selectedConversation.name}</strong><span>{channelLabel(selectedConversation.channel)} · {selectedConversation.phone}</span></div>
              <span className={`chatbot-thread-status ${selectedConversation.status === 'Needs reply' ? 'needs-reply' : ''}`}>{selectedConversation.status}</span>
            </div>
            <div className="chatbot-message-list">
              {selectedConversation.messages.map(message => <article className={`chatbot-message ${message.sender}`} key={message.id}>
                <span>{message.sender === 'customer' ? selectedConversation.name : message.sender === 'assistant' ? 'BizBuddy AI' : 'You'} · {message.time}</span>
                <p>{message.text}</p>
              </article>)}
            </div>
            <form className="chatbot-owner-reply" onSubmit={sendReply}>
              <input aria-label="Write a demo reply" value={reply} onChange={event => setReply(event.target.value)} placeholder="Write a reply… (demo only)" maxLength={500} required />
              <button type="button" className="chatbot-ai-draft" onClick={draftReply}>AI draft</button>
              <button className="chatbot-secondary" type="submit">Send demo reply</button>
            </form>
          </div>}
        </div>
      </section>

      <div className="chatbot-commerce-grid">
        <section className="chatbot-section chatbot-invoice-section">
          <div className="chatbot-section-heading">
            <div><p>INVOICES</p><h2>Recent invoices</h2></div>
            <button className="chatbot-secondary" onClick={() => setShowInvoiceForm(open => !open)}>{showInvoiceForm ? 'Cancel' : '+ Create demo invoice'}</button>
          </div>
          {showInvoiceForm && <form className="chatbot-invoice-form" onSubmit={createInvoice}>
            <label>Customer<select value={invoiceDraft.customer} onChange={event => setInvoiceDraft(current => ({ ...current, customer: event.target.value }))}>
              {conversations.map(conversation => <option key={conversation.id}>{conversation.name}</option>)}
            </select></label>
            <label>Item or service<input value={invoiceDraft.description} onChange={event => setInvoiceDraft(current => ({ ...current, description: event.target.value }))} placeholder="e.g. Ankara fabric · 6 yards" required maxLength={120} /></label>
            <label>Amount (₦)<input type="number" min="1" step="1" value={invoiceDraft.amount} onChange={event => setInvoiceDraft(current => ({ ...current, amount: event.target.value }))} placeholder="48000" required /></label>
            <button className="chatbot-primary" type="submit">Create invoice</button>
          </form>}
          <div className="chatbot-invoice-list">
            {invoices.map(invoice => <article className="chatbot-invoice-row" key={invoice.id}>
              <span className="chatbot-invoice-icon">₦</span>
              <span className="chatbot-invoice-description"><strong>{invoice.id} · {invoice.customer}</strong><small>{invoice.description} · {invoice.date}</small></span>
              <strong className="chatbot-invoice-amount">{formatNaira(invoice.amount)}</strong>
              <span className={`chatbot-invoice-status ${invoice.status.toLowerCase().replace(' ', '-')}`}>{invoice.status}</span>
              <span className="chatbot-invoice-actions">
                {invoice.status !== 'Paid' && <button onClick={() => markInvoicePaid(invoice)}>Mark paid</button>}
                {invoice.status !== 'Paid' && <button onClick={() => sendReminder(invoice)}>Remind</button>}
              </span>
            </article>)}
          </div>
        </section>

        <section className="chatbot-section chatbot-payment-section">
          <div className="chatbot-section-heading"><div><p>PAYMENTS</p><h2>Latest activity</h2></div><span className="chatbot-payment-live"><i />Demo feed</span></div>
          <div className="chatbot-payment-list">
            {startingPayments.map(payment => <article className="chatbot-payment-row" key={payment.id}>
              <span className="chatbot-payment-check">✓</span>
              <span><strong>{payment.customer}</strong><small>{payment.method} · {payment.time}</small></span>
              <span className="chatbot-payment-value">{formatNaira(payment.amount)}<small>{payment.status}</small></span>
            </article>)}
          </div>
          <div className="chatbot-payment-footer"><span>Paid invoices</span><strong>{formatNaira(paidTotal)}</strong></div>
        </section>
      </div>

      <section className="chatbot-section chatbot-activity-section">
        <div className="chatbot-section-heading"><div><p>WORKSPACE UPDATES</p><h2>Business activity</h2></div><span className="chatbot-muted">Just now</span></div>
        <div className="chatbot-activity-list">
          <article><i className="payment" /><span><strong>Payment received</strong><small>Chidi Nwosu paid invoice INV-2047 via Paystack</small></span><b>+{formatNaira(125000)}</b></article>
          <article><i className="order" /><span><strong>Order moving forward</strong><small>Order #ORD-1042 is ready for customer collection</small></span><b>Today</b></article>
          <article><i className="customer" /><span><strong>New customer conversation</strong><small>Adaeze Okafor reached out on WhatsApp</small></span><b>2 min ago</b></article>
        </div>
      </section>
    </div>
  )
}

export default ChatbotWorkspace
