import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import env from '../config/env.js';
import { findByEmail } from '../repositories/admin.repository.js';
import { AppError } from '../utils/app-error.util.js';

const LOGIN_TOKEN_EXPIRY = '7d';
const SSE_TICKET_EXPIRY = '10m';

export function signToken(payload, expiresIn = LOGIN_TOKEN_EXPIRY) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn });
}

// Shared by requireAuth and (Stage 8) the SSE ticket path, so the two
// verification code paths can't drift apart.
export function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
}

// Short-lived, single-purpose token for the SSE query-string auth path —
// native EventSource can't set headers, and a long-lived admin JWT sitting
// in a query string would land in access logs. 10m window is generous
// enough that EventSource's auto-reconnect (which resends the same query
// string) survives a brief network blip.
export function signSseTicket(adminId) {
  return signToken({ sub: adminId, purpose: 'sse' }, SSE_TICKET_EXPIRY);
}

export async function login(email, password) {
  const admin = await findByEmail(email);
  if (!admin) {
    throw new AppError('Invalid email or password', 401);
  }

  const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken({ sub: admin._id.toString(), email: admin.email });
  return { token };
}
