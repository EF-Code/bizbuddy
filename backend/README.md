# BizBuddy Backend

FastAPI backend for the BizBuddy dashboard, customer chatbot, and channel webhooks.

## Database

Start MySQL in the XAMPP Control Panel and create the `bizbuddy` database. The
backend defaults to the standard local XAMPP connection (`root`, no password,
port `3306`). If your credentials or port differ, set `DATABASE_URL` in the
backend `.env` file:

```env
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@127.0.0.1:3306/bizbuddy
```

URL-encode special characters in the password. SQLAlchemy creates the chatbot,
channel, customer, conversation, message, and order-request tables at startup.

## AI and encrypted channel credentials

Copy `.env.example` to `.env`. Add an OpenAI API key and generate a persistent
Fernet encryption key:

```powershell
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Set the generated value as `CHATBOT_ENCRYPTION_KEY`. Channel access tokens are
encrypted before storage. Keep this key stable and private: rotating it without
re-encrypting saved channel credentials will make those credentials unreadable.
Never put API keys or channel credentials in the React app or commit `.env`.
The same persistent `CHATBOT_ENCRYPTION_KEY` encrypts Twilio Auth Tokens in
MySQL. Keep the key stable and private.

The assistant uses the configured business knowledge as its source of truth.
When requested information is missing or uncertain, it refers the customer to
the owner. Order messages are stored as requests for owner confirmation, not
confirmed orders. `OPENAI_API_KEY` is required to test or activate AI responses.

## Official messaging channel setup

Set `PUBLIC_API_URL` to the public HTTPS address of this FastAPI service.

* **WhatsApp Business, Instagram, Facebook Messenger:** create/configure the
  app in Meta for Developers, then provide the official account ID, access token,
  and app secret in the BizBuddy dashboard. Set `META_WEBHOOK_VERIFY_TOKEN`.
  Subscribe the appropriate Meta app/product to the `messages` webhook field,
  using the callback URL shown by BizBuddy and the same verification token.
  Incoming webhook signatures are checked against the saved Meta app secret;
  outbound replies use the official Meta Graph API.
* **Telegram:** create a bot with BotFather and enter its bot token. BizBuddy
  verifies the token and registers the HTTPS webhook with Telegram's official
  Bot API.
* **Website live chat:** connect the website channel and add the generated
  script tag to your site. Save that site's exact origin in the chatbot
  settings; the public widget API rejects requests from other origins.

Connections are not marked as saved until provider credentials are validated.
Meta inbound messages require the app's webhook subscription to be configured
in Meta for Developers; saving credentials alone does not subscribe a webhook.
Disconnecting Telegram removes its registered webhook.

## Dashboard pitch demos

The dashboard’s **AI Chatbot Connection** page is a frontend-only business
workspace demo. Its connected apps, customer conversations, AI replies,
invoices, payments, and activity are sample data. Toggling connections,
simulating messages, creating invoices, and marking invoices paid only updates
the local demo state; it does not connect accounts, contact customers, create
real invoices, or process payments.

The **Overview → Twilio Messaging** page is also a frontend-only demo. It starts
with a sample connected account and conversations; connecting, disconnecting,
sending, delivery updates, and incoming replies are simulated. It does not call
Twilio, require Twilio credentials, or send real messages.

The backend integrations remain available for future/live use, but neither
pitch-demo dashboard calls those endpoints.

## Optional live Twilio backend setup

1. Add `PUBLIC_API_URL` to the backend `.env` as the public HTTPS origin of the
   FastAPI service, for example `https://api.example.com`. Incoming webhook
   signatures are validated against this URL; it must match the public URL
   configured at Twilio. Set a persistent `CHATBOT_ENCRYPTION_KEY` as above.
2. Connect using `POST /api/twilio/connect` with the Twilio Account SID, Auth
   Token, and at least one sender. Sender numbers must be in E.164 format (for
   example `+14155552671`). The Auth Token is encrypted by the backend and is
   never returned by an API.
3. Configure `/api/webhooks/twilio` as the **A message comes
   in** webhook for each Twilio number. Set HTTP method to `POST`. For WhatsApp,
   configure the same URL on the approved WhatsApp sender/sandbox in Twilio.
4. Outgoing messages include `/api/webhooks/twilio/status` as their status
   callback when `PUBLIC_API_URL` is set. Twilio signs both callbacks; BizBuddy
   validates those signatures and deduplicates all message records by Message
   SID.

The live API can test the saved account, send SMS/WhatsApp, sync up to 1,000
historical messages, and filter stored history by phone, direction, status,
channel, and date. Disconnecting removes the encrypted Auth Token but retains
message history. Twilio status updates may take a short time to arrive. If a
send request times out, check message history before retrying to avoid sending
a duplicate.

## Run

```powershell
cd my-app/backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Run the React app in a second terminal from `my-app` with `npm run dev`. Vite
proxies `/api` requests to `http://127.0.0.1:8000`. API documentation is
available at `http://127.0.0.1:8000/docs`.
