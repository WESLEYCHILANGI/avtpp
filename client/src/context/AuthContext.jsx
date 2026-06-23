import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

function readStoredTheme() {
  const t = localStorage.getItem('avtpp_theme');
  return t === 'dark' ? 'dark' : 'light';
}

// Read a persisted session synchronously so the correct auth state is available
// on the first render (avoids a redirect flash and a setState-in-effect).
function readStoredSession(tokenKey, dataKey) {
  try {
    const token = localStorage.getItem(tokenKey);
    const data = localStorage.getItem(dataKey);
    if (token && data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to parse stored auth data, clearing:', err);
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(dataKey);
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredSession('avtpp_token', 'avtpp_user'));
  const [admin, setAdmin] = useState(() => readStoredSession('avtpp_admin_token', 'avtpp_admin'));
  const [loading] = useState(false);
  const [theme, setThemeState] = useState(readStoredTheme);

  // Apply + persist theme whenever it changes
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('avtpp_theme', theme);
  }, [theme]);

  const setTheme = (t) => setThemeState(t === 'dark' ? 'dark' : 'light');
  const toggleTheme = () => setThemeState(t => (t === 'dark' ? 'light' : 'dark'));

  // Merge partial changes into the current user and persist them
  const updateUser = (partial) => {
    setUser(prev => {
      const next = { ...(prev || {}), ...partial };
      localStorage.setItem('avtpp_user', JSON.stringify(next));
      return next;
    });
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('avtpp_token', res.data.token);
    localStorage.setItem('avtpp_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    localStorage.setItem('avtpp_token', res.data.token);
    localStorage.setItem('avtpp_user', JSON.stringify(res.data.user));
    localStorage.setItem('avtpp_tour_pending', '1'); // show the welcome tour on first load
    setUser(res.data.user);
    return res.data;
  };

  const adminLogin = async (email, password) => {
    const res = await api.post('/auth/admin/login', { email, password });
    localStorage.setItem('avtpp_admin_token', res.data.token);
    localStorage.setItem('avtpp_admin', JSON.stringify(res.data.admin));
    setAdmin(res.data.admin);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('avtpp_token');
    localStorage.removeItem('avtpp_user');
    setUser(null);
  };

  const adminLogout = () => {
    localStorage.removeItem('avtpp_admin_token');
    localStorage.removeItem('avtpp_admin');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ user, admin, loading, login, register, logout, adminLogin, adminLogout, updateUser, theme, setTheme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
