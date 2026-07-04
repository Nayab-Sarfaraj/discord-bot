import { Router } from 'express';
import { getCommands } from '../controllers/command.controller.js';
import { requireAuth } from '../middlewares/require-auth.middleware.js';
import { adminRateLimiter } from '../middlewares/rate-limit.middleware.js';

const router = Router();

router.get('/', requireAuth, adminRateLimiter, getCommands);

export default router;
