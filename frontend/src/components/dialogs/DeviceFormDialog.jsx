/**
 * DeviceFormDialog - Form for creating/editing devices
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Camera, Activity, Shield, Server, Cctv, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// Icon mapping
const ICON_MAP = {
  camera: Cctv, "hard-drive": HardDrive, network: Server, router: Server,
  server: Server, monitor: Server, printer: Server, wifi: Server,
  shield: Server, box: Server, layers: Server
};
const getIcon = (iconName) => ICON_MAP[iconName] || Server;

export const DeviceFormDialog = ({ open, onOpenChange, device, organizations, groups, deviceTypes, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ 
    name: "", ip_address: "", port: 80, description: "", group_id: "", device_type_id: "", 
    brand: "", model: "", location: "", notes: "", image_url: "", 
    camera_protocol: "http", camera_user: "", camera_password: "", camera_path: "", 
    has_statistics: false, is_cra: false 
  });
  const [saving, setSaving] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize form only once when dialog opens
  useEffect(() => {
    if (open && !initialized) {
      if (device) {
        setFormData({ 
          name: device.name || "", ip_address: device.ip_address || "", port: device.port || 80, 
          description: device.description || "", group_id: device.group_id || "", 
          device_type_id: device.device_type_id || "", brand: device.brand || "", 
          model: device.model || "", location: device.location || "", notes: device.notes || "", 
          image_url: device.image_url || "",
          camera_protocol: device.camera_protocol || "http",
          camera_user: device.camera_user || "",
          camera_password: device.camera_password || "",
          camera_path: device.camera_path || "",
          has_statistics: device.has_statistics || false,
          is_cra: device.is_cra || false
        });
        const grp = groups.find(g => g.id === device.group_id);
        if (grp) setSelectedOrgId(grp.organization_id);
      } else {
        setFormData({ name: "", ip_address: "", port: 80, description: "", group_id: "", device_type_id: "", brand: "", model: "", location: "", notes: "", image_url: "", camera_protocol: "http", camera_user: "", camera_password: "", camera_path: "", has_statistics: false, is_cra: false });
        setSelectedOrgId("");
      }
      setInitialized(true);
    }
    if (!open) {
      setInitialized(false);
    }
  }, [open, device, groups, initialized]);

  const filteredGroups = selectedOrgId ? groups.filter(g => g.organization_id === selectedOrgId) : groups;
  const isCamera = formData.device_type_id === "type-camera" || deviceTypes.find(t => t.id === formData.device_type_id)?.icon === "camera";
  const isCloning = device && !device.id;

  // Build preview URL
  const previewUrl = formData.camera_user && formData.camera_password && formData.camera_path && formData.ip_address
    ? `${formData.camera_protocol}://${formData.camera_user}:****@${formData.ip_address}:${formData.port}${formData.camera_path}`
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.ip_address || !formData.port) { 
      toast.error("Completa los campos requeridos"); 
      return; 
    }
    setSaving(true);
    // When cloning, pass null as deviceId to create new device
    await onSave({ ...formData, group_id: formData.group_id || null, device_type_id: formData.device_type_id || null }, isCloning ? null : device?.id);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="device-form-dialog" className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCloning && <Copy className="w-5 h-5 text-blue-600" />}
            {isCloning ? t('devices.cloneDevice') : device?.id ? t('devices.editDevice') : t('devices.addDevice')}
          </DialogTitle>
          <DialogDescription>
            {isCloning 
              ? t('devices.cloneDescription', 'Modifica el puerto y nombre para crear el nuevo dispositivo')
              : t('devices.formDescription', 'Configura los datos del dispositivo de red')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label>{t('common.name')} *</Label>
              <Input data-testid="device-name-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('devices.ipAddress')} *</Label>
              <Input data-testid="device-ip-input" className="font-mono" value={formData.ip_address} onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('devices.port')} *</Label>
              <Input data-testid="device-port-input" type="number" className="font-mono" value={formData.port} onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 80 })} />
            </div>
            
            <div className="space-y-2">
              <Label>{t('devices.deviceType')}</Label>
              <Select value={formData.device_type_id || "none"} onValueChange={(v) => {
                const newTypeId = v === "none" ? "" : v;
                const selectedType = deviceTypes.find(t => t.id === newTypeId);
                const isNewCamera = selectedType?.icon === "camera" || newTypeId === "type-camera";
                
                if (isNewCamera && !formData.camera_path) {
                  setFormData({ 
                    ...formData, 
                    device_type_id: newTypeId,
                    camera_path: "/record/current.jpg",
                    camera_protocol: formData.camera_protocol || "http"
                  });
                } else {
                  setFormData({ ...formData, device_type_id: newTypeId });
                }
              }}>
                <SelectTrigger><SelectValue placeholder={t('devices.selectType', 'Seleccionar tipo')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('devices.noType', 'Sin tipo')}</SelectItem>
                  {deviceTypes.map((t) => { 
                    const Icon = getIcon(t.icon); 
                    return (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" style={{ color: t.color }} />
                          {t.name}
                        </div>
                      </SelectItem>
                    ); 
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('organizations.title', 'Organización')}</Label>
              <Select value={selectedOrgId || "none"} onValueChange={(v) => { setSelectedOrgId(v === "none" ? "" : v); setFormData({ ...formData, group_id: "" }); }}>
                <SelectTrigger><SelectValue placeholder={t('common.select', 'Seleccionar')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('common.all', 'Todas')}</SelectItem>
                  {organizations.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>{t('devices.group', 'Grupo')}</Label>
              <Select value={formData.group_id || "none"} onValueChange={(v) => setFormData({ ...formData, group_id: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="device-group-select"><SelectValue placeholder={t('devices.selectGroup', 'Sin grupo')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('devices.selectGroup', 'Sin grupo')}</SelectItem>
                  {filteredGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                        {g.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Camera fields - only show when type is camera */}
            {isCamera && (
              <>
                <Separator className="col-span-2" />
                <div className="col-span-2 flex items-center gap-2 text-sm font-medium text-purple-600">
                  <Camera className="w-4 h-4" />
                  Configuración de Cámara
                </div>
                <div className="space-y-2">
                  <Label>{t('devices.protocol', 'Protocolo')}</Label>
                  <Select value={formData.camera_protocol} onValueChange={(v) => setFormData({ ...formData, camera_protocol: v })}>
                    <SelectTrigger data-testid="camera-protocol-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="https">HTTPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('devices.cameraUser', 'Usuario cámara')}</Label>
                  <Input placeholder="admin" value={formData.camera_user} onChange={(e) => setFormData({ ...formData, camera_user: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('devices.cameraPassword', 'Contraseña cámara')}</Label>
                  <Input type="password" placeholder="••••••••" value={formData.camera_password} onChange={(e) => setFormData({ ...formData, camera_password: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>{t('devices.imagePath', 'Ruta de imagen')}</Label>
                  <div className="flex gap-2">
                    <Select value={formData.camera_path || "custom"} onValueChange={(v) => setFormData({ ...formData, camera_path: v === "custom" ? "" : v })}>
                      <SelectTrigger className="w-[200px]"><SelectValue placeholder={t('devices.selectPath', 'Seleccionar ruta')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="/record/current.jpg">{t('devices.pathMobotixRecord', 'Mobotix (record)')}</SelectItem>
                        <SelectItem value="/cgi-bin/image.jpg">{t('devices.pathMobotixCgi', 'Mobotix (cgi-bin)')}</SelectItem>
                        <SelectItem value="/snap.jpg">{t('devices.pathGeneric', 'Genérico (/snap.jpg)')}</SelectItem>
                        <SelectItem value="/jpg/image.jpg">{t('devices.pathAxis', 'Axis (/jpg/image.jpg)')}</SelectItem>
                        <SelectItem value="/Streaming/channels/1/picture">{t('devices.pathHikvision', 'Hikvision')}</SelectItem>
                        <SelectItem value="custom">{t('devices.pathCustom', 'Personalizada...')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="/ruta/imagen.jpg" 
                      className="font-mono flex-1" 
                      value={formData.camera_path} 
                      onChange={(e) => setFormData({ ...formData, camera_path: e.target.value })} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{t('devices.pathHint', 'Selecciona una ruta predefinida o escribe una personalizada')}</p>
                </div>
                {previewUrl && (
                  <div className="col-span-2 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">URL generada:</p>
                    <code className="text-xs font-mono break-all">{previewUrl}</code>
                  </div>
                )}
                {/* Mobotix Statistics checkbox */}
                <div className="col-span-2 flex items-center gap-3 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg">
                  <Switch 
                    id="has-statistics" 
                    checked={formData.has_statistics} 
                    onCheckedChange={(checked) => setFormData({ ...formData, has_statistics: checked })}
                  />
                  <div className="flex-1">
                    <Label htmlFor="has-statistics" className="cursor-pointer font-medium text-cyan-700">{t('devices.enableStatistics', 'Estadísticas MxAnalytics')}</Label>
                    <p className="text-xs text-cyan-600">{t('devices.statsHint', 'Habilita si la cámara tiene conteo de personas y mapa de calor (Mobotix C25/C26)')}</p>
                  </div>
                  <Activity className="w-5 h-5 text-cyan-500" />
                </div>
              </>
            )}

            <Separator className="col-span-2" />
            <p className="col-span-2 text-sm font-medium text-muted-foreground">{t('devices.additionalInfo', 'Información adicional')}</p>

            <div className="space-y-2">
              <Label>{t('devices.brand', 'Marca')}</Label>
              <Input placeholder={t('devices.brandPlaceholder', 'Ej: Hikvision, Synology')} value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t('devices.model', 'Modelo')}</Label>
              <Input placeholder={t('devices.modelPlaceholder', 'Ej: DS-2CD2143G2')} value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>{t('devices.location', 'Ubicación')}</Label>
              <Input placeholder={t('devices.locationPlaceholder', 'Ej: Oficina Madrid - Planta 2')} value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label>{t('common.description', 'Descripción')}</Label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>{t('common.notes', 'Notas')}</Label>
              <Textarea placeholder={t('common.notesPlaceholder', 'Notas internas, configuración...')} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
            </div>
            
            {/* CRA Checkbox */}
            <div className="col-span-2 flex items-center gap-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg">
              <Switch 
                id="is-cra" 
                checked={formData.is_cra} 
                onCheckedChange={(checked) => setFormData({ ...formData, is_cra: checked })}
              />
              <div className="flex-1">
                <Label htmlFor="is-cra" className="cursor-pointer font-medium text-red-700">Dispositivo CRA</Label>
                <p className="text-xs text-red-600">Marcar como dispositivo crítico (Central Receptora de Alarmas)</p>
              </div>
              <Shield className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button data-testid="save-device-btn" type="submit" disabled={saving}>{saving ? t('common.saving', 'Guardando...') : t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceFormDialog;
