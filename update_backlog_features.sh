#!/bin/bash
# =============================================================================
# Script de actualización WatchTower - Backlog Features
# Mapa de Canarias, Dashboard Personalizable, Video Tutoriales
# Fecha: 06 Mar 2026
# =============================================================================

set -e  # Salir si hay errores

PROD_DIR="/opt/siempria-monitor"
BACKUP_DIR="/opt/siempria-monitor/backups/$(date +%Y%m%d_%H%M%S)"

echo "========================================"
echo "  WatchTower - Actualización Backlog"
echo "========================================"
echo ""

# Crear directorio de backup
echo "[1/6] Creando backup..."
mkdir -p "$BACKUP_DIR"
cp "$PROD_DIR/frontend/src/App.js" "$BACKUP_DIR/App.js.bak" 2>/dev/null || true
echo "      Backup guardado en: $BACKUP_DIR"

# Crear directorios necesarios
echo "[2/6] Creando directorios..."
mkdir -p "$PROD_DIR/frontend/src/components/help"
mkdir -p "$PROD_DIR/frontend/src/components/maps"
mkdir -p "$PROD_DIR/frontend/src/components/dashboard"

# Crear VideoTutorials.jsx
echo "[3/6] Creando VideoTutorials.jsx..."
cat > "$PROD_DIR/frontend/src/components/help/VideoTutorials.jsx" << 'VIDEOEOF'
/**
 * VideoTutorials - Panel de video tutoriales
 * Muestra guías en video para aprender a usar el sistema
 */
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  PlayCircle, Clock, Search, BookOpen, Monitor, 
  Camera, Bell, Shield, Settings, Users, Filter,
  ChevronRight, Star, TrendingUp
} from 'lucide-react';

const TUTORIALS = [
  { id: 1, title: 'Introducción al Sistema', description: 'Aprende los conceptos básicos de WatchTower y cómo navegar por el dashboard.', duration: '5:30', category: 'basics', difficulty: 'beginner', thumbnail: '/api/placeholder/320/180', videoUrl: null, views: 1250, featured: true },
  { id: 2, title: 'Añadir y Configurar Dispositivos', description: 'Paso a paso para añadir cámaras, grabadores y otros dispositivos al sistema.', duration: '8:45', category: 'devices', difficulty: 'beginner', thumbnail: '/api/placeholder/320/180', videoUrl: null, views: 890 },
  { id: 3, title: 'Gestión de Alertas', description: 'Configura notificaciones, umbrales de alerta y respuestas automáticas.', duration: '6:20', category: 'alerts', difficulty: 'intermediate', thumbnail: '/api/placeholder/320/180', videoUrl: null, views: 654 },
  { id: 4, title: 'Configuración de CRA', description: 'Aprende a configurar la Central Receptora de Alarmas para máxima seguridad.', duration: '12:15', category: 'security', difficulty: 'advanced', thumbnail: '/api/placeholder/320/180', videoUrl: null, views: 432 },
  { id: 5, title: 'Usuarios y Permisos', description: 'Gestiona usuarios, roles y permisos de acceso al sistema.', duration: '7:00', category: 'users', difficulty: 'intermediate', thumbnail: '/api/placeholder/320/180', videoUrl: null, views: 567 },
  { id: 6, title: 'Grabadores Dahua - Configuración', description: 'Integra y configura grabadores DVR/NVR Dahua con el sistema.', duration: '10:30', category: 'devices', difficulty: 'intermediate', thumbnail: '/api/placeholder/320/180', videoUrl: null, views: 789 },
  { id: 7, title: 'Reportes y Estadísticas', description: 'Genera informes detallados y analiza el rendimiento de tu infraestructura.', duration: '9:15', category: 'reports', difficulty: 'intermediate', thumbnail: '/api/placeholder/320/180', videoUrl: null, views: 345 },
  { id: 8, title: 'Fail2ban y Seguridad Avanzada', description: 'Protege tu sistema con detección de intrusos y bloqueo automático de IPs.', duration: '11:00', category: 'security', difficulty: 'advanced', thumbnail: '/api/placeholder/320/180', videoUrl: null, views: 234 }
];

