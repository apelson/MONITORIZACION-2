#!/bin/bash
#############################################################
# Script de instalación del NOC Dashboard para SIEMPRIA
# Ejecutar en el servidor de producción
#
# USO: 
#   chmod +x install_noc_script.sh
#   ./install_noc_script.sh /ruta/a/tu/frontend
#
# Ejemplo:
#   ./install_noc_script.sh /home/siempria/frontend
#############################################################

set -e

# Verificar argumento
if [ -z "$1" ]; then
    echo "❌ Error: Debes especificar la ruta del frontend"
    echo "Uso: $0 /ruta/a/tu/frontend"
    echo "Ejemplo: $0 /home/siempria/frontend"
    exit 1
fi

FRONTEND_DIR="$1"
COMPONENTS_DIR="$FRONTEND_DIR/src/components"

# Verificar que existe el directorio
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Error: El directorio $FRONTEND_DIR no existe"
    exit 1
fi

echo "============================================"
echo "🚀 Instalando NOC Dashboard para SIEMPRIA"
echo "============================================"
echo "📁 Frontend: $FRONTEND_DIR"
echo ""

# Crear backup
BACKUP_DIR="$FRONTEND_DIR/backup_$(date +%Y%m%d_%H%M%S)"
echo "📦 Creando backup en: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -r "$COMPONENTS_DIR/common" "$BACKUP_DIR/" 2>/dev/null || true
cp -r "$COMPONENTS_DIR/noc" "$BACKUP_DIR/" 2>/dev/null || true
cp -r "$COMPONENTS_DIR/panels" "$BACKUP_DIR/" 2>/dev/null || true

# Crear directorios necesarios
echo "📁 Creando estructura de directorios..."
mkdir -p "$COMPONENTS_DIR/common"
mkdir -p "$COMPONENTS_DIR/noc/widgets"
mkdir -p "$COMPONENTS_DIR/panels"

#############################################################
# NOCFloatingButton.jsx (con detección móvil/tablet)
#############################################################
echo "📝 Creando NOCFloatingButton.jsx..."
cat > "$COMPONENTS_DIR/common/NOCFloatingButton.jsx" << 'ENDFILE'
/**
 * NOCFloatingButton - Botón flotante para abrir el Centro de Operaciones de Red
 * Diseñado para acceso rápido al dashboard NOC 24/7
 * Solo visible en tablet (768px) y superior - oculto en móviles
 */
