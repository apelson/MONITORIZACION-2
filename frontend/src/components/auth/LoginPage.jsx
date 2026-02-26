/**
 * Login Page Component - WATCH TOWER by Siempria
 * Spectacular animated login with glowing text effects
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  RefreshCw, Lock, User, Shield, Bell, Mail, Phone, Send, 
  AlertCircle, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LanguageSelector } from '@/components/LanguageSelector';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
// Symbol only - hexagon logo
const SYMBOL_URL = "https://customer-assets.emergentagent.com/job_a94233fe-5bf2-40c3-a397-62d7837aec7e/artifacts/e9dyv3py_278325658_4943266082409281_2320348341249708641_n-removebg-preview.png";
const MOBOTIX_LOGO_URL = "https://www.mobotix.com/sites/default/files/2019-10/MOBOTIX-Logo.svg";

// Spectacular animated logo component with WATCH TOWER text
const SpectacularWatchTower = () => {
  const [glowPhase, setGlowPhase] = useState(0);
  const [textGlow, setTextGlow] = useState(false);
  
  useEffect(() => {
    // Continuous glow animation
    const glowInterval = setInterval(() => {
      setGlowPhase(prev => (prev + 1) % 360);
    }, 50);
    
    // Text pulsing effect - slower
    const textInterval = setInterval(() => {
      setTextGlow(prev => !prev);
    }, 1500);
    
    return () => {
      clearInterval(glowInterval);
      clearInterval(textInterval);
    };
  }, []);

  // Calculate dynamic glow colors
  const primaryGlow = `hsl(${190 + Math.sin(glowPhase * 0.02) * 10}, 100%, ${55 + Math.sin(glowPhase * 0.03) * 10}%)`;
  const secondaryGlow = `hsl(${200 + Math.cos(glowPhase * 0.02) * 15}, 90%, ${50 + Math.cos(glowPhase * 0.025) * 15}%)`;

  return (
    <div className="relative flex flex-col items-center">
      {/* Background ambient glow */}
      <div 
        className="absolute inset-0 -top-20 -bottom-20"
        style={{
          background: `radial-gradient(ellipse at center, ${primaryGlow}15 0%, transparent 60%)`,
          filter: 'blur(40px)',
        }}
      />
      
      {/* Hexagon Symbol */}
      <div className="relative mb-8">
        {/* Outer rotating glow ring */}
        <div 
          className="absolute inset-0 -m-8"
          style={{
            background: `conic-gradient(from ${glowPhase}deg, transparent, ${primaryGlow}40, transparent, ${secondaryGlow}40, transparent)`,
            filter: 'blur(20px)',
            borderRadius: '50%',
          }}
        />
        
        {/* Multiple glow layers */}
        <div 
          className="absolute inset-0 -m-4 rounded-full transition-all duration-300"
          style={{
            background: `radial-gradient(circle, ${primaryGlow}30 0%, transparent 70%)`,
            transform: `scale(${1.1 + Math.sin(glowPhase * 0.02) * 0.1})`,
          }}
        />
        
        {/* Symbol container */}
        <div 
          className="relative p-6 transition-all duration-500"
          style={{
            filter: `drop-shadow(0 0 ${20 + Math.sin(glowPhase * 0.03) * 10}px ${primaryGlow})`,
          }}
        >
          <img 
            src={SYMBOL_URL} 
            alt="WatchTower" 
            className="w-32 h-32 object-contain transition-all duration-500"
            style={{
              filter: `brightness(${1 + Math.sin(glowPhase * 0.02) * 0.2}) drop-shadow(0 0 30px ${primaryGlow})`,
            }}
          />
        </div>
      </div>
      
      {/* WATCH TOWER Text - Spectacular */}
      <div className="relative mb-2">
        {/* Text glow background */}
        <div 
          className="absolute inset-0 -m-4 transition-all duration-[1500ms]"
          style={{
            background: textGlow 
              ? `linear-gradient(90deg, transparent, ${primaryGlow}40, transparent)`
              : 'transparent',
            filter: 'blur(20px)',
          }}
        />
        
        {/* Main text with letter spacing animation */}
        <h1 
          className="relative text-5xl md:text-6xl font-black tracking-[0.15em] transition-all duration-[1500ms]"
          style={{
            color: textGlow ? '#00e5ff' : '#00a3d9',
            textShadow: textGlow 
              ? `0 0 10px ${primaryGlow}, 0 0 20px ${primaryGlow}, 0 0 40px ${primaryGlow}, 0 0 80px ${secondaryGlow}`
              : `0 0 5px ${primaryGlow}80, 0 0 10px ${primaryGlow}40`,
            letterSpacing: textGlow ? '0.2em' : '0.15em',
          }}
        >
          WATCH TOWER
        </h1>
        
        {/* Scanning line effect */}
        <div 
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ mixBlendMode: 'overlay' }}
        >
          <div 
            className="absolute h-full w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{
              left: `${(glowPhase % 200) - 20}%`,
              transition: 'left 0.1s linear',
            }}
          />
        </div>
      </div>
      
      {/* by Siempria */}
      <p 
        className="text-lg tracking-[0.3em] uppercase transition-all duration-[1500ms]"
        style={{
          color: textGlow ? '#00c8ff' : '#0088aa',
          textShadow: textGlow ? `0 0 10px ${primaryGlow}` : 'none',
          opacity: textGlow ? 1 : 0.8,
        }}
      >
        by Siempria
      </p>
      
      {/* Subtitle */}
      <p className="text-slate-400 mt-4 text-sm tracking-wide">
        Centro de Operaciones de Red 24/7
      </p>
      
      {/* Feature indicators */}
      <div className="mt-8 space-y-3 text-slate-400 text-sm">
        <div className="flex items-center justify-center gap-3">
          <div 
            className="w-2 h-2 rounded-full transition-all duration-500"
            style={{ 
              backgroundColor: primaryGlow,
              boxShadow: `0 0 10px ${primaryGlow}`,
            }}
          />
          <span>Monitoreo en tiempo real 24/7</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <div 
            className="w-2 h-2 rounded-full transition-all duration-500"
            style={{ 
              backgroundColor: primaryGlow,
              boxShadow: `0 0 10px ${primaryGlow}`,
            }}
          />
          <span>Alertas instantáneas por email</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <div 
            className="w-2 h-2 rounded-full transition-all duration-500"
            style={{ 
              backgroundColor: primaryGlow,
              boxShadow: `0 0 10px ${primaryGlow}`,
            }}
          />
          <span>Conexión segura y encriptada</span>
        </div>
      </div>
    </div>
  );
};

