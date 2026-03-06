/**
 * CanaryIslandsMap - Mapa interactivo de las Islas Canarias
 * Muestra dispositivos por isla con estadísticas y navegación
 */
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  MapPin, Camera, AlertTriangle, CheckCircle, 
  ZoomIn, ZoomOut, Maximize2, RefreshCw 
} from 'lucide-react';

// Canary Islands SVG paths and positions
const ISLANDS = [
  {
    id: 'lanzarote',
    name: 'Lanzarote',
    shortName: 'LZ',
    path: 'M 380 80 L 420 70 L 450 85 L 460 110 L 445 140 L 410 150 L 380 135 L 370 105 Z',
    center: { x: 415, y: 110 },
    color: '#3B82F6'
  },
  {
    id: 'fuerteventura',
    name: 'Fuerteventura',
    shortName: 'FV',
    path: 'M 320 130 L 350 120 L 370 140 L 375 180 L 365 230 L 340 260 L 310 250 L 300 200 L 305 160 Z',
    center: { x: 340, y: 190 },
    color: '#F59E0B'
  },
  {
    id: 'gran-canaria',
    name: 'Gran Canaria',
    shortName: 'GC',
    path: 'M 200 180 L 250 170 L 280 190 L 285 230 L 265 270 L 220 280 L 185 255 L 180 215 Z',
    center: { x: 232, y: 225 },
    color: '#10B981'
  },
  {
    id: 'tenerife',
    name: 'Tenerife',
    shortName: 'TF',
    path: 'M 80 160 L 130 145 L 170 160 L 175 200 L 155 245 L 110 260 L 65 240 L 55 195 Z',
    center: { x: 115, y: 200 },
    color: '#8B5CF6'
  },
  {
    id: 'la-gomera',
    name: 'La Gomera',
    shortName: 'LG',
    path: 'M 40 280 L 70 270 L 90 285 L 85 310 L 60 325 L 35 310 Z',
    center: { x: 62, y: 297 },
    color: '#EC4899'
  },
  {
    id: 'la-palma',
    name: 'La Palma',
    shortName: 'LP',
    path: 'M 15 120 L 45 100 L 70 115 L 75 160 L 55 200 L 25 195 L 10 155 Z',
    center: { x: 42, y: 150 },
    color: '#06B6D4'
  },
  {
    id: 'el-hierro',
    name: 'El Hierro',
    shortName: 'EH',
    path: 'M 5 320 L 35 310 L 50 330 L 40 355 L 15 355 L 5 340 Z',
    center: { x: 27, y: 335 },
    color: '#F97316'
  }
];

// Map island names to organization/location data
const getIslandFromLocation = (location) => {
  if (!location) return null;
  const loc = location.toLowerCase();
  
  if (loc.includes('lanzarote') || loc.includes('arrecife')) return 'lanzarote';
  if (loc.includes('fuerteventura') || loc.includes('puerto del rosario') || loc.includes('corralejo')) return 'fuerteventura';
  if (loc.includes('gran canaria') || loc.includes('las palmas') || loc.includes('maspalomas') || loc.includes('telde')) return 'gran-canaria';
  if (loc.includes('tenerife') || loc.includes('santa cruz') || loc.includes('la laguna') || loc.includes('adeje') || loc.includes('arona')) return 'tenerife';
  if (loc.includes('gomera') || loc.includes('san sebastian')) return 'la-gomera';
  if (loc.includes('palma') && !loc.includes('las palmas')) return 'la-palma';
  if (loc.includes('hierro') || loc.includes('valverde')) return 'el-hierro';
  
  return null;
};

