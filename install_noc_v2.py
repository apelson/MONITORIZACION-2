#!/usr/bin/env python3
"""
NOC WatchTower Installer v2
Incluye: NOC Competitivo con ranking por centro + botón flotante

INSTRUCCIONES DE USO:
1. Copiar este archivo a tu servidor
2. Ejecutar: python3 install_noc_v2.py
3. Reiniciar los servicios:
   - Backend: sudo systemctl restart watchtower-backend  (o tu comando)
   - Frontend: cd frontend && npm run build && sudo systemctl restart nginx
"""

import os
import sys

# Detectar rutas automáticamente
POSSIBLE_PATHS = [
    "/opt/watchtower",
    "/var/www/watchtower", 
    "/home/siempria/watchtower",
    os.path.expanduser("~/watchtower"),
    "/app"
]

BASE_PATH = None
for path in POSSIBLE_PATHS:
    if os.path.exists(path):
        BASE_PATH = path
        break

if not BASE_PATH:
    print("ERROR: No se encontró el directorio del proyecto")
    print("Por favor, define BASE_PATH manualmente en este script")
    sys.exit(1)

print(f"Usando directorio base: {BASE_PATH}")

# ============================================================
# ARCHIVO 1: Backend - brand_statistics.py (añadir endpoint)
# ============================================================

RANKING_BY_CENTER_ENDPOINT = '''
@router.get("/ranking-by-center")
async def get_ranking_by_center(
    period: str = Query("day", description="Period: day, week, month, year"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get center visit ranking for competitive dashboard.
    Returns aggregated visit counts per center (brand + island combination) sorted by total visits.
    """
    # Calculate date range
    now = datetime.now(timezone.utc)
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    elif period == "year":
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=7)
    
    today = now.strftime("%Y-%m-%d")
    
    # Aggregate by center (brand + island combination) from daily stats
    pipeline = [
        {"$match": {"date": today}},
        {"$group": {
            "_id": {"brand_id": "$brand_id", "island": "$island"},
            "total_visits": {"$sum": "$visits"}
        }},
        {"$project": {
            "brand_id": "$_id.brand_id",
            "island": "$_id.island",
            "total_visits": 1,
            "_id": 0
        }},
        {"$sort": {"total_visits": -1}}
    ]
    
    results = await brand_daily_collection.aggregate(pipeline).to_list(length=100)
    
    # Get brands and centers from DB for enrichment
    brands = await get_brands_from_db()
    centers = await get_centers_from_db()
    
    # Build ranking with enriched data
    ranking = []
    for r in results:
        brand_info = next((b for b in brands if b["id"] == r["brand_id"]), None)
        island_info = next((c for c in centers if c.get("island") == r["island"] or c.get("id") == r["island"]), None)
        
        if brand_info:
            # Create a unique center identifier
            center_name = f"{brand_info['name']} - {island_info['name'] if island_info else r['island'].replace('-', ' ').title()}"
            
            ranking.append({
                "center_id": f"{r['brand_id']}_{r['island']}",
                "center_name": center_name,
                "brand_id": r["brand_id"],
                "brand_name": brand_info["name"],
                "brand_color": brand_info["color"],
                "brand_logo": brand_info.get("logo", ""),
                "island": r["island"],
                "island_name": island_info["name"] if island_info else r["island"].replace("-", " ").title(),
                "total_visits": r["total_visits"]
            })
    
    # If no data, return empty list
    if not ranking:
        # Build list of possible centers from brands x islands
        islands = ["tenerife", "gran-canaria", "lanzarote", "fuerteventura", "la-palma", "la-gomera", "el-hierro"]
        island_names = {
            "tenerife": "Tenerife", "gran-canaria": "Gran Canaria", "lanzarote": "Lanzarote",
            "fuerteventura": "Fuerteventura", "la-palma": "La Palma", "la-gomera": "La Gomera", "el-hierro": "El Hierro"
        }
        for brand in brands:
            for island in islands:
                ranking.append({
                    "center_id": f"{brand['id']}_{island}",
                    "center_name": f"{brand['name']} - {island_names.get(island, island)}",
                    "brand_id": brand["id"],
                    "brand_name": brand["name"],
                    "brand_color": brand["color"],
                    "brand_logo": brand.get("logo", ""),
                    "island": island,
                    "island_name": island_names.get(island, island),
                    "total_visits": 0
                })
    
    return {
        "ranking": ranking,
        "period": period,
        "start_date": start_date.isoformat(),
        "end_date": now.isoformat(),
        "total_centers": len(ranking)
    }

'''

