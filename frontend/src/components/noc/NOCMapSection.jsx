/**
 * NOC Map Section Component
 * Canary Islands device map
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

const NOCMapSection = ({ 
  devicesByIsland,
  stats
}) => {
  const { t } = useTranslation();

  // Calculate bubble size based on device count
  const getBubbleSize = (count) => {
    if (count === 0) return 20;
    if (count < 10) return 30;
    if (count < 50) return 45;
    if (count < 100) return 55;
    return 65;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">
            {t('noc.map', 'Mapa Canarias')}
          </span>
        </div>
        {/* Global stats badge */}
        <div className={cn(
          "px-3 py-1 rounded-full text-sm font-bold", 
          stats.uptimePercent >= 95 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : stats.uptimePercent >= 80 
              ? 'bg-amber-500/20 text-amber-400' 
              : 'bg-red-500/20 text-red-400'
        )}>
          {stats.uptimePercent}% {t('noc.operational', 'Operativo')}
        </div>
      </div>
      <div className="flex-1 relative min-h-0">
        <svg viewBox="0 0 400 500" className="w-full h-full">
          {devicesByIsland.map(island => {
            const hasOffline = island.offline > 0;
            const size = getBubbleSize(island.total);
            return (
              <g key={island.id}>
                <circle 
                  cx={island.x} 
                  cy={island.y} 
                  r={size / 2} 
                  fill={hasOffline ? '#ef4444' : '#10b981'} 
                  opacity={0.8} 
                />
                <text 
                  x={island.x} 
                  y={island.y + 4} 
                  textAnchor="middle" 
                  fill="white" 
                  fontSize={size > 40 ? 16 : 12} 
                  fontWeight="bold"
                >
                  {island.total}
                </text>
                <text 
                  x={island.x} 
                  y={island.y + size / 2 + 14} 
                  textAnchor="middle" 
                  fill="#94a3b8" 
                  fontSize={10}
                >
                  {island.abbrev}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-2 left-2 flex gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-slate-400">OK</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-[10px] text-slate-400">Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NOCMapSection;
