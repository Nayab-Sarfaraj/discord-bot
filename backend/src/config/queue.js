import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import env from './env.js';

// Required by BullMQ; also needed for Upstash's managed Redis. Do not
// remove — BullMQ throws at Queue/Worker construction without it.
const connectionOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export function createRedisConnection() {
  return new IORedis(env.redisUrl, connectionOptions);
}

export const connection = createRedisConnection();

export const slackNotifyQueue = new Queue('slack-notify', { connection });
export const aiTriageQueue = new Queue('ai-triage', { connection });