const LoginPage = ({ login }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!username || !password) { 
      setLoginError(t('validation.required', 'Por favor completa todos los campos'));
      toast.error(t('validation.required', 'Por favor completa todos los campos')); 
      return; 
    }
    setLoading(true);
    try { 
      await login(username, password); 
      toast.success(t('auth.welcomeBack', '¡Bienvenido de nuevo!')); 
    } catch (e) { 
      console.error('Login error:', e);
      const errorMsg = e.response?.data?.detail || t('auth.invalidCredentials', 'Usuario o contraseña incorrectos');
      setLoginError(errorMsg);
      toast.error(errorMsg, { duration: 4000 });
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
      toast.success('Se ha enviado un email con instrucciones para recuperar tu contraseña');
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al enviar email de recuperación');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Language selector in top right */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector variant="outline" />
      </div>
      
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0,200,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,200,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          animation: 'gridMove 20s linear infinite',
        }} />
      </div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>
      
      {/* Left side - Spectacular Watch Tower */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative">
        <SpectacularWatchTower />
        
        {/* Partner logo */}
        <div className="absolute bottom-12 left-0 right-0 text-center">
          <p className="text-slate-600 text-xs mb-3">Distribuidor Autorizado</p>
          <div className="bg-white/90 rounded-lg px-4 py-2 inline-block backdrop-blur">
            <img 
              src={MOBOTIX_LOGO_URL} 
              alt="Mobotix" 
              className="h-7 object-contain" 
              onError={(e) => { e.target.parentElement.innerHTML = '<span class="text-lg font-bold text-slate-800">MOBOTIX</span>'; }} 
            />
          </div>
        </div>
      </div>
      
      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src={SYMBOL_URL} alt="WatchTower" className="h-20 mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-bold text-cyan-400 tracking-wider">WATCH TOWER</h1>
            <p className="text-cyan-600 text-sm">by Siempria</p>
          </div>
          
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-semibold text-slate-800">{t('auth.login', 'Iniciar Sesión')}</CardTitle>
              <CardDescription className="text-slate-500">{t('auth.loginDescription', 'Introduce tus credenciales para continuar')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-slate-700">{t('auth.username', 'Usuario')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      data-testid="login-username" 
                      value={username} 
                      onChange={(e) => { setUsername(e.target.value); setLoginError(""); }} 
                      className="pl-10" 
                      placeholder={t('auth.username', 'Usuario')} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">{t('auth.password', 'Contraseña')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      data-testid="login-password" 
                      type="password" 
                      value={password} 
                      onChange={(e) => { setPassword(e.target.value); setLoginError(""); }} 
                      className="pl-10" 
                      placeholder="••••••••" 
                    />
                  </div>
                </div>
                {loginError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm" data-testid="login-error">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}
                <Button 
                  data-testid="login-submit" 
                  type="submit" 
                  className="w-full h-12 text-base bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700" 
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
                    className="text-sm text-cyan-600 hover:text-cyan-700 hover:underline transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Forgot Password Dialog */}
          <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Recuperar Contraseña
                </DialogTitle>
                <DialogDescription>
                  Ingresa tu email y te enviaremos instrucciones para restablecer tu contraseña
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowForgotPassword(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={resetting}>
                    {resetting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          {/* Contact info */}
          <div className="mt-8 text-center space-y-3">
            <p className="text-slate-400 text-sm font-medium">{t('common.needHelp', '¿Necesitas ayuda?')}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <a href="mailto:soporte@siempria.com" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
                <Mail className="w-4 h-4" />
                soporte@siempria.com
              </a>
              <a href="tel:+34822220022" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
                <Phone className="w-4 h-4" />
                822 22 00 22
              </a>
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-700/30 text-center text-slate-500 text-xs space-y-1">
            <p>© {new Date().getFullYear()} Siempria - {t('saas.copyright', 'Todos los derechos reservados')}</p>
            <p>{t('login.authorizedDistributor', 'Distribuidor Autorizado Mobotix para España y Portugal')}</p>
          </div>
          
          {/* SaaS Portal Link */}
          <div className="mt-6 text-center">
            <button 
              onClick={() => window.location.href = '/saas'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 hover:text-cyan-300 transition-all text-sm"
            >
              <Globe className="w-4 h-4" />
              {t('login.accessSaas', 'Acceder al Portal SaaS')}
            </button>
          </div>
        </div>
      </div>
      
      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-cyan-500/30" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-cyan-500/30" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-cyan-500/30" />
      
      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
          50% { transform: translateY(-40px) translateX(-10px); opacity: 0.3; }
          75% { transform: translateY(-20px) translateX(5px); opacity: 0.5; }
        }
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(80px, 80px); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
