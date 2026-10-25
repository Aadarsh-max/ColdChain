import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const { people } = vi.hoisted(() => ({
  people: {
    'admin-token': { id: '1', email: 'admin@test.local', name: 'Admin', role: 'admin' },
    'viewer-token': { id: '2', email: 'viewer@test.local', name: 'Viewer', role: 'viewer' }
  }
}));

vi.mock('../src/services/authService.js', () => ({
  authenticateToken: vi.fn(async (token) => (people[token] ? { user: people[token], exp: 9999999999 } : null)),
  login: vi.fn(),
  signup: vi.fn(async () => ({ created: true })),
  changePassword: vi.fn()
}));
vi.mock('../src/services/userService.js', () => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  resetUserPassword: vi.fn()
}));
vi.mock('../src/services/deviceQueryService.js', () => ({
  listDevices: vi.fn(async () => []),
  getDeviceOverview: vi.fn(),
  getLatestReading: vi.fn(),
  listReadings: vi.fn()
}));
vi.mock('../src/services/settingsAdminService.js', () => ({
  getSettingsDoc: vi.fn(),
  updateSettings: vi.fn(async () => ({ hysteresisC: 0.5 }))
}));
vi.mock('../src/services/shipmentService.js', () => ({
  listShipments: vi.fn(),
  getShipmentDetail: vi.fn(),
  createShipment: vi.fn(async () => ({ shipmentId: 'CC1024' })),
  updateShipment: vi.fn(),
  getShipmentHistory: vi.fn(),
  listShipmentReadings: vi.fn()
}));
vi.mock('../src/services/alertQueryService.js', () => ({
  listAlerts: vi.fn(),
  acknowledgeAlert: vi.fn(async () => ({ acknowledged: true }))
}));

import app from '../src/app.js';
import { changePassword, login, signup } from '../src/services/authService.js';
import { createUser, listUsers, resetUserPassword, updateUser } from '../src/services/userService.js';
import { updateSettings } from '../src/services/settingsAdminService.js';
import { createShipment } from '../src/services/shipmentService.js';
import { acknowledgeAlert } from '../src/services/alertQueryService.js';
import { AppError } from '../src/utils/AppError.js';

const admin = { Authorization: 'Bearer admin-token' };
const viewer = { Authorization: 'Bearer viewer-token' };
const ALERT_ID = '507f1f77bcf86cd799439011';

const shipment = {
  shipmentId: 'CC1024',
  productName: 'Medicine',
  minTempC: 10,
  maxTempC: 15,
  origin: { name: 'Palghar' },
  destination: { name: 'Mumbai' }
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authentication', () => {
  it('keeps the health endpoint public', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).not.toBe(401);
  });

  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/devices');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Authentication required');
  });

  it('rejects a wrong auth scheme', async () => {
    const res = await request(app).get('/api/devices').set('Authorization', 'Token admin-token');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const res = await request(app).get('/api/devices').set('Authorization', 'Bearer nonsense');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid or expired session');
  });

  it('lets both roles read data', async () => {
    expect((await request(app).get('/api/devices').set(admin)).status).toBe(200);
    expect((await request(app).get('/api/devices').set(viewer)).status).toBe(200);
  });

  it('returns the current user', async () => {
    const res = await request(app).get('/api/auth/me').set(viewer);
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('viewer');
  });

  it('requires a token for /auth/me', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });
});

