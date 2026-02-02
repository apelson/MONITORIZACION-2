/**
 * Auth Context - Authentication state management
 */
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
          setUser(response.data.user);
        } catch (error) {
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (username, password) => {
    const response = await axios.post(`${API}/auth/login`, { username, password });
    const { token: accessToken, user: userData } = response.data;
    localStorage.setItem("token", accessToken);
    setToken(accessToken);
    setUser(userData);
    return userData;
  };

  const logout = () => { 
    localStorage.removeItem("token"); 
    setToken(null); 
    setUser(null); 
  };

  // Create axios instance that always reads fresh token from localStorage
  const authAxios = useMemo(() => {
    const instance = axios.create({ baseURL: API });
    instance.interceptors.request.use((config) => { 
      const currentToken = localStorage.getItem("token");
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`; 
      }
      return config; 
    });
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.config?.responseType === 'blob') {
          error.response = { data: null, status: error.response?.status || 0 };
        }
        // Auto logout on 401
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
        }
        return Promise.reject(error);
      }
    );
    return instance;
  }, []);

  const value = { user, token, login, logout, loading, authAxios };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
