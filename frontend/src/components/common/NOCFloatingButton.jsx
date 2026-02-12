/**
 * NOCFloatingButton - Botón flotante para abrir el Centro de Operaciones de Red
 * Diseñado para acceso rápido al dashboard NOC 24/7
 */
import { useState } from 'react';
import { Monitor, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const NOCFloatingButton = ({ onClick, offlineCount = 0, className }) => {
  const [isHovered, setIsHovered] = useState(false);
  const hasIssues = offlineCount > 0;

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
