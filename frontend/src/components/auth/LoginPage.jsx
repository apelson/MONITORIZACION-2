/**
 * Login Page Component
 * Receives login function as prop from parent AuthProvider
 * With spectacular animated logo
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  RefreshCw, Lock, User, Shield, Bell, Mail, Phone, Send, 
  AlertCircle, Globe, Cctv 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LanguageSelector } from '@/components/LanguageSelector';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_equip-tracker-39/artifacts/796492pi_version%20autorizada%202.png";
const MOBOTIX_LOGO_URL = "https://www.mobotix.com/sites/default/files/2019-10/MOBOTIX-Logo.svg";

// Spectacular animated logo component
const SpectacularLogo = () => {
  const [pulse, setPulse] = useState(true);
  
  useEffect(() => {
    // Slow pulsing animation cycle
    const interval = setInterval(() => {
      setPulse(prev => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex flex-col items-center mb-8">
      {/* Outer glow rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="w-64 h-64 rounded-full transition-all duration-[2000ms] ease-in-out"
          style={{
            background: `radial-gradient(circle, rgba(0,200,255,${pulse ? 0.15 : 0.05}) 0%, transparent 70%)`,
            transform: `scale(${pulse ? 1.2 : 1})`,
          }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="w-48 h-48 rounded-full transition-all duration-[2000ms] ease-in-out"
          style={{
            background: `radial-gradient(circle, rgba(0,163,217,${pulse ? 0.2 : 0.1}) 0%, transparent 70%)`,
            transform: `scale(${pulse ? 1.1 : 0.9})`,
          }}
        />
      </div>
      
      {/* Main hexagon container */}
      <div className="relative z-10">
        {/* Rotating border effect */}
        <div 
          className="absolute inset-0 rounded-full transition-all duration-[2000ms]"
          style={{
            background: `conic-gradient(from 0deg, transparent, rgba(0,200,255,${pulse ? 0.5 : 0.2}), transparent, rgba(0,163,217,${pulse ? 0.5 : 0.2}), transparent)`,
            filter: 'blur(8px)',
            transform: `scale(1.15) rotate(${pulse ? 180 : 0}deg)`,
          }}
        />
        
        {/* Logo container with glow */}
        <div 
          className="relative bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 p-10 rounded-full border-2 transition-all duration-[2000ms] backdrop-blur-sm"
          style={{
            borderColor: pulse ? 'rgba(0,200,255,0.6)' : 'rgba(0,163,217,0.3)',
            boxShadow: pulse 
              ? '0 0 60px rgba(0,200,255,0.4), 0 0 100px rgba(0,163,217,0.2), inset 0 0 30px rgba(0,200,255,0.1)' 
              : '0 0 30px rgba(0,163,217,0.2), inset 0 0 15px rgba(0,200,255,0.05)',
          }}
        >
          {/* Camera icon with animation */}
          <Cctv 
            className="w-28 h-28 transition-all duration-[2000ms]"
            style={{ 
              color: pulse ? '#00c8ff' : '#00a3d9',
              filter: pulse ? 'drop-shadow(0 0 20px rgba(0,200,255,0.6))' : 'drop-shadow(0 0 10px rgba(0,163,217,0.3))',
              transform: `rotate(${pulse ? 5 : -5}deg)`,
            }} 
          />
          
          {/* Recording indicator */}
          <div className="absolute top-6 right-6 flex items-center gap-1.5">
            <div 
              className="w-3 h-3 rounded-full transition-all duration-500"
              style={{
                backgroundColor: '#ef4444',
                boxShadow: pulse ? '0 0 10px #ef4444, 0 0 20px #ef4444' : '0 0 5px #ef4444',
              }}
            />
            <span 
              className="text-[10px] font-bold transition-opacity duration-500"
              style={{ 
                color: '#ef4444',
                opacity: pulse ? 1 : 0.5 
              }}
            >
              REC
            </span>
          </div>
        </div>
      </div>
      
      {/* Siempria Logo below */}
      <div className="relative mt-6 z-10">
        <img 
          src={LOGO_URL} 
          alt="Siempria" 
          className="h-24 mx-auto object-contain transition-all duration-[2000ms]"
          style={{ 
            filter: pulse 
              ? 'drop-shadow(0 0 30px rgba(0,200,255,0.5)) brightness(1.1)' 
              : 'drop-shadow(0 0 15px rgba(0,163,217,0.3)) brightness(1)',
          }} 
        />
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
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Language selector in top right */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector variant="outline" />
      </div>
      
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(0,163,217,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,217,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>
      
      {/* Left side - Info with Spectacular Logo */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative">
        <div className="max-w-md text-center">
          {/* Spectacular animated logo */}
          <SpectacularLogo />
          
          <h1 className="text-3xl font-light text-white mb-2">{t('login.title', 'Network Monitor')}</h1>
          <p className="text-cyan-400 mb-8">{t('login.subtitle', 'Sistema de Vigilancia Profesional')}</p>
          
          <div className="space-y-4 text-slate-400 text-sm">
            <div className="flex items-center justify-center gap-3">
              <Shield className="w-5 h-5 text-cyan-500" />
              <span>{t('login.monitoring247', 'Monitoreo en tiempo real 24/7')}</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Bell className="w-5 h-5 text-cyan-500" />
              <span>{t('login.instantAlerts', 'Alertas instantáneas por email')}</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Lock className="w-5 h-5 text-cyan-500" />
              <span>{t('login.secureConnection', 'Conexión segura y encriptada')}</span>
            </div>
          </div>
          
          {/* Partner logo */}
          <div className="mt-12 pt-8 border-t border-slate-700/50">
            <p className="text-slate-500 text-xs mb-3">{t('login.authorizedDistributorShort', 'Distribuidor Autorizado')}</p>
            <div className="bg-white rounded-lg px-4 py-2 inline-block">
              <img src={MOBOTIX_LOGO_URL} alt="Mobotix" className="h-8 object-contain" onError={(e) => { e.target.parentElement.innerHTML = '<span class="text-lg font-bold text-slate-800">MOBOTIX</span>'; }} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo and contact */}
          <div className="lg:hidden text-center mb-8">
            <img src={LOGO_URL} alt="Siempria" className="h-16 mx-auto mb-4 object-contain" />
            <h1 className="text-xl font-light text-white mb-4">Network Monitor</h1>
            <div className="flex items-center justify-center gap-4">
              <a href="mailto:soporte@siempria.com" className="p-3 bg-cyan-500/20 rounded-full hover:bg-cyan-500/30 transition-colors" title="Email">
                <Mail className="w-5 h-5 text-cyan-400" />
              </a>
              <a href="tel:+34822220022" className="p-3 bg-cyan-500/20 rounded-full hover:bg-cyan-500/30 transition-colors" title="Teléfono">
                <Phone className="w-5 h-5 text-cyan-400" />
              </a>
            </div>
          </div>
          
          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-semibold text-slate-800">{t('auth.login')}</CardTitle>
              <CardDescription className="text-slate-500">{t('auth.loginDescription', 'Introduce tus credenciales para continuar')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-slate-700">{t('auth.username')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      data-testid="login-username" 
                      value={username} 
                      onChange={(e) => { setUsername(e.target.value); setLoginError(""); }} 
                      className="pl-10" 
                      placeholder={t('auth.username')} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">{t('auth.password')}</Label>
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
                      {t('auth.login')}
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
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-cyan-500/20" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-cyan-500/20" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-cyan-500/20" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-cyan-500/20" />
    </div>
  );
};

export default LoginPage;
