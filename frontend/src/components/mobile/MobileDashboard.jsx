/**
 * MobileDashboard - Vista móvil optimizada del dashboard
 * Se detecta automáticamente en dispositivos móviles
 * Presenta la información de forma compacta y accesible
 */
import React, { useState, useMemo } from 'react';
import { 
  Monitor, Wifi, WifiOff, AlertTriangle, Building2, Clock,
  Camera, HardDrive, Server, Router, Shield, Bell, 
  ChevronRight, RefreshCw, Eye, X, Menu, Home, Settings,
  Activity, Wrench, ClipboardList, MapPin, Phone, Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// Icon map for device types
const ICON_MAP = {
  camera: Camera,
  'hard-drive': HardDrive,
  server: Server,
  router: Router,
  shield: Shield,
  monitor: Monitor,
  default: Monitor
};

const getDeviceIcon = (iconName) => ICON_MAP[iconName] || ICON_MAP.default;

const MobileDashboard = ({
  devices = [],
  organizations = [],
  groups = [],
  alerts = [],
  deviceTypes = [],
  user,
  onDeviceClick,
  onRefresh,
  onClose,
  onCreateIncident,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Calculate stats
  const stats = useMemo(() => {
    const online = devices.filter(d => d.status === 'online').length;
    const offline = devices.filter(d => d.status === 'offline').length;
    const total = devices.length;
    const craDevices = devices.filter(d => d.is_cra);
    const craOnline = craDevices.filter(d => d.status === 'online').length;
    const craTotal = craDevices.length;
    
    return { online, offline, total, craOnline, craTotal };
  }, [devices]);

  // Filter devices by search and organization
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      const matchesSearch = !searchTerm || 
        device.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.ip_address?.includes(searchTerm);
      const matchesOrg = !selectedOrg || 
        groups.find(g => g.id === device.group_id)?.organization_id === selectedOrg;
      return matchesSearch && matchesOrg;
    });
  }, [devices, searchTerm, selectedOrg, groups]);

  // Get offline devices
  const offlineDevices = useMemo(() => {
    return devices.filter(d => d.status === 'offline');
  }, [devices]);

  // Get recent alerts (last 10)
  const recentAlerts = useMemo(() => {
    return [...alerts]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);
  }, [alerts]);

  // Group devices by organization
  const devicesByOrg = useMemo(() => {
    const grouped = {};
    organizations.forEach(org => {
      const orgGroups = groups.filter(g => g.organization_id === org.id);
      const orgDevices = devices.filter(d => 
        orgGroups.some(g => g.id === d.group_id)
      );
      if (orgDevices.length > 0) {
        grouped[org.id] = {
          organization: org,
          devices: orgDevices,
          online: orgDevices.filter(d => d.status === 'online').length,
          offline: orgDevices.filter(d => d.status === 'offline').length,
          total: orgDevices.length
        };
      }
    });
    return grouped;
  }, [organizations, groups, devices]);

  const currentTime = new Date().toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20" data-testid="mobile-dashboard">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-slate-900 border-slate-800 text-white w-72">
                <SheetHeader>
                  <SheetTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-cyan-400" />
                    WatchTower
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-2">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-3 text-white hover:bg-slate-800"
                    onClick={() => { setActiveTab('overview'); setMenuOpen(false); }}
                  >
                    <Home className="w-4 h-4" />
                    Resumen
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-3 text-white hover:bg-slate-800"
                    onClick={() => { setActiveTab('devices'); setMenuOpen(false); }}
                  >
                    <Monitor className="w-4 h-4" />
                    Dispositivos
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-3 text-white hover:bg-slate-800"
                    onClick={() => { setActiveTab('alerts'); setMenuOpen(false); }}
                  >
                    <Bell className="w-4 h-4" />
                    Alertas
                    {recentAlerts.length > 0 && (
                      <Badge className="ml-auto bg-red-500 text-white">{recentAlerts.length}</Badge>
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-3 text-white hover:bg-slate-800"
                    onClick={() => { setActiveTab('organizations'); setMenuOpen(false); }}
                  >
                    <Building2 className="w-4 h-4" />
                    Organizaciones
                  </Button>
                </div>
                <div className="absolute bottom-6 left-4 right-4">
                  <div className="text-xs text-slate-500 text-center">
                    {user?.username} • {user?.role}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <div>
              <h1 className="font-bold text-lg">WatchTower</h1>
              <p className="text-xs text-slate-400">{currentTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onRefresh}
              disabled={loading}
              className="text-white"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </Button>
            {onClose && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onClose}
                className="text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-800 rounded-lg p-2">
            <div className="flex items-center justify-center gap-1 text-green-400">
              <Wifi className="w-4 h-4" />
              <span className="font-bold text-lg">{stats.online}</span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase">Online</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-2">
            <div className="flex items-center justify-center gap-1 text-red-400">
              <WifiOff className="w-4 h-4" />
              <span className="font-bold text-lg">{stats.offline}</span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase">Offline</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-2">
            <div className="flex items-center justify-center gap-1 text-cyan-400">
              <Monitor className="w-4 h-4" />
              <span className="font-bold text-lg">{stats.total}</span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase">Total</p>
          </div>
        </div>
        {stats.craTotal > 0 && (
          <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">CRA</span>
            </div>
            <Badge variant="outline" className={cn(
              "text-xs",
              stats.craOnline === stats.craTotal ? "border-green-500 text-green-400" : "border-red-500 text-red-400"
            )}>
              {stats.craOnline}/{stats.craTotal}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-slate-800 border border-slate-700">
            <TabsTrigger value="overview" className="flex-1 text-xs data-[state=active]:bg-cyan-600">
              Resumen
            </TabsTrigger>
            <TabsTrigger value="devices" className="flex-1 text-xs data-[state=active]:bg-cyan-600">
              Dispositivos
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex-1 text-xs data-[state=active]:bg-cyan-600">
              Alertas
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Offline Devices Alert */}
            {offlineDevices.length > 0 && (
              <Card className="bg-red-500/10 border-red-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-4 h-4" />
                    Dispositivos Offline ({offlineDevices.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="h-[150px]">
                    {offlineDevices.slice(0, 5).map(device => (
                      <div 
                        key={device.id}
                        className="flex items-center justify-between py-2 border-b border-red-500/20 last:border-0"
                        onClick={() => onDeviceClick?.(device)}
                      >
                        <div className="flex items-center gap-2">
                          <WifiOff className="w-4 h-4 text-red-400" />
                          <div>
                            <p className="text-sm font-medium text-white">{device.name}</p>
                            <p className="text-xs text-slate-400">{device.ip_address}</p>
                          </div>
                        </div>
                        {device.is_cra && (
                          <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">CRA</Badge>
                        )}
                      </div>
                    ))}
                    {offlineDevices.length > 5 && (
                      <Button 
                        variant="ghost" 
                        className="w-full text-xs text-slate-400 mt-2"
                        onClick={() => setActiveTab('devices')}
                      >
                        Ver todos ({offlineDevices.length})
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Organizations Summary */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-white">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  Organizaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-[200px]">
                  {Object.values(devicesByOrg).map(({ organization, online, offline, total }) => (
                    <div 
                      key={organization.id}
                      className="py-3 border-b border-slate-800 last:border-0"
                      onClick={() => {
                        setSelectedOrg(organization.id);
                        setActiveTab('devices');
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-white">{organization.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-green-400">{online}</span>
                          <span className="text-xs text-slate-500">/</span>
                          <span className="text-xs text-slate-400">{total}</span>
                        </div>
                      </div>
                      <Progress 
                        value={(online / total) * 100} 
                        className="h-1.5 bg-slate-700"
                      />
                      {offline > 0 && (
                        <p className="text-xs text-red-400 mt-1">
                          {offline} offline
                        </p>
                      )}
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-3 text-center">
                  <Camera className="w-6 h-6 mx-auto mb-1 text-blue-400" />
                  <p className="text-lg font-bold text-white">
                    {devices.filter(d => {
                      const type = deviceTypes.find(t => t.id === d.device_type_id);
                      return type?.icon === 'camera';
                    }).length}
                  </p>
                  <p className="text-xs text-slate-400">Cámaras</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="p-3 text-center">
                  <Server className="w-6 h-6 mx-auto mb-1 text-purple-400" />
                  <p className="text-lg font-bold text-white">
                    {devices.filter(d => {
                      const type = deviceTypes.find(t => t.id === d.device_type_id);
                      return ['server', 'hard-drive'].includes(type?.icon);
                    }).length}
                  </p>
                  <p className="text-xs text-slate-400">Servidores/NAS</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Devices Tab */}
          <TabsContent value="devices" className="mt-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar dispositivos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Organization Filter */}
            {selectedOrg && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-purple-500 text-purple-400">
                  {organizations.find(o => o.id === selectedOrg)?.name}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-slate-400 h-6 px-2"
                  onClick={() => setSelectedOrg(null)}
                >
                  <X className="w-3 h-3 mr-1" />
                  Limpiar
                </Button>
              </div>
            )}

            {/* Device List */}
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-2">
                {filteredDevices.map(device => {
                  const deviceType = deviceTypes.find(t => t.id === device.device_type_id);
                  const DeviceIcon = getDeviceIcon(deviceType?.icon);
                  const group = groups.find(g => g.id === device.group_id);
                  
                  return (
                    <Card 
                      key={device.id}
                      className={cn(
                        "bg-slate-900 border-slate-800 cursor-pointer active:scale-[0.98] transition-transform",
                        device.status === 'offline' && "border-l-2 border-l-red-500"
                      )}
                      onClick={() => onDeviceClick?.(device)}
                      data-testid={`mobile-device-${device.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            device.status === 'online' ? "bg-green-500/10" : "bg-red-500/10"
                          )}>
                            <DeviceIcon className={cn(
                              "w-5 h-5",
                              device.status === 'online' ? "text-green-400" : "text-red-400"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-white truncate">{device.name}</p>
                              {device.is_cra && (
                                <Shield className="w-3 h-3 text-amber-400 flex-shrink-0" />
                              )}
                              {device.in_maintenance && (
                                <Wrench className="w-3 h-3 text-blue-400 flex-shrink-0" />
                              )}
                              {device.has_open_incident && (
                                <ClipboardList className="w-3 h-3 text-orange-400 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span className="font-mono">{device.ip_address}</span>
                              {group && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{group.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            device.status === 'online' ? "bg-green-400" : "bg-red-400 animate-pulse"
                          )} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {filteredDevices.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No se encontraron dispositivos</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-4">
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="space-y-2">
                {recentAlerts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay alertas recientes</p>
                  </div>
                ) : (
                  recentAlerts.map(alert => {
                    const device = devices.find(d => d.id === alert.device_id);
                    return (
                      <Card 
                        key={alert.id}
                        className="bg-slate-900 border-slate-800"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "p-2 rounded-lg flex-shrink-0",
                              alert.type === 'offline' ? "bg-red-500/10" : "bg-amber-500/10"
                            )}>
                              {alert.type === 'offline' ? (
                                <WifiOff className="w-4 h-4 text-red-400" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">
                                {device?.name || 'Dispositivo'}
                              </p>
                              <p className="text-xs text-slate-400">
                                {alert.message || (alert.type === 'offline' ? 'Dispositivo offline' : 'Alerta')}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-1">
                                {new Date(alert.created_at).toLocaleString('es-ES')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-4 py-2 z-50">
        <div className="grid grid-cols-4 gap-1">
          <Button 
            variant="ghost" 
            className={cn(
              "flex-col h-auto py-2 text-xs",
              activeTab === 'overview' ? "text-cyan-400" : "text-slate-400"
            )}
            onClick={() => setActiveTab('overview')}
          >
            <Home className="w-5 h-5 mb-1" />
            Inicio
          </Button>
          <Button 
            variant="ghost" 
            className={cn(
              "flex-col h-auto py-2 text-xs relative",
              activeTab === 'devices' ? "text-cyan-400" : "text-slate-400"
            )}
            onClick={() => setActiveTab('devices')}
          >
            <Monitor className="w-5 h-5 mb-1" />
            Dispositivos
            {stats.offline > 0 && (
              <span className="absolute top-1 right-1/4 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </Button>
          <Button 
            variant="ghost" 
            className={cn(
              "flex-col h-auto py-2 text-xs relative",
              activeTab === 'alerts' ? "text-cyan-400" : "text-slate-400"
            )}
            onClick={() => setActiveTab('alerts')}
          >
            <Bell className="w-5 h-5 mb-1" />
            Alertas
            {recentAlerts.length > 0 && (
              <span className="absolute top-1 right-1/4 w-2 h-2 bg-amber-500 rounded-full" />
            )}
          </Button>
          <Button 
            variant="ghost" 
            className={cn(
              "flex-col h-auto py-2 text-xs",
              activeTab === 'organizations' ? "text-cyan-400" : "text-slate-400"
            )}
            onClick={() => setActiveTab('organizations')}
          >
            <Building2 className="w-5 h-5 mb-1" />
            Orgs
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default MobileDashboard;