# ============================================================
# ARCHIVO 2: Frontend - NOCCompetitivo.jsx
# ============================================================

NOC_COMPETITIVO_JSX = '''/**
 * NOCCompetitivo - Real-time competitive leaderboard dashboard
 * Optimized for 55" displays - NO SCROLL, all content visible
 * Shows brand ranking + center ranking + island statistics
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, Medal, TrendingUp, RefreshCw, X, Flame, Crown, Star,
  MapPin, Users, Clock, ChevronUp, ChevronDown, Map, Building2, Store
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

// Center ranking row - shows brand + island
const CenterRankingRow = ({ rank, center, maxVisits }) => {
  const percentage = maxVisits > 0 ? (center.total_visits / maxVisits) * 100 : 0;
  
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="w-6 text-center font-bold text-slate-500 text-sm">{rank}º</span>
      {center.brand_logo ? (
        <img src={center.brand_logo} alt={center.brand_name} className="w-6 h-6 object-contain rounded bg-white p-0.5" />
      ) : (
        <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: center.brand_color }}>
          {center.brand_name?.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-white text-xs truncate block">{center.brand_name}</span>
        <span className="text-[10px] text-slate-400 truncate block">{center.island_name}</span>
      </div>
      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-12 text-right font-bold text-emerald-400 text-xs">
        <AnimatedNumber value={center.total_visits || 0} />
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
  const [centerRanking, setCenterRanking] = useState([]);
  const [islandStats, setIslandStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval] = useState(30);
  const [activeTab, setActiveTab] = useState('brands'); // 'brands' or 'centers'
  const intervalRef = useRef(null);
  
  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Refresh realtime and get ranking
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
  const maxCenterVisits = centerRanking.length > 0 ? centerRanking[0].total_visits || 1 : 1;
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
          
          {/* Full ranking list - with tabs for brands/centers */}
          <div className="flex-1 bg-slate-800/30 rounded-xl p-4 border border-slate-700 overflow-hidden">
            {/* Tab buttons */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setActiveTab('brands')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  activeTab === 'brands' 
                    ? "bg-cyan-600 text-white" 
                    : "bg-slate-700 text-slate-400 hover:text-white"
                )}
              >
                <TrendingUp className="w-4 h-4" />
                Marcas
              </button>
              <button
                onClick={() => setActiveTab('centers')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  activeTab === 'centers' 
                    ? "bg-emerald-600 text-white" 
                    : "bg-slate-700 text-slate-400 hover:text-white"
                )}
              >
                <Store className="w-4 h-4" />
                Centros
                {centerRanking.length > 0 && (
                  <Badge className="ml-1 bg-emerald-500/30 text-emerald-300 text-[10px] h-5">
                    {centerRanking.length}
                  </Badge>
                )}
              </button>
            </div>
            
            {/* Brand ranking view */}
            {activeTab === 'brands' && (
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
            )}
            
            {/* Center ranking view */}
            {activeTab === 'centers' && (
              <div className="space-y-0.5 max-h-[calc(100%-50px)] overflow-y-auto">
                {centerRanking.map((center, index) => (
                  <CenterRankingRow
                    key={center.center_id}
                    rank={index + 1}
                    center={center}
                    maxVisits={maxCenterVisits}
                  />
                ))}
                
                {centerRanking.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Store className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Sin datos de centros</p>
                    <p className="text-xs mt-1">Los centros con visitas aparecerán aquí</p>
                  </div>
                )}
              </div>
            )}
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
'''

