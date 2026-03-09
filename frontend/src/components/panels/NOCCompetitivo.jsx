/**
 * NOCCompetitivo - Premium Real-time Competitive Leaderboard Dashboard
 * OPTIMIZADO PARA PANTALLA FIJA 55" - SIN SCROLL
 * Glassmorphism, fluid animations, 3D podium effects
 * Features: Island silhouettes + Confetti celebrations
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, TrendingUp, RefreshCw, X, Flame, Crown,
  Users, Clock, Map, Store, Sparkles, Award, PartyPopper
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

// Island configuration with PNG silhouettes
const ISLANDS = [
  { id: 'tenerife', name: 'Tenerife', shortName: 'TF', color: '#8B5CF6', png: '/islands/tenerife.png' },
  { id: 'gran-canaria', name: 'Gran Canaria', shortName: 'GC', color: '#10B981', png: '/islands/grancanaria.png' },
  { id: 'lanzarote', name: 'Lanzarote', shortName: 'LZ', color: '#3B82F6', png: '/islands/lanzarote.png' },
  { id: 'fuerteventura', name: 'Fuerteventura', shortName: 'FV', color: '#F59E0B', png: '/islands/fuerteventura.png' },
  { id: 'la-palma', name: 'La Palma', shortName: 'LP', color: '#06B6D4', png: '/islands/lapalma.png' },
  { id: 'la-gomera', name: 'La Gomera', shortName: 'LG', color: '#EC4899', png: null },
  { id: 'el-hierro', name: 'El Hierro', shortName: 'EH', color: '#F97316', png: null }
];

// Confetti celebration
const triggerConfetti = (intensity = 'medium') => {
  const config = intensity === 'heavy' 
    ? { particleCount: 200, spread: 120 }
    : { particleCount: 100, spread: 80 };
  
  confetti({ ...config, origin: { x: 0.1, y: 0.6 }, colors: ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#00CED1'] });
  confetti({ ...config, origin: { x: 0.9, y: 0.6 }, colors: ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#00CED1'] });
  
  if (intensity === 'heavy') {
    setTimeout(() => {
      confetti({ particleCount: 50, spread: 360, startVelocity: 30, origin: { x: 0.5, y: 0.4 }, colors: ['#FFD700', '#FFDF00'], shapes: ['star'] });
    }, 300);
  }
};

// Animated number
const AnimatedNumber = ({ value, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startRef = useRef(displayValue);
  
  useEffect(() => {
    startRef.current = displayValue;
    const startTime = Date.now();
    const animate = () => {
      const progress = Math.min((Date.now() - startTime) / 800, 1);
      setDisplayValue(Math.round(startRef.current + (value - startRef.current) * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  
  return <span className={className}>{displayValue.toLocaleString('es-ES')}</span>;
};

// Live clock - compact
const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="text-center">
      <div className="text-4xl font-black text-white tabular-nums">
        {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-xs text-white/50 uppercase tracking-wider">
        {time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
      </div>
    </div>
  );
};

// Compact Podium for 55" screen
const CompactPodium = ({ ranking }) => {
  const positions = [
    { rank: 2, data: ranking[1], h: 100 },
    { rank: 1, data: ranking[0], h: 130 },
    { rank: 3, data: ranking[2], h: 80 }
  ];
  
  const colors = {
    1: { bg: 'from-yellow-400 to-amber-500', text: 'text-yellow-900', glow: 'shadow-[0_0_40px_rgba(251,191,36,0.4)]' },
    2: { bg: 'from-slate-300 to-gray-400', text: 'text-slate-700', glow: '' },
    3: { bg: 'from-amber-600 to-orange-600', text: 'text-white', glow: '' }
  };
  
  return (
    <div className="flex items-end justify-center gap-3">
      {positions.map(({ rank, data, h }) => {
        if (!data) return <div key={rank} className="w-24" />;
        const style = colors[rank];
        return (
          <div key={rank} className={cn("flex flex-col items-center", rank === 1 && "scale-105 -mt-4")}>
            {rank === 1 && <Crown className="w-8 h-8 text-yellow-400 mb-1 animate-pulse" />}
            {data.brand_logo ? (
              <img src={data.brand_logo} alt={data.brand_name} className={cn("w-12 h-12 object-contain rounded-xl bg-white p-1 mb-2", rank === 1 && "w-14 h-14 ring-2 ring-yellow-300")} />
            ) : (
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black text-white mb-2", rank === 1 && "w-14 h-14")} style={{ backgroundColor: data.brand_color }}>
                {data.brand_name?.charAt(0)}
              </div>
            )}
            <div className={cn("w-24 rounded-t-xl bg-gradient-to-t flex items-end justify-center pb-2", style.bg, style.glow)} style={{ height: h }}>
              <span className={cn("text-2xl font-black", style.text)}>{rank}º</span>
            </div>
            <p className="mt-1 text-xs font-bold text-white truncate max-w-[90px]">{data.brand_name}</p>
            <p className={cn("text-lg font-black", rank === 1 ? "text-yellow-400" : "text-slate-300")}>
              <AnimatedNumber value={data.total_visits || 0} />
            </p>
          </div>
        );
      })}
    </div>
  );
};

// Compact ranking row - single line
const CompactRankingRow = ({ rank, brand, visits, maxVisits }) => {
  const pct = maxVisits > 0 ? (visits / maxVisits) * 100 : 0;
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
      "bg-white/5 hover:bg-white/10 border border-white/5",
      rank === 1 && "bg-yellow-500/10 border-yellow-500/20"
    )}>
      <span className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black",
        rank === 1 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-yellow-900" :
        rank === 2 ? "bg-gradient-to-br from-slate-300 to-gray-400 text-slate-700" :
        rank === 3 ? "bg-gradient-to-br from-amber-600 to-orange-600 text-white" :
        "bg-white/10 text-white/60"
      )}>{rank}</span>
      {brand.logo ? (
        <img src={brand.logo} alt={brand.name} className="w-8 h-8 object-contain rounded bg-white p-0.5" />
      ) : (
        <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: brand.color }}>
          {brand.name.charAt(0)}
        </div>
      )}
      <span className="flex-1 font-medium text-white text-sm truncate">{brand.name}</span>
      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", rank === 1 ? "bg-yellow-400" : "bg-cyan-400")} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("w-12 text-right font-black text-sm tabular-nums", rank === 1 ? "text-yellow-400" : "text-cyan-400")}>
        <AnimatedNumber value={visits} />
      </span>
    </div>
  );
};

// Compact island card with silhouette
const CompactIslandCard = ({ island, data, maxVisits, isLeader }) => {
  const pct = maxVisits > 0 ? (data.total / maxVisits) * 100 : 0;
  const hasVisits = data.total > 0;
  
  return (
    <div className={cn(
      "relative p-3 rounded-xl transition-all",
      "bg-white/5 border border-white/10 hover:bg-white/10",
      isLeader && "ring-1 ring-yellow-400/50 bg-yellow-500/10",
      !hasVisits && "opacity-40"
    )}>
      {isLeader && <Crown className="absolute -top-2 -right-2 w-5 h-5 text-yellow-400" />}
      <div className="flex items-center gap-2">
        {island.png ? (
          <img 
            src={island.png} 
            alt={island.name} 
            className="w-10 h-10 object-contain"
            style={{ filter: hasVisits ? `drop-shadow(0 0 4px ${island.color}80)` : 'brightness(0.3) grayscale(1)' }}
          />
        ) : (
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black text-white" style={{ backgroundColor: island.color }}>
            {island.shortName}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white/70 truncate">{island.name}</p>
          <p className={cn("text-xl font-black", isLeader ? "text-yellow-400" : "text-white")}>
            <AnimatedNumber value={data.total || 0} />
          </p>
        </div>
      </div>
      <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: island.color }} />
      </div>
    </div>
  );
};

// Main component
const NOCCompetitivo = ({ authAxios, isFullscreen = false, onClose }) => {
  const [ranking, setRanking] = useState([]);
  const [centerRanking, setCenterRanking] = useState([]);
  const [islandStats, setIslandStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState('brands');
  const intervalRef = useRef(null);
  const prevTotalRef = useRef(0);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await authAxios.post('/brand-statistics/realtime/refresh');
      const [rankingRes, centerRes, islandRes] = await Promise.all([
        authAxios.get('/brand-statistics/ranking', { params: { period: 'day' } }),
        authAxios.get('/brand-statistics/ranking-by-center', { params: { period: 'day' } }),
        authAxios.get('/brand-statistics/history/by-island', {
          params: { start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] }
        })
      ]);
      
      const sorted = (rankingRes.data.ranking || []).sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0));
      const centerSorted = (centerRes.data.ranking || []).filter(c => c.total_visits > 0).sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0));
      
      // Check for record
      if (sorted.length > 0 && prevTotalRef.current > 0 && sorted[0].total_visits > prevTotalRef.current * 1.1) {
        triggerConfetti('heavy');
      }
      if (sorted.length > 0) prevTotalRef.current = sorted[0].total_visits || 0;
      
      setRanking(sorted);
      setCenterRanking(centerSorted);
      setIslandStats(islandRes.data.islands || {});
      setLastUpdate(new Date());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [authAxios]);
  
  useEffect(() => {
    fetchData();
    if (autoRefresh) intervalRef.current = setInterval(fetchData, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchData]);
  
  const totalVisits = ranking.reduce((sum, i) => sum + (i.total_visits || 0), 0);
  const maxVisits = ranking[0]?.total_visits || 1;
  const maxIslandVisits = Math.max(...Object.values(islandStats).map(i => i.total || 0), 1);
  const leaderIsland = Object.entries(islandStats).sort((a, b) => (b[1].total || 0) - (a[1].total || 0))[0];
  
  // Show max 6 brands to fit without scroll
  const visibleRanking = ranking.slice(0, 6);
  const visibleCenters = centerRanking.slice(0, 6);
  
  return (
    <div className={cn("relative overflow-hidden", isFullscreen ? "fixed inset-0 z-50" : "rounded-2xl")}>
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a1a]">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-600/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>
      
      {/* Content - NO SCROLL */}
      <div className="relative z-10 h-screen flex flex-col">
        {/* Header - compact */}
        <header className="flex-shrink-0 px-6 py-3 bg-black/40 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white flex items-center gap-2">
                  NOC Competitivo <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                </h1>
                <p className="text-white/40 text-xs">Ranking en tiempo real</p>
              </div>
            </div>
            
            <LiveClock />
            
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <div>
                    <p className="text-[10px] text-white/40 uppercase">Total</p>
                    <p className="text-xl font-black text-cyan-400 tabular-nums"><AnimatedNumber value={totalVisits} /></p>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => triggerConfetti('heavy')} className="h-9 w-9 p-0 bg-yellow-500/10 border-yellow-500/30 text-yellow-400" title="Confeti">
                <PartyPopper className="w-4 h-4" />
              </Button>
              <Button variant={autoRefresh ? "default" : "outline"} size="sm" onClick={() => setAutoRefresh(!autoRefresh)} className={cn("h-9 px-3", autoRefresh ? "bg-green-600" : "bg-white/5 border-white/20")}>
                <RefreshCw className={cn("w-3 h-3 mr-1", autoRefresh && loading && "animate-spin")} />
                {autoRefresh ? '30s' : 'Off'}
              </Button>
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0 text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </header>
        
        {/* Main - fixed height, no scroll */}
        <main className="flex-1 p-4 grid grid-cols-12 gap-4 min-h-0">
          {/* Left: Podium + Ranking */}
          <div className="col-span-7 flex flex-col gap-4 min-h-0">
            {/* Podium */}
            <section className="flex-shrink-0 bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-yellow-400" />
                <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider">Podio de Honor</h2>
              </div>
              <CompactPodium ranking={ranking.slice(0, 3)} />
            </section>
            
            {/* Ranking - fixed, no scroll */}
            <section className="flex-1 bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-3">
                <button onClick={() => setActiveTab('brands')} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all", activeTab === 'brands' ? "bg-cyan-600 text-white" : "bg-white/10 text-white/50 hover:text-white")}>
                  <TrendingUp className="w-3 h-3" /> Marcas
                </button>
                <button onClick={() => setActiveTab('centers')} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all", activeTab === 'centers' ? "bg-emerald-600 text-white" : "bg-white/10 text-white/50 hover:text-white")}>
                  <Store className="w-3 h-3" /> Centros {centerRanking.length > 0 && <Badge className="ml-1 bg-white/20 text-[10px] h-4">{centerRanking.length}</Badge>}
                </button>
              </div>
              
              <div className="flex-1 space-y-1.5 overflow-hidden">
                {activeTab === 'brands' && visibleRanking.map((item, i) => (
                  <CompactRankingRow key={item.brand_id} rank={i + 1} brand={{ name: item.brand_name, logo: item.brand_logo, color: item.brand_color }} visits={item.total_visits || 0} maxVisits={maxVisits} />
                ))}
                {activeTab === 'centers' && visibleCenters.map((c, i) => (
                  <CompactRankingRow key={c.center_id} rank={i + 1} brand={{ name: `${c.brand_name} - ${c.island_name}`, logo: c.brand_logo, color: c.brand_color }} visits={c.total_visits || 0} maxVisits={centerRanking[0]?.total_visits || 1} />
                ))}
                {ranking.length === 0 && <div className="flex items-center justify-center h-full text-white/30"><Trophy className="w-10 h-10" /></div>}
              </div>
            </section>
          </div>
          
          {/* Right: Islands */}
          <div className="col-span-5 flex flex-col gap-4 min-h-0">
            <div className="flex items-center gap-2">
              <Map className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-bold text-white/60 uppercase tracking-wider">Islas Canarias</h2>
            </div>
            
            {/* Island grid - 2 cols, fixed */}
            <div className="flex-1 grid grid-cols-2 gap-2 content-start overflow-hidden">
              {ISLANDS.map(island => {
                const data = islandStats[island.id] || { total: 0 };
                const isLeader = leaderIsland && leaderIsland[0] === island.id && data.total > 0;
                return <CompactIslandCard key={island.id} island={island} data={data} maxVisits={maxIslandVisits} isLeader={isLeader} />;
              })}
            </div>
            
            {/* Total summary - compact */}
            <div className="flex-shrink-0 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur rounded-2xl p-4 border border-purple-500/20">
              <div className="text-center">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Total Archipiélago</p>
                <p className="text-4xl font-black text-white"><AnimatedNumber value={totalVisits} /></p>
                <p className="text-xs text-white/40">visitas hoy</p>
              </div>
              {leaderIsland && leaderIsland[1].total > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-center gap-2 text-sm">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span className="text-white/60">Líder:</span>
                  <span className="font-bold text-white">{ISLANDS.find(i => i.id === leaderIsland[0])?.name}</span>
                  <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">{leaderIsland[1].total}</Badge>
                </div>
              )}
            </div>
          </div>
        </main>
        
        {/* Footer - minimal */}
        <footer className="flex-shrink-0 px-6 py-2 bg-black/40 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/30 text-xs">
            <Clock className="w-3 h-3" />
            {lastUpdate && <span>Actualizado: {lastUpdate.toLocaleTimeString('es-ES')}</span>}
          </div>
          <div className="flex items-center gap-2 text-white/30 text-xs">
            <span>Desarrollado por</span>
            <span className="font-semibold text-white/50">Siempria</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default NOCCompetitivo;
