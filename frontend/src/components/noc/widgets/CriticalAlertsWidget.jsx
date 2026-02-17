/**
 * Critical Alerts Widget - Shows offline devices from critical device types
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShieldAlert, WifiOff, GripVertical, Activity, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const CriticalAlertsWidget = ({
  authAxios,
  onDeviceClick,
  onMaximize,
  editMode = false
}) => {
  const { t } = useTranslation();
  const [criticalDevices, setCriticalDevices] = useState([]);
  const [criticalTypes, setCriticalTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch critical offline devices
  useEffect(() => {
    const fetchCriticalDevices = async () => {
      if (!authAxios) return;
      
      try {
        setLoading(true);
        const response = await authAxios.get('/devices/critical-offline');
        setCriticalDevices(response.data?.devices || []);
        setCriticalTypes(response.data?.critical_types || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching critical devices:', err);
        setError('Error cargando dispositivos críticos');
      } finally {
        setLoading(false);
      }
    };

    fetchCriticalDevices();
    const interval = setInterval(fetchCriticalDevices, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [authAxios]);

  // Format time since last seen
  const formatTimeSince = (timestamp) => {
    if (!timestamp) return 'N/A';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const hasAlerts = criticalDevices.length > 0;
  const hasCriticalTypes = criticalTypes.length > 0;

  return (
    <div className={cn(
      "h-full bg-slate-900/80 border rounded-lg overflow-hidden flex flex-col transition-all",
      editMode ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : 
      hasAlerts ? "border-red-500/50 ring-1 ring-red-500/30" : "border-slate-700/50"
    )}>
      {/* Header */}
      <div className={cn(
        "px-3 py-2 shrink-0 flex items-center justify-between",
        hasAlerts ? "bg-red-500/10" : "bg-slate-800/50"
      )}>
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
          <ShieldAlert className={cn("w-4 h-4", hasAlerts ? "text-red-400 animate-pulse" : "text-emerald-400")} />
          <span className="text-sm font-semibold text-white">
            {t('noc.criticalAlerts', 'Alertas Críticas')}
          </span>
        </div>
        <Badge className={cn(
          "text-xs",
          hasAlerts ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
        )}>
          {criticalDevices.length}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-red-400">
            <AlertTriangle className="w-6 h-6 mb-2" />
            <span className="text-xs text-center">{error}</span>
          </div>
        ) : !hasCriticalTypes ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-slate-400">
            <ShieldAlert className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs text-center">
              {t('noc.noCriticalTypes', 'No hay tipos de dispositivos marcados como críticos')}
            </span>
            <span className="text-[10px] text-slate-500 mt-1">
              {t('noc.configureCriticalHint', 'Ve a Ajustes → Tipos de Dispositivos')}
            </span>
          </div>
        ) : !hasAlerts ? (
          // All good - Show stable ECG line
          <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="relative w-full h-16 mb-3">
              {/* Stable ECG line animation */}
              <svg viewBox="0 0 200 40" className="w-full h-full">
                <defs>
                  <linearGradient id="stableGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
                    <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,20 L50,20 L55,20 L60,10 L65,30 L70,20 L140,20 L145,20 L150,12 L155,28 L160,20 L200,20"
                  fill="none"
                  stroke="url(#stableGradient)"
                  strokeWidth="2"
                  className="animate-pulse"
                />
              </svg>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">
                {t('noc.allCriticalOnline', 'Todos los dispositivos críticos online')}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-2">
              {criticalTypes.length} {t('noc.typesMonitored', 'tipos monitoreados')}
            </span>
          </div>
        ) : (
          // Show critical offline devices
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1.5">
              {criticalDevices.map(device => (
                <div
                  key={device.id}
                  onClick={() => onDeviceClick?.(device)}
                  className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg cursor-pointer hover:bg-red-500/20 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">
                            {device.name}
                          </span>
                          {device.device_type && (
                            <Badge 
                              className="text-[9px] px-1.5 py-0 shrink-0"
                              style={{ 
                                backgroundColor: `${device.device_type.color}20`,
                                color: device.device_type.color 
                              }}
                            >
                              {device.device_type.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {device.ip_address}
                          </span>
                          {device.last_seen && (
                            <span className="text-[10px] text-red-400">
                              Offline: {formatTimeSince(device.last_seen)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <WifiOff className="w-4 h-4 text-red-400 shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer - Critical types summary */}
      {hasCriticalTypes && (
        <div className="px-2 py-1.5 bg-slate-800/50 border-t border-slate-700/30 shrink-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[9px] text-slate-500">Monitoreando:</span>
            {criticalTypes.slice(0, 3).map(type => (
              <Badge 
                key={type.id}
                className="text-[8px] px-1 py-0"
                style={{ 
                  backgroundColor: `${type.color}20`,
                  color: type.color 
                }}
              >
                {type.name}
              </Badge>
            ))}
            {criticalTypes.length > 3 && (
              <span className="text-[8px] text-slate-500">+{criticalTypes.length - 3}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CriticalAlertsWidget;
