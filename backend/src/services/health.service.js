import mongoose from 'mongoose';
import { connection } from '../config/queue.js';

const MONGO_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

// Always reports 200 at the HTTP layer regardless of these sub-statuses — a
// transient Redis blip shouldn't look like the web service itself is down
// if this route is wired to a platform health check.
export function getHealthStatus() {
  return {
    status: 'ok',
    uptime: process.uptime(),
    mongo: MONGO_STATES[mongoose.connection.readyState] || 'unknown',
    redis: connection.status,
    timestamp: new Date().toISOString(),
  };
}
