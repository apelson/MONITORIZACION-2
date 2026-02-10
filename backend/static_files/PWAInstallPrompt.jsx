/**
 * PWA Install Prompt Component
 * Shows an install prompt for Progressive Web App functionality
 */
import { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if on iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsIOS(isIOSDevice);
    
    // Don't show if already installed
    if (isStandalone) return;
    
    // Check if dismissed recently (24h)
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) return;

    // For Android/Desktop - listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // For iOS - show after 5 seconds if not installed
    if (isIOSDevice && !isStandalone) {
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-gradient-to-r from-cyan-600 to-blue-600 text-white p-4 rounded-xl shadow-2xl z-[10000] animate-in slide-in-from-bottom-5">
      <button onClick={handleDismiss} className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="bg-white/20 p-2 rounded-lg">
          <Smartphone className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">Instalar Siempria Monitor</h4>
          <p className="text-xs text-white/80 mt-1">
            {isIOS 
              ? "Pulsa el botón compartir y 'Añadir a pantalla de inicio'"
              : "Instala la app para acceso rápido y notificaciones"
            }
          </p>
          {!isIOS && (
            <Button 
              size="sm" 
              variant="secondary" 
              className="mt-2 bg-white text-blue-600 hover:bg-white/90"
              onClick={handleInstall}
            >
              Instalar App
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
