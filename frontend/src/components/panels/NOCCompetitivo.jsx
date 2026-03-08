/**
 * NOCCompetitivo - Real-time competitive leaderboard dashboard
 * Full-screen dashboard showing live brand/center competition rankings
 * Accessible via floating button
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, Medal, TrendingUp, TrendingDown, Minus, RefreshCw, 
  Maximize2, Minimize2, X, Flame, Crown, Star, Zap,
  MapPin, Users, Clock, ChevronUp, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Podium positions with special styling
const PODIUM_STYLES = {
  1: { 
    bg: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600',
    border: 'border-yellow-300',
    icon: Crown,
    iconColor: 'text-yellow-100',
    shadow: 'shadow-yellow-500/50',
    label: '1º'
  },
  2: { 
    bg: 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500',
    border: 'border-slate-300',
    icon: Medal,
    iconColor: 'text-slate-100',
    shadow: 'shadow-slate-400/50',
    label: '2º'
  },
  3: { 
    bg: 'bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800',
    border: 'border-amber-500',
    icon: Medal,
    iconColor: 'text-amber-200',
    shadow: 'shadow-amber-600/50',
    label: '3º'
  }
};

// Animated counter component
const AnimatedNumber = ({ value, duration = 1000 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const startValue = displayValue;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.round(startValue + (value - startValue) * eased);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  return <span>{displayValue.toLocaleString('es-ES')}</span>;
};

// Single ranking card
const RankingCard = ({ rank, brand, visits, maxVisits, previousRank, animationDelay = 0 }) => {
  const isPodium = rank <= 3;
  const podiumStyle = PODIUM_STYLES[rank];
  const rankChange = previousRank ? previousRank - rank : 0;
  
  const percentage = maxVisits > 0 ? (visits / maxVisits) * 100 : 0;
  
  return (
    <div 
      className={cn(
        "relative flex items-center gap-4 p-4 rounded-xl transition-all duration-500 transform hover:scale-[1.02]",
        isPodium 
          ? `${podiumStyle.bg} text-white shadow-lg ${podiumStyle.shadow}` 
          : "bg-slate-800/50 border border-slate-700 hover:border-slate-600"
      )}
      style={{ 
        animationDelay: `${animationDelay}ms`,
        animation: 'slideInRight 0.5s ease-out forwards'
      }}
    >
      {/* Rank badge */}
      <div className={cn(
        "flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl",
        isPodium 
          ? "bg-white/20 backdrop-blur" 
          : "bg-slate-700 text-slate-300"
      )}>
        {isPodium && podiumStyle.icon && (
          <podiumStyle.icon className={cn("w-6 h-6", podiumStyle.iconColor)} />
        )}
        {!isPodium && <span className="text-lg">{rank}º</span>}
      </div>
      
      {/* Brand info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          {brand.logo ? (
            <img 
              src={brand.logo} 
              alt={brand.name} 
              className="w-8 h-8 object-contain rounded bg-white p-0.5"
              onError={(e) => e.target.style.display = 'none'}
            />
          ) : (
            <div 
              className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: brand.color }}
            >
              {brand.name.charAt(0)}
            </div>
          )}
          <h3 className={cn(
            "font-bold truncate",
            isPodium ? "text-white text-lg" : "text-slate-200"
          )}>
            {brand.name}
          </h3>
          
          {/* Rank change indicator */}
          {rankChange !== 0 && (
            <Badge 
              variant="outline" 
              className={cn(
                "ml-auto flex-shrink-0",
                rankChange > 0 
                  ? "bg-green-500/20 text-green-400 border-green-500/30" 
                  : "bg-red-500/20 text-red-400 border-red-500/30"
              )}
            >
              {rankChange > 0 ? (
                <><ChevronUp className="w-3 h-3" /> +{rankChange}</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> {rankChange}</>
              )}
            </Badge>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="relative mt-2">
          <div className={cn(
            "h-2 rounded-full overflow-hidden",
            isPodium ? "bg-white/20" : "bg-slate-700"
          )}>
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                isPodium ? "bg-white/60" : "bg-gradient-to-r from-cyan-500 to-blue-500"
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Visit count */}
      <div className={cn(
        "flex-shrink-0 text-right",
        isPodium ? "text-white" : "text-slate-300"
      )}>
        <div className="text-2xl font-bold">
          <AnimatedNumber value={visits} />
        </div>
        <div className={cn(
          "text-xs uppercase tracking-wide",
          isPodium ? "text-white/70" : "text-slate-500"
        )}>
          visitas
        </div>
      </div>
    </div>
  );
};

