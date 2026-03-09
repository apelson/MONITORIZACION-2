/**
 * NOCCompetitivo - Premium Real-time Competitive Leaderboard Dashboard
 * Redesign with glassmorphism, fluid animations, 3D podium effects
 * Optimized for large displays (55"+) in client offices
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, Medal, TrendingUp, RefreshCw, X, Flame, Crown, Star,
  MapPin, Users, Clock, Map, Store, Sparkles, Zap, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Island configuration with colors
const ISLANDS = [
  { id: 'tenerife', name: 'Tenerife', shortName: 'TF', color: '#8B5CF6', gradient: 'from-violet-500 to-purple-600' },
  { id: 'gran-canaria', name: 'Gran Canaria', shortName: 'GC', color: '#10B981', gradient: 'from-emerald-500 to-green-600' },
  { id: 'lanzarote', name: 'Lanzarote', shortName: 'LZ', color: '#3B82F6', gradient: 'from-blue-500 to-indigo-600' },
  { id: 'fuerteventura', name: 'Fuerteventura', shortName: 'FV', color: '#F59E0B', gradient: 'from-amber-500 to-orange-600' },
  { id: 'la-palma', name: 'La Palma', shortName: 'LP', color: '#06B6D4', gradient: 'from-cyan-500 to-teal-600' },
  { id: 'la-gomera', name: 'La Gomera', shortName: 'LG', color: '#EC4899', gradient: 'from-pink-500 to-rose-600' },
  { id: 'el-hierro', name: 'El Hierro', shortName: 'EH', color: '#F97316', gradient: 'from-orange-500 to-red-600' }
];

// Animated counter with easing
const AnimatedNumber = ({ value, duration = 1200, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startRef = useRef(displayValue);
  
  useEffect(() => {
    startRef.current = displayValue;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // Quartic ease-out
      const current = Math.round(startRef.current + (value - startRef.current) * eased);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return <span className={className}>{displayValue.toLocaleString('es-ES')}</span>;
};

// Real-time clock component
const LiveClock = () => {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="flex flex-col items-center">
      <div className="text-5xl font-black tracking-tight text-white tabular-nums">
        {time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-sm text-white/60 uppercase tracking-widest mt-1">
        {time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
    </div>
  );
};

// Premium 3D Podium with glow effects
const PremiumPodium = ({ ranking }) => {
  const positions = [
    { rank: 2, data: ranking[1], height: 140, offset: 0 },
    { rank: 1, data: ranking[0], height: 180, offset: -20 },
    { rank: 3, data: ranking[2], height: 110, offset: 0 }
  ];
  
  const colors = {
    1: { 
      base: 'from-yellow-400 via-amber-400 to-yellow-500',
      glow: 'shadow-[0_0_60px_rgba(251,191,36,0.5)]',
      ring: 'ring-yellow-300/50',
      text: 'text-yellow-900',
      badge: 'bg-gradient-to-r from-yellow-400 to-amber-500'
    },
    2: { 
      base: 'from-slate-300 via-gray-300 to-slate-400',
      glow: 'shadow-[0_0_40px_rgba(148,163,184,0.4)]',
      ring: 'ring-slate-300/50',
      text: 'text-slate-700',
      badge: 'bg-gradient-to-r from-slate-300 to-gray-400'
    },
    3: { 
      base: 'from-amber-600 via-orange-600 to-amber-700',
      glow: 'shadow-[0_0_40px_rgba(217,119,6,0.4)]',
      ring: 'ring-amber-400/50',
      text: 'text-amber-100',
      badge: 'bg-gradient-to-r from-amber-600 to-orange-600'
    }
  };
  
  return (
    <div className="relative flex items-end justify-center gap-4 py-6">
      {/* Ambient glow behind podium */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-32 bg-gradient-to-t from-amber-500/20 via-yellow-500/10 to-transparent blur-3xl" />
      
      {positions.map(({ rank, data, height, offset }) => {
        if (!data) return <div key={rank} className="w-32" />;
        const style = colors[rank];
        
        return (
          <div 
            key={rank} 
            className={cn(
              "relative flex flex-col items-center transition-all duration-700",
              rank === 1 && "z-10 scale-105"
            )}
            style={{ transform: `translateY(${offset}px)` }}
          >
            {/* Winner crown with particles */}
            {rank === 1 && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                <Crown className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse" />
                <Sparkles className="absolute -top-2 -right-4 w-5 h-5 text-yellow-300 animate-bounce" />
                <Sparkles className="absolute -top-1 -left-3 w-4 h-4 text-yellow-300 animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            )}
            
            {/* Brand logo with glow */}
            <div className={cn(
              "relative mb-3 transition-transform duration-500 hover:scale-110",
              rank === 1 && style.glow
            )}>
              {data.brand_logo ? (
                <div className={cn(
                  "rounded-2xl bg-white p-2 ring-4 transition-all duration-300",
                  style.ring,
                  rank === 1 ? "w-20 h-20" : "w-16 h-16"
                )}>
                  <img 
                    src={data.brand_logo} 
                    alt={data.brand_name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div 
                  className={cn(
                    "rounded-2xl flex items-center justify-center text-2xl font-black text-white ring-4",
                    style.ring,
                    rank === 1 ? "w-20 h-20" : "w-16 h-16"
                  )}
                  style={{ backgroundColor: data.brand_color }}
                >
                  {data.brand_name?.charAt(0)}
                </div>
              )}
              
              {/* Rank medal */}
              {rank !== 1 && (
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black",
                  style.badge, style.text
                )}>
                  {rank}º
                </div>
              )}
            </div>
            
            {/* Podium block with 3D effect */}
            <div 
              className={cn(
                "relative w-28 rounded-t-2xl overflow-hidden transition-all duration-500",
                "bg-gradient-to-t", style.base, style.glow
              )}
              style={{ height }}
            >
              {/* 3D depth effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/20" />
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-black/10" />
              
              {/* Rank number */}
              <div className={cn(
                "absolute bottom-4 left-1/2 -translate-x-1/2 text-4xl font-black",
                style.text
              )}>
                {rank}º
              </div>
              
              {/* Shimmer effect for winner */}
              {rank === 1 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              )}
            </div>
            
            {/* Brand name and visits */}
            <div className="mt-4 text-center">
              <p className={cn(
                "font-bold text-white truncate max-w-[120px]",
                rank === 1 ? "text-lg" : "text-base"
              )}>
                {data.brand_name}
              </p>
              <p className={cn(
                "font-black tabular-nums",
                rank === 1 ? "text-3xl text-yellow-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" : "text-xl text-slate-300"
              )}>
                <AnimatedNumber value={data.total_visits || 0} />
              </p>
              <p className="text-xs text-white/50 uppercase tracking-wider">visitas</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Glassmorphism ranking row with hover effects
const GlassRankingRow = ({ rank, brand, visits, maxVisits, isWinner }) => {
  const percentage = maxVisits > 0 ? (visits / maxVisits) * 100 : 0;
  
  return (
    <div className={cn(
      "group relative flex items-center gap-4 p-3 rounded-xl transition-all duration-300",
      "bg-white/5 backdrop-blur-sm border border-white/10",
      "hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]",
      isWinner && "bg-yellow-500/10 border-yellow-500/30"
    )}>
      {/* Rank */}
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg",
        rank === 1 ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-yellow-900" :
        rank === 2 ? "bg-gradient-to-br from-slate-300 to-gray-400 text-slate-700" :
        rank === 3 ? "bg-gradient-to-br from-amber-600 to-orange-600 text-white" :
        "bg-white/10 text-white/70"
      )}>
        {rank}
      </div>
      
      {/* Logo */}
      {brand.logo ? (
        <img 
          src={brand.logo} 
          alt={brand.name} 
          className="w-10 h-10 object-contain rounded-lg bg-white p-1 ring-1 ring-white/20" 
        />
      ) : (
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white ring-1 ring-white/20" 
          style={{ backgroundColor: brand.color }}
        >
          {brand.name.charAt(0)}
        </div>
      )}
      
      {/* Name and progress */}
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-white text-sm truncate block group-hover:text-yellow-300 transition-colors">
          {brand.name}
        </span>
        <div className="mt-1.5 h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-700",
              rank === 1 ? "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500" :
              "bg-gradient-to-r from-cyan-400 to-blue-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      
      {/* Visits count */}
      <div className="text-right">
        <span className={cn(
          "text-lg font-black tabular-nums",
          rank === 1 ? "text-yellow-400" : "text-cyan-400"
        )}>
          <AnimatedNumber value={visits} />
        </span>
      </div>
      
      {/* Winner indicator */}
      {isWinner && (
        <Zap className="w-5 h-5 text-yellow-400 absolute -right-2 -top-2 animate-pulse" />
      )}
    </div>
  );
};

// Premium island card with glassmorphism
const PremiumIslandCard = ({ island, data, maxVisits, isLeader }) => {
  const percentage = maxVisits > 0 ? (data.total / maxVisits) * 100 : 0;
  const hasVisits = data.total > 0;
  
  return (
    <div className={cn(
      "relative group p-4 rounded-2xl transition-all duration-500",
      "bg-white/5 backdrop-blur-md border border-white/10",
      "hover:bg-white/10 hover:border-white/20 hover:scale-[1.03]",
      isLeader && "ring-2 ring-yellow-400/50 bg-yellow-500/10",
      !hasVisits && "opacity-50"
    )}>
      {/* Leader crown */}
      {isLeader && (
        <Crown className="absolute -top-3 -right-3 w-7 h-7 text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
      )}
      
      {/* Island icon */}
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white mb-3 transition-transform group-hover:scale-110",
        `bg-gradient-to-br ${island.gradient}`
      )}>
        {island.shortName}
      </div>
      
      {/* Island info */}
      <h3 className="font-bold text-white text-sm mb-1">{island.name}</h3>
      
      {/* Visits */}
      <div className={cn(
        "text-3xl font-black tabular-nums mb-2",
        isLeader ? "text-yellow-400" : "text-white"
      )}>
        <AnimatedNumber value={data.total || 0} />
      </div>
      
      {/* Progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-700",
            `bg-gradient-to-r ${island.gradient}`
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Main NOC Competitivo component
const NOCCompetitivo = ({ authAxios, isFullscreen = false, onClose }) => {
  const [ranking, setRanking] = useState([]);
  const [centerRanking, setCenterRanking] = useState([]);
  const [islandStats, setIslandStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval] = useState(30);
  const [activeTab, setActiveTab] = useState('brands');
  const intervalRef = useRef(null);
  
  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await authAxios.post('/brand-statistics/realtime/refresh');
      
      const [rankingRes, centerRankingRes, islandRes] = await Promise.all([
        authAxios.get('/brand-statistics/ranking', { params: { period: 'day' } }),
        authAxios.get('/brand-statistics/ranking-by-center', { params: { period: 'day' } }),
        authAxios.get('/brand-statistics/history/by-island', {
          params: { 
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0]
          }
        })
      ]);
      
      const sortedRanking = (rankingRes.data.ranking || [])
        .sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0));
      
      const sortedCenterRanking = (centerRankingRes.data.ranking || [])
        .filter(c => c.total_visits > 0)
        .sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0));
      
      setRanking(sortedRanking);
      setCenterRanking(sortedCenterRanking);
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
  
  // Find leader island
  const leaderIsland = Object.entries(islandStats)
    .sort((a, b) => (b[1].total || 0) - (a[1].total || 0))[0];
  
  return (
    <div className={cn(
      "relative overflow-hidden",
      isFullscreen ? "fixed inset-0 z-50" : "rounded-2xl"
    )}>
      {/* Animated background */}
      <div className="absolute inset-0 bg-[#0a0a1a]">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/10 rounded-full blur-[200px]" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Premium Header */}
        <header className="px-8 py-4 bg-black/30 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between">
            {/* Left: Logo and title */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-2xl blur-lg opacity-50" />
                <div className="relative p-3 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 rounded-2xl shadow-2xl">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-3">
                  NOC Competitivo
                  <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
                </h1>
                <p className="text-white/50 text-sm">
                  Ranking en tiempo real de visitas
                </p>
              </div>
            </div>
            
            {/* Center: Live clock */}
            <LiveClock />
            
            {/* Right: Stats and controls */}
            <div className="flex items-center gap-4">
              {/* Total visits badge */}
              <div className="px-6 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider">Total Hoy</p>
                    <p className="text-2xl font-black text-cyan-400 tabular-nums">
                      <AnimatedNumber value={totalVisits} />
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Auto-refresh toggle */}
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={cn(
                  "rounded-xl h-10 px-4",
                  autoRefresh ? "bg-green-600 hover:bg-green-700" : "bg-white/5 border-white/20 hover:bg-white/10"
                )}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", autoRefresh && loading && "animate-spin")} />
                {autoRefresh ? `${refreshInterval}s` : 'Auto'}
              </Button>
              
              {/* Manual refresh */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchData} 
                disabled={loading}
                className="rounded-xl h-10 w-10 p-0 bg-white/5 border-white/20 hover:bg-white/10"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </Button>
              
              {/* Close button */}
              {onClose && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose} 
                  className="rounded-xl h-10 w-10 p-0 text-white/50 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </header>
        
        {/* Main content grid */}
        <main className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden">
          {/* Left: Podium and Ranking (7 cols) */}
          <div className="col-span-7 flex flex-col gap-6">
            {/* Premium Podium */}
            <section className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-yellow-400" />
                <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider">Podio de Honor</h2>
              </div>
              <PremiumPodium ranking={ranking.slice(0, 3)} />
            </section>
            
            {/* Ranking list with tabs */}
            <section className="flex-1 bg-white/5 backdrop-blur-md rounded-3xl p-5 border border-white/10 overflow-hidden flex flex-col">
              {/* Tabs */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setActiveTab('brands')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300",
                    activeTab === 'brands' 
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30" 
                      : "bg-white/10 text-white/60 hover:text-white hover:bg-white/20"
                  )}
                >
                  <TrendingUp className="w-4 h-4" />
                  Marcas
                </button>
                <button
                  onClick={() => setActiveTab('centers')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300",
                    activeTab === 'centers' 
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30" 
                      : "bg-white/10 text-white/60 hover:text-white hover:bg-white/20"
                  )}
                >
                  <Store className="w-4 h-4" />
                  Centros
                  {centerRanking.length > 0 && (
                    <Badge className="ml-1 bg-white/20 text-white text-xs">
                      {centerRanking.length}
                    </Badge>
                  )}
                </button>
              </div>
              
              {/* Ranking content */}
              <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                {activeTab === 'brands' && ranking.map((item, index) => (
                  <GlassRankingRow
                    key={item.brand_id}
                    rank={index + 1}
                    brand={{
                      name: item.brand_name,
                      logo: item.brand_logo,
                      color: item.brand_color
                    }}
                    visits={item.total_visits || 0}
                    maxVisits={maxVisits}
                    isWinner={index === 0}
                  />
                ))}
                
                {activeTab === 'centers' && centerRanking.map((center, index) => (
                  <GlassRankingRow
                    key={center.center_id}
                    rank={index + 1}
                    brand={{
                      name: `${center.brand_name} - ${center.island_name}`,
                      logo: center.brand_logo,
                      color: center.brand_color
                    }}
                    visits={center.total_visits || 0}
                    maxVisits={centerRanking[0]?.total_visits || 1}
                    isWinner={index === 0}
                  />
                ))}
                
                {ranking.length === 0 && activeTab === 'brands' && (
                  <div className="flex flex-col items-center justify-center h-full text-white/30">
                    <Trophy className="w-16 h-16 mb-4" />
                    <p className="text-lg">Sin datos de ranking</p>
                  </div>
                )}
              </div>
            </section>
          </div>
          
          {/* Right: Island Statistics (5 cols) */}
          <div className="col-span-5 flex flex-col gap-6">
            {/* Island header */}
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider">Islas Canarias</h2>
            </div>
            
            {/* Island grid */}
            <div className="grid grid-cols-2 gap-4 flex-1 content-start">
              {ISLANDS.map(island => {
                const data = islandStats[island.id] || { total: 0, brands: {} };
                const isLeader = leaderIsland && leaderIsland[0] === island.id && data.total > 0;
                return (
                  <PremiumIslandCard 
                    key={island.id} 
                    island={island} 
                    data={data}
                    maxVisits={maxIslandVisits}
                    isLeader={isLeader}
                  />
                );
              })}
            </div>
            
            {/* Total summary card */}
            <div className="bg-gradient-to-br from-purple-900/40 via-indigo-900/40 to-violet-900/40 backdrop-blur-md rounded-3xl p-6 border border-purple-500/20">
              <div className="text-center">
                <p className="text-xs text-white/50 uppercase tracking-widest mb-2">
                  Total Archipiélago
                </p>
                <p className="text-6xl font-black text-white mb-1 drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                  <AnimatedNumber value={totalVisits} />
                </p>
                <p className="text-sm text-white/50">visitas hoy</p>
              </div>
              
              {/* Leader island highlight */}
              {leaderIsland && leaderIsland[1].total > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-3">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  <span className="text-white/70">Isla líder:</span>
                  <span className="font-bold text-white">
                    {ISLANDS.find(i => i.id === leaderIsland[0])?.name}
                  </span>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    {leaderIsland[1].total}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </main>
        
        {/* Footer */}
        <footer className="px-8 py-3 bg-black/30 backdrop-blur-xl border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/30 text-xs">
              <Clock className="w-3 h-3" />
              {lastUpdate && (
                <span>Actualizado: {lastUpdate.toLocaleTimeString('es-ES')}</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-white/40 text-xs">
              <span>Desarrollado por</span>
              <img 
                src="/siempria-logo.png" 
                alt="Siempria" 
                className="h-5 opacity-70"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <span className="font-semibold">Siempria</span>
            </div>
          </div>
        </footer>
      </div>
      
      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default NOCCompetitivo;
