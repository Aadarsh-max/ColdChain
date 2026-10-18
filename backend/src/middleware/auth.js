export const authenticate = (req, res, next) => {
  next();
};

export const requireRole = () => (req, res, next) => {
  next();
};