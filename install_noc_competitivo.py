#!/usr/bin/env python3
"""
Instalador NOC Competitivo para WatchTower by Siempria
Ejecutar: python3 install_noc_competitivo.py
"""
import os

BASE = "/opt/siempria-monitor"

# ============================================================
# ARCHIVO 1: NOCCompetitivoFloatingButton.jsx
# ============================================================
BUTTON_CONTENT = '''/**
 * NOCCompetitivoFloatingButton - Floating lateral button for NOC Competitivo
 * Same style as CRA and LiveViewer buttons
 */
import { useState, useEffect, useCallback } from 'react';
import { Trophy, Crown, ChevronRight, TrendingUp, MapPin, Users } from 'lucide-react';
import { Badge } from '../ui/badge';
import NOCCompetitivo from '@/components/panels/NOCCompetitivo';

const NOCCompetitivoFloatingButton = ({ authAxios }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState({ total: 0, leader: null, islands: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await authAxios.get('/brand-statistics/ranking', { params: { period: 'day' } });
      const ranking = response.data.ranking || [];
      const total = ranking.reduce((sum, item) => sum + (item.total_visits || 0), 0);
      const leader = ranking.length > 0 ? ranking[0] : null;
      const islandsResponse = await authAxios.get('/brand-statistics/history/by-island', {
        params: { start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] }
      });
      const islandsData = islandsResponse.data.islands || {};
      const activeIslands = Object.values(islandsData).filter(i => i.total > 0).length;
      setStats({ total, leader, islands: activeIslands });
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  }, [authAxios]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) return (
    <div className="fixed right-0 z-50" style={{ top: 'calc(33% + 200px)' }}>
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-2 sm:p-3 rounded-l-xl shadow-lg animate-pulse">
        <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed right-0 z-50 transition-all duration-300" style={{ top: 'calc(33% + 200px)' }}
        onMouseEnter={() => setIsExpanded(true)} onMouseLeave={() => setIsExpanded(false)} data-testid="noc-competitivo-btn">
        <div className={`flex items-center cursor-pointer shadow-2xl rounded-l-xl overflow-hidden transition-all duration-300
          bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 text-white hover:from-amber-400 hover:via-orange-400 hover:to-orange-500
          ${isOpen ? 'ring-4 ring-orange-300 ring-opacity-50' : ''}`} onClick={() => setIsOpen(true)}>
          <div className={`p-2 sm:p-3 flex flex-col items-center justify-center ${isExpanded ? 'sm:border-r border-white/20' : ''}`}>
            <Trophy className="w-5 h-5 sm:w-8 sm:h-8" />
            {stats.total > 0 && <span className="text-[10px] sm:text-xs font-bold mt-0.5 sm:mt-1">{stats.total.toLocaleString('es-ES')}</span>}
          </div>
          <div className={`overflow-hidden transition-all duration-300 hidden sm:block ${isExpanded ? 'w-52 opacity-100' : 'w-0 opacity-0'}`}>
            <div className="p-3 whitespace-nowrap">
              <div className="font-bold text-sm mb-1 flex items-center gap-2"><Crown className="w-4 h-4 text-yellow-200" />NOC Competitivo</div>
              <div className="space-y-1 text-xs">
                {stats.leader && <div className="flex items-center justify-between"><span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />Líder</span><Badge variant="secondary" className="bg-white/20 text-white h-5 max-w-[80px] truncate">{stats.leader.brand_name}</Badge></div>}
                <div className="flex items-center justify-between"><span className="flex items-center gap-1"><Users className="w-3 h-3" />Visitas hoy</span><Badge variant="secondary" className="bg-white/20 text-white h-5">{stats.total.toLocaleString('es-ES')}</Badge></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1"><MapPin className="w-3 h-3" />Islas activas</span><Badge variant="secondary" className="bg-white/20 text-white h-5">{stats.islands}/7</Badge></div>
              </div>
              <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-xs"><span>Ver ranking</span><ChevronRight className="w-4 h-4" /></div>
            </div>
          </div>
        </div>
        <div className="absolute top-1 sm:top-2 left-1 sm:left-2 pointer-events-none"><div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-300 rounded-full animate-pulse" /></div>
      </div>
      {isOpen && <NOCCompetitivo authAxios={authAxios} isFullscreen={true} onClose={() => setIsOpen(false)} />}
    </>
  );
};

export default NOCCompetitivoFloatingButton;
'''

