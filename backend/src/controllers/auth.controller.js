import { asyncHandler } from '../utils/asyncHandler.js';
import { changePassword, login, signup } from '../services/authService.js';

export const postLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const data = await login(email, password);
  res.set('Cache-Control', 'no-store');
  res.json({ data });
});

export const postSignup = asyncHandler(async (req, res) => {
  await signup(req.validated.body);
  res.set('Cache-Control', 'no-store');
  res.status(202).json({
    data: { message: 'Request received. An administrator must approve your account before you can sign in.' }
  });
});

export const getMe = (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ data: req.user });
};

export const postChangePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.validated.body;
  const data = await changePassword(req.user.id, currentPassword, newPassword);
  res.set('Cache-Control', 'no-store');
  res.json({ data });
});