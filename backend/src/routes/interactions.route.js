import { Router } from 'express';
import express from 'express';
import { verifyDiscordSignature } from '../middlewares/verify-discord-signature.middleware.js';
import { interactionsRateLimiter } from '../middlewares/rate-limit.middleware.js';
import { handleInteraction } from '../controllers/interactions.controller.js';

const router = Router();

// Stamped before anything else — rate limiting, body parsing, and
// signature verification all count against Discord's ~3s budget too, not
// just the controller's own logic.
function stampRequestIn(req, res, next) {
  req.requestInAt = Date.now();
  next();
}

router.post(
  '/',
  stampRequestIn,
  interactionsRateLimiter,
  express.raw({ type: 'application/json' }),
  verifyDiscordSignature,
  handleInteraction,
);

export default router;
