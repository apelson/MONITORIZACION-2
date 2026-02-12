/**
 * NOC History Section Component
 * Device downtime history tracking
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { History, Maximize2, Minimize2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

const NOCHistorySection = ({ 
  downtimeHistory,
  maxDownCount = 20,
  expanded = false,
  onToggleExpand,
  showExpandButton = true
}) => {
  const { t } = useTranslation();

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Compact view for dashboard grid
  if (!expanded) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-white">
              {t('noc.history', 'Historial')}
            </span>
            <Badge variant="outline" className="text-xs border-orange-500 text-orange-400">
              7 {t('noc.days', 'días')}
            </Badge>
          </div>
          {showExpandButton && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onToggleExpand}>
              <Maximize2 className="w-3 h-3" />
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          {downtimeHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-slate-400">
              <CheckCircle className="w-8 h-8 mb-2 text-emerald-500/50" />
              <p className="text-xs">{t('noc.noDowntime', 'Sin caídas')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {downtimeHistory.slice(0, 8).map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-1.5 rounded bg-slate-800/50"
                >
                  <span className="text-xs text-white truncate flex-1 mr-2">{item.name}</span>
                  <Badge 
                    className={cn(
                      "text-xs shrink-0",
                      item.count > 3 ? "bg-red-500" : "bg-amber-500"
                    )}
                  >
                    {item.count}
                  </Badge>
                </div>
              ))}
              {downtimeHistory.length > 8 && (
                <p className="text-xs text-center text-slate-400 mt-1">
                  +{downtimeHistory.length - 8} más
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
          <History className="w-8 h-8 text-orange-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">
              {t('noc.downtimeHistory', 'Historial de Caídas')} (7 {t('noc.days', 'días')})
            </h2>
            <p className="text-slate-400">
              {downtimeHistory.length} {t('noc.devicesWithIncidents', 'dispositivos con incidencias')}
            </p>
          </div>
        </div>
        {showExpandButton && (
          <Button variant="ghost" size="sm" onClick={onToggleExpand}>
            <Minimize2 className="w-5 h-5" />
          </Button>
        )}
      </div>

      {downtimeHistory.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <CheckCircle className="w-32 h-32 text-emerald-500/50 mb-4" />
          <p className="text-xl text-slate-400">
            {t('noc.noDowntime', 'Sin caídas en los últimos 7 días')}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-3 p-2">
            {downtimeHistory.map((item, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      item.count > 3 ? "bg-red-500/20" : "bg-amber-500/20"
                    )}>
                      <AlertTriangle className={cn(
                        "w-5 h-5",
                        item.count > 3 ? "text-red-400" : "text-amber-400"
                      )} />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">{item.name}</p>
                      <p className="text-xs text-slate-400">
                        {t('noc.lastDown', 'Última caída')}: {formatDate(item.lastDown)}
                      </p>
                    </div>
                  </div>
                  <Badge className={cn(
                    "text-lg px-3 py-1",
                    item.count > 3 ? "bg-red-500" : "bg-amber-500"
                  )}>
                    {item.count} {t('noc.drops', 'caídas')}
                  </Badge>
                </div>
                <Progress 
                  value={(item.count / maxDownCount) * 100} 
                  className={cn(
                    "h-2",
                    item.count > 3 ? "bg-red-500/20" : "bg-amber-500/20"
                  )}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default NOCHistorySection;