const CanaryIslandsMap = ({ devices = [], organizations = [], onIslandClick, onDeviceClick }) => {
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [hoveredIsland, setHoveredIsland] = useState(null);
  const [zoom, setZoom] = useState(1);

  // Calculate stats per island
  const islandStats = useMemo(() => {
    const stats = {};
    
    ISLANDS.forEach(island => {
      stats[island.id] = {
        total: 0,
        online: 0,
        offline: 0,
        devices: []
      };
    });

    devices.forEach(device => {
      // Try to determine island from device location or organization
      let islandId = getIslandFromLocation(device.location);
      
      if (!islandId && device.organization_id) {
        const org = organizations.find(o => o.id === device.organization_id);
        if (org) {
          islandId = getIslandFromLocation(org.name) || getIslandFromLocation(org.location);
        }
      }

      if (islandId && stats[islandId]) {
        stats[islandId].total++;
        stats[islandId].devices.push(device);
        if (device.status === 'online') {
          stats[islandId].online++;
        } else {
          stats[islandId].offline++;
        }
      }
    });

    return stats;
  }, [devices, organizations]);

  const handleIslandClick = (island) => {
    setSelectedIsland(island.id === selectedIsland ? null : island.id);
    onIslandClick?.(island, islandStats[island.id]);
  };

  const totalStats = useMemo(() => {
    return {
      total: devices.length,
      online: devices.filter(d => d.status === 'online').length,
      offline: devices.filter(d => d.status !== 'online').length
    };
  }, [devices]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Mapa de Canarias
            </CardTitle>
            <CardDescription>
              Distribución de dispositivos por isla
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Camera className="w-3 h-3" />
              {totalStats.total} total
            </Badge>
            <Badge variant="default" className="gap-1 bg-green-600">
              <CheckCircle className="w-3 h-3" />
              {totalStats.online}
            </Badge>
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              {totalStats.offline}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Zoom controls */}
        <div className="flex justify-end gap-1 mb-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(2, z + 0.25))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(1)}>
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Map SVG */}
        <div className="relative bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg overflow-hidden" style={{ height: '400px' }}>
          <svg 
            viewBox="0 0 500 400" 
            className="w-full h-full"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.3s ease' }}
          >
            {/* Ocean background pattern */}
            <defs>
              <pattern id="waves" patternUnits="userSpaceOnUse" width="20" height="20">
                <path d="M0 10 Q5 5 10 10 T20 10" fill="none" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="500" height="400" fill="url(#waves)" />

            {/* Islands */}
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
                        <path
                          d={island.path}
                          fill={isSelected ? island.color : isHovered ? `${island.color}dd` : `${island.color}99`}
                          stroke={hasOffline ? '#EF4444' : island.color}
                          strokeWidth={isSelected ? 3 : hasOffline ? 2 : 1}
                          className="cursor-pointer transition-all duration-200"
                          style={{
                            filter: isSelected ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none',
                            transform: isSelected ? 'translateY(-2px)' : 'none'
                          }}
                          onClick={() => handleIslandClick(island)}
                          onMouseEnter={() => setHoveredIsland(island.id)}
                          onMouseLeave={() => setHoveredIsland(null)}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="p-3">
                        <div className="text-center">
                          <p className="font-bold">{island.name}</p>
                          <div className="flex gap-2 mt-1 justify-center">
                            <span className="text-xs text-green-600">{stats.online} online</span>
                            <span className="text-xs text-red-600">{stats.offline} offline</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Click para ver detalles
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {/* Island label */}
                    <text
                      x={island.center.x}
                      y={island.center.y - 15}
                      textAnchor="middle"
                      className="text-xs font-bold fill-white pointer-events-none"
                      style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {island.shortName}
                    </text>

                    {/* Device count badge */}
                    {stats.total > 0 && (
                      <g>
                        <circle
                          cx={island.center.x}
                          cy={island.center.y + 5}
                          r={12}
                          fill="white"
                          stroke={hasOffline ? '#EF4444' : '#10B981'}
                          strokeWidth={2}
                        />
                        <text
                          x={island.center.x}
                          y={island.center.y + 9}
                          textAnchor="middle"
                          className="text-xs font-bold pointer-events-none"
                          fill={hasOffline ? '#EF4444' : '#10B981'}
                        >
                          {stats.total}
                        </text>
                      </g>
                    )}

                    {/* Alert indicator for offline devices */}
                    {hasOffline && (
                      <circle
                        cx={island.center.x + 15}
                        cy={island.center.y - 10}
                        r={6}
                        fill="#EF4444"
                        className="animate-pulse"
                      />
                    )}
                  </g>
                );
              })}
            </TooltipProvider>

            {/* Compass */}
            <g transform="translate(450, 350)">
              <circle cx="0" cy="0" r="20" fill="white" stroke="#CBD5E1" strokeWidth="2" />
              <text x="0" y="-8" textAnchor="middle" className="text-xs font-bold fill-gray-600">N</text>
              <path d="M0 -15 L3 0 L0 -5 L-3 0 Z" fill="#EF4444" />
              <path d="M0 15 L3 0 L0 5 L-3 0 Z" fill="#CBD5E1" />
            </g>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur rounded-lg p-2 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Todo OK</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <span>Con alertas</span>
            </div>
          </div>
        </div>

        {/* Selected island details */}
        {selectedIsland && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {ISLANDS.find(i => i.id === selectedIsland)?.name}
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIsland(null)}>
                Cerrar
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 bg-white rounded">
                <p className="text-2xl font-bold">{islandStats[selectedIsland].total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <p className="text-2xl font-bold text-green-600">{islandStats[selectedIsland].online}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <p className="text-2xl font-bold text-red-600">{islandStats[selectedIsland].offline}</p>
                <p className="text-xs text-muted-foreground">Offline</p>
              </div>
            </div>

            {/* Device list for selected island */}
            {islandStats[selectedIsland].devices.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {islandStats[selectedIsland].devices.slice(0, 10).map((device, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white rounded text-sm cursor-pointer hover:bg-gray-50"
                    onClick={() => onDeviceClick?.(device)}
                  >
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-gray-500" />
                      <span className="truncate max-w-[150px]">{device.name}</span>
                    </div>
                    <Badge variant={device.status === 'online' ? 'default' : 'destructive'} className="text-xs">
                      {device.status}
                    </Badge>
                  </div>
                ))}
                {islandStats[selectedIsland].devices.length > 10 && (
                  <p className="text-xs text-center text-muted-foreground pt-2">
                    +{islandStats[selectedIsland].devices.length - 10} más
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CanaryIslandsMap;