// Main NOC Competitivo component
const NOCCompetitivo = ({ authAxios, isFullscreen = false, onClose }) => {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [previousRanking, setPreviousRanking] = useState({});
  const intervalRef = useRef(null);
  
  // Fetch ranking data
  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      // First refresh realtime data
      await authAxios.post('/brand-statistics/realtime/refresh');
      
      // Then get ranking
      const response = await authAxios.get('/brand-statistics/ranking', {
        params: { period: 'day' }
      });
      
      // Store previous positions for animation
      const prevPositions = {};
      ranking.forEach((item, idx) => {
        prevPositions[item.brand_id] = idx + 1;
      });
      setPreviousRanking(prevPositions);
      
      // Sort by visits descending
      const sortedRanking = (response.data.ranking || [])
        .sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0));
      
      setRanking(sortedRanking);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching ranking:', error);
    }
    setLoading(false);
  }, [authAxios, ranking]);
  
  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchRanking();
    
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchRanking, refreshInterval * 1000);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, refreshInterval]);
  
  // Calculate totals
  const totalVisits = ranking.reduce((sum, item) => sum + (item.total_visits || 0), 0);
  const maxVisits = ranking.length > 0 ? ranking[0].total_visits || 0 : 0;
  
  // Get top 3 for podium
  const podium = ranking.slice(0, 3);
  const restOfRanking = ranking.slice(3);
  
  const containerClass = isFullscreen 
    ? "fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-auto"
    : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl";
  
  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/30">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                NOC Competitivo
                <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
              </h1>
              <p className="text-slate-400 text-sm">
                Ranking en tiempo real de visitas por marca
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Stats badges */}
            <Badge variant="outline" className="bg-slate-800 border-slate-600 text-slate-300 px-3 py-1.5">
              <Users className="w-4 h-4 mr-2 text-cyan-400" />
              <span className="font-bold text-cyan-400">{totalVisits.toLocaleString('es-ES')}</span>
              <span className="ml-1 text-slate-500">total</span>
            </Badge>
            
            {lastUpdate && (
              <Badge variant="outline" className="bg-slate-800 border-slate-600 text-slate-300 px-3 py-1.5">
                <Clock className="w-4 h-4 mr-2 text-green-400" />
                {lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </Badge>
            )}
            
            {/* Auto-refresh toggle */}
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", autoRefresh && loading && "animate-spin")} />
              {autoRefresh ? `${refreshInterval}s` : 'Auto'}
            </Button>
            
            {/* Manual refresh */}
            <Button variant="outline" size="sm" onClick={fetchRanking} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            
            {/* Close button */}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6 max-w-6xl mx-auto">
        {/* Podium section (top 3) */}
        {podium.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-400 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Podium
            </h2>
            
            {/* Visual podium display */}
            <div className="flex items-end justify-center gap-4 mb-6">
              {/* 2nd place */}
              {podium[1] && (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {podium[1].brand_logo ? (
                      <img 
                        src={podium[1].brand_logo} 
                        alt={podium[1].brand_name}
                        className="w-16 h-16 object-contain rounded-lg bg-white p-1 shadow-lg"
                      />
                    ) : (
                      <div 
                        className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                        style={{ backgroundColor: podium[1].brand_color }}
                      >
                        {podium[1].brand_name?.charAt(0)}
                      </div>
                    )}
                    <Medal className="absolute -top-2 -right-2 w-6 h-6 text-slate-400" />
                  </div>
                  <div className="h-24 w-28 bg-gradient-to-t from-slate-400 to-slate-300 rounded-t-lg mt-2 flex items-end justify-center pb-2">
                    <span className="text-2xl font-bold text-slate-700">2º</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-300 text-center">{podium[1].brand_name}</p>
                  <p className="text-lg font-bold text-slate-100">{(podium[1].total_visits || 0).toLocaleString('es-ES')}</p>
                </div>
              )}
              
              {/* 1st place */}
              {podium[0] && (
                <div className="flex flex-col items-center -mt-8">
                  <div className="relative">
                    {podium[0].brand_logo ? (
                      <img 
                        src={podium[0].brand_logo} 
                        alt={podium[0].brand_name}
                        className="w-20 h-20 object-contain rounded-lg bg-white p-1 shadow-xl ring-4 ring-yellow-400"
                      />
                    ) : (
                      <div 
                        className="w-20 h-20 rounded-lg flex items-center justify-center text-3xl font-bold text-white shadow-xl ring-4 ring-yellow-400"
                        style={{ backgroundColor: podium[0].brand_color }}
                      >
                        {podium[0].brand_name?.charAt(0)}
                      </div>
                    )}
                    <Crown className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 text-yellow-400" />
                  </div>
                  <div className="h-32 w-32 bg-gradient-to-t from-yellow-500 to-yellow-400 rounded-t-lg mt-2 flex items-end justify-center pb-2">
                    <span className="text-3xl font-bold text-yellow-900">1º</span>
                  </div>
                  <p className="mt-2 text-base font-bold text-white text-center">{podium[0].brand_name}</p>
                  <p className="text-xl font-bold text-yellow-400">{(podium[0].total_visits || 0).toLocaleString('es-ES')}</p>
                </div>
              )}
              
              {/* 3rd place */}
              {podium[2] && (
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {podium[2].brand_logo ? (
                      <img 
                        src={podium[2].brand_logo} 
                        alt={podium[2].brand_name}
                        className="w-16 h-16 object-contain rounded-lg bg-white p-1 shadow-lg"
                      />
                    ) : (
                      <div 
                        className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                        style={{ backgroundColor: podium[2].brand_color }}
                      >
                        {podium[2].brand_name?.charAt(0)}
                      </div>
                    )}
                    <Medal className="absolute -top-2 -right-2 w-6 h-6 text-amber-600" />
                  </div>
                  <div className="h-20 w-28 bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-lg mt-2 flex items-end justify-center pb-2">
                    <span className="text-2xl font-bold text-amber-200">3º</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-300 text-center">{podium[2].brand_name}</p>
                  <p className="text-lg font-bold text-slate-100">{(podium[2].total_visits || 0).toLocaleString('es-ES')}</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Full ranking list */}
        <div>
          <h2 className="text-lg font-semibold text-slate-400 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-500" />
            Ranking Completo
          </h2>
          
          <div className="space-y-3">
            {ranking.map((item, index) => (
              <RankingCard
                key={item.brand_id}
                rank={index + 1}
                brand={{
                  name: item.brand_name,
                  logo: item.brand_logo,
                  color: item.brand_color
                }}
                visits={item.total_visits || 0}
                maxVisits={maxVisits}
                previousRank={previousRanking[item.brand_id]}
                animationDelay={index * 100}
              />
            ))}
            
            {ranking.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-500">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No hay datos de ranking disponibles</p>
                <p className="text-sm mt-1">Los datos se actualizarán cuando haya visitas registradas</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* CSS for animations */}
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default NOCCompetitivo;
