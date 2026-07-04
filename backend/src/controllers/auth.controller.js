import { login } from '../services/auth.service.js';
import { loginSchema } from '../validators/auth.validator.js';
import { SuccessResponse } from '../utils/api-response.util.js';
import { AppError } from '../utils/app-error.util.js';
import { asyncHandler } from '../utils/async-handler.util.js';

export const postLogin = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Invalid email or password format', 400);
  }

  const { email, password } = parsed.data;
  const result = await login(email, password);

  return SuccessResponse(res, { message: 'Logged in', data: result });
});
