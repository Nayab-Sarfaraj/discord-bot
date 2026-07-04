# Discord Slash-Command Bot + Admin Dashboard

## What this is

A web app + Discord bot: users run slash commands in Discord, the app logs them,
replies in Discord, mirrors a notification to Slack, and shows a live log on an
admin dashboard.

## Tech Stack

- Backend: Node.js + Express
- DB: MongoDB (Mongoose)
- Queue: BullMQ + Redis (Upstash)
- Realtime: SSE (Server-Sent Events) — no Socket.io
- Frontend: React + React Query + Axios (API calls) + shadcn/ui (components) + react-hot-toast (toasts)
- Validation: Zod
- Hosting: Render — **two separate services**:
  - `web` — Express API + interactions endpoint + SSE
  - `worker` — BullMQ worker (background jobs only)
- Notifications: Slack Incoming Webhook
- AI (optional/stretch): Gemini API, only inside worker jobs, never inline in request handlers

## Frontend Folder Structure

```
src/
  pages/
  components/
    ui/          (shadcn components)
  hooks/
    queries/     (react-query useQuery hooks)
    mutations/   (react-query useMutation hooks)
  lib/
    api.js       (axios instance)
  context/       (if needed, e.g. auth)
```

## Frontend Conventions

- All HTTP calls go through a single Axios instance (`lib/api.js`) with base URL +
  interceptor for auth token + interceptor for error normalization. No raw `fetch`/`axios.get`
  scattered in components.
- All server state via React Query (`useQuery`/`useMutation`). No manual `useEffect` + `useState`
  for data fetching.
- All user-facing success/error feedback via `react-hot-toast`. No `alert()`, no silent failures.
- UI components from shadcn/ui — use its primitives (Table, Badge, Dialog, Form) instead of
  building custom ones from scratch.
- SSE connection lives in a single hook (`useLiveCommands` or similar), not duplicated per component.
- Forms validated with Zod (shared schema shape with backend where practical) + react-hook-form.

## Architecture Rules

- Discord interactions endpoint MUST verify Ed25519 signature BEFORE touching the
  body/payload. Respond to PING (type 1) with PONG immediately.
- MUST respond to Discord within ~3 seconds. Never do Slack calls, DB writes beyond
  the initial log, or AI calls synchronously inside the interaction handler if they
  might be slow — use deferred response + BullMQ job + follow-up message instead.
- Dedup: every interaction has a unique `interactionId`. Enforce via a unique index
  in Mongo AND check-before-process in the service layer. Jobs must be idempotent
  since BullMQ can retry them.
- SSE is for live push notifications only — never a data store. MongoDB is always
  the source of truth. Emit SSE events only from the service layer, right after a
  DB write (e.g. `emitCommandCreated()`, `emitCommandUpdated()`).
- Worker and web are separate processes/services. Worker never handles HTTP
  requests; web never processes BullMQ jobs directly.

## Code Structure & Conventions

- Layered pattern: `controller -> service -> repository`
  - Controllers: parse/validate request, call service, send response. No business logic.
  - Services: business logic, orchestration, emits SSE events, enqueues jobs.
  - Repositories: only place that talks to Mongoose models.
- Validation: Zod schemas per route, in `validators/`. Validate at the controller boundary.
- Jobs: defined in `jobs/`, one file per job type (`slack-notify.job.js`, `ai-summary.job.js`).
- Async routes: wrap all controllers in an `asyncHandler(fn)` — no manual try/catch per route.
- Errors: throw a custom `AppError(message, statusCode)`; one global error-handling
  middleware converts it to the standard error response. Never leak raw stack traces to client.
- Responses: ALWAYS use `SuccessResponse` / `ErrorResponse` helpers.
  Shape: `{ success, message, data, error }`. No ad-hoc response objects in controllers.
- Config: all env vars read once in `config/env.js`, exported as a single object.
  No scattered `process.env.X` calls elsewhere.
- Naming: files in `kebab-case.type.js` (e.g. `command.service.js`, `command.repository.js`).
  Mongo collections: lowercase plural (`commands`, `jobs`, `servers`, `admins`).
- Auth: admin routes protected by a single `requireAuth` middleware (JWT-based).

## Folder Structure

```
src/
  controllers/
  services/
  repositories/
  validators/
  models/
  jobs/
  workers/
  routes/
  middlewares/
  config/
  utils/
```

## Backend Extras

- Rate limiting on public/admin routes (e.g. `express-rate-limit`) to avoid abuse.
- Helmet for basic HTTP security headers.
- CORS restricted to the deployed frontend origin only.
- Health check route (`/health`) — also useful to ping periodically if Render free tier sleeps.

## Logging

- Log job failures, signature verification failures, and dedup hits.
- NEVER log: bot token, application public key, Slack/Discord webhook URLs, JWT secret,
  or full request bodies containing secrets.

## Secrets

- All secrets via env vars only. `.env` is gitignored. `.env.example` kept up to date
  with placeholder values, no real secrets, committed to repo.

## Commands

- `npm run dev` — start web service locally
- `npm run worker` — start BullMQ worker locally
- `npm run register-commands` — one-time script to register Discord slash commands (guild-scoped for dev)

## Git

- Conventional commit messages (`feat:`, `fix:`, `chore:`, etc.)
