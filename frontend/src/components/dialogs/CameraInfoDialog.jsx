/**
 * CameraInfoDialog - Shows camera configuration including FTP status and hemispheric views
 */
import { useState, useEffect } from 'react';
import { 
  Camera, Server, Upload, RefreshCw, Wifi, WifiOff, HardDrive, 
  Thermometer, Activity, Eye, Grid3X3, Circle, Square
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Skeleton } from '../ui/skeleton';
import { toast } from 'sonner';

const CameraInfoDialog = ({ open, onOpenChange, device, authAxios }) => {
  const [config, setConfig] = useState(null);
  const [ftpStatus, setFtpStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hemisphericView, setHemisphericView] = useState('full');
  const [hemisphericImage, setHemisphericImage] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);

  useEffect(() => {
    if (open && device?.id) {
      fetchCameraInfo();
    }
  }, [open, device?.id]);

  const fetchCameraInfo = async () => {
    setLoading(true);
    try {
      const [configRes, ftpRes] = await Promise.all([
        authAxios.get(`/camera-stream/camera-config/${device.id}`),
        authAxios.get(`/camera-stream/ftp-status/${device.id}`)
      ]);
      setConfig(configRes.data);
      setFtpStatus(ftpRes.data);
      
      // If hemispheric camera, load image
      if (configRes.data.is_hemispheric) {
        loadHemisphericImage('full');
      }
    } catch (error) {
      console.error('Error fetching camera info:', error);
      toast.error('Error al obtener información de la cámara');
    } finally {
      setLoading(false);
    }
  };

  const loadHemisphericImage = async (view) => {
    setLoadingImage(true);
    setHemisphericView(view);
    try {
      const response = await authAxios.get(`/camera-stream/hemispheric/${device.id}?view=${view}`, {
        responseType: 'blob'
      });
      const imageUrl = URL.createObjectURL(response.data);
      setHemisphericImage(imageUrl);
    } catch (error) {
      console.error('Error loading hemispheric image:', error);
      toast.error('Error al cargar imagen hemisférica');
    } finally {
      setLoadingImage(false);
    }
  };

  if (!device) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-600" />
            Información de Cámara - {device.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-sm">
            {device.ip_address}:{device.port}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="ftp" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ftp">
                <Upload className="w-4 h-4 mr-2" />FTP
              </TabsTrigger>
              <TabsTrigger value="config">
                <Server className="w-4 h-4 mr-2" />Configuración
              </TabsTrigger>
              {config?.is_hemispheric && (
                <TabsTrigger value="hemispheric">
                  <Eye className="w-4 h-4 mr-2" />Hemisférica
                </TabsTrigger>
              )}
            </TabsList>

            {/* FTP Status Tab */}
            <TabsContent value="ftp" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Estado FTP
                    </span>
                    <Badge variant={ftpStatus?.ftp_enabled ? "default" : "secondary"}>
                      {ftpStatus?.ftp_enabled ? "Activo" : "Inactivo"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Servidor FTP</p>
                      <p className="font-mono font-medium">{ftpStatus?.ftp_server || "No configurado"}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Ruta</p>
                      <p className="font-mono font-medium">{ftpStatus?.ftp_path || "No configurado"}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Usuario FTP</p>
                      <p className="font-mono font-medium">{ftpStatus?.ftp_user || "No configurado"}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Eventos FTP</p>
                      <Badge variant={ftpStatus?.event_enabled ? "default" : "outline"}>
                        {ftpStatus?.event_enabled ? "Habilitado" : "Deshabilitado"}
                      </Badge>
                    </div>
                  </div>

                  {/* FTP Status indicators */}
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-cyan-200">
                    <div className={`p-3 rounded-full ${ftpStatus?.ftp_enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {ftpStatus?.ftp_enabled ? (
                        <Wifi className="w-6 h-6 text-green-600" />
                      ) : (
                        <WifiOff className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">
                        {ftpStatus?.ftp_enabled ? "FTP Configurado y Activo" : "FTP No Activo"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {ftpStatus?.ftp_enabled 
                          ? "La cámara está enviando imágenes al servidor FTP"
                          : "La cámara no tiene FTP configurado o está deshabilitado"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Config Tab */}
            <TabsContent value="config" className="mt-4 space-y-4">
              {/* Connection Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Conexión
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Badge variant={config?.connection?.reachable ? "default" : "destructive"}>
                      {config?.connection?.reachable ? "Conectada" : "Sin conexión"}
                    </Badge>
                    <span className="font-mono text-sm">
                      {config?.connection?.protocol}://{config?.connection?.ip}:{config?.connection?.port}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* System Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Tipo</p>
                      <p className="font-medium">{config?.camera_type || "Desconocido"}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Firmware</p>
                      <p className="font-mono text-sm">{config?.system?.firmware || "N/A"}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Temperatura</p>
                      <p className="font-medium flex items-center gap-1">
                        <Thermometer className="w-4 h-4" />
                        {config?.system?.temperature || "N/A"}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Hemisférica</p>
                      <Badge variant={config?.is_hemispheric ? "default" : "outline"}>
                        {config?.is_hemispheric ? "Sí" : "No"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Storage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    Almacenamiento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">NAS</p>
                      <Badge variant={config?.storage?.nas_connected ? "default" : "outline"}>
                        {config?.storage?.nas_connected ? "Conectado" : "No conectado"}
                      </Badge>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Tarjeta SD</p>
                      <Badge variant={config?.storage?.sd_card ? "default" : "outline"}>
                        {config?.storage?.sd_card || "No detectada"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Events */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Eventos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <p className="text-xs text-muted-foreground mb-2">Detección Movimiento</p>
                      <Badge variant={config?.events?.motion_detection ? "default" : "outline"}>
                        {config?.events?.motion_detection ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <p className="text-xs text-muted-foreground mb-2">Entrada Alarma</p>
                      <Badge variant={config?.events?.alarm_input ? "default" : "outline"}>
                        {config?.events?.alarm_input ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <p className="text-xs text-muted-foreground mb-2">FTP en Evento</p>
                      <Badge variant={config?.events?.ftp_on_event ? "default" : "outline"}>
                        {config?.events?.ftp_on_event ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hemispheric View Tab */}
            {config?.is_hemispheric && (
              <TabsContent value="hemispheric" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Vista Hemisférica
                      </span>
                      <Button variant="outline" size="sm" onClick={() => loadHemisphericImage(hemisphericView)}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loadingImage ? 'animate-spin' : ''}`} />
                        Actualizar
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* View selector */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: 'full', label: 'Completa', icon: Circle },
                        { key: 'panorama', label: 'Panorama 360°', icon: Square },
                        { key: 'north', label: 'Norte', icon: Eye },
                        { key: 'south', label: 'Sur', icon: Eye },
                        { key: 'quad', label: 'Cuádruple', icon: Grid3X3 },
                        { key: 'surround', label: 'Envolvente', icon: Eye },
                      ].map(view => (
                        <Button
                          key={view.key}
                          variant={hemisphericView === view.key ? "default" : "outline"}
                          size="sm"
                          onClick={() => loadHemisphericImage(view.key)}
                          disabled={loadingImage}
                        >
                          <view.icon className="w-4 h-4 mr-2" />
                          {view.label}
                        </Button>
                      ))}
                    </div>

                    {/* Image display */}
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                      {loadingImage ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <RefreshCw className="w-8 h-8 text-white animate-spin" />
                        </div>
                      ) : hemisphericImage ? (
                        <img 
                          src={hemisphericImage} 
                          alt={`Vista ${hemisphericView}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-white/50">
                          <p>Selecciona una vista para cargar la imagen</p>
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2">
                        {hemisphericView.toUpperCase()}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground text-center">
                      Las cámaras hemisféricas Mobotix permiten diferentes vistas: 
                      fisheye completo, panorama 360°, vistas norte/sur, y cuádruple.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={fetchCameraInfo}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar Todo
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CameraInfoDialog;
