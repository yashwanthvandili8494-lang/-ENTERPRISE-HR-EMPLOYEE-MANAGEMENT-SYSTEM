import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { setAccessToken, getAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',
  EMPLOYEE: 'EMPLOYEE',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.get('/settings');
      setCompanySettings(res.data.data);
    } catch (_) {
      // ignore if not authenticated
    }
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      if (!getAccessToken()) {
        // Attempt silent refresh using HTTP-only cookie
        try {
          const refreshRes = await api.post('/auth/refresh');
          setAccessToken(refreshRes.data.data.accessToken);
        } catch (_) {
          setUser(null);
          setLoading(false);
          return;
        }
      }
      const res = await api.get('/auth/me');
      setUser(res.data.data);
      await loadSettings();
    } catch (_) {
      setAccessToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [loadSettings]);

  useEffect(() => {
    fetchMe();
    const handleUnauthorized = () => {
      setUser(null);
      setAccessToken(null);
    };
    window.addEventListener('ehrms:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('ehrms:unauthorized', handleUnauthorized);
  }, [fetchMe]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, user: loggedInUser } = res.data.data;
    setAccessToken(accessToken);
    setUser(loggedInUser);
    await loadSettings();
    return loggedInUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {
      // continue cleanup even if network fails
    }
    setAccessToken(null);
    setUser(null);
  };

  const hasRole = (...roles) => Boolean(user && roles.includes(user.role));

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        companySettings,
        setCompanySettings,
        loading,
        login,
        logout,
        refreshUser: fetchMe,
        refreshSettings: loadSettings,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
