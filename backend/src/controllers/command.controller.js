import { listCommands } from '../repositories/command.repository.js';
import { SuccessResponse } from '../utils/api-response.util.js';
import { asyncHandler } from '../utils/async-handler.util.js';

export const getCommands = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const result = await listCommands({ page, limit });

  return SuccessResponse(res, { message: 'Commands fetched', data: result });
});
