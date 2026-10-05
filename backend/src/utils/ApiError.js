/**
 * Application-level error carrying an HTTP status and a client-safe message.
 * `details` may hold field-level validation info; it is safe to expose.
 */
class ApiError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.expose = true;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'You do not have permission to do that') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  static conflict(message, details) {
    return new ApiError(409, message, details);
  }
  static tooMany(message = 'Too many requests, please slow down') {
    return new ApiError(429, message);
  }
  static internal(message = 'Something went wrong on our end') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
