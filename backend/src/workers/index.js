import { Worker } from 'bullmq';
import { connectDB } from '../config/db.js';
import { connection } from '../config/queue.js';
import { assertRequiredEnv } from '../config/env.js';
import { processSlackNotify } from '../jobs/slack-notify.job.js';
import { processAiTriage } from '../jobs/ai-triage.job.js';
import { updateMirrorStatus, updateAiTriage } from '../repositories/command.repository.js';
import { publishCommandUpdated } from '../utils/sse.util.js';
import { editOriginalInteractionResponse } from '../utils/discord-followup.util.js';
import { redactSecrets } from '../utils/redact.util.js';

async function start() {
  assertRequiredEnv(['mongodbUri', 'redisUrl']);

  await connectDB();

  const slackWorker = new Worker(
    'slack-notify',
    async (job) => {
      await processSlackNotify(job);
      const doc = await updateMirrorStatus(job.data.interactionId, 'sent');
      await publishCommandUpdated(connection, { interactionId: job.data.interactionId, mirrorStatus: 'sent' });
      return doc;
    },
    { connection, concurrency: 1 },
  );

  slackWorker.on('failed', async (job, err) => {
    console.error(`slack-notify job ${job?.id} failed after ${job?.attemptsMade} attempts:`, redactSecrets(err.message));

    if (job && job.attemptsMade >= job.opts.attempts) {
      await updateMirrorStatus(job.data.interactionId, 'failed');
      await publishCommandUpdated(connection, { interactionId: job.data.interactionId, mirrorStatus: 'failed' });
    }
  });

  const aiWorker = new Worker(
    'ai-triage',
    async (job) => {
      const { summary, category } = await processAiTriage(job);
      const doc = await updateAiTriage(job.data.interactionId, {
        aiSummary: summary,
        aiCategory: category,
        aiStatus: 'done',
      });
      await publishCommandUpdated(connection, {
        interactionId: job.data.interactionId,
        aiSummary: summary,
        aiCategory: category,
        aiStatus: 'done',
      });

      // Best-effort — the DB/SSE update above is already the source of
      // truth. A failed edit (e.g. token expired) shouldn't fail the job.
      if (job.data.interactionToken) {
        try {
          const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
          await editOriginalInteractionResponse(
            job.data.interactionToken,
            `✅ Report logged: "${job.data.commandText}" — Tagged: **${categoryLabel}**`,
          );
        } catch (err) {
          console.error(`Failed to edit original message for interaction ${job.data.interactionId}:`, redactSecrets(err.message));
        }
      }

      return doc;
    },
    { connection, concurrency: 1 },
  );

  aiWorker.on('failed', async (job, err) => {
    console.error(`ai-triage job ${job?.id} failed after ${job?.attemptsMade} attempts:`, redactSecrets(err.message));

    if (job && job.attemptsMade >= job.opts.attempts) {
      await updateAiTriage(job.data.interactionId, { aiStatus: 'failed' });
      await publishCommandUpdated(connection, { interactionId: job.data.interactionId, aiStatus: 'failed' });

      // The interaction reply was deferred on the assumption this job would
      // edit it in — if triage ultimately fails, Discord is left showing
      // "thinking..." forever unless we still send *some* follow-up.
      if (job.data.interactionToken) {
        try {
          await editOriginalInteractionResponse(
            job.data.interactionToken,
            `✅ Report logged: "${job.data.commandText}" (AI tagging unavailable)`,
          );
        } catch (editErr) {
          console.error(
            `Failed to edit original message after ai-triage failure for interaction ${job.data.interactionId}:`,
            redactSecrets(editErr.message),
          );
        }
      }
    }
  });

  console.log('worker service started, listening on queues: slack-notify, ai-triage');
}

start().catch((err) => {
  console.error('Failed to start worker service:', redactSecrets(err.stack ?? err.message ?? String(err)));
  process.exit(1);
});
