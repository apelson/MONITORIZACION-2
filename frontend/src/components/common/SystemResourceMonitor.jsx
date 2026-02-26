/**
 * SystemResourceMonitor - Muestra CPU, RAM, HDD, NET en el header del NOC
 * Diseño producción con iconos de colores y barras
 */
import { useState, useEffect, useRef } from 'react';
import { Cpu, MemoryStick, HardDrive, Wifi } from 'lucide-react';
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
    intervalRef.current = setInterval(fetchStats, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [authAxios]);

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
    <div className="flex items-center gap-4 px-3 py-1.5 bg-slate-800/30 rounded border border-slate-700/50">
      {/* CPU - Cyan */}
      <div className="flex items-center gap-2">
        <Cpu className="w-4 h-4 text-cyan-400" />
        <span className="text-[10px] text-slate-400 uppercase font-medium">CPU</span>
        <div className="w-16 h-2 bg-slate-700 rounded-sm overflow-hidden">
          <div 
            className="h-full bg-cyan-500 transition-all"
            style={{ width: `${cpuPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-cyan-400 font-mono w-8">{Math.round(cpuPercent)}%</span>
      </div>

      {/* RAM - Purple/Magenta */}
      <div className="flex items-center gap-2">
        <MemoryStick className="w-4 h-4 text-purple-400" />
        <span className="text-[10px] text-slate-400 uppercase font-medium">RAM</span>
        <div className="w-16 h-2 bg-slate-700 rounded-sm overflow-hidden">
          <div 
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${ramPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-purple-400 font-mono w-8">{Math.round(ramPercent)}%</span>
      </div>

      {/* HDD - Amber/Orange */}
      <div className="flex items-center gap-2">
        <HardDrive className="w-4 h-4 text-amber-400" />
        <span className="text-[10px] text-slate-400 uppercase font-medium">HDD</span>
        <div className="w-16 h-2 bg-slate-700 rounded-sm overflow-hidden">
          <div 
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${diskPercent}%` }}
          />
        </div>
        <span className="text-[10px] text-amber-400 font-mono w-8">{Math.round(diskPercent)}%</span>
      </div>

      {/* Network - Green */}
      <div className="flex items-center gap-2">
        <Wifi className="w-4 h-4 text-emerald-400" />
        <span className="text-[10px] text-slate-400 uppercase font-medium">NET</span>
        <div className="flex items-center gap-1">
          <span className="text-emerald-400 text-[10px] font-mono">↑{formatNetSpeed(netUp)}</span>
          <span className="text-cyan-400 text-[10px] font-mono">↓{formatNetSpeed(netDown)}</span>
        </div>
      </div>
    </div>
  );
};

export default SystemResourceMonitor;
