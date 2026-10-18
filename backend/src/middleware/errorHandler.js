import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';

export const notFoundHandler = (req, res) => {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
      }
    });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }))
      }
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: { message: `Invalid value for ${err.path}` } });
  }

  if (err && err.code === 11000) {
    return res.status(409).json({ error: { message: 'Duplicate record' } });
  }

  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Malformed JSON body' } });
  }

  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Request body too large' } });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, ...(err.details ? { details: err.details } : {}) }
    });
  }

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}: ${err && err.stack ? err.stack : err}`);
  return res.status(500).json({ error: { message: 'Internal server error' } });
};