/**
 * Alerts Widget - Recent Alerts
 */
import { Bell, XCircle, CheckCircle, Maximize2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const AlertsWidget = ({ 
  recentAlerts = [],
  stats,
  formatTimeSince,
  onMaximize,
  editMode = false 
}) => {
  return (
    <div className={cn(
      "h-full bg-slate-900/80 border rounded-lg p-2 flex flex-col transition-all",
      editMode ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : 
      stats?.criticalAlerts > 0 ? "border-2 border-amber-500" : "border-slate-700/50"
    )}>
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
          <Bell className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Alertas</span>
          <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">{stats?.recentAlerts || 0}</Badge>
        </div>
        {onMaximize && (
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-amber-400" onClick={onMaximize}>
            <Maximize2 className="w-3 h-3" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        {recentAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-4">
            <CheckCircle className="w-8 h-8 text-emerald-500/50 mb-1" />
            <p className="text-xs text-slate-400">Sin alertas (24h)</p>
          </div>
        ) : (
          <div className="space-y-1 pr-2">
            {recentAlerts.slice(0, 8).map(alert => {
              const isDown = alert.alert_type === 'device_down' || alert.alert_type === 'nas_disconnected';
              return (
                <div 
                  key={alert.id} 
                  className={cn(
                    "p-1.5 rounded border flex items-center justify-between",
                    isDown ? "bg-red-500/5 border-red-500/20" : "bg-emerald-500/5 border-emerald-500/20"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isDown 
                      ? <XCircle className="w-3 h-3 text-red-400 shrink-0" /> 
                      : <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                    }
                    <span className="text-[11px] text-white truncate">{alert.device_name}</span>
                  </div>
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
