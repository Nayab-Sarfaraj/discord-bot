# Discord Slash-Command Bot + Admin Dashboard

Monorepo with two independently deployable pieces:

```
backend/    Express API + BullMQ worker (Node.js, MongoDB, Redis)
frontend/   React admin dashboard (Vite)
```

See `CLAUDE.md` for architecture rules and conventions.

## Backend

```bash
cd backend
cp .env.example .env   # fill in Mongo/Redis/Discord/Slack/JWT values
npm install
npm run dev            # web service (Express API, port 3000)
npm run worker         # BullMQ worker (separate process)
```

No Discord/Slack/BullMQ logic is wired up yet — this is the scaffold only.
`GET /api/health` is the only live route.

## Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev             # Vite dev server, port 5173, proxies /api -> localhost:3000
```

Uses React Query for server state, a single Axios instance (`src/lib/api.js`),
shadcn/ui for components, and react-hot-toast for feedback.

## Deployment

Render, two services per `backend/`:
- `web` — `npm run dev`-equivalent start command, serves the API + interactions endpoint + SSE
- `worker` — `npm run worker`, background jobs only

Frontend deploys as a static build (`npm run build` in `frontend/`).
