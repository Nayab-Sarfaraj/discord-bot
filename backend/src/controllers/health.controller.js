import { getHealthStatus } from '../services/health.service.js';
import { SuccessResponse } from '../utils/api-response.util.js';
import { asyncHandler } from '../utils/async-handler.util.js';

export const getHealth = asyncHandler(async (req, res) => {
  const data = getHealthStatus();
  return SuccessResponse(res, { message: 'Service healthy', data });
});
