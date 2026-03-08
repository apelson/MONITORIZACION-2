/**
 * NOCCompetitivo - Real-time competitive leaderboard dashboard
 * Optimized for 55" displays - NO SCROLL, all content visible
 * Shows brand ranking + island statistics
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, Medal, TrendingUp, RefreshCw, X, Flame, Crown, Star,
  MapPin, Users, Clock, ChevronUp, ChevronDown, Map
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Island configuration with colors
const ISLANDS = [
  { id: 'tenerife', name: 'Tenerife', shortName: 'TF', color: '#8B5CF6' },
  { id: 'gran-canaria', name: 'Gran Canaria', shortName: 'GC', color: '#10B981' },
  { id: 'lanzarote', name: 'Lanzarote', shortName: 'LZ', color: '#3B82F6' },
  { id: 'fuerteventura', name: 'Fuerteventura', shortName: 'FV', color: '#F59E0B' },
  { id: 'la-palma', name: 'La Palma', shortName: 'LP', color: '#06B6D4' },
  { id: 'la-gomera', name: 'La Gomera', shortName: 'LG', color: '#EC4899' },
  { id: 'el-hierro', name: 'El Hierro', shortName: 'EH', color: '#F97316' }
];

// Animated number component
const AnimatedNumber = ({ value, duration = 800 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startRef = useRef(displayValue);
  
  useEffect(() => {
    startRef.current = displayValue;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startRef.current + (value - startRef.current) * eased);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return <span>{displayValue.toLocaleString('es-ES')}</span>;
};

// Podium component for top 3
const Podium = ({ ranking }) => {
  const positions = [
    { rank: 2, height: 'h-20', data: ranking[1] },
    { rank: 1, height: 'h-28', data: ranking[0] },
    { rank: 3, height: 'h-16', data: ranking[2] }
  ];
  
  const colors = {
    1: { bg: 'from-yellow-400 to-amber-500', text: 'text-yellow-900', border: 'ring-yellow-300' },
    2: { bg: 'from-slate-300 to-slate-400', text: 'text-slate-700', border: 'ring-slate-200' },
    3: { bg: 'from-amber-600 to-orange-700', text: 'text-amber-100', border: 'ring-amber-400' }
  };
  
  return (
    <div className="flex items-end justify-center gap-3">
      {positions.map(({ rank, height, data }) => {
        if (!data) return null;
        const style = colors[rank];
        
        return (
          <div key={rank} className="flex flex-col items-center">
            {/* Brand logo/avatar */}
            <div className={cn("relative mb-2", rank === 1 && "scale-110")}>
              {data.brand_logo ? (
                <img 
                  src={data.brand_logo} 
                  alt={data.brand_name}
                  className={cn(
                    "w-12 h-12 object-contain rounded-lg bg-white p-1 shadow-lg",
                    rank === 1 && "w-14 h-14 ring-2",
                    style.border
                  )}
                />
              ) : (
                <div 
                  className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-white shadow-lg", rank === 1 && "w-14 h-14")}
                  style={{ backgroundColor: data.brand_color }}
                >
                  {data.brand_name?.charAt(0)}
                </div>
              )}
              {rank === 1 && <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 text-yellow-400" />}
              {rank !== 1 && <Medal className="absolute -top-2 -right-2 w-5 h-5 text-slate-400" />}
            </div>
            
            {/* Podium block */}
            <div className={cn(
              "w-24 rounded-t-lg flex items-end justify-center pb-2 bg-gradient-to-t shadow-lg",
              height,
              style.bg
            )}>
              <span className={cn("text-2xl font-bold", style.text)}>{rank}º</span>
            </div>
            
            {/* Brand name and visits */}
            <p className="mt-2 text-sm font-semibold text-white text-center max-w-[100px] truncate">
              {data.brand_name}
            </p>
            <p className={cn("text-lg font-bold", rank === 1 ? "text-yellow-400" : "text-slate-300")}>
              <AnimatedNumber value={data.total_visits || 0} />
            </p>
          </div>
        );
      })}
    </div>
  );
};

// Compact ranking row
const RankingRow = ({ rank, brand, visits, maxVisits }) => {
  const percentage = maxVisits > 0 ? (visits / maxVisits) * 100 : 0;
  
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-6 text-center font-bold text-slate-500 text-sm">{rank}º</span>
      {brand.logo ? (
        <img src={brand.logo} alt={brand.name} className="w-7 h-7 object-contain rounded bg-white p-0.5" />
      ) : (
        <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: brand.color }}>
          {brand.name.charAt(0)}
        </div>
      )}
      <span className="flex-1 font-medium text-white text-sm truncate">{brand.name}</span>
      <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-16 text-right font-bold text-cyan-400 text-sm">
        <AnimatedNumber value={visits} />
      </span>
    </div>
  );
};

// Island stats card
const IslandCard = ({ island, data, maxVisits }) => {
  const percentage = maxVisits > 0 ? (data.total / maxVisits) * 100 : 0;
  
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 hover:border-slate-500 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: island.color }} />
        <span className="font-semibold text-white text-sm">{island.shortName}</span>
        <span className="text-xs text-slate-400 truncate">{island.name}</span>
      </div>
      <div className="text-2xl font-bold text-white mb-1">
        <AnimatedNumber value={data.total || 0} />
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: island.color }}
        />
      </div>
    </div>
  );
};

