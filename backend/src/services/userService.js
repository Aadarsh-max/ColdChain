import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { hashPassword, publicUser } from './authService.js';

const approvalRank = { pending: 0, approved: 1, rejected: 2 };

export const listUsers = async () => {
  const users = await User.find().sort({ createdAt: 1 }).lean();
  return users
    .map(publicUser)
    .sort((a, b) => approvalRank[a.approval] - approvalRank[b.approval]);
};

export const createUser = async ({ email, name, role, password }) => {
  const existing = await User.exists({ email });
  if (existing) throw new AppError(409, 'A user with this email already exists');

  const passwordHash = await hashPassword(password);
  try {
    const doc = await User.create({ email, name, role, passwordHash, approval: 'approved' });
    return publicUser(doc.toObject());
  } catch (err) {
    if (err && err.code === 11000) throw new AppError(409, 'A user with this email already exists');
    throw err;
  }
};

export const updateUser = async (userId, input, actingUserId) => {
  const target = await User.findById(userId);
  if (!target) return null;

  const changes = { ...input };
  const isSelf = String(target._id) === String(actingUserId);
  const changesRole = changes.role !== undefined && changes.role !== target.role;
  const blocks = changes.active === false || changes.approval === 'rejected';

  if (isSelf && (changesRole || blocks)) {
    throw new AppError(400, 'You cannot change your own role or deactivate your own account');
  }

  const losesAdmin =
    target.role === 'admin' &&
    target.active &&
    target.approval !== 'rejected' &&
    ((changesRole && changes.role !== 'admin') || blocks);

  if (losesAdmin) {
    const others = await User.countDocuments({
      role: 'admin',
      active: true,
      approval: { $ne: 'rejected' },
      _id: { $ne: target._id }
    });
    if (others === 0) throw new AppError(400, 'At least one active admin is required');
  }

  if (changes.approval === 'approved') changes.active = true;

  target.set(changes);
  if (blocks) target.tokenVersion += 1;
  await target.save();
  return publicUser(target.toObject());
};

export const resetUserPassword = async (userId, password, actingUserId) => {
  if (String(userId) === String(actingUserId)) {
    throw new AppError(400, 'Use Change password on your Account page for your own password');
  }

  const passwordHash = await hashPassword(password);
  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { passwordHash, failedLogins: 0, lockUntil: null }, $inc: { tokenVersion: 1 } },
    { new: true }
  ).lean();

  return updated ? publicUser(updated) : null;
};