/**
 * WelcomeTour - Tour de bienvenida para nuevos usuarios
 * Guía interactiva que muestra las principales funcionalidades del sistema
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Camera, Bell, Shield, HardDrive, Video, BarChart3, 
  Settings, Users, Map, Brain, ChevronRight, ChevronLeft,
  Check, X, Sparkles, Rocket, Target, Zap
} from 'lucide-react';

// Tour steps configuration
const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Bienvenido a WatchTower',
    description: 'Tu centro de control para la gestión integral de videovigilancia y seguridad.',
    icon: Rocket,
    highlight: null,
    content: (
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
          <Camera className="w-10 h-10 text-white" />
        </div>
        <p className="text-muted-foreground">
          Este tour te guiará por las principales funcionalidades del sistema.
          Puedes saltarlo en cualquier momento y acceder a él desde Configuración.
        </p>
      </div>
    )
  },
  {
    id: 'devices',
    title: 'Dispositivos',
    description: 'Monitoriza todas tus cámaras y dispositivos de red en tiempo real.',
    icon: Camera,
    highlight: 'tab-devices',
    content: (
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
          <Target className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium">Estado en tiempo real</p>
            <p className="text-sm text-muted-foreground">Visualiza el estado de todos tus dispositivos con actualización automática</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
          <Zap className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <p className="font-medium">Acciones rápidas</p>
            <p className="text-sm text-muted-foreground">Accede a snapshot, ping y configuración de cada dispositivo</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'alerts',
    title: 'Sistema de Alertas',
    description: 'Recibe notificaciones instantáneas cuando algo requiera tu atención.',
    icon: Bell,
    highlight: 'tab-alerts',
    content: (
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
          <Bell className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium">Notificaciones Telegram</p>
            <p className="text-sm text-muted-foreground">Alertas instantáneas en tu móvil cuando un dispositivo se desconecta</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
          <Shield className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium">Alertas CRA</p>
            <p className="text-sm text-muted-foreground">Integración con Central Receptora de Alarmas</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'grabadores',
    title: 'Grabadores Dahua',
    description: 'Gestiona tus DVR/NVR con tecnología P2P sin necesidad de IP pública.',
    icon: HardDrive,
    highlight: 'tab-grabadores',
    content: (
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
          <Video className="w-5 h-5 text-purple-600 mt-0.5" />
          <div>
            <p className="font-medium">Vista en Directo</p>
            <p className="text-sm text-muted-foreground">Accede al streaming de tus cámaras sin configuraciones complejas</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
          <HardDrive className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div>
            <p className="font-medium">Estado del disco</p>
            <p className="text-sm text-muted-foreground">Monitoriza el espacio y salud de los discos de grabación</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'statistics',
    title: 'Estadísticas e Informes',
    description: 'Analiza el rendimiento de tu sistema con métricas detalladas.',
    icon: BarChart3,
    highlight: 'tab-statistics',
    content: (
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
          <BarChart3 className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div>
            <p className="font-medium">Dashboard interactivo</p>
            <p className="text-sm text-muted-foreground">Gráficas de uptime, incidencias y tendencias</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-cyan-50 rounded-lg">
          <Brain className="w-5 h-5 text-cyan-600 mt-0.5" />
          <div>
            <p className="font-medium">AI Insights</p>
            <p className="text-sm text-muted-foreground">Análisis inteligente con recomendaciones automáticas</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'settings',
    title: 'Configuración',
    description: 'Personaliza el sistema según tus necesidades.',
    icon: Settings,
    highlight: 'tab-settings',
    content: (
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
          <Settings className="w-5 h-5 text-slate-600 mt-0.5" />
          <div>
            <p className="font-medium">Telegram y notificaciones</p>
            <p className="text-sm text-muted-foreground">Configura alertas por Telegram y email</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
          <Users className="w-5 h-5 text-orange-600 mt-0.5" />
          <div>
            <p className="font-medium">Gestión de usuarios</p>
            <p className="text-sm text-muted-foreground">Administra roles y permisos del equipo</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'finish',
    title: '¡Todo listo!',
    description: 'Ya conoces las funciones principales. ¡Empieza a explorar!',
    icon: Sparkles,
    highlight: null,
    content: (
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
          <Check className="w-10 h-10 text-white" />
        </div>
        <p className="text-muted-foreground">
          Puedes volver a ver este tour en cualquier momento desde 
          <strong> Configuración → Ayuda → Tour de bienvenida</strong>
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1"><Camera className="w-3 h-3" />582 dispositivos</Badge>
          <Badge variant="outline" className="gap-1"><Shield className="w-3 h-3" />CRA activa</Badge>
          <Badge variant="outline" className="gap-1"><Bell className="w-3 h-3" />Alertas ON</Badge>
        </div>
      </div>
    )
  }
];

const WelcomeTour = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(false);

  useEffect(() => {
    // Check if user has seen the tour before
    const seen = localStorage.getItem('watchtower_tour_completed');
    setHasSeenTour(seen === 'true');
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      
      // Highlight element if specified
      const nextStep = TOUR_STEPS[currentStep + 1];
      if (nextStep.highlight) {
        const element = document.querySelector(`[data-testid="${nextStep.highlight}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
          }, 2000);
        }
      }
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('watchtower_tour_completed', 'true');
    setHasSeenTour(true);
    onComplete?.();
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('watchtower_tour_completed', 'true');
    onClose();
  };

  const resetTour = () => {
    localStorage.removeItem('watchtower_tour_completed');
    setHasSeenTour(false);
    setCurrentStep(0);
  };

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="mb-2">
              Paso {currentStep + 1} de {TOUR_STEPS.length}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
              <X className="w-4 h-4 mr-1" />
              Saltar
            </Button>
          </div>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            {step.title}
          </DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Progress value={progress} className="h-2 mb-4" />
          {step.content}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>
          <Button onClick={handleNext}>
            {currentStep === TOUR_STEPS.length - 1 ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Finalizar
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Hook to manage tour state
export const useWelcomeTour = () => {
  const [isOpen, setIsOpen] = useState(false);

  const showTour = useCallback(() => setIsOpen(true), []);
  const hideTour = useCallback(() => setIsOpen(false), []);
  
  const checkFirstVisit = useCallback(() => {
    const seen = localStorage.getItem('watchtower_tour_completed');
    if (seen !== 'true') {
      setIsOpen(true);
    }
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem('watchtower_tour_completed');
  }, []);

  return { isOpen, showTour, hideTour, checkFirstVisit, resetTour };
};

export default WelcomeTour;
