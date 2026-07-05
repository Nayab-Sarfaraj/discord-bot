# AI Notes

## Tools and split of work

Built almost entirely with **Claude Code** (Sonnet 5) in an agentic
coding session, working directly against the repo — scaffolding, every
backend/frontend file, and live verification (curl-based signed-request
tests, a local Mongo/Redis via Docker, and Playwright driving a real headless
browser against the running dev servers). I set direction and made the
calls below; the AI wrote essentially all the code, ran its own tests after
each stage, and reported back what it found — including bugs it introduced
and then caught itself.

## Decisions I made

1. **Stack**, locked in up front via `CLAUDE.md` (Express + Mongoose +
   BullMQ/Redis + SSE, not Socket.io, layered controller → service →
   repository, Render split into separate `web`/`worker` services). This
   drove every architectural choice downstream rather than letting the AI
   default to something else.
2. **Register slash commands both guild-scoped and globally**, not just
   guild-scoped for dev speed. The AI's first plan assumed grading would
   happen in the same dev server and only proposed guild-scoped
   registration; I overrode that — global registration costs nothing but a
   ~1hr propagation wait (started early, in parallel with everything else),
   and the assignment explicitly says graders may use their own server. Not
   worth the risk of it silently not working on the day it's checked.
3. **Skip the shadcn CLI's interactive wizard** rather than let the AI keep
   fighting piped-stdin prompts with regenerated Ed25519 test keys and retry
   loops — told it directly to just run the non-interactive flag form
   (`-d -t vite -b base -p nova --no-monorepo`) once we found it in `--help`,
   instead of spending more turns on TTY workarounds.

## A requirement that quietly slipped

Worth calling out on its own, separate from the "Decisions I made" note
above, because of how it happened rather than what it was. The core
requirement is one specific sentence: an admin "adds your bot and picks a
channel it can post to." Somewhere in the middle of building this out, the
actual implementation drifted into a bare Guild ID text field that fed
straight into command registration — nothing checking the bot was actually
a member of that server, no channel list, no picker. No validation at all
that the ID typed in meant anything.

The dangerous part wasn't that it was broken — it was that it *worked*.
The happy path tested clean: paste a real guild ID, commands got
registered, everything green. That's exactly the shape of gap that survives
testing, because the tests were written against the implementation as it
stood, not against the spec. Nothing failed. Nothing threw. It just quietly
wasn't what was asked for, and it would have stayed that way if the core
requirement line hadn't gotten a second, more literal read.

Fixed by adding a real validation step (an actual Discord API call
confirming bot membership in that guild before accepting the ID at all),
then a genuine channel-fetch-and-pick step (list the guild's real channels,
pick one from a dropdown, save that alongside the guild), with the
auto-registration behavior folded into that same save action rather than
living on its own.

Honestly, this one cost real time to unwind — new endpoint, new frontend
step, retesting the whole connect flow — and the root cause wasn't a tricky
bug, it was checking the spec loosely early on and trusting that "it runs
end to end" meant "it does what was asked." Those aren't the same thing,
and a one-line requirement is easy to satisfy by accident in a way that
looks complete until you go back and read it again.

## Hardest bug

The most serious one wasn't caught by writing tests — it was caught by
*running* the "Redis briefly down" reliability check from the assignment's
own quality bar. The AI's design for the Slack-mirror enqueue was a plain
`try/catch` around `queue.add(...)`, on the reasonable-looking assumption
that if Redis is unreachable, the call rejects and the catch block marks
`mirrorStatus: 'failed'` while the Discord reply still succeeds.

It doesn't reject. BullMQ requires `maxRetriesPerRequest: null` on its Redis
connection (it throws at construction time otherwise), and with that setting
ioredis queues commands offline and retries **forever** with backoff instead
of ever rejecting a pending command. So `queue.add()` on a dead Redis just
hangs — silently blowing straight through Discord's 3-second response
window. Every single command would have failed during any Redis outage,
which is close to the worst possible failure mode given the assignment's own
"must respect the 3s window" and "must not silently lose an interaction"
requirements — and it would have looked completely fine in every earlier
test, because Redis was always up during those.

We only found it by deliberately pointing `REDIS_URL` at an unreachable host
mid-session and timing the response. Fix was a `Promise.race` with a 1.5s
timeout wrapped specifically around that one call site (not a global ioredis
timeout, which would also break BullMQ's legitimately long-blocking
job-fetch calls in the worker process) — degrades to `mirrorStatus: 'failed'`
immediately instead of hanging.

Two smaller but still real bugs from the same "looked right, wasn't"
category, both in the per-guild command-config feature: Mongoose's `Map`
schema field doesn't cast correctly through a raw `findOneAndUpdate`
replacement document, and separately, `doc.toObject()` returns `Map` fields
as actual `Map` instances unless you pass `{ flattenMaps: true }` — which
`JSON.stringify` then silently serializes to `{}}` over HTTP with no error
at all. Config saves looked successful (200 OK) while quietly saving
nothing. Both only surfaced by asserting on the *saved* value after a write,
not just the HTTP status.

## AI stretch goal

Added after the core was working: `/report` text gets triaged by Groq
(Llama 3.1, chosen over Gemini — free tier, no card, and an OpenAI-compatible
REST API meant no new SDK dependency) in its own BullMQ job, following the
exact same rule as the Slack mirror — never inline in the request handler.
Two things worth calling out since they were easy to get wrong by copying
the Slack-mirror pattern too literally:

- Once there were *two* independent enqueue calls (Slack + AI) each bounded
  by a 1.5s timeout, awaiting them sequentially could stack to ~3s in the
  worst case (both timing out from the same Redis outage) — right at
  Discord's own response budget. Fixed by running both with `Promise.all`
  instead of one after another.
- Showing the triage result "in the response" without blocking the 3s
  window meant editing the original Discord reply after the fact, via
  `PATCH /webhooks/{app_id}/{interaction_token}/messages/@original` once the
  worker's Groq call resolves (interaction tokens stay valid ~15 min, plenty
  of headroom). That edit is wrapped separately and never fails the job —
  the DB write + dashboard SSE update is the real source of truth.

## What I'd add with more time

- The Redis-pub/sub bridge for live mirror-status/AI-status updates works
  but is the one piece of cross-process plumbing in the whole thing; I'd
  want a second pair of eyes on it before trusting it in a longer-running
  deployment.
- Interactive components (buttons) and a modal-based `/report` — both listed
  stretch goals, both skipped to keep the core reliable within the time box.
- Multi-server isolation is partially there (config is keyed by `guildId`,
  and connecting one now validates membership + picks a real channel — see
  above), but there's still no UI to *list* which servers the bot is
  currently in — you paste a Guild ID in by hand rather than picking from a
  list. A `GET /guilds` (bot's own guild list) call would close that gap.
