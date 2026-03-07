/**
 * LeafletCanaryMap - Mapa interactivo real de las Islas Canarias con Leaflet
 * Muestra dispositivos por isla usando OpenStreetMap
 */
import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, Camera, AlertTriangle, CheckCircle, 
  ZoomIn, ZoomOut, Maximize2, Layers, X
} from 'lucide-react';

// Fix for default marker icons in Leaflet with webpack
import 'leaflet/dist/leaflet.css';

// Custom marker icons
const createCustomIcon = (color, count, hasOffline) => {
  const borderColor = hasOffline ? '#EF4444' : color;
  const html = `
    <div style="
      background: ${color};
      border: 3px solid ${borderColor};
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      ${hasOffline ? 'animation: pulse 2s infinite;' : ''}
    ">
      ${count}
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); }
        50% { transform: scale(1.1); box-shadow: 0 4px 20px rgba(239, 68, 68, 0.7); }
      }
    </style>
  `;
  
  return L.divIcon({
    html,
    className: 'custom-marker-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

// Canary Islands with real coordinates
const ISLANDS = [
  {
    id: 'tenerife',
    name: 'Tenerife',
    shortName: 'TF',
    coords: [28.2916, -16.6291],
    color: '#8B5CF6',
    capital: 'Santa Cruz de Tenerife'
  },
  {
    id: 'gran-canaria',
    name: 'Gran Canaria',
    shortName: 'GC',
    coords: [27.9202, -15.5474],
    color: '#10B981',
    capital: 'Las Palmas de Gran Canaria'
  },
  {
    id: 'lanzarote',
    name: 'Lanzarote',
    shortName: 'LZ',
    coords: [29.0469, -13.6319],
    color: '#3B82F6',
    capital: 'Arrecife'
  },
  {
    id: 'fuerteventura',
    name: 'Fuerteventura',
    shortName: 'FV',
    coords: [28.3587, -14.0537],
    color: '#F59E0B',
    capital: 'Puerto del Rosario'
  },
  {
    id: 'la-palma',
    name: 'La Palma',
    shortName: 'LP',
    coords: [28.6835, -17.7642],
    color: '#06B6D4',
    capital: 'Santa Cruz de La Palma'
  },
  {
    id: 'la-gomera',
    name: 'La Gomera',
    shortName: 'LG',
    coords: [28.0916, -17.1133],
    color: '#EC4899',
    capital: 'San Sebastián de La Gomera'
  },
  {
    id: 'el-hierro',
    name: 'El Hierro',
    shortName: 'EH',
    coords: [27.7406, -18.0237],
    color: '#F97316',
    capital: 'Valverde'
  }
];

// Map center for Canary Islands
const CANARY_CENTER = [28.2916, -15.8];
const DEFAULT_ZOOM = 8;

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

// Get island from group
const getIslandFromGroup = (device, groups) => {
  if (!device.group_id || !groups) return null;
  const group = groups.find(g => g.id === device.group_id || g._id === device.group_id);
  if (group && group.island) {
    return group.island;
  }
  return null;
};

// Map control component
const MapControls = ({ onZoomIn, onZoomOut, onReset }) => {
  const map = useMap();
  
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '10px', marginRight: '10px' }}>
      <div className="leaflet-control bg-white rounded-lg shadow-lg p-1 flex flex-col gap-1">
        <button 
          onClick={() => map.zoomIn()}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Acercar"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button 
          onClick={() => map.zoomOut()}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Alejar"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="border-t border-gray-200 my-1"></div>
        <button 
          onClick={() => map.setView(CANARY_CENTER, DEFAULT_ZOOM)}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Vista completa"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Fly to island on selection
const FlyToIsland = ({ island }) => {
  const map = useMap();
  
  useEffect(() => {
    if (island) {
      map.flyTo(island.coords, 10, { duration: 0.8 });
    }
  }, [island, map]);
  
  return null;
};

const LeafletCanaryMap = ({ devices = [], organizations = [], groups = [], onIslandClick, onDeviceClick }) => {
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [mapStyle, setMapStyle] = useState('streets'); // streets, satellite, terrain

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
      // First try to get island from group assignment
      let islandId = getIslandFromGroup(device, groups);
      
      // Then try device location
      if (!islandId) {
        islandId = getIslandFromLocation(device.location);
      }
      
      // Then try organization
      if (!islandId && device.organization_id) {
        const org = organizations.find(o => o.id === device.organization_id || o._id === device.organization_id);
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
  }, [devices, organizations, groups]);

  const handleIslandClick = (island) => {
    const newSelected = island.id === selectedIsland?.id ? null : island;
    setSelectedIsland(newSelected);
    onIslandClick?.(island, islandStats[island.id]);
  };

  const totalStats = useMemo(() => {
    return {
      total: devices.length,
      online: devices.filter(d => d.status === 'online').length,
      offline: devices.filter(d => d.status !== 'online').length
    };
  }, [devices]);

  // Map tile layers
  const tileLayers = {
    streets: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri'
    },
    terrain: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenTopoMap'
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Mapa de Canarias
            </CardTitle>
            <CardDescription>
              Distribución de dispositivos por isla - Vista interactiva
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Map style selector */}
            <div className="flex items-center gap-1 mr-2">
              <Button 
                variant={mapStyle === 'streets' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setMapStyle('streets')}
                className="text-xs px-2"
              >
                Calles
              </Button>
              <Button 
                variant={mapStyle === 'satellite' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setMapStyle('satellite')}
                className="text-xs px-2"
              >
                Satélite
              </Button>
              <Button 
                variant={mapStyle === 'terrain' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setMapStyle('terrain')}
                className="text-xs px-2"
              >
                Terreno
              </Button>
            </div>
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
      <CardContent className="p-0">
        <div className="relative" style={{ height: '500px' }}>
          <MapContainer
            center={CANARY_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              url={tileLayers[mapStyle].url}
              attribution={tileLayers[mapStyle].attribution}
            />
            
            {/* Custom controls */}
            <MapControls />
            
            {/* Fly to selected island */}
            {selectedIsland && <FlyToIsland island={selectedIsland} />}
            
            {/* Island markers */}
            {ISLANDS.map(island => {
              const stats = islandStats[island.id];
              const hasOffline = stats.offline > 0;
              const hasDevices = stats.total > 0;
              
              return (
                <Marker
                  key={island.id}
                  position={island.coords}
                  icon={createCustomIcon(
                    hasDevices ? island.color : '#9CA3AF',
                    stats.total,
                    hasOffline
                  )}
                  eventHandlers={{
                    click: () => handleIslandClick(island)
                  }}
                >
                  <Popup className="island-popup" maxWidth={300}>
                    <div className="p-2">
                      <h3 className="font-bold text-lg mb-1" style={{ color: island.color }}>
                        {island.name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">{island.capital}</p>
                      
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <p className="text-xl font-bold">{stats.total}</p>
                          <p className="text-xs text-gray-500">Total</p>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <p className="text-xl font-bold text-green-600">{stats.online}</p>
                          <p className="text-xs text-gray-500">Online</p>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded">
                          <p className="text-xl font-bold text-red-600">{stats.offline}</p>
                          <p className="text-xs text-gray-500">Offline</p>
                        </div>
                      </div>
                      
                      {stats.devices.length > 0 && (
                        <div className="border-t pt-2">
                          <p className="text-xs text-gray-500 mb-2">Dispositivos:</p>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {stats.devices.slice(0, 5).map((device, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center justify-between text-sm p-1 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={() => onDeviceClick?.(device)}
                              >
                                <span className="truncate max-w-[150px]">{device.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  device.status === 'online' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {device.status}
                                </span>
                              </div>
                            ))}
                            {stats.devices.length > 5 && (
                              <p className="text-xs text-center text-gray-400 pt-1">
                                +{stats.devices.length - 5} más
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur rounded-lg p-3 text-xs shadow-lg z-[1000]">
            <div className="font-semibold mb-2 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              Leyenda
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span>Todo OK</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
                <span>Con alertas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                <span>Sin dispositivos</span>
              </div>
            </div>
          </div>
          
          {/* Island selector chips */}
          <div className="absolute top-4 left-4 z-[1000] flex flex-wrap gap-1 max-w-[300px]">
            {ISLANDS.map(island => {
              const stats = islandStats[island.id];
              const isSelected = selectedIsland?.id === island.id;
              
              return (
                <button
                  key={island.id}
                  onClick={() => handleIslandClick(island)}
                  className={`
                    px-2 py-1 rounded-full text-xs font-medium transition-all
                    ${isSelected 
                      ? 'text-white shadow-lg scale-105' 
                      : 'bg-white/90 text-gray-700 hover:bg-white shadow'
                    }
                  `}
                  style={isSelected ? { backgroundColor: island.color } : {}}
                >
                  {island.shortName}
                  {stats.total > 0 && (
                    <span className={`ml-1 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                      ({stats.total})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Selected island details panel */}
        {selectedIsland && (
          <div className="border-t p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4" style={{ color: selectedIsland.color }} />
                {selectedIsland.name}
                <span className="text-sm font-normal text-gray-500">
                  ({selectedIsland.capital})
                </span>
              </h4>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedIsland(null)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <p className="text-3xl font-bold">{islandStats[selectedIsland.id].total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg shadow-sm">
                <p className="text-3xl font-bold text-green-600">{islandStats[selectedIsland.id].online}</p>
                <p className="text-sm text-gray-500">Online</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg shadow-sm">
                <p className="text-3xl font-bold text-red-600">{islandStats[selectedIsland.id].offline}</p>
                <p className="text-sm text-gray-500">Offline</p>
              </div>
            </div>

            {/* Device list for selected island */}
            {islandStats[selectedIsland.id].devices.length > 0 && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Dispositivos en {selectedIsland.name}:</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {islandStats[selectedIsland.id].devices.map((device, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                      onClick={() => onDeviceClick?.(device)}
                    >
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-gray-400" />
                        <span className="truncate max-w-[200px]">{device.name}</span>
                      </div>
                      <Badge 
                        variant={device.status === 'online' ? 'default' : 'destructive'} 
                        className="text-xs"
                      >
                        {device.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {islandStats[selectedIsland.id].devices.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay dispositivos asignados a esta isla</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeafletCanaryMap;
