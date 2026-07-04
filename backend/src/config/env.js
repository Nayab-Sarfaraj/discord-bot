import dotenv from 'dotenv';

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  // Comma-separated list — supports local dev + one or more deployed
  // frontend origins at once (e.g. Vercel + a custom domain).
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()),

  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/discord-bot',

  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  discordBotToken: process.env.DISCORD_BOT_TOKEN,
  discordApplicationId: process.env.DISCORD_APPLICATION_ID,
  discordPublicKey: process.env.DISCORD_PUBLIC_KEY,
  discordGuildId: process.env.DISCORD_GUILD_ID,

  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,

  jwtSecret: process.env.JWT_SECRET,

  groqApiKey: process.env.GROQ_API_KEY,

  // Render's free tier only offers Web Service + Static Site, not
  // Background Worker — set true there so the web process also runs the
  // BullMQ worker in-process. Leave unset locally to run them as two
  // separate processes (npm run dev + npm run worker), matching the
  // original architecture.
  runWorkerInProcess: process.env.RUN_WORKER_IN_PROCESS === 'true',
};

// Fails loudly at boot instead of confusingly mid-request (e.g. jwt.sign()
// throwing on an undefined secret). Call with only the keys a given
// process/stage actually needs — not every process needs every var.
export function assertRequiredEnv(keys) {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export default env;
