/**
 * NOCHeader - Header del NOC Dashboard con controles
 */
import { useState } from 'react';
import { 
  Clock, Volume2, VolumeX, Lock, Unlock, Play, Pause, 
  ExternalLink, RefreshCw, X, Settings, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import DashboardFilters from './DashboardFilters';

const LOGO_URL = "/assets/logos/siempria-noc-logo.png";

const NOCHeader = ({
  currentTime,
  soundEnabled,
  setSoundEnabled,
  editMode,
  onToggleEditMode,
  onResetLayout,
  presentationMode,
  onTogglePresentation,
  onOpenNewWindow,
  onRefresh,
  refreshing,
  onClose,
  organizations,
  groups,
  filters,
  onFiltersChange,
  savingPrefs,
  t
}) => {
  return (
    <div className="h-14 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 flex items-center justify-between px-4 shrink-0">
      {/* Left - Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
          <img src={LOGO_URL} alt="Siempria" className="w-6 h-6 object-contain" onError={(e) => e.target.style.display = 'none'} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">
            {t('noc.title', 'NOC Dashboard')}
          </h1>
          <p className="text-[10px] text-slate-400">{t('noc.subtitle', 'Centro de Operaciones de Red 24/7')}</p>
        </div>
        
        {/* Logo Siempria */}
        <img src={LOGO_URL} alt="Siempria" className="h-8 ml-2 opacity-70" onError={(e) => e.target.style.display = 'none'} />
      </div>
      
      {/* Center - Filters */}
      <DashboardFilters
        organizations={organizations}
        groups={groups}
        filters={filters}
        onFiltersChange={onFiltersChange}
        className="hidden lg:flex"
      />

      {/* Right - Controls */}
      <div className="flex items-center gap-2">
        {/* Time */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-mono text-white">
            {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-[10px] text-slate-400">
            {currentTime.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
        
        {/* Status badge */}
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
          {t('noc.active', 'Activo')}
        </Badge>

        {/* Sound toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSoundEnabled(!soundEnabled)} 
                className={cn("h-8 w-8 p-0", soundEnabled ? "text-cyan-400" : "text-slate-500")}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{soundEnabled ? 'Silenciar' : 'Activar sonido'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Edit Layout toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onToggleEditMode}
                disabled={savingPrefs}
                className={cn("h-8 w-8 p-0", editMode ? "text-cyan-400 bg-cyan-500/20" : "text-slate-400 hover:text-cyan-400")}
              >
                {savingPrefs ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : editMode ? (
                  <Unlock className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{editMode ? 'Guardar y Bloquear' : 'Editar Layout'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Reset Layout - only in edit mode */}
        {editMode && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onResetLayout}
                  className="h-8 w-8 p-0 text-orange-400 hover:bg-orange-500/20"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restaurar Layout</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Presentation mode toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onTogglePresentation} 
                className={cn("h-8 w-8 p-0", presentationMode ? "text-amber-400 bg-amber-500/20" : "text-slate-400 hover:text-amber-400")}
              >
                {presentationMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{presentationMode ? 'Detener presentación' : 'Iniciar presentación'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Open in new window */}
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

        {/* Refresh */}
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

        {/* Close */}
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
