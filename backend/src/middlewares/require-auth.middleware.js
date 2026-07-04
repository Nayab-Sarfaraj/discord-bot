import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { AppError } from '../utils/app-error.util.js';
import { asyncHandler } from '../utils/async-handler.util.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new AppError('Authentication required', 401);
  }

  try {
    req.admin = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  next();
});
