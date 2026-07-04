import app from './app.js';
import env from './config/env.js';
import { connectDB } from './config/db.js';

async function start() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`web service listening on port ${env.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start web service:', err);
  process.exit(1);
});