# ============================================================
# ARCHIVO 3: Frontend - NOCCompetitivoFloatingButton.jsx
# ============================================================

NOC_FLOATING_BUTTON_JSX = '''/**
 * NOCCompetitivoFloatingButton - Floating lateral button for NOC Competitivo
 * Same style as CRA and LiveViewer buttons
 * Shows real-time ranking stats with expand on hover
 */
import { useState, useEffect, useCallback } from 'react';
import { Trophy, Crown, ChevronRight, TrendingUp, MapPin, Users } from 'lucide-react';
import { Badge } from '../ui/badge';
import NOCCompetitivo from '@/components/panels/NOCCompetitivo';

const NOCCompetitivoFloatingButton = ({ authAxios, onClick, isActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState({ total: 0, leader: null, islands: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await authAxios.get('/brand-statistics/ranking', {
        params: { period: 'day' }
      });
      const ranking = response.data.ranking || [];
      const total = ranking.reduce((sum, item) => sum + (item.total_visits || 0), 0);
      const leader = ranking.length > 0 ? ranking[0] : null;
      
      // Count islands with activity
      const islandsResponse = await authAxios.get('/brand-statistics/history/by-island', {
        params: { 
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        }
      });
      const islandsData = islandsResponse.data.islands || {};
      const activeIslands = Object.values(islandsData).filter(i => i.total > 0).length;
      
      setStats({ total, leader, islands: activeIslands });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleClick = () => {
    setIsOpen(true);
  };

  if (loading) {
    return (
      <div className="fixed right-0 z-50" style={{ top: 'calc(33% + 200px)' }}>
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-2 sm:p-3 rounded-l-xl shadow-lg animate-pulse">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div 
        className="fixed right-0 z-50 transition-all duration-300"
        style={{ top: 'calc(33% + 200px)' }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        data-testid="noc-competitivo-btn"
      >
        <div 
          className={`
            flex items-center cursor-pointer shadow-2xl rounded-l-xl overflow-hidden
            transition-all duration-300
            bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 text-white
            hover:from-amber-400 hover:via-orange-400 hover:to-orange-500
            ${isActive || isOpen ? 'ring-4 ring-orange-300 ring-opacity-50' : ''}
          `}
          onClick={handleClick}
        >
          {/* Icon section */}
          <div className={`p-2 sm:p-3 flex flex-col items-center justify-center ${isExpanded ? 'sm:border-r border-white/20' : ''}`}>
            <Trophy className="w-5 h-5 sm:w-8 sm:h-8" />
            {stats.total > 0 && (
              <span className="text-[10px] sm:text-xs font-bold mt-0.5 sm:mt-1">
                {stats.total.toLocaleString('es-ES')}
              </span>
            )}
          </div>

          {/* Expanded content */}
          <div className={`overflow-hidden transition-all duration-300 hidden sm:block ${isExpanded ? 'w-52 opacity-100' : 'w-0 opacity-0'}`}>
            <div className="p-3 whitespace-nowrap">
              <div className="font-bold text-sm mb-1 flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-200" />
                NOC Competitivo
              </div>
              
              <div className="space-y-1 text-xs">
                {stats.leader && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Líder
                    </span>
                    <Badge variant="secondary" className="bg-white/20 text-white h-5 max-w-[80px] truncate">
                      {stats.leader.brand_name}
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Visitas hoy
                  </span>
                  <Badge variant="secondary" className="bg-white/20 text-white h-5">
                    {stats.total.toLocaleString('es-ES')}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    Islas activas
                  </span>
                  <Badge variant="secondary" className="bg-white/20 text-white h-5">
                    {stats.islands}/7
                  </Badge>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-xs">
                <span>Ver ranking</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Pulse animation for live indicator */}
        <div className="absolute top-1 sm:top-2 left-1 sm:left-2 pointer-events-none">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-300 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Fullscreen NOC Competitivo Dashboard */}
      {isOpen && (
        <NOCCompetitivo 
          authAxios={authAxios} 
          isFullscreen={true}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default NOCCompetitivoFloatingButton;
'''

