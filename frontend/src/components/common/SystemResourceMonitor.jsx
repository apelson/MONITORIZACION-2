/**
 * SystemResourceMonitor - Muestra CPU, RAM, HDD, NET en el header del NOC
 * Diseño compacto para integrarse junto al título - Estilo producción
 */
import { useState, useEffect, useRef } from 'react';
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

  const getBarColor = (percent) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-amber-500';
    return 'bg-cyan-500';
  };

  const formatNetSpeed = (kbs) => {
    if (kbs >= 1024) return (kbs / 1024).toFixed(2);
    return kbs.toFixed(2);
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center gap-4 px-3 py-1 bg-slate-800/30 rounded border border-slate-700/50">
        <div className="flex items-center gap-6">
          {['CPU', 'RAM', 'HDD', 'NET'].map((label) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase font-medium">{label}</span>
              <div className="w-16 h-1.5 bg-slate-700 rounded animate-pulse" />
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

  return (
    <div className="flex items-center gap-5 px-3 py-1.5 bg-slate-800/30 rounded border border-slate-700/50">
      {/* CPU */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400 uppercase font-medium w-7">CPU</span>
        <div className="w-20 h-2 bg-slate-700 rounded-sm overflow-hidden">
          <div 
            className={cn("h-full transition-all", getBarColor(cpuPercent))}
            style={{ width: `${cpuPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-white font-mono w-8">{Math.round(cpuPercent)}%</span>
      </div>

      {/* RAM */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400 uppercase font-medium w-7">RAM</span>
        <div className="w-20 h-2 bg-slate-700 rounded-sm overflow-hidden">
          <div 
            className={cn("h-full transition-all", getBarColor(ramPercent))}
            style={{ width: `${ramPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-white font-mono w-8">{Math.round(ramPercent)}%</span>
      </div>

      {/* HDD */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400 uppercase font-medium w-7">HDD</span>
        <div className="w-20 h-2 bg-slate-700 rounded-sm overflow-hidden">
          <div 
            className={cn("h-full transition-all", getBarColor(diskPercent))}
            style={{ width: `${diskPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-white font-mono w-8">{Math.round(diskPercent)}%</span>
      </div>

      {/* Network */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-400 uppercase font-medium w-7">NET</span>
        <div className="flex items-center gap-1">
          <span className="text-emerald-400 text-[10px] font-mono">↑{formatNetSpeed(netUp)}</span>
          <span className="text-cyan-400 text-[10px] font-mono">↓{formatNetSpeed(netDown)}</span>
        </div>
      </div>
    </div>
  );
};

export default SystemResourceMonitor;
