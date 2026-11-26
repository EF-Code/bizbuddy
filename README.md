# BizBuddy

A small-business back office built from `BizBuddy_Project_Explanation.pdf`.
React/Vite frontend, FastAPI backend, persistent SQLite database. No paid API key,
cloud database, XAMPP or automation subscription is required.

## Use the application

Live URL: https://bizbuddy.naijatown.app

1. Create an account. Each account has its own records.
2. **Fabrics & Stock**: enter products, NGN prices, quantities and low-stock thresholds.
3. **AI Chatbot Connection**: save opening hours/policies and verified FAQs, then
   enable website chat. Share the generated customer chat link.
4. **Unified Concierge**: review real conversations and handoffs, reply as owner,
   and confirm order requests by selecting a product and quantity. Confirmation
   creates an order and reduces stock atomically; repeated confirmation is rejected.
5. **Invoices & Reminders**: create and confirm invoices. Review the email draft.
   Overdue confirmed invoices produce reminder drafts, never unsolicited automatic
   sends. Choose the original web/Telegram/email conversation for reminders.
   Marking an invoice paid cancels pending drafts.
6. **Atelier Dashboard**: see today's requests by channel, outstanding invoices,
   handoffs and low stock. Summaries are saved by date and refreshed every minute.
   Optionally schedule one owner summary per day over connected Telegram or Gmail
   from AI Chatbot Connection; delivery defaults to dashboard only.
7. **Client Profiles**: explicitly link verified customer identities across channels.

The default assistant is a deterministic knowledge engine, **not a hosted LLM**.
It quotes saved facts and hands off unsupported/ambiguous questions. An existing
OpenAI integration remains optional; it is not required or configured by default.

## Channels and costs

| Channel | Setup | Delivery |
| --- | --- | --- |
| Website chat | Click Enable website chat | Live, no external account |
| Telegram | Paste a BotFather bot token | Official free Bot API; webhook registered automatically |
| Gmail | Dedicated inbox + Google app password | Unread plain-text sync every minute; replies require approval; threads preserved |
| Email without Gmail | No account connection | Download `.eml` drafts and send with your own email app |
| Twilio SMS / WhatsApp | Account SID, auth token and sender | Live unified-inbox connector; provider charges and sandbox opt-in apply |
| Instagram / Facebook / Meta WhatsApp | Meta account credentials and app approval | Existing official backend endpoints; not preconnected or simulated as live |

Google app passwords require two-step verification and may be unavailable for some
managed/protected accounts: https://support.google.com/accounts/answer/185833.
Telegram: https://core.telegram.org/bots/.
Gmail TLS settings: https://developers.google.com/workspace/gmail/imap/imap-smtp.

Email attachments, payment processing and automatic stock reordering are outside
this MVP. Gmail sync checks up to 20 recent unread, small plain-text messages per
run; use a dedicated project inbox. Do not represent mocked provider tests as
verified delivery from a real account.

## Local development

Requires Python 3.10+ and Node 22+.

```sh
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
npm ci
```

For web chat locally, set `PUBLIC_API_URL=http://localhost:5173` in `backend/.env`.
No `.env` is needed for basic authentication, inventory or invoices. External
channel credentials require a stable Fernet encryption key (see backend README).

Run in separate terminals:

```sh
cd backend
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

```sh
npm run dev
```

Vite proxies `/api` and `/chatbot-widget.js` to the loopback API. The database is
`backend/bizbuddy.db` unless `DATABASE_URL` overrides it. Credentials and database
files are excluded from git and denied by Vite's filesystem rules.

## Verification

```sh
npm run lint
npm run build
python3 ops/test_gateway.py
python3 ops/test_update.py
backend/.venv/bin/python -W ignore -m unittest discover -s backend -p 'test_*.py'
```

Tests use isolated databases and mocked provider transports. They cover twenty
customer questions, unsafe/unknown-answer handoff, stock updates, duplicate order
confirmation, owner isolation, reminder idempotency, paid-invoice cancellation,
Gmail draft approval/threading/deduplication, once-daily summary delivery,
customer linking, and Twilio webhook signatures/unified inbox capture.
Browser QA additionally exercised account creation → inventory → public chat →
owner reply → invoice → reminder → payment, on desktop and mobile.

## VPS hosting and automatic updates

Caddy's configuration and `/opt/naijatown` are unchanged. The production gateway
serves compiled assets at the existing `172.18.0.1:5173` upstream and proxies the
API to `127.0.0.1:8000`. Both services start automatically at boot.

**Push to GitHub `main` to update the website.** `bizbuddy-update.timer` checks
`origin/main` every minute (plus up to five seconds of jitter), then:

1. Exports the commit into an isolated release under `/var/lib/bizbuddy/releases`.
2. Installs dependencies only when the lockfile/requirements change; insufficient
   disk space or failed installs leave the current site running.
3. Runs lint, build, backend tests, gateway HTTP tests, rollback safety tests and an isolated API startup check.
4. Takes a private SQLite snapshot, switches the active release atomically and
   restarts only BizBuddy's API. The static frontend remains available.
5. Restores the previous code release if activation fails. Three recent releases
   and seven database snapshots are retained. Old hashed assets remain available
   for already-open browser tabs. Gateway code changes also restart its service.

Local edits and other Git branches are not deployed. The source checkout is not
reset or overwritten: deployments use Git archives. The live database and `.env`
remain in `/home/vangaard/bizbuddy/backend`; they are never fetched from GitHub.
The public `/__deployment` endpoint reports the active commit.

```sh
sudo systemctl status bizbuddy-web bizbuddy-api bizbuddy-update.timer
sudo journalctl -u bizbuddy-update -n 80 --no-pager
sudo systemctl start bizbuddy-update.service  # Check GitHub immediately
```

Initial VPS setup (already performed here):

```sh
bash ops/install-update.sh
```

The updater runs as `vangaard` using that account's configured GitHub credentials.
Its sudo rule permits only restarting the two named BizBuddy services. Root-owned
systemd/sudoers changes and changes to the updater itself require rerunning the
installer from a reviewed checkout; regular application changes deploy automatically.

Manual rollback to a retained, validated commit:

```sh
python3 ops/update.py --no-fetch --ref PREVIOUS_COMMIT_SHA
```

Stop the update timer first when keeping a rollback active; otherwise the next
check redeploys GitHub main. Database backups are **not** restored automatically,
so an incompatible future schema migration needs a deliberate recovery plan.
Never commit the database, `.env`, credentials or private snapshots.
