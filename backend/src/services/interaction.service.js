import { InteractionType, InteractionResponseType } from 'discord-interactions';
import {
  createCommand,
  findByInteractionId,
  updateMirrorStatus,
  updateAiTriage,
} from '../repositories/command.repository.js';
import { getConfig } from '../services/server-config.service.js';
import { slackNotifyQueue, aiTriageQueue } from '../config/queue.js';
import { broadcast } from '../utils/sse.util.js';
import { redactSecrets } from '../utils/redact.util.js';
import env from '../config/env.js';

const MONGO_DUPLICATE_KEY_ERROR = 11000;

// BullMQ requires maxRetriesPerRequest: null on its Redis connection (see
// config/queue.js), which means ioredis queues commands offline and retries
// forever instead of rejecting when Redis is unreachable — queue.add()
// alone would hang past Discord's ~3s window. This bounds just this one
// call site so a Redis outage degrades to "mirror failed", not "no reply".
const ENQUEUE_TIMEOUT_MS = 1500;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)),
  ]);
}

function extractCommandText(data) {
  const textOption = data?.options?.find((opt) => opt.name === 'text');
  return textOption?.value ?? null;
}

function buildAckResponse(commandName) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: `✅ Got it! (\`/${commandName}\`)` },
  };
}

// AI triage can take longer than Discord's ~3s budget — defer instead
// ("Bot is thinking...") and let the worker edit this in once the Groq
// call (running in the background, via BullMQ) resolves.
function buildDeferredResponse() {
  return { type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE };
}

function buildDisabledResponse(commandName) {
  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content: `⛔ \`/${commandName}\` is disabled for this server.`, flags: 64 }, // 64 = EPHEMERAL
  };
}

// Fire-and-forget enqueue, bounded so a broker outage can't hang the
// Discord reply. Returns true on success; on failure, logs (redacted) and
// runs onFailure so the caller can mark whatever status field applies.
async function enqueueBounded(queue, jobName, jobData, jobOpts, interactionId, label, onFailure) {
  try {
    const enqueuePromise = queue.add(jobName, jobData, jobOpts);
    enqueuePromise.catch(() => {});
    await withTimeout(enqueuePromise, ENQUEUE_TIMEOUT_MS);
    return true;
  } catch (err) {
    console.error(`Failed to enqueue ${label} for interaction ${interactionId}:`, redactSecrets(err.message));
    await onFailure();
    return false;
  }
}

async function handleApplicationCommand(interaction) {
  const { id: interactionId, guild_id: guildId, channel_id: channelId, token, member, data } = interaction;
  const commandName = data.name;

  const config = await getConfig(guildId);
  if (config.commandToggles?.[commandName] === false) {
    return buildDisabledResponse(commandName);
  }

  // Fast-path only — the real correctness guarantee is the unique index on
  // interactionId below. This just avoids an unnecessary write attempt.
  const existing = await findByInteractionId(interactionId);
  if (existing) {
    return buildAckResponse(commandName);
  }

  const commandText = extractCommandText(data);
  const aiEligible = Boolean(env.groqApiKey && commandText);

  let doc;
  try {
    doc = await createCommand({
      interactionId,
      guildId,
      channelId,
      userId: member?.user?.id,
      username: member?.user?.username,
      commandName,
      commandText,
      status: 'received',
      mirrorStatus: config.mirrorEnabled ? 'pending' : 'skipped',
      aiStatus: aiEligible ? 'pending' : 'skipped',
    });
  } catch (err) {
    // The same interaction delivered twice concurrently races past the
    // findByInteractionId check above — the unique index is what actually
    // prevents double-processing. This also doubles as replay defense,
    // since verifyKey() doesn't itself enforce timestamp freshness.
    if (err.code !== MONGO_DUPLICATE_KEY_ERROR) {
      throw err;
    }
    return buildAckResponse(commandName);
  }

  // Emitted right after the DB write, per project convention. Same process
  // as the SSE clients (web), so no cross-process concern here.
  broadcast('command_created', doc);

  // Each enqueue call must live in this "create succeeded" branch only —
  // never in a shared finally — or a duplicate delivery hitting the 11000
  // catch above would double-enqueue either job. Run concurrently, not
  // sequentially — two 1.5s-bounded enqueues awaited one after another
  // could stack to ~3s if both Redis calls time out, right at Discord's
  // own response budget.
  const pendingEnqueues = [];

  if (config.mirrorEnabled) {
    pendingEnqueues.push(
      enqueueBounded(
        slackNotifyQueue,
        'notify',
        { interactionId, commandName, commandText: doc.commandText, username: doc.username, guildId, channelId },
        { jobId: interactionId, attempts: 3, backoff: { type: 'exponential', delay: 1000, jitter: 0.5 } },
        interactionId,
        'slack-notify',
        () => updateMirrorStatus(interactionId, 'failed'),
      ),
    );
  }

  // Started (not awaited) alongside the mirror enqueue above so both run
  // concurrently — awaiting this one before the other would reintroduce
  // the ~3s worst-case stacking this pattern is meant to avoid.
  const aiEnqueueTask = aiEligible
    ? enqueueBounded(
        aiTriageQueue,
        'triage',
        { interactionId, commandName, commandText, interactionToken: token },
        { jobId: interactionId, attempts: 2, backoff: { type: 'exponential', delay: 1000, jitter: 0.5 } },
        interactionId,
        'ai-triage',
        () => updateAiTriage(interactionId, { aiStatus: 'failed' }),
      )
    : null;

  if (aiEnqueueTask) {
    pendingEnqueues.push(aiEnqueueTask);
  }

  await Promise.all(pendingEnqueues);
  const aiEnqueueSucceeded = aiEnqueueTask ? await aiEnqueueTask : false;

  // Only defer if a job actually got queued to edit this in later — if the
  // AI enqueue itself failed, no follow-up will ever arrive, and returning
  // a deferred "thinking..." response would leave Discord stuck forever.
  if (aiEligible && aiEnqueueSucceeded) {
    return buildDeferredResponse();
  }

  return buildAckResponse(commandName);
}

export async function buildInteractionResponse(interaction) {
  if (interaction.type === InteractionType.PING) {
    return { type: InteractionResponseType.PONG };
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    return handleApplicationCommand(interaction);
  }

  return null;
}
