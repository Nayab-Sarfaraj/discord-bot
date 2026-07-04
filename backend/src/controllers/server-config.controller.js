import { getConfig, updateConfig } from '../services/server-config.service.js';
import { updateServerConfigSchema } from '../validators/server-config.validator.js';
import { SuccessResponse } from '../utils/api-response.util.js';
import { AppError } from '../utils/app-error.util.js';
import { asyncHandler } from '../utils/async-handler.util.js';

export const getServerConfig = asyncHandler(async (req, res) => {
  const config = await getConfig(req.params.guildId);
  return SuccessResponse(res, { message: 'Config fetched', data: config });
});

export const putServerConfig = asyncHandler(async (req, res) => {
  const parsed = updateServerConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Invalid config payload', 400);
  }

  const config = await updateConfig(req.params.guildId, parsed.data);
  return SuccessResponse(res, { message: 'Config updated', data: config });
});
