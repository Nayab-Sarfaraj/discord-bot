import { Router } from 'express';
import { postLogin } from '../controllers/auth.controller.js';
import { loginRateLimiter } from '../middlewares/rate-limit.middleware.js';

const router = Router();

router.post('/login', loginRateLimiter, postLogin);

export default router;
