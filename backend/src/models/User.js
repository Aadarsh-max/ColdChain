import mongoose from 'mongoose';
import { APPROVALS, ROLES } from '../config/roles.js';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'viewer', index: true },
    approval: { type: String, enum: APPROVALS, default: 'approved', index: true },
    active: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
    failedLogins: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);