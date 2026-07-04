import { verifyToken } from '../services/auth.service.js';
import { AppError } from '../utils/app-error.util.js';
import { asyncHandler } from '../utils/async-handler.util.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new AppError('Authentication required', 401);
  }

  req.admin = verifyToken(token);
  next();
});
