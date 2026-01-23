/**
 * Authentication Context and Hook
 * Handles user authentication, token management, and API calls
 */
import { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  // Axios instance with auth headers
  const authAxios = axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  // Update headers when token changes
  authAxios.interceptors.request.use((config) => {
    const currentToken = localStorage.getItem("token");
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
  });

  const login = useCallback(async (username, password) => {
    try {
      const res = await axios.post(`${API}/auth/login`, { username, password });
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem("token", newToken);
      setToken(newToken);
      setUser(userData);
      toast.success(`Bienvenido, ${userData.full_name || userData.username}`);
      return true;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error de inicio de sesión");
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  const verifyToken = useCallback(async () => {
    const savedToken = localStorage.getItem("token");
    if (!savedToken) return false;
    
    try {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      setUser(res.data.user);
      setToken(savedToken);
      return true;
    } catch (e) {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
      return false;
    }
  }, []);

  const value = {
    user,
    token,
    login,
    logout,
    verifyToken,
    authAxios,
    isAuthenticated: !!token && !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
