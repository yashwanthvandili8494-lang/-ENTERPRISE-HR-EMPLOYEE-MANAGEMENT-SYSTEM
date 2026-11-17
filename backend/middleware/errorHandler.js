const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyValue || {});
    message = `Duplicate value for ${fields.join(', ')}. Record already exists.`;
    errors = fields.map((field) => ({ field, message: `${field} must be unique` }));
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Mongoose invalid ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid identifier for field ${err.path}`;
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds maximum allowed size (5MB).' : err.message;
  }

  // Zod error fallback
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Request validation failed';
    errors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  }

  if (env.NODE_ENV === 'development' && statusCode >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 ? { errors } : {}),
    ...(env.NODE_ENV === 'development' && statusCode >= 500 ? { stack: err.stack } : {}),
  });
};

module.exports = { notFoundHandler, errorHandler };
