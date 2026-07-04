import { createRedisConnection } from '../config/queue.js';

const clients = new Set();

export function addClient(res) {
  clients.add(res);
}

export function removeClient(res) {
  clients.delete(res);
}

export function broadcast(event, data) {
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(frame);
  }
}

const SSE_UPDATE_CHANNEL = 'sse:command-updated';

// Web and worker are separate processes/services — the worker can't reach
// this process's in-memory `clients` set directly, so it publishes over this
// Redis channel instead and we forward into broadcast() here.
export function subscribeToRedisUpdates() {
  // A subscriber connection can only issue subscribe/unsubscribe commands
  // once subscribed — it can't share the connection object BullMQ's
  // Queue/Worker already hold, so this gets its own.
  const subscriber = createRedisConnection();
  subscriber.subscribe(SSE_UPDATE_CHANNEL);
  subscriber.on('message', (channel, message) => {
    if (channel !== SSE_UPDATE_CHANNEL) return;
    broadcast('command_updated', JSON.parse(message));
  });
  return subscriber;
}

export function publishCommandUpdated(connection, payload) {
  return connection.publish(SSE_UPDATE_CHANNEL, JSON.stringify(payload));
}