const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: BookOpen },
  { id: 'basics', name: 'Básicos', icon: Monitor },
  { id: 'devices', name: 'Dispositivos', icon: Camera },
  { id: 'alerts', name: 'Alertas', icon: Bell },
  { id: 'security', name: 'Seguridad', icon: Shield },
  { id: 'users', name: 'Usuarios', icon: Users },
  { id: 'reports', name: 'Reportes', icon: TrendingUp }
];

const getDifficultyBadge = (difficulty) => {
  switch (difficulty) {
    case 'beginner': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Principiante</Badge>;
    case 'intermediate': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Intermedio</Badge>;
    case 'advanced': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Avanzado</Badge>;
    default: return null;
  }
};

const VideoCard = ({ tutorial, onClick }) => (
  <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 overflow-hidden" onClick={() => onClick(tutorial)}>
    <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center group">
      <Camera className="w-12 h-12 text-slate-600" />
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <PlayCircle className="w-16 h-16 text-white" />
      </div>
      {tutorial.featured && <Badge className="absolute top-2 left-2 bg-yellow-500 text-yellow-900 gap-1"><Star className="w-3 h-3" />Destacado</Badge>}
      <Badge variant="secondary" className="absolute bottom-2 right-2 bg-black/70 text-white"><Clock className="w-3 h-3 mr-1" />{tutorial.duration}</Badge>
    </div>
    <CardContent className="p-4">
      <h3 className="font-semibold text-sm line-clamp-2 mb-2">{tutorial.title}</h3>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{tutorial.description}</p>
      <div className="flex items-center justify-between">
        {getDifficultyBadge(tutorial.difficulty)}
        <span className="text-xs text-muted-foreground">{tutorial.views} vistas</span>
      </div>
    </CardContent>
  </Card>
);

