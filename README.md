# Discord Slash-Command Bot + Admin Dashboard

Users run `/report <text>` or `/status` in Discord. The bot verifies the
request, records it, replies in Discord, mirrors a notification to Slack via
a background queue, and shows a live-updating log on a password-protected
admin dashboard.

## What it does

- `/report <text>` and `/status` slash commands, registered both guild-scoped
  (instant, for dev) and globally (works in any server, ~1hr propagation).
- Every interaction's Ed25519 signature is verified before anything else runs;
  Discord's own PING verification handshake is answered directly.
- Commands are recorded in MongoDB, deduped by `interactionId` (unique index +
  check-before-process), and acked back in Discord within Discord's ~3s window.
- Each command mirrors a notification to a Slack Incoming Webhook via a BullMQ
  job (Upstash Redis) — never inline, so a slow/down Slack never blocks the
  Discord reply. Retries 3x with backoff; failures are visible on the
  dashboard (`mirrorStatus: failed`) instead of silently disappearing.
- Dashboard (JWT-login-gated): live command log via Server-Sent Events (new
  rows and mirror-status changes appear without a refresh), and a per-guild
  settings page to toggle commands on/off or disable Slack mirroring — which
  actually changes bot behavior on the next command.
- **AI triage (stretch goal)**: if `GROQ_API_KEY` is set, `/report` text is
  sent to Groq (Llama 3.1) in a BullMQ job — never inline — which returns a
  one-line summary + category (bug/feature/question/other). Shown live on
  the dashboard, and the original Discord reply is edited in-place once it's
  ready (via Discord's message-edit webhook, valid ~15 min after the
  interaction). Degrades to a no-op (`aiStatus: skipped`) if the key isn't set.

## Repo layout

```
backend/    Express API (web) + BullMQ worker — Node.js, MongoDB, Redis
frontend/   React admin dashboard (Vite)
```

See `CLAUDE.md` for the architecture/convention rules this was built against,
and `AI_NOTES.md` for how AI tools were used while building it.

## Run it locally

Needs a MongoDB and a Redis reachable from your machine (local, Docker, or
Atlas/Upstash directly — same env var either way).

```bash
cd backend
cp .env.example .env        # fill in the values below
npm install
npm run register-commands   # one-time: registers /report and /status
npm run seed-admin          # one-time: ADMIN_EMAIL/ADMIN_PASSWORD env -> seeds an admin
npm run dev                 # web service — Express API, port 3000
npm run worker              # separate process — BullMQ worker (Slack mirror)
```

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # Vite dev server, port 5173, proxies /api -> :3000
```

To actually receive Discord traffic locally, tunnel port 3000 (e.g. `ngrok
http 3000`) and paste `https://<tunnel>/api/interactions` into the Discord
Developer Portal's Interactions Endpoint URL field — Discord tests it live
with a signed PING and only saves if verification passes.

### Environment variables (`backend/.env`)

| Variable | Required for | Notes |
|---|---|---|
| `PORT` | web | defaults to 3000 |
| `NODE_ENV` | both | `development` / `production` |
| `CORS_ORIGIN` | web | must be the deployed frontend's exact origin in prod |
| `MONGODB_URI` | both | Atlas free tier (M0, no card) in prod |
| `REDIS_URL` | both | **use the `rediss://` (TLS) string from Upstash**, not `redis://` — the plain scheme is the most common Upstash+BullMQ setup mistake. Pick a **Regional** Upstash DB (not Global) and set `maxmemory-policy: noeviction` in the Upstash console, or job data can silently vanish under memory pressure. |
| `DISCORD_BOT_TOKEN` | scripts, web | Developer Portal → Bot tab |
| `DISCORD_APPLICATION_ID` | scripts, web | Developer Portal → General Information |
| `DISCORD_PUBLIC_KEY` | web | Developer Portal → General Information — this is what verifies every interaction's signature |
| `DISCORD_GUILD_ID` | `register-commands` (optional) | your dev server's ID, for instant guild-scoped registration alongside the global one |
| `SLACK_WEBHOOK_URL` | worker | Slack → Incoming Webhooks |
| `JWT_SECRET` | web | admin auth + SSE tickets; generate with e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `seed-admin` only | not read at runtime, just by the seed script |
| `GROQ_API_KEY` | worker (optional) | console.groq.com, free tier, no card. Leave blank to skip AI triage entirely (`aiStatus: skipped`) — everything else works without it. |

`frontend/.env` only needs `VITE_API_BASE_URL` (defaults to `/api`, fine
behind the Vite dev proxy or if frontend/backend share an origin in prod).

## Deployment

Deployed to **Render** (three services, all free tier, no card):

- **web** — start command `npm run start` in `backend/`. Serves the API,
  `/api/interactions`, and the SSE endpoint.
- **worker** — Render **Background Worker**, start command
  `npm run start:worker` in `backend/`. Consumes the Slack-mirror queue only;
  never handles HTTP.
- **frontend** — Render **Static Site**, build command `npm run build` in
  `frontend/`, publish directory `frontend/dist`.

Data/queue: **MongoDB Atlas** (M0 free) and **Upstash Redis** (free,
Regional, `noeviction` — see the `REDIS_URL` note above).

Operational notes for a live grading window:
- Render's free web service spins down after 15 minutes idle; a cold start
  can take 30-60s+, which would blow past Discord's 3s window on the first
  command. Set up a free external ping (UptimeRobot / cron-job.org hitting
  `/api/health` every ~10 min) before/during any live testing.
- Global slash-command registration can take up to ~1hr to propagate — run
  `npm run register-commands` well ahead of when it needs to work in an
  unfamiliar server.
- After deploying, update `DISCORD_PUBLIC_KEY`'s owning app's Interactions
  Endpoint URL to the Render web service's public `/api/interactions` URL —
  Discord re-verifies on save.

## Reliability behavior (what's actually been tested)

- Forged/invalid Ed25519 signature → `401`, nothing touches the DB.
- Same `interactionId` delivered twice (concurrently or replayed) → one DB
  row, one Slack post, same idempotent ack both times — enforced by a unique
  Mongo index, not just an in-memory check.
- Slack webhook unreachable → BullMQ retries 3x with backoff, then
  `mirrorStatus: failed` (visible on the dashboard), Discord reply already
  succeeded regardless.
- Redis briefly unreachable → both the Slack-mirror and AI-triage enqueue
  calls are time-boxed (1.5s each, run concurrently so they can't stack past
  Discord's budget) so a Redis outage can't hang the Discord reply; falls
  back to `mirrorStatus: failed` / `aiStatus: failed` immediately instead of
  timing out the interaction.
- Groq unreachable/`GROQ_API_KEY` missing → same pattern as Slack: retries,
  then `aiStatus: failed`, visible on the dashboard, reply already succeeded.
- Secrets (bot token, public key, webhook URL, JWT secret, Groq key,
  DB/Redis URIs) are redacted out of anything logged or returned to a
  client, even inside raw connection-error messages.
