export function SuccessResponse(res, { message = 'Success', data = null, statusCode = 200 } = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    error: null,
  });
}

export function ErrorResponse(res, { message = 'Error', error = null, statusCode = 500 } = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    error,
  });
}