const VideoTutorials = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVideo, setSelectedVideo] = useState(null);

  const filteredTutorials = TUTORIALS.filter(tutorial => {
    const matchesSearch = tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) || tutorial.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tutorial.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredTutorials = TUTORIALS.filter(t => t.featured);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><PlayCircle className="w-5 h-5 text-red-500" />Video Tutoriales</CardTitle>
            <CardDescription>Aprende a usar WatchTower con nuestras guías en video</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1"><BookOpen className="w-3 h-3" />{TUTORIALS.length} tutoriales</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar tutoriales..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {CATEGORIES.map(category => {
              const Icon = category.icon;
              return <Button key={category.id} variant={selectedCategory === category.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(category.id)} className="gap-1 whitespace-nowrap"><Icon className="w-3 h-3" />{category.name}</Button>;
            })}
          </div>
        </div>
        {selectedCategory === 'all' && !searchQuery && featuredTutorials.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" />Tutoriales Destacados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{featuredTutorials.map(tutorial => <VideoCard key={tutorial.id} tutorial={tutorial} onClick={setSelectedVideo} />)}</div>
          </div>
        )}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Filter className="w-4 h-4" />{selectedCategory === 'all' ? 'Todos los Tutoriales' : CATEGORIES.find(c => c.id === selectedCategory)?.name}<Badge variant="secondary">{filteredTutorials.length}</Badge></h3>
          {filteredTutorials.length > 0 ? (
            <ScrollArea className="h-[500px] pr-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{filteredTutorials.map(tutorial => <VideoCard key={tutorial.id} tutorial={tutorial} onClick={setSelectedVideo} />)}</div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 text-muted-foreground"><BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No se encontraron tutoriales</p></div>
          )}
        </div>
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-3">Empezar Rápido</h4>
          <div className="flex flex-wrap gap-2">{['Añadir Cámara', 'Configurar Alertas', 'Crear Usuario', 'Ver Reportes'].map(link => <Button key={link} variant="outline" size="sm" className="gap-1">{link}<ChevronRight className="w-3 h-3" /></Button>)}</div>
        </div>
      </CardContent>
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{selectedVideo?.title}</DialogTitle></DialogHeader>
          <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
            {selectedVideo?.videoUrl ? <video src={selectedVideo.videoUrl} controls autoPlay className="w-full h-full rounded-lg" /> : (
              <div className="text-center text-white"><PlayCircle className="w-16 h-16 mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">Video próximamente</p><p className="text-sm text-gray-400 mt-2">{selectedVideo?.description}</p></div>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">{selectedVideo && getDifficultyBadge(selectedVideo.difficulty)}<span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-4 h-4" />{selectedVideo?.duration}</span></div>
            <span className="text-sm text-muted-foreground">{selectedVideo?.views} vistas</span>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default VideoTutorials;
VIDEOEOF

# Verificar si CanaryIslandsMap existe, si no, crearlo
echo "[4/6] Verificando CanaryIslandsMap.jsx..."
if [ ! -f "$PROD_DIR/frontend/src/components/maps/CanaryIslandsMap.jsx" ]; then
  echo "      Creando CanaryIslandsMap.jsx..."
  cat > "$PROD_DIR/frontend/src/components/maps/CanaryIslandsMap.jsx" << 'MAPEOF'
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Camera, AlertTriangle, CheckCircle, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

const ISLANDS = [
  { id: 'lanzarote', name: 'Lanzarote', shortName: 'LZ', path: 'M 380 80 L 420 70 L 450 85 L 460 110 L 445 140 L 410 150 L 380 135 L 370 105 Z', center: { x: 415, y: 110 }, color: '#3B82F6' },
  { id: 'fuerteventura', name: 'Fuerteventura', shortName: 'FV', path: 'M 320 130 L 350 120 L 370 140 L 375 180 L 365 230 L 340 260 L 310 250 L 300 200 L 305 160 Z', center: { x: 340, y: 190 }, color: '#F59E0B' },
  { id: 'gran-canaria', name: 'Gran Canaria', shortName: 'GC', path: 'M 200 180 L 250 170 L 280 190 L 285 230 L 265 270 L 220 280 L 185 255 L 180 215 Z', center: { x: 232, y: 225 }, color: '#10B981' },
  { id: 'tenerife', name: 'Tenerife', shortName: 'TF', path: 'M 80 160 L 130 145 L 170 160 L 175 200 L 155 245 L 110 260 L 65 240 L 55 195 Z', center: { x: 115, y: 200 }, color: '#8B5CF6' },
  { id: 'la-gomera', name: 'La Gomera', shortName: 'LG', path: 'M 40 280 L 70 270 L 90 285 L 85 310 L 60 325 L 35 310 Z', center: { x: 62, y: 297 }, color: '#EC4899' },
  { id: 'la-palma', name: 'La Palma', shortName: 'LP', path: 'M 15 120 L 45 100 L 70 115 L 75 160 L 55 200 L 25 195 L 10 155 Z', center: { x: 42, y: 150 }, color: '#06B6D4' },
  { id: 'el-hierro', name: 'El Hierro', shortName: 'EH', path: 'M 5 320 L 35 310 L 50 330 L 40 355 L 15 355 L 5 340 Z', center: { x: 27, y: 335 }, color: '#F97316' }
];

const getIslandFromLocation = (location) => {
  if (!location) return null;
  const loc = location.toLowerCase();
  if (loc.includes('lanzarote') || loc.includes('arrecife')) return 'lanzarote';
  if (loc.includes('fuerteventura') || loc.includes('puerto del rosario')) return 'fuerteventura';
  if (loc.includes('gran canaria') || loc.includes('las palmas')) return 'gran-canaria';
  if (loc.includes('tenerife') || loc.includes('santa cruz')) return 'tenerife';
  if (loc.includes('gomera')) return 'la-gomera';
  if (loc.includes('palma') && !loc.includes('las palmas')) return 'la-palma';
  if (loc.includes('hierro')) return 'el-hierro';
  return null;
};

const CanaryIslandsMap = ({ devices = [], organizations = [], onIslandClick, onDeviceClick }) => {
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [hoveredIsland, setHoveredIsland] = useState(null);
  const [zoom, setZoom] = useState(1);

  const islandStats = useMemo(() => {
    const stats = {};
    ISLANDS.forEach(island => { stats[island.id] = { total: 0, online: 0, offline: 0, devices: [] }; });
    devices.forEach(device => {
      let islandId = getIslandFromLocation(device.location);
      if (!islandId && device.organization_id) {
        const org = organizations.find(o => o.id === device.organization_id);
        if (org) islandId = getIslandFromLocation(org.name) || getIslandFromLocation(org.location);
      }
      if (islandId && stats[islandId]) {
        stats[islandId].total++;
        stats[islandId].devices.push(device);
        device.status === 'online' ? stats[islandId].online++ : stats[islandId].offline++;
      }
    });
    return stats;
  }, [devices, organizations]);

  const handleIslandClick = (island) => {
    setSelectedIsland(island.id === selectedIsland ? null : island.id);
    onIslandClick?.(island, islandStats[island.id]);
  };

  const totalStats = useMemo(() => ({
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status !== 'online').length
  }), [devices]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" />Mapa de Canarias</CardTitle><CardDescription>Distribución de dispositivos por isla</CardDescription></div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1"><Camera className="w-3 h-3" />{totalStats.total} total</Badge>
            <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="w-3 h-3" />{totalStats.online}</Badge>
            <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />{totalStats.offline}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end gap-1 mb-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}><ZoomOut className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(2, z + 0.25))}><ZoomIn className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(1)}><Maximize2 className="w-4 h-4" /></Button>
        </div>
        <div className="relative bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg overflow-hidden" style={{ height: '400px' }}>
          <svg viewBox="0 0 500 400" className="w-full h-full" style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.3s ease' }}>
            <defs><pattern id="waves" patternUnits="userSpaceOnUse" width="20" height="20"><path d="M0 10 Q5 5 10 10 T20 10" fill="none" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="1"/></pattern></defs>
            <rect width="500" height="400" fill="url(#waves)" />
            <TooltipProvider>
              {ISLANDS.map(island => {
                const stats = islandStats[island.id];
                const isSelected = selectedIsland === island.id;
                const isHovered = hoveredIsland === island.id;
                const hasOffline = stats.offline > 0;
                return (
                  <g key={island.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <path d={island.path} fill={isSelected ? island.color : isHovered ? `${island.color}dd` : `${island.color}99`} stroke={hasOffline ? '#EF4444' : island.color} strokeWidth={isSelected ? 3 : hasOffline ? 2 : 1} className="cursor-pointer transition-all duration-200" style={{ filter: isSelected ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none' }} onClick={() => handleIslandClick(island)} onMouseEnter={() => setHoveredIsland(island.id)} onMouseLeave={() => setHoveredIsland(null)} />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="p-3"><div className="text-center"><p className="font-bold">{island.name}</p><div className="flex gap-2 mt-1 justify-center"><span className="text-xs text-green-600">{stats.online} online</span><span className="text-xs text-red-600">{stats.offline} offline</span></div></div></TooltipContent>
                    </Tooltip>
                    <text x={island.center.x} y={island.center.y - 15} textAnchor="middle" className="text-xs font-bold fill-white pointer-events-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{island.shortName}</text>
                    {stats.total > 0 && (<g><circle cx={island.center.x} cy={island.center.y + 5} r={12} fill="white" stroke={hasOffline ? '#EF4444' : '#10B981'} strokeWidth={2} /><text x={island.center.x} y={island.center.y + 9} textAnchor="middle" className="text-xs font-bold pointer-events-none" fill={hasOffline ? '#EF4444' : '#10B981'}>{stats.total}</text></g>)}
                    {hasOffline && <circle cx={island.center.x + 15} cy={island.center.y - 10} r={6} fill="#EF4444" className="animate-pulse" />}
                  </g>
                );
              })}
            </TooltipProvider>
            <g transform="translate(450, 350)"><circle cx="0" cy="0" r="20" fill="white" stroke="#CBD5E1" strokeWidth="2" /><text x="0" y="-8" textAnchor="middle" className="text-xs font-bold fill-gray-600">N</text><path d="M0 -15 L3 0 L0 -5 L-3 0 Z" fill="#EF4444" /><path d="M0 15 L3 0 L0 5 L-3 0 Z" fill="#CBD5E1" /></g>
          </svg>
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur rounded-lg p-2 text-xs"><div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Todo OK</span></div><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div><span>Con alertas</span></div></div>
        </div>
        {selectedIsland && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-3"><h4 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" />{ISLANDS.find(i => i.id === selectedIsland)?.name}</h4><Button variant="ghost" size="sm" onClick={() => setSelectedIsland(null)}>Cerrar</Button></div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 bg-white rounded"><p className="text-2xl font-bold">{islandStats[selectedIsland].total}</p><p className="text-xs text-muted-foreground">Total</p></div>
              <div className="text-center p-2 bg-green-50 rounded"><p className="text-2xl font-bold text-green-600">{islandStats[selectedIsland].online}</p><p className="text-xs text-muted-foreground">Online</p></div>
              <div className="text-center p-2 bg-red-50 rounded"><p className="text-2xl font-bold text-red-600">{islandStats[selectedIsland].offline}</p><p className="text-xs text-muted-foreground">Offline</p></div>
            </div>
            {islandStats[selectedIsland].devices.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {islandStats[selectedIsland].devices.slice(0, 10).map((device, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded text-sm cursor-pointer hover:bg-gray-50" onClick={() => onDeviceClick?.(device)}>
                    <div className="flex items-center gap-2"><Camera className="w-4 h-4 text-gray-500" /><span className="truncate max-w-[150px]">{device.name}</span></div>
                    <Badge variant={device.status === 'online' ? 'default' : 'destructive'} className="text-xs">{device.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CanaryIslandsMap;
MAPEOF
else
  echo "      CanaryIslandsMap.jsx ya existe"
fi

# Verificar si CustomizableDashboard existe
echo "[5/6] Verificando CustomizableDashboard.jsx..."
if [ ! -f "$PROD_DIR/frontend/src/components/dashboard/CustomizableDashboard.jsx" ]; then
  echo "      Creando CustomizableDashboard.jsx..."
  cat > "$PROD_DIR/frontend/src/components/dashboard/CustomizableDashboard.jsx" << 'DASHEOF'
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { LayoutDashboard, Settings2, GripVertical, Camera, Bell, Shield, HardDrive, BarChart3, Activity, Server, Network, Users, AlertTriangle, Clock, RefreshCw, Save, RotateCcw, Plus } from 'lucide-react';

const AVAILABLE_WIDGETS = [
  { id: 'device-stats', name: 'Estadísticas de Dispositivos', icon: Camera, size: 'small', category: 'monitoring' },
  { id: 'alerts-summary', name: 'Resumen de Alertas', icon: Bell, size: 'small', category: 'alerts' },
  { id: 'cra-status', name: 'Estado CRA', icon: Shield, size: 'small', category: 'security' },
  { id: 'dahua-status', name: 'Estado Grabadores', icon: HardDrive, size: 'small', category: 'monitoring' },
  { id: 'vpn-status', name: 'Estado VPN', icon: Network, size: 'small', category: 'network' },
  { id: 'system-resources', name: 'Recursos del Sistema', icon: Activity, size: 'medium', category: 'system' },
  { id: 'recent-alerts', name: 'Alertas Recientes', icon: AlertTriangle, size: 'large', category: 'alerts' },
  { id: 'uptime-chart', name: 'Gráfico de Uptime', icon: BarChart3, size: 'large', category: 'monitoring' },
  { id: 'users-online', name: 'Usuarios Conectados', icon: Users, size: 'small', category: 'users' },
  { id: 'server-health', name: 'Salud del Servidor', icon: Server, size: 'medium', category: 'system' },
  { id: 'quick-actions', name: 'Acciones Rápidas', icon: Plus, size: 'small', category: 'tools' },
  { id: 'clock', name: 'Reloj y Fecha', icon: Clock, size: 'small', category: 'tools' },
];

const DEFAULT_LAYOUT = ['device-stats', 'alerts-summary', 'cra-status', 'dahua-status', 'system-resources', 'recent-alerts'];

const WidgetContent = ({ widget, data }) => {
  const Icon = widget.icon;
  const renderContent = () => {
    switch(widget.id) {
      case 'device-stats': return (<div className="grid grid-cols-3 gap-2 text-center"><div><p className="text-2xl font-bold text-blue-600">{data?.total || 0}</p><p className="text-xs text-muted-foreground">Total</p></div><div><p className="text-2xl font-bold text-green-600">{data?.online || 0}</p><p className="text-xs text-muted-foreground">Online</p></div><div><p className="text-2xl font-bold text-red-600">{data?.offline || 0}</p><p className="text-xs text-muted-foreground">Offline</p></div></div>);
      case 'alerts-summary': return (<div className="space-y-2"><div className="flex justify-between"><span className="text-sm">Críticas</span><Badge variant="destructive">{data?.critical || 0}</Badge></div><div className="flex justify-between"><span className="text-sm">Warnings</span><Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{data?.warnings || 0}</Badge></div><div className="flex justify-between"><span className="text-sm">Info</span><Badge variant="outline">{data?.info || 0}</Badge></div></div>);
      case 'cra-status': return (<div className="text-center"><div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${data?.connected ? 'bg-green-100' : 'bg-red-100'}`}><Shield className={`w-6 h-6 ${data?.connected ? 'text-green-600' : 'text-red-600'}`} /></div><p className="mt-2 font-medium">{data?.connected ? 'Conectada' : 'Desconectada'}</p><p className="text-xs text-muted-foreground">{data?.events || 0} eventos hoy</p></div>);
      case 'clock': return (<div className="text-center"><p className="text-3xl font-bold">{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p><p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>);
      case 'system-resources': return (<div className="space-y-3"><div><div className="flex justify-between text-sm mb-1"><span>CPU</span><span>{data?.cpu || 0}%</span></div><div className="h-2 bg-gray-200 rounded-full"><div className="h-2 bg-blue-500 rounded-full" style={{width: `${data?.cpu || 0}%`}}></div></div></div><div><div className="flex justify-between text-sm mb-1"><span>RAM</span><span>{data?.ram || 0}%</span></div><div className="h-2 bg-gray-200 rounded-full"><div className="h-2 bg-green-500 rounded-full" style={{width: `${data?.ram || 0}%`}}></div></div></div><div><div className="flex justify-between text-sm mb-1"><span>Disco</span><span>{data?.disk || 0}%</span></div><div className="h-2 bg-gray-200 rounded-full"><div className="h-2 bg-purple-500 rounded-full" style={{width: `${data?.disk || 0}%`}}></div></div></div></div>);
      default: return (<div className="text-center text-muted-foreground py-4"><Icon className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-sm">Widget disponible</p></div>);
    }
  };
  return (<Card className="h-full"><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Icon className="w-4 h-4" />{widget.name}</CardTitle></CardHeader><CardContent>{renderContent()}</CardContent></Card>);
};

const CustomizableDashboard = ({ deviceStats, alertStats, systemStats, craStatus }) => {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('watchtower_dashboard_layout');
    if (saved) { try { setLayout(JSON.parse(saved)); } catch (e) { console.error('Error loading dashboard layout:', e); } }
  }, []);

  const saveLayout = useCallback(() => { localStorage.setItem('watchtower_dashboard_layout', JSON.stringify(layout)); toast.success('Dashboard guardado'); setShowConfig(false); }, [layout]);
  const resetLayout = useCallback(() => { setLayout(DEFAULT_LAYOUT); localStorage.removeItem('watchtower_dashboard_layout'); toast.success('Dashboard restaurado'); }, []);
  const toggleWidget = (widgetId) => { setLayout(prev => prev.includes(widgetId) ? prev.filter(id => id !== widgetId) : [...prev, widgetId]); };
  const moveWidget = (index, direction) => { setLayout(prev => { const newLayout = [...prev]; const newIndex = index + direction; if (newIndex >= 0 && newIndex < newLayout.length) { [newLayout[index], newLayout[newIndex]] = [newLayout[newIndex], newLayout[index]]; } return newLayout; }); };
  const getWidgetData = (widgetId) => { switch(widgetId) { case 'device-stats': return deviceStats; case 'alerts-summary': return alertStats; case 'system-resources': return systemStats; case 'cra-status': return craStatus; default: return {}; } };
  const activeWidgets = layout.map(id => AVAILABLE_WIDGETS.find(w => w.id === id)).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-blue-600" /><h2 className="text-lg font-semibold">Mi Dashboard</h2><Badge variant="outline">{activeWidgets.length} widgets</Badge></div>
        <Dialog open={showConfig} onOpenChange={setShowConfig}>
          <DialogTrigger asChild><Button variant="outline" size="sm"><Settings2 className="w-4 h-4 mr-2" />Personalizar</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5" />Personalizar Dashboard</DialogTitle><DialogDescription>Selecciona y ordena los widgets que quieres ver</DialogDescription></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div><h4 className="font-medium mb-2">Widgets Disponibles</h4><ScrollArea className="h-[300px] pr-2"><div className="space-y-2">{AVAILABLE_WIDGETS.map(widget => { const Icon = widget.icon; const isActive = layout.includes(widget.id); return (<div key={widget.id} className={`flex items-center justify-between p-3 rounded-lg border ${isActive ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}><div className="flex items-center gap-2"><Icon className="w-4 h-4" /><span className="text-sm">{widget.name}</span></div><Switch checked={isActive} onCheckedChange={() => toggleWidget(widget.id)} /></div>); })}</div></ScrollArea></div>
              <div><h4 className="font-medium mb-2">Orden de Widgets ({layout.length})</h4><ScrollArea className="h-[300px] pr-2"><div className="space-y-2">{layout.map((widgetId, index) => { const widget = AVAILABLE_WIDGETS.find(w => w.id === widgetId); if (!widget) return null; const Icon = widget.icon; return (<div key={widgetId} className="flex items-center justify-between p-3 rounded-lg border bg-white"><div className="flex items-center gap-2"><GripVertical className="w-4 h-4 text-gray-400" /><Icon className="w-4 h-4" /><span className="text-sm">{widget.name}</span></div><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveWidget(index, -1)} disabled={index === 0}>↑</Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveWidget(index, 1)} disabled={index === layout.length - 1}>↓</Button></div></div>); })}</div></ScrollArea></div>
            </div>
            <DialogFooter className="flex justify-between"><Button variant="outline" onClick={resetLayout}><RotateCcw className="w-4 h-4 mr-2" />Restaurar</Button><Button onClick={saveLayout}><Save className="w-4 h-4 mr-2" />Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{activeWidgets.map(widget => (<div key={widget.id} className={`${widget.size === 'large' ? 'md:col-span-2' : ''}`}><WidgetContent widget={widget} data={getWidgetData(widget.id)} /></div>))}</div>
      {activeWidgets.length === 0 && (<Card className="p-8 text-center"><LayoutDashboard className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">Dashboard vacío</h3><p className="text-sm text-muted-foreground mb-4">Personaliza tu dashboard añadiendo widgets</p><Button onClick={() => setShowConfig(true)}><Plus className="w-4 h-4 mr-2" />Añadir Widgets</Button></Card>)}
    </div>
  );
};

export default CustomizableDashboard;
DASHEOF
else
  echo "      CustomizableDashboard.jsx ya existe"
fi

# Actualizar App.js con los nuevos imports y tabs
echo "[6/6] Actualizando App.js..."

# Añadir imports si no existen
if ! grep -q "import CanaryIslandsMap" "$PROD_DIR/frontend/src/App.js"; then
  sed -i '/import MobileDashboard/a import CanaryIslandsMap from "@/components/maps/CanaryIslandsMap";' "$PROD_DIR/frontend/src/App.js"
  echo "      - Import CanaryIslandsMap añadido"
fi

if ! grep -q "import CustomizableDashboard" "$PROD_DIR/frontend/src/App.js"; then
  sed -i '/import CanaryIslandsMap/a import CustomizableDashboard from "@/components/dashboard/CustomizableDashboard";' "$PROD_DIR/frontend/src/App.js"
  echo "      - Import CustomizableDashboard añadido"
fi

if ! grep -q "import VideoTutorials" "$PROD_DIR/frontend/src/App.js"; then
  sed -i '/import CustomizableDashboard/a import VideoTutorials from "@/components/help/VideoTutorials";' "$PROD_DIR/frontend/src/App.js"
  echo "      - Import VideoTutorials añadido"
fi

# Añadir PlayCircle al import de lucide-react si no existe
if ! grep -q "PlayCircle" "$PROD_DIR/frontend/src/App.js"; then
  sed -i 's/Video, Menu/Video, Menu, PlayCircle/' "$PROD_DIR/frontend/src/App.js"
  echo "      - PlayCircle añadido a imports"
fi

echo ""
echo "========================================"
echo "  Archivos actualizados correctamente"
echo "========================================"
echo ""
echo "IMPORTANTE: Los tabs (Mapa, Mi Dashboard, Tutoriales)"
echo "deben añadirse manualmente a App.js si no existen."
echo ""
echo "Ejecuta estos comandos para completar:"
echo ""
echo "  cd $PROD_DIR/frontend"
echo "  npm run build"
echo "  sudo systemctl restart siempria-frontend.service"
echo ""
echo "========================================"
