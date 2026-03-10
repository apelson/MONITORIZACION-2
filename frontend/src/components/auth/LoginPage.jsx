/**
 * Login Page - WATCH TOWER by Siempria
 * UNIFIED DESIGN - Login integrado en el mismo fondo espectacular
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  RefreshCw, Lock, User, Shield, Bell, Mail, Phone, Send, 
  AlertCircle, Globe, Eye, EyeOff, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LanguageSelector } from '@/components/LanguageSelector';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const SYMBOL_URL = "/assets/logos/siempria-symbol.png";
const MOBOTIX_LOGO_URL = "https://www.mobotix.com/sites/default/files/2019-10/MOBOTIX-Logo.svg";

const LoginPage = ({ login }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);
  const [loginError, setLoginError] = useState("");
  
  // Animation states
  const [phase, setPhase] = useState(0);
  const [textGlow, setTextGlow] = useState(false);
  
  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setPhase(prev => (prev + 0.015) % (Math.PI * 2));
    }, 16);
    const glowInterval = setInterval(() => {
      setTextGlow(prev => !prev);
    }, 2000);
    return () => {
      clearInterval(phaseInterval);
      clearInterval(glowInterval);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!username || !password) { 
      setLoginError(t('validation.required', 'Por favor completa todos los campos'));
      return; 
    }
    setLoading(true);
    try { 
      await login(username, password); 
      toast.success(t('auth.welcomeBack', '¡Bienvenido!')); 
    } catch (e) { 
      const errorMsg = e.response?.data?.detail || t('auth.invalidCredentials', 'Credenciales inválidas');
      setLoginError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes('@')) {
      toast.error('Por favor ingresa un email válido');
      return;
    }
    setResetting(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: resetEmail });
      toast.success('Email de recuperación enviado');
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al enviar email');
    } finally {
      setResetting(false);
    }
  };

  // Dynamic colors
  const primaryColor = `hsl(${190 + Math.sin(phase) * 10}, 100%, ${55 + Math.sin(phase * 1.5) * 8}%)`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#060a10] relative overflow-hidden px-4 py-4">
      {/* Language selector */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector variant="outline" />
      </div>
      
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Grid */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,200,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,200,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
        {/* Central glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]"
          style={{
            background: `radial-gradient(ellipse at center, ${primaryColor}15 0%, transparent 60%)`,
            filter: 'blur(60px)',
          }}
        />
        {/* Rotating ambient */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] opacity-20"
          style={{
            background: `conic-gradient(from ${phase * 57}deg, transparent, ${primaryColor}30, transparent, ${primaryColor}20, transparent)`,
            filter: 'blur(80px)',
          }}
        />
      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${1.5 + Math.random() * 2}px`,
              height: `${1.5 + Math.random() * 2}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: '#00d4ff',
              opacity: 0.2 + Math.random() * 0.3,
              animation: `float ${10 + Math.random() * 15}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Main Content - Centered */}
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
        
        {/* Logo with glow */}
        <div className="relative mb-4">
          {/* Glow rings */}
          <div 
            className="absolute inset-0 -m-6 rounded-full"
            style={{
              background: `conic-gradient(from ${phase * 57}deg, transparent, ${primaryColor}40, transparent, ${primaryColor}20, transparent)`,
              filter: 'blur(15px)',
            }}
          />
          <div 
            className="absolute inset-0 -m-3 rounded-full"
            style={{
              background: `radial-gradient(circle, ${primaryColor}30 0%, transparent 70%)`,
              transform: `scale(${1.1 + Math.sin(phase * 2) * 0.1})`,
            }}
          />
          
          {/* Logo container */}
          <div 
            className="relative p-4 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0,30,50,0.8) 0%, rgba(0,20,35,0.6) 100%)',
              border: `1px solid ${primaryColor}40`,
              boxShadow: `0 0 30px ${primaryColor}20, inset 0 0 15px ${primaryColor}10`,
            }}
          >
            <img 
              src={SYMBOL_URL} 
              alt="WatchTower" 
              className="w-20 h-20 object-contain"
              style={{
                filter: `brightness(${1.05 + Math.sin(phase * 2) * 0.1}) drop-shadow(0 0 15px ${primaryColor})`,
              }}
            />
            {/* REC indicator */}
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
              <div 
                className="w-1.5 h-1.5 rounded-full bg-red-500"
                style={{ 
                  boxShadow: '0 0 6px #ef4444',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <span className="text-red-400 text-[7px] font-bold">REC</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 
          className="text-4xl md:text-5xl font-black tracking-[0.2em] text-center mb-1 transition-all duration-[2000ms]"
          style={{
            color: textGlow ? '#00e5ff' : '#00b8d4',
            textShadow: textGlow 
              ? `0 0 10px ${primaryColor}, 0 0 30px ${primaryColor}, 0 0 60px ${primaryColor}80`
              : `0 0 5px ${primaryColor}60`,
            letterSpacing: textGlow ? '0.25em' : '0.2em',
          }}
        >
          WATCH TOWER
        </h1>
        
        <p className="text-base tracking-[0.25em] mb-1 text-white font-medium">
          by Siempria
        </p>
        
        <p className="text-slate-500 text-[11px] tracking-wider mb-6">
          Centro de Operaciones de Red 24/7
        </p>

        {/* Login Form - Glass effect */}
        <div 
          className="w-full p-6 rounded-xl backdrop-blur-xl"
          style={{
            background: 'linear-gradient(135deg, rgba(10,20,30,0.9) 0%, rgba(5,15,25,0.85) 100%)',
            border: '1px solid rgba(0,200,255,0.15)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,200,255,0.03)',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div 
              className="p-2 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, #00b8d4 0%, #0088a8 100%)',
                boxShadow: '0 6px 15px rgba(0,184,212,0.3)',
              }}
            >
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('auth.login', 'Iniciar Sesión')}</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">{t('auth.username', 'Usuario')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input 
                  data-testid="login-username" 
                  value={username} 
                  onChange={(e) => { setUsername(e.target.value); setLoginError(""); }} 
                  className="pl-10 h-10 bg-slate-900/80 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20" 
                  placeholder={t('auth.username', 'Usuario')} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-300 text-sm">{t('auth.password', 'Contraseña')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input 
                  data-testid="login-password" 
                  type={showPassword ? "text" : "password"}
                  value={password} 
                  onChange={(e) => { setPassword(e.target.value); setLoginError(""); }} 
                  className="pl-10 pr-10 h-10 bg-slate-900/80 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20" 
                  placeholder="••••••••" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {loginError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}
            
            <Button 
              data-testid="login-submit" 
              type="submit" 
              className="w-full h-10 text-base font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-0 shadow-lg shadow-cyan-500/25" 
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  {t('auth.login', 'Iniciar Sesión')}
                </>
              )}
            </Button>
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        </div>

        {/* Features */}
        <div className="mt-5 flex flex-wrap justify-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-500" />
            <span>Monitoreo 24/7</span>
          </div>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-500" />
            <span>Alertas instantáneas</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-500" />
            <span>Conexión segura</span>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
          <a href="mailto:soporte@siempria.com" className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300">
            <Mail className="w-3.5 h-3.5" />
            soporte@siempria.com
          </a>
          <a href="tel:+34822220022" className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300">
            <Phone className="w-3.5 h-3.5" />
            822 22 00 22
          </a>
        </div>

        {/* Footer + Partner in same row */}
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="text-slate-600 text-[10px]">
            <p>© {new Date().getFullYear()} Siempria</p>
            <p>Distribuidor Autorizado Mobotix</p>
          </div>
          <div className="bg-white/90 rounded-lg px-3 py-1.5 inline-block">
            <img 
              src={MOBOTIX_LOGO_URL} 
              alt="Mobotix" 
              className="h-5 object-contain" 
              onError={(e) => { e.target.parentElement.innerHTML = '<span class="text-xs font-bold text-slate-800">MOBOTIX</span>'; }} 
            />
          </div>
        </div>

        {/* SaaS Portal Link */}
        <button 
          onClick={() => window.location.href = '/saas'}
          className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400 text-xs"
        >
          <Globe className="w-3.5 h-3.5" />
          Acceder al Portal SaaS
        </button>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Mail className="w-5 h-5 text-cyan-400" />
              Recuperar Contraseña
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Ingresa tu email y te enviaremos instrucciones
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                placeholder="tu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)} className="border-slate-600 text-slate-300">
                Cancelar
              </Button>
              <Button type="submit" disabled={resetting} className="bg-cyan-600 hover:bg-cyan-700">
                {resetting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" />Enviar</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-24 h-24 border-l border-t border-cyan-500/20" />
      <div className="absolute bottom-0 left-0 w-24 h-24 border-l border-b border-cyan-500/20" />
      <div className="absolute top-0 right-0 w-24 h-24 border-r border-t border-cyan-500/20" />
      <div className="absolute bottom-0 right-0 w-24 h-24 border-r border-b border-cyan-500/20" />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-30px) translateX(10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
