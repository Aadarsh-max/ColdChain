import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setUnauthorizedHandler } from '../api/client.js';
import { TOKEN_KEY, clearToken, getToken, setToken } from '../api/token.js';
import { fetchMe, login as loginRequest } from '../api/authApi.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === TOKEN_KEY && !event.newValue) setUser(null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await loginRequest(email, password);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const updateSession = useCallback((result) => {
    setToken(result.token);
    setUser(result.user);
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAdmin: Boolean(user && user.role === 'admin'), login, logout, updateSession }),
    [user, loading, login, logout, updateSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);