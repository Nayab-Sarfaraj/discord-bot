import mongoose from 'mongoose';

export function getHealthStatus() {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  return {
    status: 'ok',
    uptime: process.uptime(),
    db: dbStates[mongoose.connection.readyState] || 'unknown',
    timestamp: new Date().toISOString(),
  };
}
