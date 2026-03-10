/**
 * Loading Components - Loading screens and skeletons
 */
import { useTranslation } from 'react-i18next';
import { Shield, Server, Camera, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

const LOGO_URL = "/assets/logos/siempria-autorizada.png";

// Full page loading screen
export const LoadingScreen = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(0,163,217,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,163,217,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-32 right-20 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with glow */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-cyan-500 rounded-full blur-2xl opacity-20 animate-pulse" style={{ transform: 'scale(1.5)' }} />
          <img 
            src={LOGO_URL} 
            alt="Siempria" 
            className="h-24 object-contain relative z-10"
            style={{ filter: 'drop-shadow(0 0 30px rgba(0,163,217,0.4))' }}
          />
        </div>
        
        {/* Title */}
        <h1 className="text-3xl font-light text-white mb-2 tracking-wide">Network Monitor</h1>
        <p className="text-cyan-400 mb-8 text-sm">{t('login.subtitle', 'Sistema de Vigilancia Profesional')}</p>
        
        {/* Loading animation */}
        <div className="relative mb-8">
          {/* Outer ring */}
          <div className="w-20 h-20 rounded-full border-2 border-cyan-500/20 animate-spin" style={{ animationDuration: '3s' }}>
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-cyan-400 rounded-full -translate-x-1/2 -translate-y-1/2" />
          </div>
          {/* Inner ring */}
          <div className="absolute inset-2 rounded-full border-2 border-cyan-500/30 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}>
            <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-cyan-300 rounded-full -translate-x-1/2 -translate-y-1/2" />
          </div>
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-6 h-6 text-cyan-400 animate-pulse" />
          </div>
        </div>
        
        {/* Loading steps */}
        <div className="space-y-3 text-center">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-sm">{t('loading.initSecurity', 'Iniciando sistema de seguridad...')}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <div className="w-2 h-2 bg-cyan-400/50 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
            <span className="text-sm">{t('loading.connecting', 'Conectando con servidores...')}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <div className="w-2 h-2 bg-cyan-400/30 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />
            <span className="text-sm">{t('loading.loadingDevices', 'Cargando dispositivos de vigilancia...')}</span>
          </div>
        </div>
        
        {/* Floating icons */}
        <div className="absolute -z-10">
          <Server className="absolute w-8 h-8 text-cyan-500/10 animate-float" style={{ top: '-100px', left: '-150px', animationDelay: '0s' }} />
          <Camera className="absolute w-8 h-8 text-cyan-500/10 animate-float" style={{ top: '-80px', right: '-140px', animationDelay: '1s' }} />
          <Activity className="absolute w-8 h-8 text-cyan-500/10 animate-float" style={{ bottom: '-90px', left: '-120px', animationDelay: '2s' }} />
        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-6 text-slate-600 text-xs">
        © {new Date().getFullYear()} WatchTower by Siempria
      </div>
    </div>
  );
};

// Dashboard loading skeleton
export const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {[1, 2, 3, 4].map(i => (
      <Card key={i} className="server-card">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-full mt-4" />
          <Separator className="my-4" />
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-8" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Panel loading skeleton
export const PanelLoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
    <Skeleton className="h-64" />
  </div>
);

export default LoadingScreen;
