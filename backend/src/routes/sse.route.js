import { Router } from 'express';
import { getEvents, postEventsTicket } from '../controllers/sse.controller.js';
import { requireAuth } from '../middlewares/require-auth.middleware.js';

const router = Router();

router.post('/ticket', requireAuth, postEventsTicket);
router.get('/', getEvents);

export default router;
