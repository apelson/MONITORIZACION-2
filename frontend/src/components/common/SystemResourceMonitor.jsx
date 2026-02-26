/**
 * SystemResourceMonitor - Muestra CPU, RAM, HDD, NET en el header del NOC
 * Diseño compacto para integrarse junto al título
 */
import { useState, useEffect, useRef } from 'react';
import { Cpu, HardDrive, Activity, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const SystemResourceMonitor = ({ authAxios }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchStats = async () => {
    if (!authAxios) return;
    try {
      const res = await authAxios.get('/system/stats');
      setStats(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching system stats:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(fetchStats, 5000); // Update every 5 seconds
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [authAxios]);

  const getColorClass = (percent) => {
    if (percent >= 90) return 'text-red-400';
    if (percent >= 70) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const getBarColor = (percent) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <div className="flex items-center gap-4">
          {['CPU', 'RAM', 'HDD', 'NET'].map((label) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase">{label}</span>
              <div className="w-12 h-1.5 bg-slate-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cpuPercent = stats.cpu?.percent || 0;
  const ramPercent = stats.ram?.percent || 0;
  const diskPercent = stats.disk?.percent || 0;
  const netUp = stats.network?.upload_kbs || 0;
  const netDown = stats.network?.download_kbs || 0;

  const formatNetSpeed = (kbs) => {
    if (kbs >= 1024) return `${(kbs / 1024).toFixed(1)}M`;
    return `${Math.round(kbs)}K`;
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/60 rounded-lg border border-slate-700/50">
      {/* CPU */}
      <div className="flex items-center gap-1.5">
        <Cpu className={cn("w-3.5 h-3.5", getColorClass(cpuPercent))} />
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase leading-none">CPU</span>
          <div className="flex items-center gap-1">
            <div className="w-10 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all", getBarColor(cpuPercent))}
                style={{ width: `${cpuPercent}%` }}
              />
            </div>
            <span className={cn("text-[10px] font-mono", getColorClass(cpuPercent))}>
              {Math.round(cpuPercent)}%
            </span>
          </div>
        </div>
      </div>

      <div className="w-px h-6 bg-slate-700" />

      {/* RAM */}
      <div className="flex items-center gap-1.5">
        <Activity className={cn("w-3.5 h-3.5", getColorClass(ramPercent))} />
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase leading-none">RAM</span>
          <div className="flex items-center gap-1">
            <div className="w-10 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all", getBarColor(ramPercent))}
                style={{ width: `${ramPercent}%` }}
              />
            </div>
            <span className={cn("text-[10px] font-mono", getColorClass(ramPercent))}>
              {Math.round(ramPercent)}%
            </span>
          </div>
        </div>
      </div>

      <div className="w-px h-6 bg-slate-700" />

      {/* HDD */}
      <div className="flex items-center gap-1.5">
        <HardDrive className={cn("w-3.5 h-3.5", getColorClass(diskPercent))} />
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase leading-none">HDD</span>
          <div className="flex items-center gap-1">
            <div className="w-10 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all", getBarColor(diskPercent))}
                style={{ width: `${diskPercent}%` }}
              />
            </div>
            <span className={cn("text-[10px] font-mono", getColorClass(diskPercent))}>
              {Math.round(diskPercent)}%
            </span>
          </div>
        </div>
      </div>

      <div className="w-px h-6 bg-slate-700" />

      {/* Network */}
      <div className="flex items-center gap-1.5">
        <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase leading-none">NET</span>
          <div className="flex items-center gap-1">
            <span className="text-emerald-400 text-[9px]">↑{formatNetSpeed(netUp)}</span>
            <span className="text-cyan-400 text-[9px]">↓{formatNetSpeed(netDown)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemResourceMonitor;
