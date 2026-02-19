/**
 * Maintenance Mode Panel - Manage devices in maintenance mode
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Wrench, Clock, X, PlayCircle, PauseCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

const MaintenancePanel = ({ authAxios, devices = [], onRefresh }) => {
  const [maintenanceDevices, setMaintenanceDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [duration, setDuration] = useState("60");
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

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

  useEffect(() => {
    fetchMaintenanceDevices();
    // Refresh every 60 seconds
    const interval = setInterval(fetchMaintenanceDevices, 60000);
    return () => clearInterval(interval);
  }, [fetchMaintenanceDevices]);

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
      await authAxios.post(`/devices/${selectedDevice.id}/maintenance`, {
        duration_minutes: parseInt(duration),
        reason: reason || null
      });
      toast.success(`Modo mantenimiento activado para ${selectedDevice.name}`);
      setShowModal(false);
      fetchMaintenanceDevices();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al activar mantenimiento");
    } finally {
      setProcessing(false);
    }
  };

  const handleDisableMaintenance = async (deviceId, deviceName) => {
    try {
      await authAxios.delete(`/devices/${deviceId}/maintenance`);
      toast.success(`Modo mantenimiento desactivado para ${deviceName}`);
      fetchMaintenanceDevices();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al desactivar mantenimiento");
    }
  };

  const formatRemainingTime = (minutes) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  // Filter devices that are NOT in maintenance
  const availableDevices = devices.filter(
    (d) => !maintenanceDevices.find((m) => m.id === d.id)
  );

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
                        onClick={() => handleDisableMaintenance(device.id, device.name)}
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PauseCircle className="w-5 h-5 text-blue-500" />
            Activar Modo Mantenimiento
          </CardTitle>
          <CardDescription>
            Selecciona un dispositivo para pausar temporalmente las alertas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableDevices.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No hay dispositivos disponibles
            </p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableDevices.map((device) => (
                  <div
                    key={device.id}
                    data-testid={`device-maintenance-card-${device.id}`}
                    className={`p-4 rounded-lg border transition-all hover:border-amber-500/50 hover:bg-amber-500/5 cursor-pointer ${
                      device.status === "online"
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-red-500/30 bg-red-500/5"
                    }`}
                    onClick={() => handleEnableMaintenance(device)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            device.status === "online" ? "bg-green-500" : "bg-red-500"
                          }`}
                        />
                        <span className="font-medium text-sm truncate max-w-[150px]">
                          {device.name}
                        </span>
                      </div>
                      <Wrench className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {device.ip}:{device.port}
                    </p>
                  </div>
                ))}
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
