/**
 * Critical Alerts Widget - Shows offline devices from critical device types
 * With sound notifications when new critical devices go offline
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShieldAlert, WifiOff, GripVertical, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CriticalAlertsWidget = ({
  authAxios,
  onDeviceClick,
  onMaximize,
  editMode = false,
  soundEnabled: externalSoundEnabled = true
}) => {
  const { t } = useTranslation();
  const [criticalDevices, setCriticalDevices] = useState([]);
  const [criticalTypes, setCriticalTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(externalSoundEnabled);
  const [newAlertIds, setNewAlertIds] = useState(new Set());
  
  // Refs for tracking previous state and audio
  const previousDeviceIdsRef = useRef(new Set());
  const audioRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  // Initialize audio
  useEffect(() => {
    // Create audio element for alert sound
    audioRef.current = new Audio();
    // Use a base64 encoded beep sound (short alert tone)
    audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVF3t+Pr4bJwQC5jldvt67JgFwk/mtjsk4NJVJ/b8vDRfFg+TYC/4/XsxoFVNU1/wOX17MuEWDRNf8Dk9ezLhFg0TX/A5PXsy4RYNE1/wOT17MuEWDRNf8Dk9ezLhFg0TX/A5PXsy4RYNE1/wOT17MuEWDRNf8Dk9ezLhFg0TX/A5PXsy4RYNE1/wOT17MuEWDRNf8Dk9ezLhFg0TX/A5PXsy4RYNE1/wOT17MuEWDRNf8Dk9ezLhFg0TX/A5PXsy4RYNE1/wOT17MuEWDRNf8Dk9ezLhFg0TX/A5PXsy4RYNE1/wOT17MuEWDRNf8Dk9ezLhFg0TX/A5PXswIBYMk5+v+P07MmEWDRNfsDj9OvJhFg0TH6/4/TryYRYNEx+v+P068mEWDRMfr/j9OvJhFg0TH6/4/TryYRYNEx+v+P068mEWDRMfr/j9OvJhFg0TH6/4/TryYRYNEx+v+P068mEWDRMfr/j9OvJhFg0TH6/4/TryYRYNEx+v+P068mEWDNLfb7i8+rIg1cyS3y94fPqyINXMkt8veHz6siDVzJLfL3h8+rIg1cyS3y94fPqyINXMkt8veHz6siDVzJLfL3h8+rIg1cyS3y94fPqyINXMkt8veHz6siDVzJLfL3h8+rIg1cyS3y94fPqyINXMkt8veHz6siDVzJLfL3h8+rIg1cyS3y94fPqx4NWMUp7vODy6ceCV';
    audioRef.current.volume = 0.5;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Play alert sound
  const playAlertSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('Could not play alert sound:', err);
      });
    }
  }, [soundEnabled]);

  // Fetch critical offline devices
  useEffect(() => {
    const fetchCriticalDevices = async () => {
      if (!authAxios) return;
      
      try {
        setLoading(true);
        const response = await authAxios.get('/devices/critical-offline');
        const newDevices = response.data?.devices || [];
        const newTypes = response.data?.critical_types || [];
        
        // Check for new offline devices (not on first load)
        if (!isFirstLoadRef.current && newDevices.length > 0) {
          const currentIds = new Set(newDevices.map(d => d.id));
          const newOfflineDevices = newDevices.filter(d => !previousDeviceIdsRef.current.has(d.id));
          
          if (newOfflineDevices.length > 0) {
            // Play sound for new alerts
            playAlertSound();
            
            // Show toast notification
            newOfflineDevices.forEach(device => {
              toast.error(
                `🚨 ${device.name} OFFLINE`,
                {
                  description: `${device.ip_address} - ${device.device_type?.name || 'Crítico'}`,
                  duration: 10000,
                }
              );
            });
            
            // Mark new alerts for visual highlight
            setNewAlertIds(new Set(newOfflineDevices.map(d => d.id)));
            
            // Clear highlight after 5 seconds
            setTimeout(() => setNewAlertIds(new Set()), 5000);
          }
          
          previousDeviceIdsRef.current = currentIds;
        } else if (isFirstLoadRef.current) {
          // First load - just store the IDs
          previousDeviceIdsRef.current = new Set(newDevices.map(d => d.id));
          isFirstLoadRef.current = false;
        }
        
        setCriticalDevices(newDevices);
        setCriticalTypes(newTypes);
        setError(null);
      } catch (err) {
        console.error('Error fetching critical devices:', err);
        setError('Error cargando dispositivos críticos');
      } finally {
        setLoading(false);
      }
    };

    fetchCriticalDevices();
    const interval = setInterval(fetchCriticalDevices, 15000); // Check every 15s for faster alerts
    return () => clearInterval(interval);
  }, [authAxios, playAlertSound]);

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
      hasAlerts ? "border-red-500/50 ring-1 ring-red-500/30 animate-pulse" : "border-slate-700/50"
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
        <div className="flex items-center gap-1">
          {/* Sound toggle button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 w-6 p-0",
              soundEnabled ? "text-cyan-400 hover:text-cyan-300" : "text-slate-500 hover:text-slate-400"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setSoundEnabled(!soundEnabled);
              toast.info(soundEnabled ? 'Sonido desactivado' : 'Sonido activado');
            }}
            title={soundEnabled ? 'Desactivar sonido' : 'Activar sonido'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </Button>
          <Badge className={cn(
            "text-xs",
            hasAlerts ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
          )}>
            {criticalDevices.length}
          </Badge>
        </div>
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
              {t('noc.configureCriticalHint', 'Ve a Types y edita un tipo')}
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
                {t('noc.allCriticalOnline', 'Todos los críticos online')}
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
              {criticalDevices.map(device => {
                const isNew = newAlertIds.has(device.id);
                return (
                  <div
                    key={device.id}
                    onClick={() => onDeviceClick?.(device)}
                    className={cn(
                      "p-2.5 border rounded-lg cursor-pointer transition-all group",
                      isNew 
                        ? "bg-red-500/30 border-red-500 animate-pulse ring-2 ring-red-500/50" 
                        : "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={cn(
                          "w-2 h-2 rounded-full bg-red-500 shrink-0",
                          isNew ? "animate-ping" : "animate-pulse"
                        )} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-sm font-medium truncate",
                              isNew ? "text-red-300" : "text-white"
                            )}>
                              {device.name}
                            </span>
                            {isNew && (
                              <Badge className="text-[8px] px-1 py-0 bg-red-500 text-white animate-bounce">
                                NUEVO
                              </Badge>
                            )}
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
                );
              })}
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
