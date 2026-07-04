import { Router } from 'express';
import healthRoute from './health.route.js';
import authRoute from './auth.route.js';
import commandRoute from './command.route.js';
import sseRoute from './sse.route.js';
import serverConfigRoute from './server-config.route.js';

const router = Router();

router.use('/health', healthRoute);
router.use('/auth', authRoute);
router.use('/commands', commandRoute);
router.use('/events', sseRoute);
router.use('/config', serverConfigRoute);

export default router;
