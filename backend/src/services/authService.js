import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

const ROUNDS = env.isTest ? 4 : 12;
const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-password', ROUNDS);

const invalidCredentials = () => new AppError(401, 'Invalid email or password');

export const publicUser = (user) => ({
  id: String(user._id || user.id),
  email: user.email,
  name: user.name,
  role: user.role,
  active: user.active,
  approval: user.approval || 'approved',
  lastLoginAt: user.lastLoginAt || null,
  createdAt: user.createdAt || null
});

export const hashPassword = (password) => bcrypt.hash(password, ROUNDS);

export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

export const signToken = (user) =>
  jwt.sign({ sub: String(user._id), tv: user.tokenVersion || 0 }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN
  });

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
};

export const authenticateToken = async (token) => {
  const payload = verifyToken(token);
  if (!payload || typeof payload.sub !== 'string' || !mongoose.isValidObjectId(payload.sub)) return null;

  const user = await User.findById(payload.sub).lean();
  if (!user || !user.active) return null;
  if (user.approval && user.approval !== 'approved') return null;
  if ((user.tokenVersion || 0) !== payload.tv) return null;

  return { user: publicUser(user), exp: payload.exp };
};

export const signup = async ({ email, name, password }) => {
  const passwordHash = await hashPassword(password);
  const exists = await User.exists({ email });
  if (exists) return { created: false };

  try {
    await User.create({ email, name, passwordHash, role: 'viewer', approval: 'pending' });
    logger.info(`Signup request: ${email}`);
    return { created: true };
  } catch (err) {
    if (err && err.code === 11000) return { created: false };
    throw err;
  }
};

export const login = async (email, password) => {
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user || !user.active) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw invalidCredentials();
  }

  if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
    throw new AppError(429, 'Account temporarily locked after too many failed attempts. Try again in a few minutes.');
  }

  const ok = await verifyPassword(password, user.passwordHash);

  if (!ok) {
    const updated = await User.findByIdAndUpdate(user._id, { $inc: { failedLogins: 1 } }, { new: true }).select(
      'failedLogins'
    );
    if (updated && updated.failedLogins >= MAX_FAILED_LOGINS) {
      await User.updateOne(
        { _id: user._id },
        { $set: { failedLogins: 0, lockUntil: new Date(Date.now() + LOCK_MS) } }
      );
      logger.warn(`Account locked after repeated failed logins: ${email}`);
    }
    throw invalidCredentials();
  }

  if (user.approval === 'pending') {
    throw new AppError(403, 'Your account is waiting for administrator approval.');
  }
  if (user.approval === 'rejected') {
    throw new AppError(403, 'Your account request was not approved. Contact an administrator.');
  }

  const now = new Date();
  await User.updateOne({ _id: user._id }, { $set: { failedLogins: 0, lockUntil: null, lastLoginAt: now } });
  logger.info(`Login: ${email}`);

  return {
    token: signToken(user),
    user: publicUser({ ...user.toObject(), lastLoginAt: now })
  };
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new AppError(404, 'User not found');

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw new AppError(400, 'Current password is incorrect');

  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion += 1;
  await user.save();

  return { token: signToken(user), user: publicUser(user.toObject()) };
};