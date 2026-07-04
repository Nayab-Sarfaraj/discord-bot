import { connectDB } from '../config/db.js';

// Placeholder BullMQ worker entrypoint. Job processors get registered here
// once job types exist in src/jobs/.
async function start() {
  await connectDB();
  console.log('worker service started (no queues registered yet)');
}

start().catch((err) => {
  console.error('Failed to start worker service:', err);
  process.exit(1);
});
