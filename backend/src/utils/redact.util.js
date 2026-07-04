import env from '../config/env.js';

// Connection/network errors (Mongo, Redis, Slack) can embed the full
// connection string or webhook URL — including credentials — directly in
// err.message. Strip known secret values out of anything before it's logged
// or sent to a client, rather than trusting every call site to remember to.
const SECRET_VALUES = [
  env.discordBotToken,
  env.discordPublicKey,
  env.slackWebhookUrl,
  env.jwtSecret,
  env.mongodbUri,
  env.redisUrl,
  env.groqApiKey,
].filter(Boolean);

export function redactSecrets(input) {
  if (typeof input !== 'string') return input;

  let output = input;
  for (const secret of SECRET_VALUES) {
    output = output.split(secret).join('<redacted>');
  }
  return output;
}