// Main NOC Competitivo component
const NOCCompetitivo = ({ authAxios, isFullscreen = false, onClose }) => {
  const [ranking, setRanking] = useState([]);
  const [islandStats, setIslandStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval] = useState(30);
  const intervalRef = useRef(null);
  
  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Refresh realtime and get ranking
      await authAxios.post('/brand-statistics/realtime/refresh');
      
      const [rankingRes, islandRes] = await Promise.all([
        authAxios.get('/brand-statistics/ranking', { params: { period: 'day' } }),
        authAxios.get('/brand-statistics/history/by-island', {
          params: { 
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0]
          }
        })
      ]);
      
      const sortedRanking = (rankingRes.data.ranking || [])
        .sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0));
      
      setRanking(sortedRanking);
      setIslandStats(islandRes.data.islands || {});
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  }, [authAxios]);
  
  useEffect(() => {
    fetchData();
    
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, refreshInterval * 1000);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, refreshInterval, fetchData]);
  
  // Calculate totals
  const totalVisits = ranking.reduce((sum, item) => sum + (item.total_visits || 0), 0);
  const maxVisits = ranking.length > 0 ? ranking[0].total_visits || 1 : 1;
  const maxIslandVisits = Math.max(...Object.values(islandStats).map(i => i.total || 0), 1);
  
  // Top 3 and rest
  const podiumRanking = ranking.slice(0, 3);
  const restRanking = ranking.slice(3);
  
  return (
    <div className={cn(
      "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
      isFullscreen ? "fixed inset-0 z-50" : "rounded-xl"
    )}>
      {/* Header - compact for 55" */}
      <div className="bg-slate-900/95 backdrop-blur border-b border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/30">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                NOC Competitivo
                <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
              </h1>
              <p className="text-slate-400 text-xs">
                Ranking en tiempo real de visitas por marca e isla
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-slate-800 border-slate-600 text-slate-300 px-3 py-1">
              <Users className="w-4 h-4 mr-2 text-cyan-400" />
              <span className="font-bold text-cyan-400">{totalVisits.toLocaleString('es-ES')}</span>
              <span className="ml-1 text-slate-500">hoy</span>
            </Badge>
            
            {lastUpdate && (
              <Badge variant="outline" className="bg-slate-800 border-slate-600 text-slate-300 px-3 py-1">
                <Clock className="w-4 h-4 mr-2 text-green-400" />
                {lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Badge>
            )}
            
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <RefreshCw className={cn("w-4 h-4 mr-1", autoRefresh && loading && "animate-spin")} />
              {autoRefresh ? `${refreshInterval}s` : 'Auto'}
            </Button>
            
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Main content - Grid layout for 55" NO SCROLL */}
      <div className="p-4 h-[calc(100vh-72px)] grid grid-cols-12 gap-4">
        {/* Left side - Podium and Brand Ranking */}
        <div className="col-span-7 flex flex-col gap-4">
          {/* Podium section */}
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
            <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Podium - Top 3
            </h2>
            <Podium ranking={podiumRanking} />
          </div>
          
          {/* Full ranking list */}
          <div className="flex-1 bg-slate-800/30 rounded-xl p-4 border border-slate-700 overflow-hidden">
            <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-500" />
              Ranking Completo
            </h2>
            <div className="space-y-1">
              {ranking.map((item, index) => (
                <RankingRow
                  key={item.brand_id}
                  rank={index + 1}
                  brand={{
                    name: item.brand_name,
                    logo: item.brand_logo,
                    color: item.brand_color
                  }}
                  visits={item.total_visits || 0}
                  maxVisits={maxVisits}
                />
              ))}
              
              {ranking.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Trophy className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Sin datos de ranking</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right side - Island Statistics */}
        <div className="col-span-5 bg-slate-800/30 rounded-xl p-4 border border-slate-700">
          <h2 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
            <Map className="w-4 h-4 text-purple-500" />
            Estadísticas por Isla
          </h2>
          
          {/* Island grid */}
          <div className="grid grid-cols-2 gap-3">
            {ISLANDS.map(island => {
              const data = islandStats[island.id] || { total: 0, brands: {} };
              return (
                <IslandCard 
                  key={island.id} 
                  island={island} 
                  data={data}
                  maxVisits={maxIslandVisits}
                />
              );
            })}
          </div>
          
          {/* Total summary */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-lg p-4">
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Total Islas Canarias</p>
                <p className="text-4xl font-bold text-white">
                  <AnimatedNumber value={totalVisits} />
                </p>
                <p className="text-sm text-slate-400 mt-1">visitas hoy</p>
              </div>
              
              {/* Top island indicator */}
              {Object.entries(islandStats).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-600">
                  {(() => {
                    const topIsland = Object.entries(islandStats)
                      .sort((a, b) => (b[1].total || 0) - (a[1].total || 0))[0];
                    if (!topIsland || topIsland[1].total === 0) return null;
                    
                    const islandInfo = ISLANDS.find(i => i.id === topIsland[0]);
                    return (
                      <div className="flex items-center justify-center gap-2">
                        <Crown className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-slate-300">Isla líder:</span>
                        <span className="font-bold text-white">{islandInfo?.name || topIsland[0]}</span>
                        <Badge style={{ backgroundColor: islandInfo?.color }} className="text-white text-xs">
                          {topIsland[1].total}
                        </Badge>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NOCCompetitivo;
