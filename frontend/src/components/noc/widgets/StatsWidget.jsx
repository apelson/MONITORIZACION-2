/**
 * Stats Widget - Top bar with key metrics
 */
import { Server, Wifi, WifiOff, TrendingUp, AlertTriangle, Building2, Gauge, Shield, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';

const StatsWidget = ({ stats, groups, organizations, craDevices }) => {
  return (
    <div className="grid grid-cols-9 gap-2 h-full p-1">
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] text-slate-400 uppercase">TOTAL</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <Server className="w-7 h-7 text-cyan-400 opacity-40" />
      </div>
      <div className="bg-slate-900/80 border border-emerald-500/30 rounded-lg p-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] text-emerald-400 uppercase">ONLINE</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.online}</p>
        </div>
        <Wifi className="w-7 h-7 text-emerald-400 opacity-40" />
      </div>
      <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", stats.offline > 0 ? "border-2 border-red-500 animate-pulse" : "border border-slate-700/50")}>
        <div>
          <p className="text-[9px] text-red-400 uppercase">OFFLINE</p>
          <p className="text-2xl font-bold text-red-400">{stats.offline}</p>
        </div>
        <WifiOff className="w-7 h-7 text-red-400 opacity-40" />
      </div>
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] text-blue-400 uppercase">UPTIME</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.uptimePercent}%</p>
        </div>
        <TrendingUp className="w-7 h-7 text-blue-400 opacity-40" />
      </div>
      <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", stats.criticalAlerts > 0 ? "border-2 border-amber-500" : "border border-slate-700/50")}>
        <div>
          <p className="text-[9px] text-amber-400 uppercase">ALERTAS</p>
          <p className="text-2xl font-bold text-amber-400">{stats.recentAlerts}</p>
        </div>
        <AlertTriangle className="w-7 h-7 text-amber-400 opacity-40" />
      </div>
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-2 flex items-center justify-between">
        <div>
          <p className="text-[9px] text-purple-400 uppercase">GRUPOS</p>
          <p className="text-2xl font-bold text-purple-400">{groups.length} <span className="text-lg opacity-70">/ {organizations.length}</span></p>
        </div>
        <Building2 className="w-7 h-7 text-purple-400 opacity-40" />
      </div>
      <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", stats.avgLatency && stats.avgLatency > 300 ? "border-2 border-orange-500" : "border border-slate-700/50")}>
        <div>
          <p className="text-[9px] text-cyan-400 uppercase">LATENCIA</p>
          <p className="text-2xl font-bold text-cyan-400">{stats.avgLatency ? `${stats.avgLatency}ms` : '--'}</p>
        </div>
        <Gauge className="w-7 h-7 text-cyan-400 opacity-40" />
      </div>
      <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", craDevices?.some(d => d.status === 'offline') ? "border-2 border-red-500" : "border border-slate-700/50")}>
        <div>
          <p className="text-[9px] text-red-400 uppercase">CRA</p>
          <p className="text-2xl font-bold text-red-400">{craDevices?.length || 0}</p>
        </div>
        <Shield className="w-7 h-7 text-red-400 opacity-40" />
      </div>
      {/* Dahua Recorders */}
      <div className={cn("bg-slate-900/80 rounded-lg p-2 flex items-center justify-between", stats.dahuaOffline > 0 ? "border-2 border-red-500 animate-pulse" : "border border-emerald-500/30")}>
        <div>
          <p className="text-[9px] text-orange-400 uppercase">DVR/NVR</p>
          <p className="text-2xl font-bold text-orange-400">
            {stats.dahuaOnline || 0}
            <span className="text-lg opacity-70">/{stats.dahuaTotal || 0}</span>
          </p>
        </div>
        <HardDrive className="w-7 h-7 text-orange-400 opacity-40" />
      </div>
    </div>
  );
};

export default StatsWidget;
