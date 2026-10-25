import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { hashPassword, publicUser, signToken, verifyPassword, verifyToken } from '../src/services/authService.js';
import {
  changePasswordSchema,
  createUserSchema,
  loginSchema,
  passwordSchema,
  signupSchema,
  updateUserSchema
} from '../src/validators/auth.schema.js';

const user = { _id: '507f1f77bcf86cd799439011', tokenVersion: 3 };

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct-horse-battery');
    expect(hash).not.toContain('correct-horse');
    expect(await verifyPassword('correct-horse-battery', hash)).toBe(true);
    expect(await verifyPassword('wrong-password-here', hash)).toBe(false);
  });

  it('salts every hash', async () => {
    const a = await hashPassword('same-password-123');
    const b = await hashPassword('same-password-123');
    expect(a).not.toBe(b);
  });
});

describe('tokens', () => {
  it('round trips the user id and token version', () => {
    const payload = verifyToken(signToken(user));
    expect(payload.sub).toBe(user._id);
    expect(payload.tv).toBe(3);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('rejects garbage, tampered, wrong-secret, expired, and unsigned tokens', () => {
    expect(verifyToken('not-a-token')).toBeNull();

    const token = signToken(user);
    const parts = token.split('.');
    parts[1] = Buffer.from(JSON.stringify({ sub: 'someone-else', tv: 3 })).toString('base64url');
    expect(verifyToken(parts.join('.'))).toBeNull();

    const wrongSecret = jwt.sign({ sub: user._id, tv: 3 }, 'x'.repeat(40), { algorithm: 'HS256' });
    expect(verifyToken(wrongSecret)).toBeNull();

    const expired = jwt.sign({ sub: user._id, tv: 3, exp: Math.floor(Date.now() / 1000) - 10 }, env.JWT_SECRET, {
      algorithm: 'HS256'
    });
    expect(verifyToken(expired)).toBeNull();

    const unsigned = jwt.sign({ sub: user._id, tv: 3 }, null, { algorithm: 'none' });
    expect(verifyToken(unsigned)).toBeNull();
  });
});

describe('public user', () => {
  it('never exposes the password hash or token version', () => {
    const result = publicUser({
      _id: 'abc',
      email: 'a@test.local',
      name: 'A',
      role: 'viewer',
      active: true,
      approval: 'pending',
      passwordHash: 'secret',
      tokenVersion: 2
    });
    expect(result.id).toBe('abc');
    expect(result.approval).toBe('pending');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('tokenVersion');
  });

  it('treats a missing approval field as approved', () => {
    const result = publicUser({ _id: 'abc', email: 'a@test.local', name: 'A', role: 'viewer', active: true });
    expect(result.approval).toBe('approved');
  });
});

describe('auth schemas', () => {
  it('enforces the password length rules', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('a-long-enough-password').success).toBe(true);
    expect(passwordSchema.safeParse('x'.repeat(73)).success).toBe(false);
  });

  it('trims and lowercases the login email', () => {
    const parsed = loginSchema.parse({ email: '  Admin@Test.LOCAL ', password: 'x' });
    expect(parsed.email).toBe('admin@test.local');
  });

  it('rejects an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });

  it('rejects a new password equal to the current one', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'same-password-123',
      newPassword: 'same-password-123'
    });
    expect(result.success).toBe(false);
  });

  it('only allows known roles when creating a user and defaults to viewer', () => {
    const base = { email: 'n@test.local', name: 'N', password: 'a-long-password-1' };
    expect(createUserSchema.safeParse({ ...base, role: 'owner' }).success).toBe(false);
    expect(createUserSchema.parse(base).role).toBe('viewer');
  });

  it('allows partial user updates but not empty or unknown ones', () => {
    expect(updateUserSchema.safeParse({ active: false }).success).toBe(true);
    expect(updateUserSchema.safeParse({}).success).toBe(false);
    expect(updateUserSchema.safeParse({ passwordHash: 'x' }).success).toBe(false);
  });

  it('only allows approving or rejecting through user updates', () => {
    expect(updateUserSchema.safeParse({ approval: 'approved' }).success).toBe(true);
    expect(updateUserSchema.safeParse({ approval: 'rejected' }).success).toBe(true);
    expect(updateUserSchema.safeParse({ approval: 'pending' }).success).toBe(false);
  });

  it('validates signup input and ignores a role sent by the client', () => {
    const parsed = signupSchema.parse({
      name: ' New User ',
      email: ' New@Test.LOCAL ',
      password: 'a-long-password-1',
      role: 'admin'
    });
    expect(parsed.name).toBe('New User');
    expect(parsed.email).toBe('new@test.local');
    expect(parsed).not.toHaveProperty('role');
  });

  it('rejects a bad signup', () => {
    expect(signupSchema.safeParse({ name: '', email: 'bad', password: 'short' }).success).toBe(false);
  });
});