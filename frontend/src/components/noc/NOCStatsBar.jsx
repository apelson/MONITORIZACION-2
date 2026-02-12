/**
 * NOC Stats Bar Component
 * Compact statistics bar for the NOC Dashboard
 */
import { cn } from '@/lib/utils';
import { 
  Server, Wifi, WifiOff, TrendingUp, AlertTriangle, 
  Building2, Gauge, Shield 
} from 'lucide-react';

const NOCStatsBar = ({ 
  stats, 
  organizations, 
  groups, 
  craDevices,
  compact = false 
}) => {
  if (compact) {
    return (
      <div className="grid grid-cols-8 gap-2 shrink-0 mb-3">
        <StatCard 
          label="TOTAL" 
          value={stats.total} 
          icon={Server} 
          color="cyan"
          compact
        />
        <StatCard 
          label="ONLINE" 
          value={stats.online} 
          icon={Wifi} 
          color="emerald"
          highlight
          compact
        />
        <StatCard 
          label="OFFLINE" 
          value={stats.offline} 
          icon={WifiOff} 
          color="red"
          alert={stats.offline > 0}
          compact
        />
        <StatCard 
          label="UPTIME" 
          value={`${stats.uptimePercent}%`} 
          icon={TrendingUp} 
          color="blue"
          compact
        />
        <StatCard 
          label="ALERTAS" 
          value={stats.recentAlerts} 
          icon={AlertTriangle} 
          color="amber"
          alert={stats.criticalAlerts > 0}
          compact
        />
        <StatCard 
          label="GRUPOS/CENTROS" 
          value={groups.length}
          subvalue={organizations.length}
          icon={Building2} 
          color="purple"
          compact
        />
        <StatCard 
          label="LATENCIA" 
          value={stats.avgLatency ? `${stats.avgLatency}ms` : '--'} 
          icon={Gauge} 
          color="cyan"
          alert={stats.avgLatency && stats.avgLatency > 300}
          compact
        />
        <StatCard 
          label="CRA" 
          value={craDevices.length} 
          icon={Shield} 
          color="red"
          alert={craDevices.some(d => d.status === 'offline')}
          compact
        />
      </div>
    );
  }

  // Full stats bar (for main dashboard view)
  return (
    <div className="grid grid-cols-8 gap-2 shrink-0">
      <StatCard 
        label="TOTAL" 
        value={stats.total} 
        icon={Server} 
        color="cyan"
      />
      <StatCard 
        label="ONLINE" 
        value={stats.online} 
        icon={Wifi} 
        color="emerald"
        highlight
      />
      <StatCard 
        label="OFFLINE" 
        value={stats.offline} 
        icon={WifiOff} 
        color="red"
        alert={stats.offline > 0}
      />
      <StatCard 
        label="UPTIME" 
        value={`${stats.uptimePercent}%`} 
        icon={TrendingUp} 
        color="emerald"
      />
      <StatCard 
        label="ALERTAS" 
        value={stats.recentAlerts} 
        icon={AlertTriangle} 
        color="amber"
        alert={stats.criticalAlerts > 0}
      />
      <StatCard 
        label="GRUPOS / CENTROS" 
        value={groups.length}
        subvalue={organizations.length}
        icon={Building2} 
        color="purple"
      />
      <StatCard 
        label="LATENCIA" 
        value={stats.avgLatency ? `${stats.avgLatency}ms` : '--'} 
        icon={Gauge} 
        color="cyan"
        alert={stats.avgLatency && stats.avgLatency > 300}
      />
      <StatCard 
        label="CRA" 
        value={craDevices.length} 
        icon={Shield} 
        color="red"
        alert={craDevices.some(d => d.status === 'offline')}
      />
    </div>
  );
};

// Individual stat card
const StatCard = ({ 
  label, 
  value, 
  subvalue,
  icon: Icon, 
  color, 
  alert = false,
  highlight = false,
  compact = false
}) => {
  const colorClasses = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    blue: 'text-blue-400',
  };

  const borderClasses = {
    cyan: 'border-slate-700/50',
    emerald: 'border-emerald-500/30',
    red: alert ? 'border-2 border-red-500' : 'border-slate-700/50',
    amber: alert ? 'border-amber-500' : 'border-slate-700/50',
    purple: 'border-slate-700/50',
    blue: 'border-slate-700/50',
  };

  if (compact) {
    return (
      <div className={cn(
        "bg-slate-800/80 rounded-lg px-3 py-1.5 flex items-center justify-between",
        borderClasses[color],
        alert && "animate-pulse"
      )}>
        <div>
          <p className={cn("text-[7px] uppercase", colorClasses[color])}>{label}</p>
          <p className={cn("text-lg font-bold", colorClasses[color])}>
            {value}
            {subvalue !== undefined && (
              <span className="text-sm opacity-70"> / {subvalue}</span>
            )}
          </p>
        </div>
        <Icon className={cn("w-5 h-5 opacity-50", colorClasses[color])} />
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-slate-900/80 border rounded-lg p-2 flex items-center justify-between",
      borderClasses[color],
      highlight && `border-${color}-500/30`,
      alert && "animate-pulse"
    )}>
      <div>
        <p className={cn("text-[9px] uppercase", colorClasses[color])}>{label}</p>
        <p className={cn("text-2xl font-bold", colorClasses[color])}>
          {value}
          {subvalue !== undefined && (
            <span className="text-lg opacity-70"> / {subvalue}</span>
          )}
        </p>
      </div>
      <Icon className={cn("w-7 h-7 opacity-40", colorClasses[color])} />
    </div>
  );
};

export default NOCStatsBar;
export { StatCard };
