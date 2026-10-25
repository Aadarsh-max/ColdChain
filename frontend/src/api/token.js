const KEY = 'ccg.token';

export const TOKEN_KEY = KEY;

export const getToken = () => {
  try {
    return window.localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
};

export const setToken = (token) => {
  try {
    window.localStorage.setItem(KEY, token);
  } catch {
    return;
  }
};

export const clearToken = () => {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    return;
  }
};