/**
 * LiveViewer - Real-time camera viewer with drag & drop grid
 * Supports MJPEG streams from Mobotix cameras
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { 
  Video, VideoOff, Maximize2, Minimize2, Grid3X3, Grid2X2, 
  ExternalLink, X, Camera, Building2, Users, RefreshCw,
  ChevronRight, ChevronDown, Play, Square, Monitor
} from 'lucide-react';

const LiveViewer = ({ authAxios, devices = [], organizations = [], groups = [], isPopup = false, onClose }) => {
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [gridSize, setGridSize] = useState(4); // 4 = 2x2, 6 = 2x3
  const [filterOrg, setFilterOrg] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [expandedOrgs, setExpandedOrgs] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamMode, setStreamMode] = useState('snapshot'); // 'mjpeg' or 'snapshot'
  const [refreshInterval, setRefreshInterval] = useState(500); // ms for snapshot mode
  const containerRef = useRef(null);

  // Filter devices that are cameras
  const cameraDevices = devices.filter(d => 
    d.device_type_id === 'type-camera' || 
    d.camera_user || 
    d.camera_path
  );

  // Get filtered groups
  const filteredGroups = filterOrg === 'all' 
    ? groups 
    : groups.filter(g => g.organization_id === filterOrg);

  // Get filtered devices
  const filteredDevices = cameraDevices.filter(d => {
    if (filterGroup !== 'all') return d.group_id === filterGroup;
    if (filterOrg !== 'all') {
      const group = groups.find(g => g.id === d.group_id);
      return group && group.organization_id === filterOrg;
    }
    return true;
  });

  // Group devices by organization and group for tree view
  const deviceTree = organizations.map(org => {
    const orgGroups = groups.filter(g => g.organization_id === org.id);
    return {
      ...org,
      groups: orgGroups.map(grp => ({
        ...grp,
        devices: cameraDevices.filter(d => d.group_id === grp.id)
      })).filter(grp => grp.devices.length > 0)
    };
  }).filter(org => org.groups.length > 0);

  const toggleOrg = (orgId) => {
    setExpandedOrgs(prev => ({ ...prev, [orgId]: !prev[orgId] }));
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleDevice = (deviceId) => {
    setSelectedDevices(prev => {
      if (prev.includes(deviceId)) {
        return prev.filter(id => id !== deviceId);
      } else if (prev.length < gridSize) {
        return [...prev, deviceId];
      } else {
        toast.warning(`Máximo ${gridSize} cámaras en el grid actual`);
        return prev;
      }
    });
  };

  const selectAllInGroup = (groupId) => {
    const groupDevices = cameraDevices.filter(d => d.group_id === groupId);
    const deviceIds = groupDevices.map(d => d.id).slice(0, gridSize);
    setSelectedDevices(deviceIds);
  };

  const clearAll = () => {
    setSelectedDevices([]);
  };

  const openPopup = () => {
    const popup = window.open(
      `${window.location.origin}?view=live-viewer`,
      'LiveViewer',
      'width=1280,height=800,menubar=no,toolbar=no,location=no,status=no'
    );
    if (popup) {
      popup.focus();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Drag and drop handlers
  const [draggedId, setDraggedId] = useState(null);

  const handleDragStart = (e, deviceId) => {
    setDraggedId(deviceId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (draggedId && draggedId !== targetId) {
      setSelectedDevices(prev => {
        const newOrder = [...prev];
        const draggedIndex = newOrder.indexOf(draggedId);
        const targetIndex = newOrder.indexOf(targetId);
        if (draggedIndex !== -1 && targetIndex !== -1) {
          newOrder.splice(draggedIndex, 1);
          newOrder.splice(targetIndex, 0, draggedId);
        }
        return newOrder;
      });
    }
    setDraggedId(null);
  };

  const getGridCols = () => {
    if (gridSize <= 2) return 'grid-cols-2';
    if (gridSize <= 4) return 'grid-cols-2';
    return 'grid-cols-3';
  };

  return (
    <div ref={containerRef} className={`flex h-full ${isPopup ? 'min-h-screen' : ''} bg-background`}>
      {/* Sidebar - Camera selector */}
      <div className={`w-72 border-r flex flex-col ${isFullscreen ? 'hidden' : ''}`}>
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Video className="w-5 h-5" />
            Visor en Directo
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Selecciona hasta {gridSize} cámaras
          </p>
        </div>

        {/* Filters */}
        <div className="p-3 border-b space-y-2">
          <Select value={filterOrg} onValueChange={(v) => { setFilterOrg(v); setFilterGroup('all'); }}>
            <SelectTrigger className="h-8 text-xs">
              <Building2 className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Centro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los centros</SelectItem>
              {organizations.map(org => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger className="h-8 text-xs">
              <Users className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los grupos</SelectItem>
              {filteredGroups.map(grp => (
                <SelectItem key={grp.id} value={grp.id}>{grp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Device Tree */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {deviceTree.map(org => (
              <div key={org.id} className="mb-2">
                <button
                  onClick={() => toggleOrg(org.id)}
                  className="flex items-center gap-1 w-full p-2 text-sm font-medium hover:bg-muted rounded"
                >
                  {expandedOrgs[org.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Building2 className="w-4 h-4" style={{ color: org.color }} />
                  <span className="truncate">{org.name}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {org.groups.reduce((acc, g) => acc + g.devices.length, 0)}
                  </Badge>
                </button>

                {expandedOrgs[org.id] && (
                  <div className="ml-4">
                    {org.groups.map(grp => (
                      <div key={grp.id} className="mb-1">
                        <button
                          onClick={() => toggleGroup(grp.id)}
                          className="flex items-center gap-1 w-full p-1.5 text-xs hover:bg-muted rounded"
                        >
                          {expandedGroups[grp.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          <Users className="w-3 h-3" />
                          <span className="truncate">{grp.name}</span>
                          <Badge variant="outline" className="ml-auto text-xs h-5">
                            {grp.devices.length}
                          </Badge>
                        </button>

                        {expandedGroups[grp.id] && (
                          <div className="ml-4 space-y-1">
                            <button
                              onClick={() => selectAllInGroup(grp.id)}
                              className="text-xs text-primary hover:underline px-2"
                            >
                              Seleccionar todas
                            </button>
                            {grp.devices.map(device => (
                              <label
                                key={device.id}
                                className={`flex items-center gap-2 p-1.5 text-xs rounded cursor-pointer hover:bg-muted ${
                                  selectedDevices.includes(device.id) ? 'bg-primary/10' : ''
                                }`}
                              >
                                <Checkbox
                                  checked={selectedDevices.includes(device.id)}
                                  onCheckedChange={() => toggleDevice(device.id)}
                                />
                                <Camera className={`w-3 h-3 ${device.status === 'online' ? 'text-green-500' : 'text-red-500'}`} />
                                <span className="truncate flex-1">{device.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {deviceTree.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No hay cámaras disponibles
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="p-3 border-t space-y-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={clearAll}>
              <X className="w-3 h-3 mr-1" />
              Limpiar
            </Button>
            {!isPopup && (
              <Button variant="outline" size="sm" onClick={openPopup}>
                <ExternalLink className="w-3 h-3" />
              </Button>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant={gridSize === 2 ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setGridSize(2)}
            >
              1x2
            </Button>
            <Button
              variant={gridSize === 4 ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setGridSize(4)}
            >
              2x2
            </Button>
            <Button
              variant={gridSize === 6 ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setGridSize(6)}
            >
              2x3
            </Button>
          </div>
        </div>
      </div>

      {/* Main content - Camera grid */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className={`flex items-center justify-between p-2 border-b ${isFullscreen ? 'bg-black/80 text-white absolute top-0 left-0 right-0 z-10' : ''}`}>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedDevices.length}/{gridSize} cámaras
            </Badge>
            <Select value={streamMode} onValueChange={setStreamMode}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="snapshot">Snapshot</SelectItem>
                <SelectItem value="mjpeg">MJPEG</SelectItem>
              </SelectContent>
            </Select>
            {streamMode === 'snapshot' && (
              <Select value={String(refreshInterval)} onValueChange={(v) => setRefreshInterval(Number(v))}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">1 FPS</SelectItem>
                  <SelectItem value="500">2 FPS</SelectItem>
                  <SelectItem value="333">3 FPS</SelectItem>
                  <SelectItem value="200">5 FPS</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            {isPopup && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Camera Grid */}
        <div className={`flex-1 p-4 ${isFullscreen ? 'bg-black pt-16' : 'bg-muted/30'}`}>
          {selectedDevices.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Monitor className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">Sin cámaras seleccionadas</h3>
                <p className="text-muted-foreground">
                  Selecciona cámaras del panel izquierdo para verlas aquí
                </p>
              </div>
            </div>
          ) : (
            <div className={`grid ${getGridCols()} gap-4 h-full`}>
              {selectedDevices.map(deviceId => {
                const device = devices.find(d => d.id === deviceId);
                if (!device) return null;

                return (
                  <CameraPanel
                    key={deviceId}
                    device={device}
                    streamMode={streamMode}
                    refreshInterval={refreshInterval}
                    draggable
                    onDragStart={(e) => handleDragStart(e, deviceId)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, deviceId)}
                    onRemove={() => toggleDevice(deviceId)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Individual camera panel component
const CameraPanel = ({ device, streamMode, refreshInterval, draggable, onDragStart, onDragOver, onDrop, onRemove }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef(null);
  const intervalRef = useRef(null);

  const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
  
  // Get auth token from localStorage
  const getAuthToken = () => {
    try {
      return localStorage.getItem('token') || '';
    } catch {
      return '';
    }
  };

  const getSnapshotUrl = () => {
    const token = getAuthToken();
    const timestamp = Date.now();
    return `${baseUrl}/api/camera-stream/snapshot/${device.id}?t=${timestamp}&token=${token}`;
  };

  // Snapshot polling for real-time view
  useEffect(() => {
    let isMounted = true;
    
    const updateSnapshot = async () => {
      if (!isMounted || !imgRef.current) return;
      
      try {
        const token = getAuthToken();
        const response = await fetch(`${baseUrl}/api/camera-stream/snapshot/${device.id}?t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          
          if (imgRef.current && isMounted) {
            // Revoke old URL to prevent memory leak
            if (imgRef.current.src && imgRef.current.src.startsWith('blob:')) {
              URL.revokeObjectURL(imgRef.current.src);
            }
            imgRef.current.src = url;
            setLoading(false);
            setError(false);
            setRetryCount(0);
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err) {
        console.error(`Camera ${device.name} error:`, err);
        if (isMounted) {
          setRetryCount(prev => prev + 1);
          if (retryCount > 5) {
            setError(true);
            setLoading(false);
          }
        }
      }
    };

    // Initial load
    updateSnapshot();
    
    // Set up polling
    intervalRef.current = setInterval(updateSnapshot, refreshInterval);

    return () => {
      isMounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Clean up blob URL
      if (imgRef.current?.src?.startsWith('blob:')) {
        URL.revokeObjectURL(imgRef.current.src);
      }
    };
  }, [device.id, device.name, refreshInterval, baseUrl, retryCount]);

  const handleRetry = () => {
    setError(false);
    setLoading(true);
    setRetryCount(0);
  };

  return (
    <div
      className="relative bg-black rounded-lg overflow-hidden group aspect-video"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-2 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-white text-sm font-medium truncate">{device.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-white/20"
            onClick={onRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-white/70 text-xs">{device.ip_address}</p>
      </div>

      {/* Loading state */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-white/50 animate-spin mx-auto mb-2" />
            <p className="text-white/50 text-sm">Conectando...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <VideoOff className="w-12 h-12 text-red-500/50 mx-auto mb-2" />
            <p className="text-white/70 text-sm">Sin señal</p>
            <p className="text-white/50 text-xs mb-2">{device.ip_address}</p>
            <Button variant="outline" size="sm" onClick={handleRetry} className="text-xs">
              <RefreshCw className="w-3 h-3 mr-1" />
              Reintentar
            </Button>
          </div>
        </div>
      )}

      {/* Video/Image stream */}
      <img
        ref={imgRef}
        alt={device.name}
        className="w-full h-full object-contain"
        style={{ display: error ? 'none' : 'block' }}
      />

      {/* Footer overlay with drag handle */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-center">
          <div className="bg-white/20 rounded px-3 py-1 text-white/70 text-xs cursor-move">
            ⋮⋮ Arrastrar para reordenar
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveViewer;
