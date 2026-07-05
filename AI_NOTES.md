# AI Notes

## Tools and split of work

Built almost entirely with **Claude Code** (Sonnet 5) in an agentic
coding session, working directly against the repo — scaffolding, every
backend/frontend file, and live verification (curl-based signed-request
tests against real Discord requests, and manual browser testing against
the running dev servers). Local development and early testing ran against
Mongo and Redis in Docker containers; once the core flow was working, we
switched to real MongoDB Atlas and Upstash Redis so later testing (including
the reliability checks below) reflected actual production infrastructure
rather than local containers. I set direction and made the calls below; the
AI wrote essentially all the code, ran its own tests after each stage, and
reported back what it found — including bugs it introduced and then caught
itself.

## Decisions I made

1. **Stack**, locked in up front via `CLAUDE.md` (Express + Mongoose +
   BullMQ/Redis + SSE, not Socket.io, layered controller → service →
   repository, Render split into separate `web`/`worker` services). This
   drove every architectural choice downstream rather than letting the AI
   default to something else.
2. **Register slash commands both guild-scoped and globally.** The AI's
   first plan only proposed guild-scoped registration, assuming grading
   would happen in the same dev server. I overrode that — the assignment
   explicitly says graders may use their own server, and global
   registration costs nothing but a ~1hr propagation wait, started early
   in parallel with everything else. Not worth the risk of it silently not
   working on the day it's checked.
3. **Built a real OAuth redirect flow instead of leaving manual Guild ID
   entry as "good enough."** The first working version of "connect a
   server" had the admin copy a Guild ID out of Discord by hand and paste
   it in — functional, but clunky, and it gave zero feedback after clicking
   "Add Bot" that anything had actually happened. Used Discord's
   `response_type=code` + `redirect_uri` OAuth params to get `guild_id`
   back automatically as a query param on redirect, auto-filling the
   connect flow instead of leaving the admin to go find and copy an ID
   manually. Backend validation of bot membership still happens
   independently either way, so this was purely a UX call, not a security
   one — but it turns "add the bot, connect a server" into a proper single
   flow rather than two disconnected steps.
4. **Edit the original Discord message instead of sending a new one once
   the AI tag is ready.** Since the AI call can't finish inside Discord's
   3-second window, the options were: send a second follow-up message once
   tagging completes, or edit the original reply in place. Chose editing —
   `PATCH /webhooks/{app_id}/{interaction_token}/messages/@original` — so
   the user sees one message that fills in, rather than two separate
   messages (an initial "got it" plus a later "here's the tag") cluttering
   the channel. Interaction tokens stay valid for about 15 minutes, which
   is far more headroom than a background job realistically needs, so this
   was a safe default rather than a tight constraint to design around.

## A requirement that quietly slipped

Worth calling out on its own, separate from the "Decisions I made" note
above, because of how it happened rather than what it was. The core
requirement is one specific sentence: an admin "adds your bot and picks a
channel it can post to." Somewhere in the middle of building this out, the
actual implementation drifted into a bare Guild ID text field that fed
straight into command registration — nothing checking the bot was actually
a member of that server, no channel list, no picker. No validation at all
that the ID typed in meant anything.

The dangerous part wasn't that it was broken — it was that it _worked_.
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

Found by actually running the assignment's own "Redis briefly down" check,
not by writing a test for it. The Slack-mirror enqueue was wrapped in a
plain `try/catch` around `queue.add(...)`, on the assumption that if Redis
is unreachable, the call rejects and we mark `mirrorStatus: 'failed'` while
the Discord reply still goes through fine.

It doesn't reject — it hangs. BullMQ requires `maxRetriesPerRequest: null`
on its Redis connection, and with that setting, ioredis queues commands
offline and retries forever instead of ever rejecting. So `queue.add()`
against a dead Redis just sits there, silently blowing past Discord's
3-second window. This would have failed every single command during any
Redis outage, and it looked completely fine in every earlier test simply
because Redis was always up.

Only found by deliberately pointing `REDIS_URL` at an unreachable host and
timing the response. Fixed with a `Promise.race` and a 1.5s timeout around
just that one call (not a global timeout, which would break BullMQ's
legitimately long-blocking calls elsewhere) — now it fails fast and marks
`mirrorStatus: 'failed'` instead of hanging.

Two smaller bugs in the same "looked right, wasn't" category, both in the
per-guild config feature: a Mongoose `Map` field doesn't cast correctly
through a raw `findOneAndUpdate`, and separately, `toObject()` silently
turns `Map` fields into `{}` over JSON unless you pass
`{ flattenMaps: true }`. Both looked like successful 200 OK saves that
quietly wrote nothing — only caught by checking the actual saved value
after a write, not just the response status.

## Stretch goals attempted

Out of the six listed stretch goals, we went for the two that were highest
value for lowest added risk given the timeline, plus one more:

- **Configurable command rules in the UI** — per-guild command toggles
  (enable/disable `/report`, `/status` independently per connected server),
  built into the same Settings page as the connect flow.
- **Meaningful observability** — structured `[timing]` request logs on
  every interaction, plus `mirrorStatus`/AI-status tracking per command,
  visible live on the dashboard rather than just in server logs.
- **AI step** — described in detail below.

Skipped: interactive components (buttons), modal-based `/report`, and full
multi-server isolation (partially covered — see "What I'd add with more
time"). All three were judged as more new surface area and testing risk
than was worth it against the core reliability requirements, which are
weighted higher in the assignment's own grading criteria.

## AI stretch goal

Added after the core was working: `/report` text gets triaged by Groq
(Llama 3.1, chosen over Gemini — free tier, no card, and an OpenAI-compatible
REST API meant no new SDK dependency) in its own BullMQ job, following the
exact same rule as the Slack mirror — never inline in the request handler.
Two things worth calling out since they were easy to get wrong by copying
the Slack-mirror pattern too literally:

- Once there were _two_ independent enqueue calls (Slack + AI) each bounded
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
  above), but there's still no UI to _list_ which servers the bot is
  currently in — you paste a Guild ID in by hand rather than picking from a
  list. A `GET /guilds` (bot's own guild list) call would close that gap.
- Render's free tier doesn't support a standalone Background Worker service,
  so the BullMQ worker runs inside the same process as the web server in
  production (gated by an env flag; locally they can still run as two
  separate processes, matching the original design). Not the architecture
  I'd pick with a paid tier available, but a reasonable adaptation to a
  real constraint rather than a corner cut for convenience.
