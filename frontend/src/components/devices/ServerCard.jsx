/**
 * ServerCard Component - Device card with image preview
 */
import { memo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Server, RefreshCw, Cctv, WifiOff, MapPin, FolderOpen, BarChart3, 
  Clock, Globe, Info, History, Copy, Edit, Trash2, Download, 
  ClipboardList, Phone, Cpu, Thermometer, HardDrive as HardDriveIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatusDot, StatusBadge } from '@/components/common/StatusBadges';

// Icon mapping
const ICON_MAP = {
  camera: Cctv, "hard-drive": HardDriveIcon, network: Server, router: Server,
  server: Server, monitor: Server, printer: Server, wifi: Server,
  shield: Server, box: Server, layers: Server
};

const getIcon = (iconName) => ICON_MAP[iconName] || Server;

const OFFLINE_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect fill='%23374151' width='400' height='200'/%3E%3Ctext x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-family='Arial' font-size='14'%3ECÁMARA OFFLINE%3C/text%3E%3Ctext x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' fill='%236B7280' font-family='Arial' font-size='11'%3EWatchTower by Siempria%3C/text%3E%3C/svg%3E";

const WHATSAPP_ALERT_NUMBER = "+34610557829";

// Firmware Badge with Popover
const FirmwareBadge = ({ device, authAxios, API }) => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  const isMobotix = device.brand?.toLowerCase().includes('mobotix');
  const firmwareVersion = device.firmware_version;
  const displayVersion = firmwareVersion ? firmwareVersion.replace('MX-', '') : null;
  
  const fetchInfo = async () => {
    if (info || loading) return;
    setLoading(true);
    try {
      const response = await authAxios.get(`/devices/${device.id}/mobotix-info`);
      if (response.data) {
        setInfo(response.data);
      }
    } catch (e) {
      console.error("Error fetching camera info:", e);
    }
    setLoading(false);
  };
  
  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (isOpen && !info) {
      fetchInfo();
    }
  };
  
  if (!isMobotix) return null;
  
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button 
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors cursor-pointer border border-blue-200 whitespace-nowrap max-w-full"
          title="Ver información del firmware"
        >
          <Cpu className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{displayVersion || 'Info'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            <div>
              <p className="font-semibold text-sm">{device.name}</p>
              <p className="text-xs opacity-90">Información del dispositivo</p>
            </div>
          </div>
        </div>
        
        <div className="p-3 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : info ? (
            <div className="space-y-3 text-sm">
              {info.system && Object.keys(info.system).length > 0 && (
                <div>
                  <p className="font-semibold text-blue-700 mb-1 flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> Sistema
                  </p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    {info.system.software && <><span className="text-muted-foreground">Firmware:</span><span className="font-mono font-medium">{info.system.software.split(' ')[0]}</span></>}
                    {info.system.model && <><span className="text-muted-foreground">Modelo:</span><span className="font-medium">{info.system.model.toUpperCase()}</span></>}
                  </div>
                </div>
              )}
              
              {info.sensors && Object.keys(info.sensors).length > 0 && (
                <div>
                  <p className="font-semibold text-orange-600 mb-1 flex items-center gap-1">
                    <Thermometer className="w-3 h-3" /> Sensores
                  </p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    {info.sensors.temperature && <><span className="text-muted-foreground">Temperatura:</span><span className="font-medium">{info.sensors.temperature.replace('&deg;', '°')}</span></>}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No se pudo obtener información</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Main ServerCard Component
export const ServerCard = memo(({ 
  device, 
  group, 
  deviceType, 
  onCheck, 
  onEdit, 
  onDelete, 
  onClone, 
  onViewHistory, 
  onMobotixInfo, 
  onCreateIncident, 
  canEdit,
  authAxios,
  API
}) => {
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageData, setImageData] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [captureTime, setCaptureTime] = useState(null);
  
  const handleCheck = async () => { 
    setIsChecking(true); 
    await onCheck(device.id); 
    setIsChecking(false); 
  };
  
  const TypeIcon = deviceType ? getIcon(deviceType.icon) : Server;

  const isCamera = device.device_type_id === "type-camera" || deviceType?.icon === "camera";
  const hasCameraConfig = !!(device.camera_path || (device.camera_user && device.camera_password));
  const canLoadImage = isCamera && device.status === "online" && (hasCameraConfig || device.image_url);

  // Lazy load image
  const cardRef = useCallback(node => {
    if (!node) return;
    
    const loadImage = async () => {
      if (imageData) return;
      setImageLoading(true);
      
      if (canLoadImage) {
        try {
          const response = await authAxios.get(`/image-proxy/${device.id}`, { responseType: 'blob' });
          if (response.data) {
            const url = URL.createObjectURL(response.data);
            setImageData(url);
            setImageError(false);
            setCaptureTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          }
        } catch (e) {
          console.error("Error loading image:", e);
          setImageData(OFFLINE_PLACEHOLDER);
          setImageError(true);
          setCaptureTime(null);
        }
      }
      setImageLoading(false);
    };
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !imageData && isCamera && canLoadImage) {
            loadImage();
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    
    observer.observe(node);
    return () => observer.disconnect();
  }, [imageData, isCamera, canLoadImage, device.id, authAxios]);

  useEffect(() => {
    if (device.status === "offline" && isCamera) {
      setImageData(OFFLINE_PLACEHOLDER);
      setCaptureTime(null);
      setImageLoading(false);
    } else if (device.image_url && !isCamera) {
      setImageData(device.image_url);
      setImageLoading(false);
    } else if (!isCamera) {
      setImageLoading(false);
    }
  }, [device.status, device.image_url, isCamera]);

  const showImage = isCamera && !imageLoading && (imageData || device.status === "offline");
  const displayImage = imageData || OFFLINE_PLACEHOLDER;

  const deviceWebUrl = `http://${device.ip_address}:${device.port}`;
  const cameraWebUrl = hasCameraConfig ? 
    `${device.camera_protocol || 'http'}://${device.ip_address}:${device.port}` : deviceWebUrl;

  const openDeviceInBrowser = () => {
    window.open(cameraWebUrl, '_blank');
  };

  return (
    <Card ref={cardRef} data-testid={`device-card-${device.id}`} className="server-card fade-in hover:-translate-y-0.5 transition-transform duration-200 overflow-hidden">
      {showImage && (
        <div className="aspect-[4/3] bg-muted overflow-hidden relative group">
          {imageLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <img 
              src={displayImage} 
              alt={device.name} 
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => { setImageError(true); setImageData(OFFLINE_PLACEHOLDER); }}
            />
          )}
          {hasCameraConfig && device.status === "online" && !imageLoading && (
            <>
              <div className="absolute bottom-1 left-1">
                {captureTime && <Badge variant="secondary" className="text-xs opacity-75 font-mono">{captureTime}</Badge>}
              </div>
              <div className="absolute bottom-1 right-1">
                <Badge variant="secondary" className="text-xs opacity-75"><Cctv className="w-3 h-3 mr-1" />Live</Badge>
              </div>
              <button 
                onClick={openDeviceInBrowser}
                className="absolute top-2 right-2 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                title="Abrir cámara en navegador"
              >
                <Globe className="w-4 h-4 text-white" />
              </button>
              {imageData && !imageError && (
                <a 
                  href={imageData}
                  download={`${device.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.jpg`}
                  className="absolute top-12 right-2 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  title="Descargar imagen"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="w-4 h-4 text-white" />
                </a>
              )}
            </>
          )}
          {device.status === "offline" && isCamera && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center text-white">
                <WifiOff className="w-8 h-8 mx-auto mb-1 opacity-75" />
                <span className="text-xs">Sin conexión</span>
              </div>
            </div>
          )}
        </div>
      )}
      <CardContent className={`p-5 ${showImage ? 'pt-4' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: deviceType?.color ? `${deviceType.color}20` : '#f4f4f5' }}>
                <TypeIcon className="w-5 h-5" style={{ color: deviceType?.color || '#6b7280' }} />
              </div>
              <StatusDot status={device.status} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground leading-tight">{device.name}</h3>
                <StatusBadge status={device.status} />
              </div>
              <p className="ip-text mt-0.5">{device.ip_address}:{device.port}</p>
            </div>
          </div>
        </div>

        {(device.brand || device.model) && (
          <div className="flex items-center gap-2 mt-2">
            <p className="text-xs text-muted-foreground font-medium">{[device.brand, device.model].filter(Boolean).join(" • ")}</p>
            <FirmwareBadge device={device} authAxios={authAxios} API={API} />
          </div>
        )}
        {device.location && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{device.location}</div>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {group && (
            <Badge variant="outline" className="text-xs" style={{ borderColor: group.color, color: group.color }}><FolderOpen className="w-3 h-3 mr-1" />{group.name}</Badge>
          )}
          {device.has_statistics && (
            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 border-purple-300"><BarChart3 className="w-3 h-3 mr-1" />Stats</Badge>
          )}
        </div>
        {device.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{device.description}</p>}
        
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{device.last_check ? new Date(device.last_check).toLocaleString() : "Sin verificar"}</span>
        </div>

        <Separator className="my-3" />

        <div className="flex flex-col gap-2">
          {device.status === 'offline' && (
            <a 
              href={`https://wa.me/${WHATSAPP_ALERT_NUMBER.replace('+', '')}?text=${encodeURIComponent(`🚨 *ALERTA - Dispositivo Offline*\n\n❌ *${device.name}*\nIP: ${device.ip_address}:${device.port}\n\n_WatchTower by Siempria_`)}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-medium transition-colors"
            >
              <Phone className="w-4 h-4" />
              {t('devices.alertWhatsApp', 'Avisar por WhatsApp')}
            </a>
          )}
          <Button data-testid={`check-device-${device.id}`} variant="outline" size="sm" onClick={handleCheck} disabled={isChecking} className="w-full">
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isChecking ? 'animate-spin-slow' : ''}`} />{t('devices.check')}
          </Button>
          <div className="flex items-center justify-center gap-1">
            <Button variant="ghost" size="sm" onClick={openDeviceInBrowser} title={t('devices.openInBrowser')}><Globe className="w-4 h-4" /></Button>
            {isCamera && (
              <Button variant="ghost" size="sm" onClick={() => onMobotixInfo(device)} title={t('devices.cameraInfo')}><Info className="w-4 h-4" /></Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onViewHistory(device)} title={t('devices.viewHistory')}><History className="w-4 h-4" /></Button>
            {onCreateIncident && (
              <Button variant="ghost" size="sm" onClick={() => onCreateIncident(device)} title={t('incidents.addIncident')} className="text-orange-600 hover:text-orange-700"><ClipboardList className="w-4 h-4" /></Button>
            )}
            {canEdit && (
              <>
                <Button variant="ghost" size="sm" onClick={() => onClone(device)} title={t('devices.cloneDevice')} className="text-blue-600 hover:text-blue-700"><Copy className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => onEdit(device)} title="Editar"><Edit className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(device)} title="Eliminar" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ServerCard.displayName = 'ServerCard';

export default ServerCard;