# ============================================================
# FUNCIONES DE INSTALACIÓN
# ============================================================

def write_file(path, content):
    """Escribe un archivo creando directorios si es necesario"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  ✓ Creado: {path}")

def add_endpoint_to_backend():
    """Añade el endpoint ranking-by-center al backend"""
    backend_file = os.path.join(BASE_PATH, "backend/routes/brand_statistics.py")
    
    if not os.path.exists(backend_file):
        print(f"  ✗ No se encontró: {backend_file}")
        return False
    
    with open(backend_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Verificar si ya existe el endpoint
    if "ranking-by-center" in content:
        print(f"  ⚠ El endpoint ranking-by-center ya existe en {backend_file}")
        return True
    
    # Buscar donde insertar (antes de ranking-by-island)
    marker = '@router.get("/ranking-by-island")'
    if marker not in content:
        print(f"  ✗ No se encontró el marcador para insertar el endpoint")
        return False
    
    # Insertar el nuevo endpoint antes del marcador
    new_content = content.replace(marker, RANKING_BY_CENTER_ENDPOINT + "\n\n" + marker)
    
    with open(backend_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"  ✓ Añadido endpoint ranking-by-center a {backend_file}")
    return True

def install_frontend_files():
    """Instala los archivos del frontend"""
    # NOCCompetitivo.jsx
    noc_path = os.path.join(BASE_PATH, "frontend/src/components/panels/NOCCompetitivo.jsx")
    write_file(noc_path, NOC_COMPETITIVO_JSX)
    
    # NOCCompetitivoFloatingButton.jsx
    button_path = os.path.join(BASE_PATH, "frontend/src/components/common/NOCCompetitivoFloatingButton.jsx")
    write_file(button_path, NOC_FLOATING_BUTTON_JSX)

def check_app_js_import():
    """Verifica si App.js tiene el import del botón flotante"""
    app_js = os.path.join(BASE_PATH, "frontend/src/App.js")
    
    if not os.path.exists(app_js):
        print(f"  ⚠ No se encontró App.js en {app_js}")
        return
    
    with open(app_js, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "NOCCompetitivoFloatingButton" not in content:
        print("""
  ⚠ ATENCIÓN: Necesitas añadir el botón flotante a App.js manualmente:
  
  1. Añadir import:
     import NOCCompetitivoFloatingButton from "@/components/common/NOCCompetitivoFloatingButton";
  
  2. Añadir componente en el JSX (cerca de otros botones flotantes):
     <NOCCompetitivoFloatingButton authAxios={authAxios} />
""")
    else:
        print("  ✓ App.js ya tiene el import de NOCCompetitivoFloatingButton")

def main():
    print("=" * 60)
    print("  NOC WatchTower Installer v2")
    print("  Ranking por Centro + Botón Flotante")
    print("=" * 60)
    print()
    
    print("1. Actualizando backend (brand_statistics.py)...")
    add_endpoint_to_backend()
    print()
    
    print("2. Instalando archivos frontend...")
    install_frontend_files()
    print()
    
    print("3. Verificando App.js...")
    check_app_js_import()
    print()
    
    print("=" * 60)
    print("  INSTALACIÓN COMPLETADA")
    print("=" * 60)
    print()
    print("Siguiente paso - Reiniciar servicios:")
    print("  1. Backend: sudo systemctl restart watchtower-backend")
    print("  2. Frontend: cd frontend && npm run build")
    print("  3. Nginx: sudo systemctl restart nginx")
    print()

if __name__ == "__main__":
    main()
