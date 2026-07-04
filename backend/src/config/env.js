import dotenv from 'dotenv';

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/discord-bot',

  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  discordBotToken: process.env.DISCORD_BOT_TOKEN,
  discordApplicationId: process.env.DISCORD_APPLICATION_ID,
  discordPublicKey: process.env.DISCORD_PUBLIC_KEY,
  discordGuildId: process.env.DISCORD_GUILD_ID,

  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,

  jwtSecret: process.env.JWT_SECRET,

  geminiApiKey: process.env.GEMINI_API_KEY,
};

export default env;
