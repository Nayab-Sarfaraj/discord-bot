import env from '../config/env.js';
import { ErrorResponse } from '../utils/api-response.util.js';
import { redactSecrets } from '../utils/redact.util.js';

export function errorMiddleware(err, req, res, next) {
  const statusCode = err.isOperational ? err.statusCode : 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (!err.isOperational) {
    console.error(redactSecrets(err.stack ?? err.message ?? String(err)));
  }

  return ErrorResponse(res, {
    message,
    error: env.nodeEnv === 'development' && !err.isOperational ? redactSecrets(err.message) : undefined,
    statusCode,
  });
}

export function notFoundMiddleware(req, res) {
  return ErrorResponse(res, {
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    statusCode: 404,
  });
}