# ============================================================
# ARCHIVO 2: NOCCompetitivo.jsx (Dashboard con siluetas de islas)
# ============================================================
DASHBOARD_CONTENT = '''/**
 * NOCCompetitivo - Real-time competitive leaderboard dashboard
 * Optimized for 55" displays - NO SCROLL
 * Shows brand ranking + island statistics with PNG silhouettes
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, Medal, TrendingUp, RefreshCw, X, Flame, Crown, Star, Users, Clock, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Island config with PNG silhouettes
const ISLANDS = [
  { id: 'tenerife', name: 'Tenerife', shortName: 'TF', color: '#8B5CF6', png: '/islands/tenerife.png' },
  { id: 'gran-canaria', name: 'Gran Canaria', shortName: 'GC', color: '#10B981', png: '/islands/grancanaria.png' },
  { id: 'lanzarote', name: 'Lanzarote', shortName: 'LZ', color: '#3B82F6', png: '/islands/lanzarote.png' },
  { id: 'fuerteventura', name: 'Fuerteventura', shortName: 'FV', color: '#F59E0B', png: '/islands/fuerteventura.png' },
  { id: 'la-palma', name: 'La Palma', shortName: 'LP', color: '#06B6D4', png: '/islands/lapalma.png' },
  { id: 'la-gomera', name: 'La Gomera', shortName: 'LG', color: '#EC4899', png: '/islands/lagomera.png' },
  { id: 'el-hierro', name: 'El Hierro', shortName: 'EH', color: '#F97316', png: '/islands/elhierro.png' }
];

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
      setDisplayValue(Math.round(startRef.current + (value - startRef.current) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  return <span>{displayValue.toLocaleString('es-ES')}</span>;
};

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
            <div className={cn("relative mb-2", rank === 1 && "scale-110")}>
              {data.brand_logo ? (
                <img src={data.brand_logo} alt={data.brand_name} className={cn("w-12 h-12 object-contain rounded-lg bg-white p-1 shadow-lg", rank === 1 && "w-14 h-14 ring-2", style.border)} />
              ) : (
                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-white shadow-lg", rank === 1 && "w-14 h-14")} style={{ backgroundColor: data.brand_color }}>{data.brand_name?.charAt(0)}</div>
              )}
              {rank === 1 && <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 text-yellow-400" />}
              {rank !== 1 && <Medal className="absolute -top-2 -right-2 w-5 h-5 text-slate-400" />}
            </div>
            <div className={cn("w-24 rounded-t-lg flex items-end justify-center pb-2 bg-gradient-to-t shadow-lg", height, style.bg)}><span className={cn("text-2xl font-bold", style.text)}>{rank}º</span></div>
            <p className="mt-2 text-sm font-semibold text-white text-center max-w-[100px] truncate">{data.brand_name}</p>
            <p className={cn("text-lg font-bold", rank === 1 ? "text-yellow-400" : "text-slate-300")}><AnimatedNumber value={data.total_visits || 0} /></p>
          </div>
        );
      })}
    </div>
  );
};

const RankingRow = ({ rank, brand, visits, maxVisits }) => {
  const pct = maxVisits > 0 ? (visits / maxVisits) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-6 text-center font-bold text-slate-500 text-sm">{rank}º</span>
      {brand.logo ? <img src={brand.logo} alt={brand.name} className="w-7 h-7 object-contain rounded bg-white p-0.5" /> : <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: brand.color }}>{brand.name.charAt(0)}</div>}
      <span className="flex-1 font-medium text-white text-sm truncate">{brand.name}</span>
      <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} /></div>
      <span className="w-16 text-right font-bold text-cyan-400 text-sm"><AnimatedNumber value={visits} /></span>
    </div>
  );
};

// Island card with PNG silhouette
const IslandCard = ({ island, data, maxVisits }) => {
  const pct = maxVisits > 0 ? (data.total / maxVisits) * 100 : 0;
  const hasVisits = data.total > 0;
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 hover:border-slate-500 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <img 
          src={island.png} 
          alt={island.name}
          className="w-8 h-8 object-contain"
          style={{ 
            filter: hasVisits 
              ? `brightness(1) drop-shadow(0 0 4px ${island.color})` 
              : 'brightness(0.4) grayscale(1)'
          }}
          onError={(e) => e.target.style.display = 'none'}
        />
        <div className="flex flex-col">
          <span className="font-semibold text-white text-sm">{island.shortName}</span>
          <span className="text-xs text-slate-400">{island.name}</span>
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1"><AnimatedNumber value={data.total || 0} /></div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: island.color }} /></div>
    </div>
  );
};

const NOCCompetitivo = ({ authAxios, isFullscreen = false, onClose }) => {
  const [ranking, setRanking] = useState([]);
  const [islandStats, setIslandStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval] = useState(30);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await authAxios.post('/brand-statistics/realtime/refresh');
      const [rankingRes, islandRes] = await Promise.all([
        authAxios.get('/brand-statistics/ranking', { params: { period: 'day' } }),
        authAxios.get('/brand-statistics/history/by-island', {
          params: { start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] }
        })
      ]);
      setRanking((rankingRes.data.ranking || []).sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0)));
      setIslandStats(islandRes.data.islands || {});
      setLastUpdate(new Date());
    } catch (error) { console.error('Error:', error); }
    setLoading(false);
  }, [authAxios]);

  useEffect(() => {
    fetchData();
    if (autoRefresh) intervalRef.current = setInterval(fetchData, refreshInterval * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, refreshInterval, fetchData]);

  const totalVisits = ranking.reduce((sum, item) => sum + (item.total_visits || 0), 0);
  const maxVisits = ranking.length > 0 ? ranking[0].total_visits || 1 : 1;
  const maxIslandVisits = Math.max(...Object.values(islandStats).map(i => i.total || 0), 1);
  const podiumRanking = ranking.slice(0, 3);

  return (
    <div className={cn("bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900", isFullscreen ? "fixed inset-0 z-50" : "rounded-xl")}>
      <div className="bg-slate-900/95 backdrop-blur border-b border-slate-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-lg shadow-amber-500/30"><Trophy className="w-6 h-6 text-white" /></div>
            <div><h1 className="text-xl font-bold text-white flex items-center gap-2">NOC Competitivo<Flame className="w-5 h-5 text-orange-500 animate-pulse" /></h1><p className="text-slate-400 text-xs">Ranking en tiempo real de visitas por marca e isla</p></div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-slate-800 border-slate-600 text-slate-300 px-3 py-1"><Users className="w-4 h-4 mr-2 text-cyan-400" /><span className="font-bold text-cyan-400">{totalVisits.toLocaleString('es-ES')}</span><span className="ml-1 text-slate-500">hoy</span></Badge>
            {lastUpdate && <Badge variant="outline" className="bg-slate-800 border-slate-600 text-slate-300 px-3 py-1"><Clock className="w-4 h-4 mr-2 text-green-400" />{lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Badge>}
            <Button variant={autoRefresh ? "default" : "outline"} size="sm" onClick={() => setAutoRefresh(!autoRefresh)} className={autoRefresh ? "bg-green-600 hover:bg-green-700" : ""}><RefreshCw className={cn("w-4 h-4 mr-1", autoRefresh && loading && "animate-spin")} />{autoRefresh ? `${refreshInterval}s` : 'Auto'}</Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}><RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /></Button>
            {onClose && <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></Button>}
          </div>
        </div>
      </div>
      <div className="p-4 h-[calc(100vh-72px)] grid grid-cols-12 gap-4">
        <div className="col-span-7 flex flex-col gap-4">
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700"><h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" />Podium - Top 3</h2><Podium ranking={podiumRanking} /></div>
          <div className="flex-1 bg-slate-800/30 rounded-xl p-4 border border-slate-700 overflow-hidden"><h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-cyan-500" />Ranking Completo</h2><div className="space-y-1">{ranking.map((item, idx) => <RankingRow key={item.brand_id} rank={idx + 1} brand={{ name: item.brand_name, logo: item.brand_logo, color: item.brand_color }} visits={item.total_visits || 0} maxVisits={maxVisits} />)}{ranking.length === 0 && <div className="text-center py-8 text-slate-500"><Trophy className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>Sin datos</p></div>}</div></div>
        </div>
        <div className="col-span-5 bg-slate-800/30 rounded-xl p-4 border border-slate-700">
          <h2 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2"><Map className="w-4 h-4 text-purple-500" />Estadísticas por Isla</h2>
          <div className="grid grid-cols-2 gap-3">{ISLANDS.map(island => <IslandCard key={island.id} island={island} data={islandStats[island.id] || { total: 0 }} maxVisits={maxIslandVisits} />)}</div>
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-lg p-4">
              <div className="text-center"><p className="text-xs text-slate-400 uppercase tracking-wide mb-1">TOTAL ISLAS CANARIAS</p><p className="text-4xl font-bold text-white"><AnimatedNumber value={totalVisits} /></p><p className="text-sm text-slate-400 mt-1">visitas hoy</p></div>
              {Object.entries(islandStats).length > 0 && (() => { const top = Object.entries(islandStats).sort((a, b) => (b[1].total || 0) - (a[1].total || 0))[0]; if (!top || top[1].total === 0) return null; const info = ISLANDS.find(i => i.id === top[0]); return <div className="mt-3 pt-3 border-t border-slate-600"><div className="flex items-center justify-center gap-2"><Crown className="w-4 h-4 text-yellow-400" /><span className="text-sm text-slate-300">Isla líder:</span><img src={info?.png} alt="" className="w-5 h-5 object-contain" style={{ filter: `drop-shadow(0 0 3px ${info?.color})` }} /><span className="font-bold text-white">{info?.name || top[0]}</span><Badge style={{ backgroundColor: info?.color }} className="text-white text-xs">{top[1].total}</Badge></div></div>; })()}
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
# ARCHIVO 3: deploy.sh
# ============================================================
DEPLOY_CONTENT = '''#!/bin/bash
set -e
echo "========================================"
echo "  WatchTower by Siempria - Deploy"
echo "========================================"
BACKUP="/opt/siempria-monitor/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP"
cp -r frontend/src "$BACKUP/"
cp -r backend "$BACKUP/"
echo "✓ Backup: $BACKUP"
cd frontend && yarn build && cd ..
echo "✓ Frontend compilado"
sudo systemctl restart siempria-backend
sleep 3
systemctl is-active --quiet siempria-backend && echo "✓ Backend activo" || echo "✗ Error backend"
echo "========================================"
echo "  ¡Deploy completado!"
echo "========================================"
'''

def main():
    print("=" * 50)
    print("  Instalador NOC Competitivo")
    print("=" * 50)
    
    # Verificar directorio
    if not os.path.exists(BASE):
        print(f"ERROR: No existe {BASE}")
        return
    
    # Backup
    import datetime
    backup_dir = f"{BASE}/backups/{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
    os.makedirs(backup_dir, exist_ok=True)
    os.system(f"cp -r {BASE}/frontend/src {backup_dir}/ 2>/dev/null")
    os.system(f"cp -r {BASE}/backend {backup_dir}/ 2>/dev/null")
    print(f"✓ Backup creado: {backup_dir}")
    
    # Crear botón flotante
    btn_path = f"{BASE}/frontend/src/components/common/NOCCompetitivoFloatingButton.jsx"
    os.makedirs(os.path.dirname(btn_path), exist_ok=True)
    with open(btn_path, 'w') as f:
        f.write(BUTTON_CONTENT)
    print(f"✓ Creado: NOCCompetitivoFloatingButton.jsx")
    
    # Crear dashboard
    dash_path = f"{BASE}/frontend/src/components/panels/NOCCompetitivo.jsx"
    os.makedirs(os.path.dirname(dash_path), exist_ok=True)
    with open(dash_path, 'w') as f:
        f.write(DASHBOARD_CONTENT)
    print(f"✓ Creado: NOCCompetitivo.jsx")
    
    # Crear deploy.sh
    deploy_path = f"{BASE}/deploy.sh"
    with open(deploy_path, 'w') as f:
        f.write(DEPLOY_CONTENT)
    os.chmod(deploy_path, 0o755)
    print(f"✓ Creado: deploy.sh")
    
    # Actualizar scheduler a 5 minutos
    server_path = f"{BASE}/backend/server.py"
    if os.path.exists(server_path):
        with open(server_path, 'r') as f:
            content = f.read()
        content = content.replace('IntervalTrigger(hours=1)', 'IntervalTrigger(minutes=5)')
        content = content.replace('storing every hour', 'storing every 5 minutes')
        with open(server_path, 'w') as f:
            f.write(content)
        print("✓ Scheduler actualizado a 5 minutos")
    
    # Actualizar App.js
    app_path = f"{BASE}/frontend/src/App.js"
    if os.path.exists(app_path):
        with open(app_path, 'r') as f:
            content = f.read()
        
        # Añadir import si no existe
        import_line = 'import NOCCompetitivoFloatingButton from "@/components/common/NOCCompetitivoFloatingButton";'
        if 'NOCCompetitivoFloatingButton' not in content:
            # Insertar después de NOCFloatingButton import
            content = content.replace(
                'import NOCFloatingButton from "@/components/common/NOCFloatingButton";',
                'import NOCFloatingButton from "@/components/common/NOCFloatingButton";\\n' + import_line
            )
            print("✓ Import añadido a App.js")
        
        # Añadir componente si no existe
        if '<NOCCompetitivoFloatingButton' not in content:
            # Buscar NOCFloatingButton y añadir después
            import re
            pattern = r'(<NOCFloatingButton[^/]*/>)'
            replacement = r'\\1\\n      {/* NOC Competitivo */}\\n      <NOCCompetitivoFloatingButton authAxios={authAxios} />'
            content = re.sub(pattern, replacement, content, count=1)
            print("✓ Componente añadido a App.js")
        
        with open(app_path, 'w') as f:
            f.write(content)
    
    print("")
    print("=" * 50)
    print("  INSTALACIÓN COMPLETADA")
    print("=" * 50)
    print("")
    print("Ahora ejecuta:")
    print(f"  cd {BASE}")
    print("  ./deploy.sh")
    print("")

if __name__ == "__main__":
    main()
