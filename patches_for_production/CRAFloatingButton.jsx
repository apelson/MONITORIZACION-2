/**
 * CRAFloatingButton - Floating button/panel for CRA status
 * Shows real-time CRA status with prominent visibility
 */
import { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, ChevronRight, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '../ui/badge';

const CRAFloatingButton = ({ authAxios, onClick, isActive }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await authAxios.get('/cra/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Error fetching CRA status:', error);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const hasAlert = status?.offline > 0;
  const hasWarning = status?.recent_alerts_24h > 0 && !hasAlert;

  if (loading) {
    return (
      <div className="fixed right-0 top-1/3 z-50">
        <div className="bg-gray-200 text-gray-500 p-2 sm:p-3 rounded-l-xl shadow-lg animate-pulse">
          <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`fixed right-0 top-1/3 z-50 transition-all duration-300 ${isExpanded ? 'translate-x-0' : 'translate-x-0'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div 
        className={`
          flex items-center cursor-pointer shadow-2xl rounded-l-xl overflow-hidden
          transition-all duration-300
          ${hasAlert 
            ? 'bg-gradient-to-r from-red-600 to-red-500 text-white animate-pulse' 
            : hasWarning 
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
              : 'bg-gradient-to-r from-green-600 to-green-500 text-white'
          }
          ${isActive ? 'ring-4 ring-white ring-opacity-50' : ''}
        `}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        {/* Icon section - always visible, smaller on mobile */}
        <div className={`p-2 sm:p-3 flex flex-col items-center justify-center ${isExpanded ? 'sm:border-r border-white/20' : ''}`}>
          {hasAlert ? (
            <ShieldAlert className="w-5 h-5 sm:w-8 sm:h-8" />
          ) : (
            <ShieldCheck className="w-5 h-5 sm:w-8 sm:h-8" />
          )}
          {hasAlert && (
            <span className="text-[10px] sm:text-xs font-bold mt-0.5 sm:mt-1 animate-bounce">
              {status.offline}
            </span>
          )}
        </div>

        {/* Expanded content - hidden on mobile */}
        <div className={`overflow-hidden transition-all duration-300 hidden sm:block ${isExpanded ? 'w-48 opacity-100' : 'w-0 opacity-0'}`}>
          <div className="p-3 whitespace-nowrap">
            <div className="font-bold text-sm mb-1">Panel CRA</div>
            
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  Online
                </span>
                <Badge variant="secondary" className="bg-white/20 text-white h-5">
                  {status?.online || 0}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </span>
                <Badge 
                  variant={hasAlert ? "destructive" : "secondary"} 
                  className={`h-5 ${hasAlert ? 'bg-white text-red-600' : 'bg-white/20 text-white'}`}
                >
                  {status?.offline || 0}
                </Badge>
              </div>
              
              {status?.recent_alerts_24h > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Alertas 24h
                  </span>
                  <Badge variant="secondary" className="bg-white/20 text-white h-5">
                    {status.recent_alerts_24h}
                  </Badge>
                </div>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-xs">
              <span>Ver panel</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Pulse animation ring for alerts */}
      {hasAlert && (
        <div className="absolute inset-0 rounded-l-xl">
          <div className="absolute inset-0 rounded-l-xl bg-red-500 animate-ping opacity-20" />
        </div>
      )}
    </div>
  );
};

export default CRAFloatingButton;
