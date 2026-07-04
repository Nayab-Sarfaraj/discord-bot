import { signSseTicket, verifyToken } from '../services/auth.service.js';
import { addClient, removeClient } from '../utils/sse.util.js';
import { SuccessResponse } from '../utils/api-response.util.js';
import { AppError } from '../utils/app-error.util.js';
import { asyncHandler } from '../utils/async-handler.util.js';

const HEARTBEAT_INTERVAL_MS = 25 * 1000;

export const postEventsTicket = asyncHandler(async (req, res) => {
  const ticket = signSseTicket(req.admin.sub);
  return SuccessResponse(res, { message: 'Ticket issued', data: { ticket } });
});

// Query-param auth, not the header-based requireAuth: native EventSource
// can't set custom headers. requireAuth itself stays header-only on
// purpose — see signSseTicket's comment for why.
export const getEvents = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) {
    throw new AppError('Missing ticket', 401);
  }

  const payload = verifyToken(token);
  if (payload.purpose !== 'sse') {
    throw new AppError('Invalid ticket', 401);
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  addClient(res);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, HEARTBEAT_INTERVAL_MS);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(res);
  });
});
