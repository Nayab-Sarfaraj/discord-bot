import { Router } from 'express';
import { getServerConfig, putServerConfig, getGuildChannels } from '../controllers/server-config.controller.js';
import { requireAuth } from '../middlewares/require-auth.middleware.js';
import { adminRateLimiter } from '../middlewares/rate-limit.middleware.js';

const router = Router();

router.get('/:guildId/channels', requireAuth, adminRateLimiter, getGuildChannels);
router.get('/:guildId', requireAuth, adminRateLimiter, getServerConfig);
router.put('/:guildId', requireAuth, adminRateLimiter, putServerConfig);

export default router;
