export const MIN_PASSWORD = 10;
export const MAX_PASSWORD = 72;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export const passwordProblem = (value) => {
  if (value.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters`;
  if (value.length > MAX_PASSWORD) return `Password must be at most ${MAX_PASSWORD} characters`;
  return '';
};

export const generatePassword = (length = 14) => {
  const bytes = new Uint32Array(length);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => ALPHABET[value % ALPHABET.length]).join('');
};