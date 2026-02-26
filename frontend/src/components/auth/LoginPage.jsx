/**
 * Login Page Component - WATCH TOWER by Siempria
 * ULTIMATE Spectacular animated login with advanced effects
 */
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  RefreshCw, Lock, User, Shield, Bell, Mail, Phone, Send, 
  AlertCircle, Globe, Eye, EyeOff
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

// ULTIMATE Spectacular Watch Tower Component
const UltimateWatchTower = () => {
  const [phase, setPhase] = useState(0);
  const [textIntensity, setTextIntensity] = useState(0);
  const [letterOffsets, setLetterOffsets] = useState([]);
  const canvasRef = useRef(null);
  
  // Text animation for each letter
  const watchTowerText = "WATCH TOWER";
  
  useEffect(() => {
    // Initialize letter offsets
    setLetterOffsets(watchTowerText.split('').map(() => Math.random() * Math.PI * 2));
    
    // Main animation loop
    const animationFrame = setInterval(() => {
      setPhase(prev => (prev + 0.02) % (Math.PI * 2));
    }, 16);
    
    // Text intensity pulsing
    const textPulse = setInterval(() => {
      setTextIntensity(prev => (prev + 0.03) % (Math.PI * 2));
    }, 16);
    
    return () => {
      clearInterval(animationFrame);
      clearInterval(textPulse);
    };
  }, []);

  // Dynamic colors based on phase
  const primaryHue = 190 + Math.sin(phase) * 15;
  const primaryColor = `hsl(${primaryHue}, 100%, ${55 + Math.sin(phase * 1.5) * 10}%)`;
  const secondaryColor = `hsl(${primaryHue + 20}, 85%, ${45 + Math.cos(phase * 1.2) * 10}%)`;
  const glowIntensity = 0.3 + Math.sin(textIntensity) * 0.2;

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Ambient background effects */}
      <div className="absolute inset-0 -top-40 -bottom-40 -left-40 -right-40 pointer-events-none">
        {/* Radial gradient pulse */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 800px 600px at center, ${primaryColor}${Math.round(glowIntensity * 30).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          }}
        />
        
        {/* Rotating conic gradient */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `conic-gradient(from ${phase * 57}deg at 50% 50%, transparent 0deg, ${primaryColor}40 30deg, transparent 60deg, ${secondaryColor}30 90deg, transparent 120deg, ${primaryColor}20 150deg, transparent 180deg, ${secondaryColor}40 210deg, transparent 240deg, ${primaryColor}30 270deg, transparent 300deg, ${secondaryColor}20 330deg, transparent 360deg)`,
            filter: 'blur(60px)',
          }}
        />
      </div>
      
      {/* Hexagon Symbol with advanced effects */}
      <div className="relative mb-10 z-10">
        {/* Multiple rotating glow rings */}
        <div className="absolute inset-0 -m-16">
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from ${phase * 57}deg, transparent, ${primaryColor}60, transparent, ${secondaryColor}40, transparent)`,
              filter: 'blur(25px)',
              animation: 'spin 8s linear infinite',
            }}
          />
        </div>
        <div className="absolute inset-0 -m-12">
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from ${-phase * 43}deg, transparent, ${secondaryColor}50, transparent, ${primaryColor}30, transparent)`,
              filter: 'blur(15px)',
              animation: 'spin 12s linear infinite reverse',
            }}
          />
        </div>
        
        {/* Pulsing glow layers */}
        <div 
          className="absolute inset-0 -m-8 rounded-full"
          style={{
            background: `radial-gradient(circle, ${primaryColor}40 0%, transparent 60%)`,
            transform: `scale(${1.2 + Math.sin(phase * 2) * 0.15})`,
            transition: 'transform 0.1s ease-out',
          }}
        />
        
        {/* Symbol container with glass effect */}
        <div 
          className="relative p-8 rounded-3xl backdrop-blur-sm"
          style={{
            background: `linear-gradient(135deg, rgba(0,20,40,0.6) 0%, rgba(0,40,60,0.4) 100%)`,
            border: `2px solid ${primaryColor}40`,
            boxShadow: `
              0 0 40px ${primaryColor}30,
              0 0 80px ${primaryColor}20,
              inset 0 0 30px ${primaryColor}10
            `,
          }}
        >
          <img 
            src={SYMBOL_URL} 
            alt="WatchTower" 
            className="w-36 h-36 object-contain"
            style={{
              filter: `
                brightness(${1.1 + Math.sin(phase * 2) * 0.15})
                drop-shadow(0 0 20px ${primaryColor})
                drop-shadow(0 0 40px ${primaryColor}80)
              `,
              transform: `scale(${1 + Math.sin(phase * 3) * 0.02})`,
            }}
          />
          
          {/* Recording indicator with pulse */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <div 
              className="relative w-3 h-3"
              style={{
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            >
              <div className="absolute inset-0 rounded-full bg-red-500" />
              <div 
                className="absolute inset-0 rounded-full bg-red-500"
                style={{
                  animation: 'ping 1.5s ease-in-out infinite',
                }}
              />
            </div>
            <span className="text-red-400 text-[10px] font-bold tracking-wider">REC</span>
          </div>
        </div>
      </div>
      
      {/* WATCH TOWER - Ultimate text effect */}
      <div className="relative mb-3 z-10">
        {/* Background glow for text */}
        <div 
          className="absolute inset-0 -m-8"
          style={{
            background: `linear-gradient(90deg, transparent, ${primaryColor}${Math.round(glowIntensity * 40).toString(16).padStart(2, '0')}, transparent)`,
            filter: 'blur(30px)',
          }}
        />
        
        {/* Main text with individual letter animation */}
        <h1 className="relative text-5xl md:text-7xl font-black tracking-[0.2em] flex">
          {watchTowerText.split('').map((letter, i) => {
            const offset = letterOffsets[i] || 0;
            const letterPhase = phase + offset * 0.5;
            const brightness = 0.8 + Math.sin(letterPhase * 2) * 0.2;
            const yOffset = Math.sin(letterPhase * 3 + i * 0.3) * 2;
            
            return (
              <span
                key={i}
                className="inline-block transition-transform duration-100"
                style={{
                  color: letter === ' ' ? 'transparent' : `hsl(${primaryHue + Math.sin(letterPhase) * 10}, 100%, ${60 + Math.sin(letterPhase) * 15}%)`,
                  textShadow: letter === ' ' ? 'none' : `
                    0 0 10px ${primaryColor},
                    0 0 20px ${primaryColor},
                    0 0 40px ${primaryColor}${Math.round(brightness * 200).toString(16).padStart(2, '0')},
                    0 0 80px ${secondaryColor}60
                  `,
                  transform: `translateY(${yOffset}px)`,
                  width: letter === ' ' ? '0.3em' : 'auto',
                }}
              >
                {letter}
              </span>
            );
          })}
        </h1>
        
        {/* Scanning light effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute h-full w-16 opacity-60"
            style={{
              background: `linear-gradient(90deg, transparent, white, transparent)`,
              left: `${((phase / (Math.PI * 2)) * 150) - 20}%`,
              filter: 'blur(8px)',
              mixBlendMode: 'overlay',
            }}
          />
        </div>
      </div>
      
      {/* by Siempria with glow */}
      <div 
        className="text-xl tracking-[0.4em] uppercase font-light mb-2 z-10"
        style={{
          color: `hsl(${primaryHue}, 70%, ${50 + Math.sin(textIntensity) * 10}%)`,
          textShadow: `0 0 20px ${primaryColor}60`,
        }}
      >
        by Siempria
      </div>
      
      {/* Subtitle */}
      <p 
        className="text-slate-400 text-sm tracking-widest z-10"
        style={{
          opacity: 0.7 + Math.sin(phase * 0.5) * 0.3,
        }}
      >
        Centro de Operaciones de Red 24/7
      </p>
      
      {/* Feature indicators with animated dots */}
      <div className="mt-10 space-y-4 z-10">
        {[
          { icon: Shield, text: 'Monitoreo en tiempo real 24/7' },
          { icon: Bell, text: 'Alertas instantáneas por email' },
          { icon: Lock, text: 'Conexión segura y encriptada' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-4 group">
            <div 
              className="relative"
              style={{
                animation: `pulse 2s ease-in-out ${i * 0.3}s infinite`,
              }}
            >
              <div 
                className="w-2.5 h-2.5 rounded-full"
                style={{ 
                  backgroundColor: primaryColor,
                  boxShadow: `0 0 10px ${primaryColor}, 0 0 20px ${primaryColor}60`,
                }}
              />
            </div>
            <span className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">
              {item.text}
            </span>
          </div>
        ))}
      </div>
      
      {/* CSS Keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes ping {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

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
    <div className="min-h-screen flex bg-[#0a0f1a] relative overflow-hidden">
      {/* Language selector in top right */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageSelector variant="outline" />
      </div>
      
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,200,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,200,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px',
          }}
        />
      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${1 + Math.random() * 3}px`,
              height: `${1 + Math.random() * 3}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: `hsl(190, 100%, ${50 + Math.random() * 30}%)`,
              opacity: 0.3 + Math.random() * 0.4,
              animation: `float ${8 + Math.random() * 12}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>
      
      {/* Left side - Ultimate Watch Tower */}
      <div className="hidden lg:flex lg:w-3/5 flex-col justify-center items-center p-12 relative">
        <UltimateWatchTower />
        
        {/* Partner logo */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-slate-600 text-xs mb-3 tracking-wider">Distribuidor Autorizado</p>
          <div className="bg-white/90 rounded-xl px-6 py-3 inline-block backdrop-blur shadow-xl">
            <img 
              src={MOBOTIX_LOGO_URL} 
              alt="Mobotix" 
              className="h-8 object-contain" 
              onError={(e) => { e.target.parentElement.innerHTML = '<span class="text-xl font-bold text-slate-800">MOBOTIX</span>'; }} 
            />
          </div>
        </div>
      </div>
      
      {/* Right side - Login form */}
      <div className="w-full lg:w-2/5 flex flex-col justify-center items-center p-8 bg-gradient-to-br from-slate-900/50 to-slate-950/80 backdrop-blur-sm">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src={SYMBOL_URL} alt="WatchTower" className="h-20 mx-auto mb-4 object-contain" />
            <h1 className="text-3xl font-bold text-cyan-400 tracking-[0.2em]">WATCH TOWER</h1>
            <p className="text-cyan-600 text-sm tracking-widest">by Siempria</p>
          </div>
          
          <Card className="shadow-2xl border-0 bg-white/[0.97] backdrop-blur-xl">
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-cyan-500/30">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800">{t('auth.login', 'Iniciar Sesión')}</CardTitle>
              <CardDescription className="text-slate-500">{t('auth.loginDescription', 'Introduce tus credenciales para continuar')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">{t('auth.username', 'Usuario')}</Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                    <Input 
                      data-testid="login-username" 
                      value={username} 
                      onChange={(e) => { setUsername(e.target.value); setLoginError(""); }} 
                      className="pl-11 h-12 text-base border-slate-200 focus:border-cyan-500 focus:ring-cyan-500" 
                      placeholder={t('auth.username', 'Usuario')} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">{t('auth.password', 'Contraseña')}</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                    <Input 
                      data-testid="login-password" 
                      type={showPassword ? "text" : "password"}
                      value={password} 
                      onChange={(e) => { setPassword(e.target.value); setLoginError(""); }} 
                      className="pl-11 pr-11 h-12 text-base border-slate-200 focus:border-cyan-500 focus:ring-cyan-500" 
                      placeholder="••••••••" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {loginError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-sm" data-testid="login-error">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}
                <Button 
                  data-testid="login-submit" 
                  type="submit" 
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all" 
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
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
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-cyan-500" />
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
                  <Button type="submit" disabled={resetting} className="bg-cyan-600 hover:bg-cyan-700">
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
            <p className="text-slate-500 text-sm font-medium">{t('common.needHelp', '¿Necesitas ayuda?')}</p>
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 hover:text-cyan-300 transition-all text-sm font-medium"
            >
              <Globe className="w-4 h-4" />
              {t('login.accessSaas', 'Acceder al Portal SaaS')}
            </button>
          </div>
        </div>
      </div>
      
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-cyan-500/20 rounded-br-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-cyan-500/20 rounded-tr-3xl" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-cyan-500/20 rounded-tl-3xl" />
      
      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-30px) translateX(15px); opacity: 0.6; }
          50% { transform: translateY(-60px) translateX(-15px); opacity: 0.3; }
          75% { transform: translateY(-30px) translateX(10px); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
