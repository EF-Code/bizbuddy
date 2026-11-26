# Website chat on bizbuddy.naijatown.app

This change is local source code; it does not change the running VPS or publish
an environment. Keep the existing naijatown.app service and Caddy site intact.

## Backend and database

Rebuild the BizBuddy frontend and backend images with these changes. Install
`backend/requirements.txt` in the backend image. Keep the existing persistent
MySQL database if configured. SQLite is also supported by setting `DATABASE_URL`
to a file inside a persistent, writable Docker volume, for example
`sqlite:////data/bizbuddy.db`. Never store the only database copy in an ephemeral
container layer.

Set `PUBLIC_API_URL=https://bizbuddy.naijatown.app` on the backend. The website
origin in the dashboard should also be `https://bizbuddy.naijatown.app` when
embedding the widget on BizBuddy itself. For another storefront, set its exact
origin instead. One website origin per business is currently supported.

## OpenCode and DeepSeek

Install OpenCode in the backend image, not just on the VPS host. For a glibc
Linux x86-64 image, the verified CLI package is `opencode-linux-x64@1.19.6`;
its executable is `node_modules/opencode-linux-x64/bin/opencode`. Install via
npm in an image directory such as `/opt/opencode` and set `OPENCODE_BIN` to
that absolute executable path. Other architectures and Alpine/musl need the
matching supported OpenCode binary. Do not copy an x86-64 binary into an ARM
or musl container.

Backend environment:

```env
AI_PROVIDER=opencode
OPENCODE_BIN=/opt/opencode/node_modules/opencode-linux-x64/bin/opencode
OPENCODE_MODEL=opencode/deepseek-v4.1-flash-free
PUBLIC_API_URL=https://bizbuddy.naijatown.app
```

The OpenCode transport needs no API key. It runs text-only requests with plugins
and all tools disabled, an isolated configuration/session, a 45-second timeout,
and at most two simultaneous model requests per backend process. It sends only
business instructions and the conversation history to the model. OpenCode stores
its temporary session data inside the request's temporary directory, which is
removed afterward. API process logs should not include customer prompts.

The model was listed during setup, but the live probe reported **Free usage
limit reached**; the bounded backend probe timed out and followed the failure
path. Free availability is controlled by OpenCode and is not guaranteed by
installing the CLI. If unavailable, turn off automatic AI replies and use owner
chat. Incoming messages remain saved for the owner when inference fails. An
OpenAI-compatible provider is an alternative using `AI_PROVIDER=openai`,
`OPENAI_BASE_URL`, `OPENAI_MODEL`, and its own `OPENAI_API_KEY`.

## Caddy routing

Merge handlers into the existing **bizbuddy.naijatown.app** block. Replace the
example Docker service names and ports with those in the existing Compose file;
Caddy and the services must share the appropriate Docker network. Preserve any
existing TLS, headers, logs, and other routes. Use `handle`, not `handle_path`,
so the backend receives `/api` unchanged.

```caddyfile
bizbuddy.naijatown.app {
    @backend path /api/* /chatbot-widget.js
    handle @backend {
        reverse_proxy bizbuddy-backend:8000
    }
    handle {
        reverse_proxy bizbuddy-frontend:80
    }
}
```

Validate the merged configuration with the installed Caddy version before
reloading. Keep the naijatown.app site block unchanged. The backend need not
expose its port publicly; Caddy can reach it on the private Docker network.
Do not use the Vite development server for production frontend serving.

## Activate and verify

1. In Messages → AI Chatbot Connection, save the website origin, welcome text,
   business knowledge, and confirmed product details.
2. Turn off automatic AI replies for an initial owner-only test. Save, connect
   website, then start website chat.
3. Add the generated script tag before `</body>` on the allowed website.
4. Send a visitor message in a separate browser session. Verify it reaches the
   owner inbox, reply, and verify the reply appears in the visitor widget.
5. Reload the visitor page and confirm both messages remain. The same browser
   session restores the latest 200 messages; closing it starts a new identity.
6. Enable AI replies only after a real inference succeeds in the deployed
   backend. Verify a known product question and an unknown question/handoff.

WhatsApp, Telegram, Instagram, and Messenger adapters remain in the backend for
future integrations. They are not connected by the website workspace. The
separate Twilio pitch-demo page remains a simulation.
