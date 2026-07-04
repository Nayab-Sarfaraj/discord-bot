import app from "./app.js";
import env, { assertRequiredEnv } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { subscribeToRedisUpdates } from "./utils/sse.util.js";
import { redactSecrets } from "./utils/redact.util.js";

async function start() {
  assertRequiredEnv([
    "mongodbUri",
    "discordPublicKey",
    "discordBotToken",
    "discordApplicationId",
    "jwtSecret",
  ]);

  await connectDB();

  subscribeToRedisUpdates();

  app.listen(env.port, () => {
    console.log(`web service listening on port ${env.port}`);
  });

  if (env.runWorkerInProcess) {
    const { startWorker } = await import("./workers/index.js");
    await startWorker({ skipConnectDB: true });
  }
}

start().catch((err) => {
  console.error(
    "Failed to start web service:",
    redactSecrets(err.stack ?? err.message ?? String(err)),
  );
  process.exit(1);
});
