import { useState } from 'react';
import axios from 'axios';
import { LogIn, Lock, User, Eye, EyeOff, RefreshCw, Shield, AlertCircle } from 'lucide-react';
import { API } from './constants';

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Completa todos los campos'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, { username, password });
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error de conexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" data-testid="login-page">
      <div className="login-container">
        <img src="/dag-logo.png" alt="Domingo Alonso Group" className="login-dag-logo" data-testid="dag-logo" />

        <div className="login-card">
          <div className="login-card-header">
            <div className="login-app-badge">
              <Shield size={14} />
              <span>Conteo de Visitas</span>
            </div>
            <h1 className="login-card-title" data-testid="login-title">Iniciar Sesion</h1>
            <p className="login-card-desc">Accede al panel de control</p>
          </div>

          <form onSubmit={handleSubmit} data-testid="login-form">
            <div className="login-field">
              <label>Usuario</label>
              <div className="login-input-wrap">
                <User size={16} />
                <input
                  data-testid="login-username" type="text" value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  placeholder="Introduce tu usuario"
                />
              </div>
            </div>
            <div className="login-field">
              <label>Contrasena</label>
              <div className="login-input-wrap">
                <Lock size={16} />
                <input
                  data-testid="login-password" type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Introduce tu contrasena"
                />
                <button type="button" className="login-pw-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="login-error" data-testid="login-error">
                <AlertCircle size={14} /><span>{error}</span>
              </div>
            )}
            <button data-testid="login-submit" type="submit" className="login-submit" disabled={loading}>
              {loading
                ? <RefreshCw size={18} className="spin" />
                : <><LogIn size={18} /><span>Acceder</span></>
              }
            </button>
          </form>
        </div>

        <div className="login-footer-text">
          <span>Desarrollado por</span>
          <img src="/siempria-logo.png" alt="Siempria" />
          <span>Siempria</span>
          <span className="login-footer-sep">|</span>
          <span>Tecnologia Mobotix</span>
        </div>
      </div>
    </div>
  );
}
