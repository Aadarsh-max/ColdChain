import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { createUser, listUsers, resetUserPassword, updateUser } from '../services/userService.js';

const notFound = () => new AppError(404, 'User not found');

export const getUsers = asyncHandler(async (req, res) => {
  const data = await listUsers();
  res.json({ data });
});

export const postUser = asyncHandler(async (req, res) => {
  const data = await createUser(req.validated.body);
  res.status(201).json({ data });
});

export const patchUser = asyncHandler(async (req, res) => {
  const data = await updateUser(req.validated.params.userId, req.validated.body, req.user.id);
  if (!data) throw notFound();
  res.json({ data });
});

export const postResetPassword = asyncHandler(async (req, res) => {
  const data = await resetUserPassword(req.validated.params.userId, req.validated.body.password, req.user.id);
  if (!data) throw notFound();
  res.json({ data });
});