export const skipFor = (page, limit) => (page - 1) * limit;

export const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.max(1, Math.ceil(total / limit))
});

export const dateFilter = (from, to) => {
  if (!from && !to) return null;
  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  return range;
};

export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');