/**
 * NOC Alerts Section Component
 * Recent alerts display
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Bell, Maximize2, Minimize2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const NOCAlertsSection = ({ 
  alerts,
  expanded = false,
  onToggleExpand,
  showExpandButton = true
}) => {
  const { t } = useTranslation();

  // Format time since
  const formatTimeSince = (timestamp) => {
    if (!timestamp) return '';
    try {
      const now = new Date();
      const then = new Date(timestamp);
      const diffMs = now - then;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'ahora';
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      return `${diffDays}d`;
    } catch {
      return '';
    }
  };

  // Check if alert is a down event
  const isDownAlert = (alert) => {
    return alert.alert_type === 'device_down' || alert.alert_type === 'nas_disconnected';
  };

  // Compact view for dashboard grid
  if (!expanded) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">
              {t('noc.alerts', 'Alertas')}
            </span>
            <Badge variant="outline" className="text-xs border-amber-500 text-amber-400">
              {alerts.length}
            </Badge>
          </div>
          {showExpandButton && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onToggleExpand}>
              <Maximize2 className="w-3 h-3" />
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-slate-400">
              <CheckCircle className="w-8 h-8 mb-2 text-emerald-500/50" />
              <p className="text-xs">{t('noc.noRecentAlerts', 'Sin alertas')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {alerts.slice(0, 6).map(alert => {
                const isDown = isDownAlert(alert);
                return (
                  <div 
                    key={alert.id} 
                    className={cn(
                      "flex items-center gap-2 p-1.5 rounded text-xs",
                      isDown ? "bg-red-500/10" : "bg-emerald-500/10"
                    )}
                  >
                    {isDown ? (
                      <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                    )}
                    <span className="text-white truncate flex-1">{alert.device_name}</span>
                    <span className="text-slate-400 shrink-0">{formatTimeSince(alert.timestamp)}</span>
                  </div>
                );
              })}
              {alerts.length > 6 && (
                <p className="text-xs text-center text-slate-400 mt-1">
                  +{alerts.length - 6} más
                </p>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="flex-1 flex flex-col gap-4 p-4 bg-slate-900/50 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8 text-amber-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">
              {t('noc.recentAlerts', 'Alertas Recientes')}
            </h2>
            <p className="text-slate-400">
              {alerts.length} {t('noc.alertsLast24h', 'alertas en las últimas 24 horas')}
            </p>
          </div>
        </div>
        {showExpandButton && (
          <Button variant="ghost" size="sm" onClick={onToggleExpand}>
            <Minimize2 className="w-5 h-5" />
          </Button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <CheckCircle className="w-32 h-32 text-emerald-500/50 mb-4" />
          <p className="text-xl text-slate-400">
            {t('noc.noRecentAlerts', 'Sin alertas recientes')}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2 p-2">
            {alerts.map(alert => {
              const isDown = isDownAlert(alert);
              return (
                <div 
                  key={alert.id} 
                  className={cn(
                    "p-4 rounded-lg border flex items-center justify-between",
                    isDown ? "bg-red-500/10 border-red-500/30" : "bg-emerald-500/10 border-emerald-500/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isDown ? (
                      <XCircle className="w-6 h-6 text-red-400" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                    )}
                    <div>
                      <p className="text-lg font-semibold text-white">{alert.device_name}</p>
                      <p className="text-sm text-slate-400">
                        {alert.message || (isDown 
                          ? t('noc.deviceDisconnected', 'Dispositivo desconectado') 
                          : t('noc.deviceConnected', 'Dispositivo conectado')
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400">{formatTimeSince(alert.timestamp)}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(alert.timestamp).toLocaleString('es-ES')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default NOCAlertsSection;
