import { Setting } from '../models/Setting.js';

const TTL_MS = 10000;

let cache = null;
let cachedAt = 0;

export const getSettings = async () => {
  if (cache && Date.now() - cachedAt < TTL_MS) return cache;
  cache = await Setting.getGlobal().lean();
  cachedAt = Date.now();
  return cache;
};

export const invalidateSettings = () => {
  cache = null;
  cachedAt = 0;
};