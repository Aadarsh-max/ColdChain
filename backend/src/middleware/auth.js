import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticateToken } from '../services/authService.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) throw new AppError(401, 'Authentication required');

  const result = await authenticateToken(token);
  if (!result) throw new AppError(401, 'Invalid or expired session');

  req.user = result.user;
  next();
});

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(new AppError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to do this'));
    }
    return next();
  };