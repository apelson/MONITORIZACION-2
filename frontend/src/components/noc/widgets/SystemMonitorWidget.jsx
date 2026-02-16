/**
 * System Monitor Widget with ECG and Map
 */
import { Activity, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import SystemECG from '@/components/common/SystemECG';

const SystemMonitorWidget = ({ 
  stats, 
  devicesByIsland,
  getBubbleSize,
  recordTime,
  editMode = false 
}) => {
  return (
    <div className={cn(
      "h-full bg-slate-900/80 border rounded-lg p-2 flex flex-col transition-all",
      editMode ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : "border-slate-700/50"
    )}>
      <div className="flex items-center justify-between mb-1 shrink-0">
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Monitor del Sistema</span>
        </div>
        <div className={cn("px-2 py-0.5 rounded-full text-xs font-bold", 
          stats.uptimePercent >= 95 ? 'bg-emerald-500/20 text-emerald-400' : 
          stats.uptimePercent >= 80 ? 'bg-amber-500/20 text-amber-400' : 
          'bg-red-500/20 text-red-400'
        )}>
          {stats.uptimePercent}% Op
        </div>
      </div>
      
      {/* ECG Monitor with Record */}
      <SystemECG 
        healthPercent={stats.uptimePercent}
        hasAlerts={stats.offline > 0 || stats.criticalAlerts > 0}
        isAnalyzing={true}
        lastIncidentTime={stats.lastIncidentTime}
        recordTime={recordTime}
        className="shrink-0 rounded-lg border border-slate-700/50 bg-slate-950/50 overflow-hidden"
      />
        
      {/* Mini Map */}
      <div className="flex-1 relative mt-1 min-h-[80px]">
        <svg viewBox="0 0 400 160" className="w-full h-full">
          {devicesByIsland?.map(island => {
            const hasOffline = island.offline > 0;
            const size = Math.min(getBubbleSize?.(island.total) || 20, 30);
            const adjustedY = island.y * 0.32;
            return (
              <g key={island.id}>
                <circle cx={island.x} cy={adjustedY} r={size / 2} fill={hasOffline ? '#ef4444' : '#10b981'} opacity={0.7} />
                <text x={island.x} y={adjustedY + 3} textAnchor="middle" fill="white" fontSize={size > 20 ? 10 : 8} fontWeight="bold">{island.total}</text>
                <text x={island.x} y={adjustedY + size / 2 + 8} textAnchor="middle" fill="#94a3b8" fontSize={6}>{island.abbrev}</text>
              </g>
            );
          })}
        </svg>
        <div className="absolute bottom-0 left-1 flex gap-2">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[7px] text-slate-400">OK</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[7px] text-slate-400">OFF</span></div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitorWidget;