describe('login', () => {
  it('validates the body', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bad', password: '' });
    expect(res.status).toBe(400);
    expect(login).not.toHaveBeenCalled();
  });

  it('returns a token and user on success', async () => {
    login.mockResolvedValue({ token: 'jwt', user: { id: '1', role: 'admin' } });
    const res = await request(app).post('/api/auth/login').send({ email: 'Admin@Test.local', password: 'whatever' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBe('jwt');
    expect(login).toHaveBeenCalledWith('admin@test.local', 'whatever');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('passes through a 401 from a failed login', async () => {
    login.mockRejectedValue(new AppError(401, 'Invalid email or password'));
    const res = await request(app).post('/api/auth/login').send({ email: 'a@test.local', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('passes through the pending approval message', async () => {
    login.mockRejectedValue(new AppError(403, 'Your account is waiting for administrator approval.'));
    const res = await request(app).post('/api/auth/login').send({ email: 'p@test.local', password: 'whatever' });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('approval');
  });

  it('validates the new password when changing it', async () => {
    const res = await request(app)
      .post('/api/auth/password')
      .set(viewer)
      .send({ currentPassword: 'old-password-1', newPassword: 'short' });
    expect(res.status).toBe(400);
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('changes the password for the logged-in user', async () => {
    changePassword.mockResolvedValue({ token: 'new', user: { id: '2' } });
    const res = await request(app)
      .post('/api/auth/password')
      .set(viewer)
      .send({ currentPassword: 'old-password-123', newPassword: 'brand-new-password-1' });
    expect(res.status).toBe(200);
    expect(changePassword).toHaveBeenCalledWith('2', 'old-password-123', 'brand-new-password-1');
  });
});

describe('signup', () => {
  it('validates the body', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: '', email: 'bad', password: 'short' });
    expect(res.status).toBe(400);
    expect(signup).not.toHaveBeenCalled();
  });

  it('accepts a valid request with a neutral message', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'New User', email: 'New@Test.local', password: 'a-long-password-1' });
    expect(res.status).toBe(202);
    expect(res.body.data.message).toContain('approve');
    expect(signup).toHaveBeenCalledWith({ name: 'New User', email: 'new@test.local', password: 'a-long-password-1' });
  });

  it('never lets the client choose a role', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Sneaky', email: 'sneaky@test.local', password: 'a-long-password-1', role: 'admin' });
    expect(signup.mock.calls[0][0]).not.toHaveProperty('role');
  });
});

describe('role permissions', () => {
  it('blocks viewers from creating shipments but allows admins', async () => {
    expect((await request(app).post('/api/shipments').set(viewer).send(shipment)).status).toBe(403);
    expect(createShipment).not.toHaveBeenCalled();
    expect((await request(app).post('/api/shipments').set(admin).send(shipment)).status).toBe(201);
  });

  it('blocks viewers from changing settings but allows admins', async () => {
    expect((await request(app).patch('/api/settings').set(viewer).send({ hysteresisC: 0.5 })).status).toBe(403);
    expect(updateSettings).not.toHaveBeenCalled();
    expect((await request(app).patch('/api/settings').set(admin).send({ hysteresisC: 0.5 })).status).toBe(200);
  });

  it('blocks viewers from acknowledging alerts and records the admin name', async () => {
    const url = `/api/alerts/${ALERT_ID}/acknowledge`;
    expect((await request(app).patch(url).set(viewer).send({})).status).toBe(403);
    expect((await request(app).patch(url).set(admin).send({ acknowledgedBy: 'Spoofed' })).status).toBe(200);
    expect(acknowledgeAlert).toHaveBeenCalledWith(ALERT_ID, 'Admin');
  });
});

describe('user management', () => {
  it('is admin only', async () => {
    expect((await request(app).get('/api/users').set(viewer)).status).toBe(403);
    listUsers.mockResolvedValue([]);
    expect((await request(app).get('/api/users').set(admin)).status).toBe(200);
  });

  it('validates new users', async () => {
    const base = { email: 'new@test.local', name: 'New', password: 'a-long-password-1' };
    expect((await request(app).post('/api/users').set(admin).send({ ...base, role: 'owner' })).status).toBe(400);
    expect((await request(app).post('/api/users').set(admin).send({ ...base, password: 'short' })).status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it('creates a user', async () => {
    createUser.mockResolvedValue({ id: '3' });
    const res = await request(app)
      .post('/api/users')
      .set(admin)
      .send({ email: 'new@test.local', name: 'New', role: 'viewer', password: 'a-long-password-1' });
    expect(res.status).toBe(201);
  });

  it('updates a user and passes the acting user id', async () => {
    updateUser.mockResolvedValue({ id: ALERT_ID });
    const res = await request(app).patch(`/api/users/${ALERT_ID}`).set(admin).send({ role: 'viewer' });
    expect(res.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith(ALERT_ID, { role: 'viewer' }, '1');
  });

  it('approves a pending user', async () => {
    updateUser.mockResolvedValue({ id: ALERT_ID, approval: 'approved' });
    const res = await request(app).patch(`/api/users/${ALERT_ID}`).set(admin).send({ approval: 'approved' });
    expect(res.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith(ALERT_ID, { approval: 'approved' }, '1');
  });

  it('does not let viewers approve users', async () => {
    const res = await request(app).patch(`/api/users/${ALERT_ID}`).set(viewer).send({ approval: 'approved' });
    expect(res.status).toBe(403);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown user and 400 for a bad id', async () => {
    updateUser.mockResolvedValue(null);
    expect((await request(app).patch(`/api/users/${ALERT_ID}`).set(admin).send({ active: false })).status).toBe(404);
    expect((await request(app).patch('/api/users/123').set(admin).send({ active: false })).status).toBe(400);
  });

  it('resets a password', async () => {
    resetUserPassword.mockResolvedValue({ id: ALERT_ID });
    const res = await request(app)
      .post(`/api/users/${ALERT_ID}/password`)
      .set(admin)
      .send({ password: 'a-new-long-password-1' });
    expect(res.status).toBe(200);
    expect(resetUserPassword).toHaveBeenCalledWith(ALERT_ID, 'a-new-long-password-1', '1');
  });
});