import { useState, useEffect } from 'react';
import { Monitor, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Custom hook to detect if screen is at least tablet size (768px)
const useIsTabletOrLarger = () => {
  const [isTablet, setIsTablet] = useState(false);
  
  useEffect(() => {
    const checkSize = () => {
      setIsTablet(window.innerWidth >= 768);
    };
    
    // Check on mount
    checkSize();
    
    // Listen for resize
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  
  return isTablet;
};

const NOCFloatingButton = ({ onClick, offlineCount = 0, className }) => {
  const [isHovered, setIsHovered] = useState(false);
  const hasIssues = offlineCount > 0;
  const isTabletOrLarger = useIsTabletOrLarger();

  // Don't render on mobile devices (less than 768px)
  if (!isTabletOrLarger) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
              "fixed z-[9990] shadow-2xl transition-all duration-300 ease-out",
              "bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600",
              "hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500",
              "hover:shadow-cyan-500/25 hover:shadow-2xl",
              "border border-cyan-400/30",
              hasIssues && "animate-pulse ring-2 ring-red-500/50",
              isHovered ? "scale-110" : "scale-100",
              className
            )}
            style={{
              bottom: '100px',
              right: '20px',
              width: isHovered ? '140px' : '56px',
              height: '56px',
              borderRadius: '28px'
            }}
            data-testid="noc-floating-btn"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <Monitor className={cn(
                  "w-6 h-6 transition-transform",
                  isHovered && "scale-110"
                )} />
                {hasIssues && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                )}
                <Activity className={cn(
                  "absolute -bottom-1 -right-1 w-3 h-3 text-cyan-300",
                  "animate-pulse"
                )} />
              </div>
              {isHovered && (
                <span className="text-sm font-medium whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200">
                  NOC 24/7
                </span>
              )}
            </div>
            
            {/* Offline counter badge */}
            {hasIssues && !isHovered && (
              <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1 animate-bounce">
                {offlineCount > 99 ? '99+' : offlineCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-slate-800 border-slate-700">
          <p className="font-medium">Centro de Operaciones de Red</p>
          <p className="text-xs text-slate-400">Dashboard de monitoreo 24/7</p>
          {hasIssues && (
            <p className="text-xs text-red-400 mt-1">{offlineCount} dispositivos offline</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default NOCFloatingButton;
ENDFILE

#############################################################
# SystemECG.jsx
#############################################################
echo "📝 Creando SystemECG.jsx..."
cat > "$COMPONENTS_DIR/common/SystemECG.jsx" << 'ENDFILE'
/**
 * System ECG Component
 * Animated ECG/heartbeat line showing real-time system health
 */
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Shield, Trophy, Clock } from 'lucide-react';

const SystemECG = ({ 
  healthPercent = 100, 
  hasAlerts = false,
  isAnalyzing = true,
  lastIncidentTime = null,
  className 
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [pulse, setPulse] = useState(0);
  const [uptimeCounter, setUptimeCounter] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const getColor = () => {
    if (healthPercent >= 95) return '#10b981';
    if (healthPercent >= 80) return '#f59e0b';
    return '#ef4444';
  };

  const getPulseRate = () => {
    if (healthPercent >= 95) return 60;
    if (healthPercent >= 80) return 80;
    return 100;
  };

  useEffect(() => {
    const calculateUptime = () => {
      if (!lastIncidentTime) {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const diff = now - startOfDay;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setUptimeCounter({ days: 0, hours, minutes, seconds });
        return;
      }

      const now = new Date();
      const incident = new Date(lastIncidentTime);
      const diff = now - incident;

      if (diff < 0) {
        setUptimeCounter({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setUptimeCounter({ days, hours, minutes, seconds });
    };

    calculateUptime();
    const interval = setInterval(calculateUptime, 1000);
    return () => clearInterval(interval);
  }, [lastIncidentTime]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    let x = 0;
    let lastY = height / 2;
    const color = getColor();
    const pulseRate = getPulseRate();
    
    const generateECGBeat = (progress) => {
      if (progress < 0.1) return 0;
      if (progress < 0.15) return -0.1;
      if (progress < 0.2) return 0.05;
      if (progress < 0.25) return -0.3;
      if (progress < 0.3) return 0;
      if (progress < 0.35) return 0.1;
      if (progress < 0.4) return 0.9;
      if (progress < 0.45) return -0.4;
      if (progress < 0.5) return 0;
      if (progress < 0.6) return 0.15;
      if (progress < 0.7) return 0.05;
      return 0;
    };

    const addNoise = () => (Math.random() - 0.5) * 2;

    const animate = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.1)';
      ctx.fillRect(0, 0, width, height);

      const beatDuration = 60000 / pulseRate;
      const now = Date.now();
      const beatProgress = (now % beatDuration) / beatDuration;

      const ecgValue = generateECGBeat(beatProgress);
      const amplitude = height * 0.35;
      const baseY = height / 2;
      let y = baseY - (ecgValue * amplitude);
      
      y += addNoise();

      if (hasAlerts && beatProgress > 0.7 && beatProgress < 0.8) {
        y -= amplitude * 0.3;
      }

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.moveTo(x - 2, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      lastY = y;
      x += 2;

      if (x > width) {
        x = 0;
        ctx.fillStyle = 'rgba(15, 23, 42, 1)';
        ctx.fillRect(0, 0, width, height);
      }

      if (beatProgress < 0.05) {
        setPulse(pulseRate);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    if (isAnalyzing) {
      animate();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [healthPercent, hasAlerts, isAnalyzing]);

  const formatNumber = (num) => String(num).padStart(2, '0');

  return (
    <div className={cn("relative", className)}>
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, ${getColor()}20 1px, transparent 1px), linear-gradient(to bottom, ${getColor()}20 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />
      
      <canvas ref={canvasRef} width={400} height={80} className="w-full h-20" />

      <div className="absolute top-1 left-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: getColor() }} />
        <span className="text-[9px] font-mono" style={{ color: getColor() }}>SYSTEM MONITOR</span>
      </div>

      <div className="absolute top-1 right-3 text-right">
        <span className="text-xl font-bold font-mono" style={{ color: getColor() }}>{pulse}</span>
        <span className="text-[9px] text-slate-400 ml-1">BPM</span>
      </div>

      <div className="border-t border-slate-700/50 bg-slate-950/80 px-2 py-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span className="text-[8px] text-slate-400 uppercase">Sin incidencias</span>
          </div>
          
          {uptimeCounter.days >= 1 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/20 rounded-full">
              <Trophy className="w-2.5 h-2.5 text-amber-400" />
              <span className="text-[7px] text-amber-400 font-medium">
                {uptimeCounter.days >= 7 ? '¡Récord!' : uptimeCounter.days >= 3 ? '¡Excelente!' : '¡Bien!'}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-center gap-0.5 mt-1">
          <div className="flex flex-col items-center">
            <div className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5">
              <span className="text-base font-bold font-mono text-emerald-400">{formatNumber(uptimeCounter.days)}</span>
            </div>
            <span className="text-[6px] text-slate-500">DÍAS</span>
          </div>
          <span className="text-emerald-400 text-sm font-bold">:</span>
          <div className="flex flex-col items-center">
            <div className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5">
              <span className="text-base font-bold font-mono text-emerald-400">{formatNumber(uptimeCounter.hours)}</span>
            </div>
            <span className="text-[6px] text-slate-500">HRS</span>
          </div>
          <span className="text-emerald-400 text-sm font-bold">:</span>
          <div className="flex flex-col items-center">
            <div className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5">
              <span className="text-base font-bold font-mono text-cyan-400">{formatNumber(uptimeCounter.minutes)}</span>
            </div>
            <span className="text-[6px] text-slate-500">MIN</span>
          </div>
          <span className="text-cyan-400 text-sm font-bold">:</span>
          <div className="flex flex-col items-center">
            <div className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5">
              <span className="text-base font-bold font-mono text-cyan-400 animate-pulse">{formatNumber(uptimeCounter.seconds)}</span>
            </div>
            <span className="text-[6px] text-slate-500">SEG</span>
          </div>
        </div>
      </div>

      <div className="absolute top-1 left-1/2 -translate-x-1/2">
        <span className={cn(
          "text-[8px] font-mono px-2 py-0.5 rounded",
          healthPercent >= 95 ? "bg-emerald-500/20 text-emerald-400" :
          healthPercent >= 80 ? "bg-amber-500/20 text-amber-400" :
          "bg-red-500/20 text-red-400 animate-pulse"
        )}>
          {healthPercent >= 95 ? "STABLE" : healthPercent >= 80 ? "ELEVATED" : "CRITICAL"}
        </span>
      </div>
    </div>
  );
};

export default SystemECG;
ENDFILE

#############################################################
# DraggableGrid.jsx
#############################################################
echo "📝 Creando DraggableGrid.jsx..."
cat > "$COMPONENTS_DIR/noc/DraggableGrid.jsx" << 'ENDFILE'
/**
 * DraggableGrid - Grid Layout con Drag & Drop real para el NOC Dashboard
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import GridLayout from 'react-grid-layout';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const gridStyles = `
  .react-grid-item > div { height: 100%; }
  .react-grid-item.react-grid-placeholder {
    background: rgba(6, 182, 212, 0.2);
    border: 2px dashed rgba(6, 182, 212, 0.5);
    border-radius: 8px;
  }
`;

export const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'uptime', x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'systemMonitor', x: 4, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'cra', x: 8, y: 0, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'organizations', x: 0, y: 4, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'offline', x: 3, y: 4, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'history', x: 6, y: 4, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'alerts', x: 9, y: 4, w: 3, h: 4, minW: 2, minH: 3 },
  ]
};

export const WIDGET_CONFIG = {
  uptime: { title: 'Uptime', icon: 'Activity', color: 'cyan' },
  systemMonitor: { title: 'Monitor', icon: 'Activity', color: 'cyan' },
  cra: { title: 'CRA', icon: 'Shield', color: 'red' },
  organizations: { title: 'Orgs', icon: 'Building2', color: 'purple' },
  offline: { title: 'Offline', icon: 'WifiOff', color: 'red' },
  history: { title: 'Historial', icon: 'History', color: 'orange' },
  alerts: { title: 'Alertas', icon: 'Bell', color: 'amber' },
};

const WidgetContainer = ({ id, children, editMode, visible, onToggleVisibility, title }) => {
  if (!visible && !editMode) return null;

  return (
    <div className={cn(
      "h-full w-full rounded-lg overflow-hidden transition-all duration-200",
      editMode && "ring-2 ring-cyan-500/50 bg-slate-800/30",
      !visible && editMode && "opacity-50"
    )}>
      {editMode && (
        <div className="drag-handle absolute top-0 left-0 right-0 h-7 bg-gradient-to-b from-cyan-500/30 to-transparent cursor-grab active:cursor-grabbing z-10 flex items-center justify-between px-2">
          <div className="flex items-center gap-1">
            <GripVertical className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] text-cyan-400 font-medium uppercase tracking-wide">{title}</span>
          </div>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-slate-700/50" onClick={(e) => { e.stopPropagation(); onToggleVisibility(id); }}>
            {visible ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
          </Button>
        </div>
      )}
      <div className={cn("h-full", editMode && "pt-7")}>{children}</div>
    </div>
  );
};

const DraggableGrid = ({ children, layouts, onLayoutChange, editMode, widgetVisibility, onToggleWidget, className }) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    const updateWidth = () => { if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth); };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleLayoutChange = useCallback((newLayout) => {
    if (editMode && onLayoutChange) onLayoutChange({ ...layouts, lg: newLayout });
  }, [editMode, onLayoutChange, layouts]);

  const currentLayout = layouts?.lg || DEFAULT_LAYOUTS.lg;
  const visibleLayout = currentLayout.filter(item => widgetVisibility[item.i] !== false || editMode);
  const visibleChildren = children.filter(child => widgetVisibility[child.key] !== false || editMode);

  return (
    <div ref={containerRef} className={cn("w-full h-full", className)}>
      <style>{gridStyles}</style>
      {editMode && (
        <div className="mb-2 px-3 py-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-cyan-400">Modo edición - Arrastra para reorganizar</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {Object.entries(WIDGET_CONFIG).map(([key, config]) => (
              <Button key={key} variant="ghost" size="sm" className={cn("h-6 px-2 text-[10px]", widgetVisibility[key] !== false ? "text-white bg-slate-700/50" : "text-slate-500 bg-transparent")} onClick={() => onToggleWidget(key)}>
                {widgetVisibility[key] !== false ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                {config.title}
              </Button>
            ))}
          </div>
        </div>
      )}
      <GridLayout className="layout" layout={visibleLayout} cols={12} rowHeight={60} width={containerWidth} margin={[12, 12]} containerPadding={[0, 0]} onLayoutChange={handleLayoutChange} isDraggable={editMode} isResizable={editMode} draggableHandle=".drag-handle" useCSSTransforms={true} compactType="vertical" preventCollision={false}>
        {visibleChildren.map(child => (
          <div key={child.key} className="overflow-hidden h-full">
            <WidgetContainer id={child.key} editMode={editMode} visible={widgetVisibility[child.key] !== false} onToggleVisibility={onToggleWidget} title={WIDGET_CONFIG[child.key]?.title || child.key}>
              {child}
            </WidgetContainer>
          </div>
        ))}
      </GridLayout>
    </div>
  );
};

export default DraggableGrid;
ENDFILE

#############################################################
# NOCHeader.jsx
#############################################################
echo "📝 Creando NOCHeader.jsx..."
cat > "$COMPONENTS_DIR/noc/NOCHeader.jsx" << 'ENDFILE'
/**
 * NOCHeader - Header del NOC Dashboard con controles
 */
import { useState } from 'react';
import { Clock, Volume2, VolumeX, Lock, Unlock, Play, Pause, ExternalLink, RefreshCw, X, Settings, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import DashboardFilters from './DashboardFilters';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_bd3cf608-7344-4385-a96f-f4dc04839f9f/artifacts/t15tym24_278325658_4943266082409281_2320348341249708641_n-removebg-preview.png";

const NOCHeader = ({ currentTime, soundEnabled, setSoundEnabled, editMode, onToggleEditMode, onResetLayout, presentationMode, onTogglePresentation, onOpenNewWindow, onRefresh, refreshing, onClose, organizations, groups, filters, onFiltersChange, savingPrefs, t }) => {
  return (
    <div className="h-14 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
          <img src={LOGO_URL} alt="Siempria" className="w-6 h-6 object-contain" onError={(e) => e.target.style.display = 'none'} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">{t('noc.title', 'NOC Dashboard')}</h1>
          <p className="text-[10px] text-slate-400">{t('noc.subtitle', 'Centro de Operaciones de Red 24/7')}</p>
        </div>
        <img src={LOGO_URL} alt="Siempria" className="h-8 ml-2 opacity-70" onError={(e) => e.target.style.display = 'none'} />
      </div>
      
      <DashboardFilters organizations={organizations} groups={groups} filters={filters} onFiltersChange={onFiltersChange} className="hidden lg:flex" />

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-mono text-white">{currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <span className="text-[10px] text-slate-400">{currentTime.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>
        
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
          {t('noc.active', 'Activo')}
        </Badge>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => setSoundEnabled(!soundEnabled)} className={cn("h-8 w-8 p-0", soundEnabled ? "text-cyan-400" : "text-slate-500")}>
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{soundEnabled ? 'Silenciar' : 'Activar sonido'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onToggleEditMode} disabled={savingPrefs} className={cn("h-8 w-8 p-0", editMode ? "text-cyan-400 bg-cyan-500/20" : "text-slate-400 hover:text-cyan-400")}>
                {savingPrefs ? <RefreshCw className="w-4 h-4 animate-spin" /> : editMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{editMode ? 'Guardar y Bloquear' : 'Editar Layout'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {editMode && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={onResetLayout} className="h-8 w-8 p-0 text-orange-400 hover:bg-orange-500/20">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restaurar Layout</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onTogglePresentation} className={cn("h-8 w-8 p-0", presentationMode ? "text-amber-400 bg-amber-500/20" : "text-slate-400 hover:text-amber-400")}>
                {presentationMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{presentationMode ? 'Detener presentación' : 'Iniciar presentación'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onOpenNewWindow} className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Abrir en nueva ventana</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onRefresh} className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Actualizar</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                <X className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cerrar</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default NOCHeader;
ENDFILE

#############################################################
# DashboardFilters.jsx
#############################################################
echo "📝 Creando DashboardFilters.jsx..."
cat > "$COMPONENTS_DIR/noc/DashboardFilters.jsx" << 'ENDFILE'
/**
 * DashboardFilters - Filtros por organización y grupo
 */
import { Building2, Users, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DashboardFilters = ({ organizations = [], groups = [], filters, onFiltersChange, className }) => {
  const handleOrganizationChange = (value) => {
    onFiltersChange({ ...filters, organizationId: value, groupId: 'all' });
  };

  const handleGroupChange = (value) => {
    onFiltersChange({ ...filters, groupId: value });
  };

  const filteredGroups = filters.organizationId === 'all' ? groups : groups.filter(g => g.organization_id === filters.organizationId);
  const isFiltered = filters.organizationId !== 'all' || filters.groupId !== 'all';

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {isFiltered && (
        <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 text-[10px] gap-1">
          <Filter className="w-3 h-3" />Filtrado
        </Badge>
      )}
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-purple-400" />
        <Select value={filters.organizationId} onValueChange={handleOrganizationChange}>
          <SelectTrigger className="w-[180px] h-8 text-xs bg-slate-800/50 border-slate-700"><SelectValue placeholder="Organización" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las organizaciones</SelectItem>
            {organizations.map(org => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-blue-400" />
        <Select value={filters.groupId} onValueChange={handleGroupChange}>
          <SelectTrigger className="w-[160px] h-8 text-xs bg-slate-800/50 border-slate-700"><SelectValue placeholder="Grupo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los grupos</SelectItem>
            {filteredGroups.map(group => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isFiltered && (
        <button onClick={() => onFiltersChange({ organizationId: 'all', groupId: 'all' })} className="text-xs text-slate-400 hover:text-white underline">Limpiar</button>
      )}
    </div>
  );
};

export default DashboardFilters;
ENDFILE

#############################################################
# index.js for noc folder
#############################################################
echo "📝 Creando index.js para noc..."
cat > "$COMPONENTS_DIR/noc/index.js" << 'ENDFILE'
export { default as NOCHeader } from './NOCHeader';
export { default as DraggableGrid, DEFAULT_LAYOUTS, WIDGET_CONFIG } from './DraggableGrid';
export { default as DashboardFilters } from './DashboardFilters';
ENDFILE

#############################################################
# Widgets
#############################################################
echo "📝 Creando widgets..."

# StatsWidget
cat > "$COMPONENTS_DIR/noc/widgets/StatsWidget.jsx" << 'ENDFILE'
import { Server, Wifi, WifiOff, TrendingUp, AlertTriangle, Building2, Gauge, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const StatsWidget = ({ stats, groups, organizations, craDevices }) => {
  return (
    <div className="grid grid-cols-8 gap-2 h-full p-1">
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-2 flex items-center justify-between">
        <div><p className="text-[9px] text-slate-400 uppercase">TOTAL</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
        <Server className="w-7 h-7 text-cyan-400 opacity-40" />
      </div>
      <div className="bg-slate-900/80 border border-emerald-500/30 rounded-lg p-2 flex items-center justify-between">
        <div><p className="text-[9px] text-emerald-400 uppercase">ONLINE</p><p className="text-2xl font-bold text-emerald-400">{stats.online}</p></div>
        <Wifi className="w-7 h-7 text-emerald-400 opacity-40" />
      </div>
      <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", stats.offline > 0 ? "border-2 border-red-500 animate-pulse" : "border border-slate-700/50")}>
        <div><p className="text-[9px] text-red-400 uppercase">OFFLINE</p><p className="text-2xl font-bold text-red-400">{stats.offline}</p></div>
        <WifiOff className="w-7 h-7 text-red-400 opacity-40" />
      </div>
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-2 flex items-center justify-between">
        <div><p className="text-[9px] text-blue-400 uppercase">UPTIME</p><p className="text-2xl font-bold text-emerald-400">{stats.uptimePercent}%</p></div>
        <TrendingUp className="w-7 h-7 text-blue-400 opacity-40" />
      </div>
      <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", stats.criticalAlerts > 0 ? "border-2 border-amber-500" : "border border-slate-700/50")}>
        <div><p className="text-[9px] text-amber-400 uppercase">ALERTAS</p><p className="text-2xl font-bold text-amber-400">{stats.recentAlerts}</p></div>
        <AlertTriangle className="w-7 h-7 text-amber-400 opacity-40" />
      </div>
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-2 flex items-center justify-between">
        <div><p className="text-[9px] text-purple-400 uppercase">GRUPOS / CENTROS</p><p className="text-2xl font-bold text-purple-400">{groups.length} <span className="text-lg opacity-70">/ {organizations.length}</span></p></div>
        <Building2 className="w-7 h-7 text-purple-400 opacity-40" />
      </div>
      <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", stats.avgLatency && stats.avgLatency > 300 ? "border-2 border-orange-500" : "border border-slate-700/50")}>
        <div><p className="text-[9px] text-cyan-400 uppercase">LATENCIA</p><p className="text-2xl font-bold text-cyan-400">{stats.avgLatency ? `${stats.avgLatency}ms` : '--'}</p></div>
        <Gauge className="w-7 h-7 text-cyan-400 opacity-40" />
      </div>
      <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", craDevices?.some(d => d.status === 'offline') ? "border-2 border-red-500" : "border border-slate-700/50")}>
        <div><p className="text-[9px] text-red-400 uppercase">CRA</p><p className="text-2xl font-bold text-red-400">{craDevices?.length || 0}</p></div>
        <Shield className="w-7 h-7 text-red-400 opacity-40" />
      </div>
    </div>
  );
};

export default StatsWidget;
ENDFILE

# UptimeWidget
cat > "$COMPONENTS_DIR/noc/widgets/UptimeWidget.jsx" << 'ENDFILE'
import { Activity, Maximize2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

const UptimeWidget = ({ uptimeData, timeRange, setTimeRange, onMaximize, editMode = false }) => {
  return (
    <div className={cn("h-full bg-slate-900/80 border rounded-lg p-3 flex flex-col transition-all", editMode ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : "border-slate-700/50")}>
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
          <Activity className="w-4 h-4 text-cyan-400" /><span className="text-sm font-semibold text-white">Uptime</span>
        </div>
        <div className="flex gap-1 items-center">
          <Button variant={timeRange === '24h' ? 'default' : 'ghost'} size="sm" className="h-6 px-2 text-[10px]" onClick={() => setTimeRange?.('24h')}>24h</Button>
          <Button variant={timeRange === '7d' ? 'default' : 'ghost'} size="sm" className="h-6 px-2 text-[10px]" onClick={() => setTimeRange?.('7d')}>7d</Button>
          {onMaximize && <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-cyan-400" onClick={onMaximize}><Maximize2 className="w-3 h-3" /></Button>}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={uptimeData}>
            <defs><linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient></defs>
            <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} interval="preserveStartEnd" />
            <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={[80, 100]} tickFormatter={(v) => `${v}%`} />
            <Area type="monotone" dataKey="uptime" stroke="#06b6d4" strokeWidth={2} fill="url(#uptimeGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default UptimeWidget;
ENDFILE

# SystemMonitorWidget
cat > "$COMPONENTS_DIR/noc/widgets/SystemMonitorWidget.jsx" << 'ENDFILE'
import { Activity, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import SystemECG from '@/components/common/SystemECG';

const SystemMonitorWidget = ({ stats, devicesByIsland, getBubbleSize, editMode = false }) => {
  return (
    <div className={cn("h-full bg-slate-900/80 border rounded-lg p-2 flex flex-col transition-all", editMode ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : "border-slate-700/50")}>
      <div className="flex items-center justify-between mb-1 shrink-0">
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
          <Activity className="w-4 h-4 text-cyan-400" /><span className="text-sm font-semibold text-white">Monitor del Sistema</span>
        </div>
        <div className={cn("px-2 py-0.5 rounded-full text-xs font-bold", stats.uptimePercent >= 95 ? 'bg-emerald-500/20 text-emerald-400' : stats.uptimePercent >= 80 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400')}>{stats.uptimePercent}% Op</div>
      </div>
      <SystemECG healthPercent={stats.uptimePercent} hasAlerts={stats.offline > 0 || stats.criticalAlerts > 0} isAnalyzing={true} lastIncidentTime={stats.lastIncidentTime} className="shrink-0 rounded-lg border border-slate-700/50 bg-slate-950/50 overflow-hidden" />
      <div className="flex-1 relative mt-1 min-h-[80px]">
        <svg viewBox="0 0 400 160" className="w-full h-full">
          {devicesByIsland?.map(island => {
            const hasOffline = island.offline > 0;
            const size = Math.min(getBubbleSize?.(island.total) || 20, 30);
            const adjustedY = island.y * 0.32;
            return (
              <g key={island.id}>
                <circle cx={island.x} cy={adjustedY} r={size / 2} fill={hasOffline ? '#ef4444' : '#10b981'} opacity={0.7} />
                <text x={island.x} y={adjustedY + 3} textAnchor="middle" fill="white" fontSize={size > 20 ? 10 : 8} fontWeight="bold">{island.total}</text>
                <text x={island.x} y={adjustedY + size / 2 + 8} textAnchor="middle" fill="#94a3b8" fontSize={6}>{island.abbrev}</text>
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-0 left-1 flex gap-2">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[7px] text-slate-400">OK</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[7px] text-slate-400">OFF</span></div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitorWidget;
ENDFILE

# CRAWidget
cat > "$COMPONENTS_DIR/noc/widgets/CRAWidget.jsx" << 'ENDFILE'
import { Shield, Maximize2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const CRAWidget = ({ craDevices = [], onMaximize, onDeviceClick, editMode = false }) => {
  const hasOffline = craDevices.some(d => d.status === 'offline');
  const offlineCount = craDevices.filter(d => d.status === 'offline').length;

  return (
    <div className={cn("h-full bg-slate-900/80 rounded-lg p-3 flex flex-col transition-all", editMode ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : hasOffline ? "border-2 border-red-500 animate-pulse" : "border border-slate-700/50")}>
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
          <Shield className="w-4 h-4 text-red-400" /><span className="text-sm font-semibold text-white">CRA</span>
          <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]">{craDevices.length}</Badge>
          {hasOffline && <Badge className="bg-red-500/20 text-red-400 text-[10px] animate-pulse">{offlineCount} OFFLINE</Badge>}
        </div>
        {onMaximize && <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-red-400" onClick={onMaximize}><Maximize2 className="w-3 h-3" /></Button>}
      </div>
      <ScrollArea className="flex-1">
        <div className={cn("grid gap-1.5 pr-2", craDevices.length > 20 ? "grid-cols-4" : "grid-cols-3")}>
          {craDevices.map(device => (
            <div key={device.id} className={cn("p-1.5 rounded border text-center cursor-pointer transition-all hover:scale-105", device.status === 'offline' ? "bg-red-500/20 border-red-500/50 animate-pulse" : "bg-emerald-500/10 border-emerald-500/30")} onClick={() => onDeviceClick?.(device)}>
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Shield className={cn("w-3 h-3", device.status === 'offline' ? "text-red-400" : "text-emerald-400")} />
                <div className={cn("w-1.5 h-1.5 rounded-full", device.status === 'offline' ? "bg-red-500" : "bg-emerald-500")} />
              </div>
              <p className="text-[9px] text-white truncate">{device.name}</p>
              <p className="text-[8px] text-slate-500 truncate">{device.ip_address}</p>
              {device.response_time_ms && <p className={cn("text-[8px] mt-0.5", device.response_time_ms > 500 ? "text-orange-400" : "text-cyan-400")}>{device.response_time_ms}ms</p>}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CRAWidget;
ENDFILE

# OrganizationsWidget
cat > "$COMPONENTS_DIR/noc/widgets/OrganizationsWidget.jsx" << 'ENDFILE'
import { Building2, Maximize2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const OrganizationsWidget = ({ devicesByOrg = [], onMaximize, editMode = false }) => {
  return (
    <div className={cn("h-full bg-slate-900/80 border rounded-lg p-2 flex flex-col transition-all", editMode ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : "border-slate-700/50")}>
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
          <Building2 className="w-4 h-4 text-purple-400" /><span className="text-sm font-semibold text-white">Organizaciones</span>
        </div>
        {onMaximize && <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-purple-400" onClick={onMaximize}><Maximize2 className="w-3 h-3" /></Button>}
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 pr-2">
          {devicesByOrg.slice(0, 8).map(({ org, online, offline }) => (
            <div key={org.id} className={cn("p-1.5 rounded border flex items-center justify-between", offline > 0 ? "bg-red-500/5 border-red-500/20" : "bg-slate-800/50 border-slate-700/30")}>
              <span className="text-[11px] text-white truncate flex-1">{org.name}</span>
              <div className="flex items-center gap-1 ml-2">
                <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1 py-0">{online}</Badge>
                {offline > 0 && <Badge className="bg-red-500/20 text-red-400 text-[9px] px-1 py-0">{offline}</Badge>}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default OrganizationsWidget;
ENDFILE

# OfflineWidget
cat > "$COMPONENTS_DIR/noc/widgets/OfflineWidget.jsx" << 'ENDFILE'
import { WifiOff, CheckCircle, Maximize2, GripVertical, Camera, HardDrive, Network, Router, Server, Monitor, Printer, Wifi, Shield, Box, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const ICON_MAP = { camera: Camera, "hard-drive": HardDrive, network: Network, router: Router, server: Server, monitor: Monitor, printer: Printer, wifi: Wifi, shield: Shield, box: Box, layers: Layers };

const OfflineWidget = ({ offlineDevices = [], deviceTypes = [], stats, onMaximize, onDeviceClick, formatTimeSince, editMode = false }) => {
  const getDeviceIcon = (device) => {
    const deviceType = deviceTypes.find(t => t.id === device.device_type_id);
    const iconName = deviceType?.icon || 'server';
    return ICON_MAP[iconName] || Server;
  };

  return (
    <div className={cn("h-full bg-slate-900/80 rounded-lg p-2 flex flex-col transition-all", editMode ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : offlineDevices.length > 0 ? "border-2 border-red-500" : "border border-slate-700/50")}>
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
          <WifiOff className="w-4 h-4 text-red-400" /><span className="text-sm font-semibold text-white">Offline</span>
          <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]">{stats?.offline || 0}</Badge>
        </div>
        {onMaximize && <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-red-400" onClick={onMaximize}><Maximize2 className="w-3 h-3" /></Button>}
      </div>
      <ScrollArea className="flex-1">
        {offlineDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-4"><CheckCircle className="w-8 h-8 text-emerald-500 mb-1" /><p className="text-xs text-emerald-400">Todos online</p></div>
        ) : (
          <div className="space-y-1 pr-2">
            {offlineDevices.slice(0, 8).map(device => {
              const Icon = getDeviceIcon(device);
              return (
                <div key={device.id} className="p-1.5 rounded bg-red-500/5 border border-red-500/20 flex items-center justify-between cursor-pointer hover:bg-red-500/10" onClick={() => onDeviceClick?.(device)}>
                  <div className="flex items-center gap-2 flex-1 min-w-0"><Icon className="w-3 h-3 text-red-400 shrink-0" /><span className="text-[11px] text-white truncate">{device.name}</span></div>
                  <span className="text-[10px] text-red-400 ml-2">{formatTimeSince?.(device.last_status_change)}</span>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default OfflineWidget;
ENDFILE

# HistoryWidget
cat > "$COMPONENTS_DIR/noc/widgets/HistoryWidget.jsx" << 'ENDFILE'
import { History, AlertTriangle, Maximize2, GripVertical, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const HistoryWidget = ({ downtimeHistory = [], onMaximize, editMode = false }) => {
  return (
    <div className={cn("h-full bg-slate-900/80 border rounded-lg p-2 flex flex-col transition-all", editMode ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : "border-slate-700/50")}>
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
          <History className="w-4 h-4 text-orange-400" /><span className="text-sm font-semibold text-white">Historial</span>
          <Badge variant="outline" className="border-orange-500/30 text-orange-400 text-[10px]">{downtimeHistory.length}</Badge>
        </div>
        {onMaximize && <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-orange-400" onClick={onMaximize}><Maximize2 className="w-3 h-3" /></Button>}
      </div>
      <ScrollArea className="flex-1">
        {downtimeHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-4"><CheckCircle className="w-8 h-8 text-emerald-500/50 mb-1" /><p className="text-xs text-slate-400">Sin caídas (7d)</p></div>
        ) : (
          <div className="space-y-1 pr-2">
            {downtimeHistory.slice(0, 6).map((item, idx) => (
              <div key={idx} className={cn("p-1.5 rounded border flex items-center justify-between", item.count > 3 ? "bg-red-500/5 border-red-500/20" : "bg-slate-800/50 border-slate-700/30")}>
                <div className="flex items-center gap-2 flex-1 min-w-0"><AlertTriangle className={cn("w-3 h-3 shrink-0", item.count > 3 ? "text-red-400" : "text-amber-400")} /><span className="text-[11px] text-white truncate">{item.name}</span></div>
                <Badge className={cn("text-[9px] px-1 py-0", item.count > 3 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400")}>{item.count}x</Badge>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default HistoryWidget;
ENDFILE

# AlertsWidget
cat > "$COMPONENTS_DIR/noc/widgets/AlertsWidget.jsx" << 'ENDFILE'
import { Bell, XCircle, CheckCircle, Maximize2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const AlertsWidget = ({ recentAlerts = [], stats, formatTimeSince, onMaximize, editMode = false }) => {
  return (
    <div className={cn("h-full bg-slate-900/80 border rounded-lg p-2 flex flex-col transition-all", editMode ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : stats?.criticalAlerts > 0 ? "border-2 border-amber-500" : "border-slate-700/50")}>
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
          <Bell className="w-4 h-4 text-amber-400" /><span className="text-sm font-semibold text-white">Alertas</span>
          <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">{stats?.recentAlerts || 0}</Badge>
        </div>
        {onMaximize && <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-amber-400" onClick={onMaximize}><Maximize2 className="w-3 h-3" /></Button>}
      </div>
      <ScrollArea className="flex-1">
        {recentAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-4"><CheckCircle className="w-8 h-8 text-emerald-500/50 mb-1" /><p className="text-xs text-slate-400">Sin alertas (24h)</p></div>
        ) : (
          <div className="space-y-1 pr-2">
            {recentAlerts.slice(0, 8).map(alert => {
              const isDown = alert.alert_type === 'device_down' || alert.alert_type === 'nas_disconnected';
              return (
                <div key={alert.id} className={cn("p-1.5 rounded border flex items-center justify-between", isDown ? "bg-red-500/5 border-red-500/20" : "bg-emerald-500/5 border-emerald-500/20")}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">{isDown ? <XCircle className="w-3 h-3 text-red-400 shrink-0" /> : <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />}<span className="text-[11px] text-white truncate">{alert.device_name}</span></div>
                  <span className="text-[10px] text-slate-400 ml-2">{formatTimeSince?.(alert.timestamp)}</span>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default AlertsWidget;
ENDFILE

# Widgets index
cat > "$COMPONENTS_DIR/noc/widgets/index.js" << 'ENDFILE'
export { default as StatsWidget } from './StatsWidget';
export { default as UptimeWidget } from './UptimeWidget';
export { default as SystemMonitorWidget } from './SystemMonitorWidget';
export { default as CRAWidget } from './CRAWidget';
export { default as OrganizationsWidget } from './OrganizationsWidget';
export { default as OfflineWidget } from './OfflineWidget';
export { default as HistoryWidget } from './HistoryWidget';
export { default as AlertsWidget } from './AlertsWidget';
ENDFILE

#############################################################
# Instalar dependencia react-grid-layout
#############################################################
echo ""
echo "📦 Instalando dependencia react-grid-layout..."
cd "$FRONTEND_DIR"
npm install react-grid-layout --legacy-peer-deps 2>/dev/null || yarn add react-grid-layout 2>/dev/null || echo "⚠️ No se pudo instalar react-grid-layout automáticamente"

#############################################################
# Build
#############################################################
echo ""
echo "🔨 Construyendo aplicación..."
cd "$FRONTEND_DIR"
npm run build --legacy-peer-deps 2>/dev/null || yarn build 2>/dev/null || echo "⚠️ Build falló - ejecuta manualmente: npm run build --legacy-peer-deps"

echo ""
echo "============================================"
echo "✅ ¡Instalación completada!"
echo "============================================"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Si el build falló, ejecuta: cd $FRONTEND_DIR && npm run build --legacy-peer-deps"
echo "2. Copia los archivos del build a tu servidor web"
echo "3. Reinicia tu backend: pkill -f uvicorn && nohup uvicorn server:app --host 0.0.0.0 --port 8001 &"
echo "4. Refresca tu navegador"
echo ""
echo "📁 Backup guardado en: $BACKUP_DIR"
echo ""
