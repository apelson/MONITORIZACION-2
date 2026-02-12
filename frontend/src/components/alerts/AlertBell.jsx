/**
 * AlertBell - Campana de notificaciones con contador de alertas no leídas
 * Abre un panel lateral con las alertas recientes
 */
import { useState, useEffect, useMemo } from 'react';
import { Bell, X, WifiOff, Wifi, Database, AlertTriangle, HardDrive, VideoOff, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const AlertBell = ({ alerts = [], onAlertClick, onViewAll, onMarkAsRead }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [readAlerts, setReadAlerts] = useState(() => {
    const saved = localStorage.getItem('readAlerts');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Calculate unread alerts (only device_down and nas_disconnected are "important")
  const unreadCount = useMemo(() => {
    const importantTypes = ['device_down', 'nas_disconnected', 'storage_full', 'recording_stopped'];
    return alerts.filter(a => 
      importantTypes.includes(a.alert_type) && !readAlerts.has(a.id)
    ).length;
  }, [alerts, readAlerts]);

  // Get recent alerts (last 20)
  const recentAlerts = useMemo(() => {
    return [...alerts]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);
  }, [alerts]);

  // Save read alerts to localStorage
  useEffect(() => {
    localStorage.setItem('readAlerts', JSON.stringify([...readAlerts]));
  }, [readAlerts]);

  const handleMarkAllRead = () => {
    const newRead = new Set(readAlerts);
    recentAlerts.forEach(a => newRead.add(a.id));
    setReadAlerts(newRead);
    if (onMarkAsRead) onMarkAsRead();
  };

  const handleAlertClick = (alert) => {
    const newRead = new Set(readAlerts);
    newRead.add(alert.id);
    setReadAlerts(newRead);
    if (onAlertClick) onAlertClick(alert);
  };

  const getAlertIcon = (alertType) => {
    const icons = {
      'device_down': WifiOff,
      'device_up': Wifi,
      'nas_disconnected': Database,
      'nas_reconnected': Database,
      'storage_full': HardDrive,
      'recording_stopped': VideoOff
    };
    return icons[alertType] || AlertTriangle;
  };

  const getAlertStyle = (alertType) => {
    const styles = {
      'device_down': { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'text-red-500', text: 'text-red-400' },
      'device_up': { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: 'text-green-500', text: 'text-green-400' },
      'nas_disconnected': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: 'text-orange-500', text: 'text-orange-400' },
      'nas_reconnected': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-500', text: 'text-blue-400' },
      'storage_full': { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'text-red-500', text: 'text-red-400' },
      'recording_stopped': { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-500', text: 'text-amber-400' }
    };
    return styles[alertType] || { bg: 'bg-slate-500/10', border: 'border-slate-500/30', icon: 'text-slate-500', text: 'text-slate-400' };
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
        data-testid="alert-bell-btn"
      >
        <Bell className={cn("w-5 h-5", unreadCount > 0 && "text-cyan-400")} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-96 bg-slate-900 border-l border-slate-700/50 shadow-2xl z-[9999] transform transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        data-testid="alert-sidebar"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Bell className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Notificaciones</h3>
              <p className="text-xs text-slate-400">{unreadCount} sin leer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Marcar leídas
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Alert List */}
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-2">
            {recentAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Bell className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">No hay alertas recientes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentAlerts.map((alert) => {
                  const Icon = getAlertIcon(alert.alert_type);
                  const style = getAlertStyle(alert.alert_type);
                  const isUnread = !readAlerts.has(alert.id);

                  return (
                    <button
                      key={alert.id}
                      onClick={() => handleAlertClick(alert)}
                      className={cn(
                        "w-full p-3 rounded-lg border transition-all text-left group",
                        style.bg, style.border,
                        isUnread ? "ring-1 ring-cyan-500/30" : "opacity-70 hover:opacity-100",
                        "hover:scale-[1.01] active:scale-[0.99]"
                      )}
                      data-testid={`alert-item-${alert.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg", style.bg)}>
                          <Icon className={cn("w-4 h-4", style.icon)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn("font-medium text-sm truncate", isUnread ? "text-white" : "text-slate-300")}>
                              {alert.device_name}
                            </p>
                            <div className="flex items-center gap-1 text-slate-500 text-xs shrink-0">
                              <Clock className="w-3 h-3" />
                              {formatTime(alert.timestamp)}
                            </div>
                          </div>
                          <p className={cn("text-xs mt-0.5", style.text)}>
                            {alert.message || alert.alert_type}
                          </p>
                          {isUnread && (
                            <div className="w-2 h-2 bg-cyan-500 rounded-full absolute top-3 right-3" />
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50 bg-slate-800/50">
          <Button
            variant="outline"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={() => {
              setIsOpen(false);
              if (onViewAll) onViewAll();
            }}
            data-testid="view-all-alerts-btn"
          >
            Ver todas las alertas
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </>
  );
};

export default AlertBell;
