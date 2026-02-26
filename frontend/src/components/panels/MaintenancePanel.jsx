/**
 * Maintenance Mode Panel - Manage devices in maintenance mode
 * Features: Search, Sort by status (offline first), Hide DVRs
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Wrench, Clock, X, PlayCircle, PauseCircle, AlertTriangle, CheckCircle, Search, WifiOff, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

const MaintenancePanel = ({ authAxios, devices = [], onRefresh }) => {
  const [maintenanceDevices, setMaintenanceDevices] = useState([]);
  const [dahuaDevices, setDahuaDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [duration, setDuration] = useState("60");
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMaintenanceDevices = useCallback(async () => {
    try {
      const response = await authAxios.get("/maintenance/devices");
      setMaintenanceDevices(response.data.devices || []);
    } catch (error) {
      console.error("Error fetching maintenance devices:", error);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  // Fetch Dahua/Grabadores devices
  const fetchDahuaDevices = useCallback(async () => {
    try {
      const response = await authAxios.get("/dahua/devices");
      // Handle both formats: array directly or {devices: []} or other object format
      let dahuaList = [];
      if (Array.isArray(response.data)) {
        dahuaList = response.data;
      } else if (response.data?.devices) {
        dahuaList = response.data.devices;
      } else if (response.data) {
        // Try to extract array from any property
        const possibleArrays = Object.values(response.data).filter(v => Array.isArray(v));
        if (possibleArrays.length > 0) {
          dahuaList = possibleArrays[0];
        }
      }
      
      console.log("[MaintenancePanel] Loaded", dahuaList.length, "dahua devices");
      
      // Transform dahua devices to match regular device format
      const transformedDahua = dahuaList.map(d => ({
        ...d,
        id: d.id || d.serial_number || d._id,
        name: d.name || d.alias || d.device_name || `Grabador ${(d.serial_number || d.id || '').slice(-6)}`,
        ip_address: d.host || d.ip || d.ip_address,
        ip: d.host || d.ip || d.ip_address,
        port: d.port || 37777,
        status: d.online === true || d.status === 'online' ? 'online' : 'offline',
        device_type_id: 'dahua_dvr',
        isDahua: true // Flag to identify dahua devices
      }));
      setDahuaDevices(transformedDahua);
    } catch (error) {
      console.error("Error fetching dahua devices:", error);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchMaintenanceDevices();
    fetchDahuaDevices();
    // Refresh every 60 seconds
    const interval = setInterval(() => {
      fetchMaintenanceDevices();
      fetchDahuaDevices();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchMaintenanceDevices, fetchDahuaDevices]);

  const handleEnableMaintenance = (device) => {
    setSelectedDevice(device);
    setDuration("60");
    setReason("");
    setShowModal(true);
  };

  const handleConfirmMaintenance = async () => {
    if (!selectedDevice) return;
    
    setProcessing(true);
    try {
      // -1 means indefinite maintenance
      const durationValue = duration === "indefinite" ? -1 : parseInt(duration);
      
      // Use different endpoint for Dahua devices
      const endpoint = selectedDevice.isDahua 
        ? `/dahua/devices/${selectedDevice.id}/maintenance`
        : `/devices/${selectedDevice.id}/maintenance`;
      
      await authAxios.post(endpoint, {
        duration_minutes: durationValue,
        reason: reason || null
      });
      toast.success(`Modo mantenimiento activado para ${selectedDevice.name}`);
      setShowModal(false);
      setSelectedDevice(null);
      setDuration("60");
      setReason("");
      fetchMaintenanceDevices();
      fetchDahuaDevices();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al activar mantenimiento");
    } finally {
      setProcessing(false);
    }
  };

  const handleDisableMaintenance = async (device) => {
    try {
      // Use different endpoint for Dahua devices
      const endpoint = device.isDahua 
        ? `/dahua/devices/${device.id}/maintenance`
        : `/devices/${device.id}/maintenance`;
      
      await authAxios.delete(endpoint);
      toast.success(`Modo mantenimiento desactivado para ${device.name}`);
      fetchMaintenanceDevices();
      fetchDahuaDevices();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al desactivar mantenimiento");
    }
  };
    }
  };

  const formatRemainingTime = (minutes) => {
    if (minutes === -1 || minutes === null) {
      return "Indefinido";
    }
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  // Filter devices that are NOT in maintenance and match search
  // Now includes ALL devices including DVRs/Grabadores (Dahua)
  const availableDevices = useMemo(() => {
    // Combine regular devices with Dahua devices
    const allDevices = [...devices, ...dahuaDevices];
    
    console.log("[MaintenancePanel] Total devices:", devices.length, "regulares +", dahuaDevices.length, "grabadores =", allDevices.length, "total");
    console.log("[MaintenancePanel] En mantenimiento:", maintenanceDevices.length);
    
    let filtered = allDevices.filter(
      (d) => !maintenanceDevices.find((m) => m.id === d.id)
    );
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        (d.name || '').toLowerCase().includes(query) ||
        (d.ip_address || d.ip || '').toLowerCase().includes(query) ||
        (d.location || '').toLowerCase().includes(query) ||
        (d.brand || '').toLowerCase().includes(query) ||
        (d.serial_number || '').toLowerCase().includes(query)
      );
    }
    
    // Sort: offline devices first, then by latency (high first), then alphabetically
    filtered.sort((a, b) => {
      // Offline devices first
      if (a.status === 'offline' && b.status !== 'offline') return -1;
      if (b.status === 'offline' && a.status !== 'offline') return 1;
      
      // High latency second (if latency > 500ms, consider it problematic)
      const aLatency = a.response_time || 0;
      const bLatency = b.response_time || 0;
      if (aLatency > 500 && bLatency <= 500) return -1;
      if (bLatency > 500 && aLatency <= 500) return 1;
      
      // Then by latency descending (higher latency = more problematic)
      if (aLatency !== bLatency) return bLatency - aLatency;
      
      // Finally alphabetically
      return (a.name || '').localeCompare(b.name || '');
    });
    
    return filtered;
  }, [devices, dahuaDevices, maintenanceDevices, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Devices in Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            Dispositivos en Mantenimiento
          </CardTitle>
          <CardDescription>
            Las alertas están deshabilitadas para estos dispositivos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
            </div>
          ) : maintenanceDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
              <p className="text-muted-foreground">No hay dispositivos en mantenimiento</p>
              <p className="text-sm text-muted-foreground">Todos los dispositivos están monitorizados activamente</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {maintenanceDevices.map((device) => (
                  <div
                    key={device.id}
                    data-testid={`maintenance-device-${device.id}`}
                    className="flex items-center justify-between p-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <Wrench className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <h4 className="font-medium">{device.name}</h4>
                        <p className="text-sm text-muted-foreground">{device.ip}:{device.port}</p>
                        {device.maintenance_reason && (
                          <p className="text-xs text-amber-600 mt-1">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            {device.maintenance_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatRemainingTime(device.maintenance_remaining_minutes || 0)}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`disable-maintenance-${device.id}`}
                        onClick={() => handleDisableMaintenance(device)}
                        className="text-green-600 border-green-500/30 hover:bg-green-500/10"
                      >
                        <PlayCircle className="w-4 h-4 mr-1" />
                        Reactivar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Available Devices to put in Maintenance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <PauseCircle className="w-5 h-5 text-blue-500" />
            Activar Modo Mantenimiento
          </CardTitle>
          <CardDescription>
            Selecciona un dispositivo para pausar temporalmente las alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="maintenance-search-input"
              placeholder="Buscar por nombre, IP, ubicación..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Device count and info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{availableDevices.length} dispositivos disponibles</span>
            {availableDevices.some(d => d.status === 'offline') && (
              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline primero
              </Badge>
            )}
          </div>

          {availableDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              {searchQuery ? (
                <>
                  <Search className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No se encontraron dispositivos</p>
                  <p className="text-sm text-muted-foreground">Intenta con otro término de búsqueda</p>
                </>
              ) : (
                <>
                  <CheckCircle className="w-10 h-10 text-green-500 mb-3" />
                  <p className="text-muted-foreground">No hay dispositivos disponibles</p>
                </>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[450px] pr-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableDevices.map((device) => {
                  const isOffline = device.status === 'offline';
                  const hasHighLatency = (device.response_time || 0) > 500;
                  const hasIssue = isOffline || hasHighLatency;
                  const isDVR = device.isDahua || (device.device_type_id || '').toLowerCase().includes('dahua');
                  const isNAS = (device.device_type_id || '').toLowerCase().includes('nas');
                  const isServer = (device.device_type_id || '').toLowerCase().includes('server');
                  
                  // Determine device type icon/label
                  let deviceTypeLabel = null;
                  if (isDVR) deviceTypeLabel = { text: 'DVR', color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' };
                  else if (isNAS) deviceTypeLabel = { text: 'NAS', color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' };
                  else if (isServer) deviceTypeLabel = { text: 'SRV', color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30' };
                  
                  return (
                    <div
                      key={device.id}
                      data-testid={`device-maintenance-card-${device.id}`}
                      className={`p-4 rounded-lg border transition-all hover:border-amber-500/50 hover:bg-amber-500/5 cursor-pointer ${
                        isOffline
                          ? "border-red-500/50 bg-red-500/10 ring-1 ring-red-500/30"
                          : hasHighLatency 
                          ? "border-orange-500/50 bg-orange-500/10"
                          : "border-green-500/30 bg-green-500/5"
                      }`}
                      onClick={() => handleEnableMaintenance(device)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isOffline ? (
                            <WifiOff className="w-4 h-4 text-red-500" />
                          ) : (
                            <div
                              className={`w-2 h-2 rounded-full ${
                                hasHighLatency ? "bg-orange-500" : "bg-green-500"
                              } ${!isOffline && "animate-pulse"}`}
                            />
                          )}
                          <span className="font-medium text-sm truncate max-w-[130px]">
                            {device.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {deviceTypeLabel && (
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${deviceTypeLabel.color}`}>
                              {deviceTypeLabel.text}
                            </Badge>
                          )}
                          {hasIssue && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                              isOffline ? "text-red-600 border-red-300" : "text-orange-600 border-orange-300"
                            }`}>
                              {isOffline ? "OFFLINE" : "LENTO"}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {device.ip_address || device.ip}{device.port ? `:${device.port}` : ''}
                      </p>
                      {device.location && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          📍 {device.location}
                        </p>
                      )}
                      {hasHighLatency && !isOffline && (
                        <p className="text-xs text-orange-600 mt-1">
                          ⏱️ {device.response_time}ms
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Mode Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-500" />
              Modo Mantenimiento
            </DialogTitle>
            <DialogDescription>
              Las alertas serán deshabilitadas temporalmente para este dispositivo
            </DialogDescription>
          </DialogHeader>

          {selectedDevice && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
                <h4 className="font-medium">{selectedDevice.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedDevice.ip}:{selectedDevice.port}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Duración del mantenimiento</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger data-testid="maintenance-duration-select">
                    <SelectValue placeholder="Seleccionar duración" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                    <SelectItem value="240">4 horas</SelectItem>
                    <SelectItem value="480">8 horas</SelectItem>
                    <SelectItem value="1440">24 horas</SelectItem>
                    <SelectItem value="2880">48 horas</SelectItem>
                    <SelectItem value="10080">1 semana</SelectItem>
                    <SelectItem value="indefinite" className="font-bold text-amber-600">♾️ Indefinido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Razón (opcional)</Label>
                <Textarea
                  data-testid="maintenance-reason-input"
                  placeholder="Ej: Actualización de firmware, cambio de disco, etc."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button
              data-testid="confirm-maintenance-btn"
              onClick={handleConfirmMaintenance}
              disabled={processing}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {processing ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
              ) : (
                <Wrench className="w-4 h-4 mr-2" />
              )}
              Activar Mantenimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaintenancePanel;
