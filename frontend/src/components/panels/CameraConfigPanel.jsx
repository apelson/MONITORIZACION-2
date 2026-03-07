/**
 * CameraConfigPanel - Configuration UI for brand counting cameras
 * Allows admins to add, edit, and delete cameras for the counting system
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  Camera, Plus, Trash2, Edit, RefreshCw, Save, X,
  MapPin, Building2, Wifi, WifiOff, Settings, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const ISLANDS = [
  { id: 'tenerife', name: 'Tenerife' },
  { id: 'gran-canaria', name: 'Gran Canaria' },
  { id: 'lanzarote', name: 'Lanzarote' },
  { id: 'fuerteventura', name: 'Fuerteventura' },
  { id: 'la-palma', name: 'La Palma' },
  { id: 'la-gomera', name: 'La Gomera' },
  { id: 'el-hierro', name: 'El Hierro' }
];

const CameraConfigPanel = ({ authAxios }) => {
  const [cameras, setCameras] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    camera_id: '',
    camera_name: '',
    brand_id: '',
    island: '',
    ip: '',
    port: 443,
    username: 'admin',
    password: '',
    enabled: true,
    counting_type: 'entrance'
  });

  // Fetch cameras and brands
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [camerasRes, brandsRes] = await Promise.all([
        authAxios.get('/brand-statistics/cameras-config'),
        authAxios.get('/brand-statistics/brands')
      ]);
      setCameras(camerasRes.data.cameras || []);
      setBrands(brandsRes.data.brands || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    }
    setLoading(false);
  }, [authAxios]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open dialog for new camera
  const handleAddNew = () => {
    setEditingCamera(null);
    setFormData({
      camera_id: '',
      camera_name: '',
      brand_id: brands[0]?.id || '',
      island: '',
      ip: '',
      port: 443,
      username: 'admin',
      password: '',
      enabled: true,
      counting_type: 'entrance'
    });
    setDialogOpen(true);
  };

  // Open dialog for editing
  const handleEdit = (camera) => {
    setEditingCamera(camera);
    setFormData({
      camera_id: camera.camera_id || '',
      camera_name: camera.camera_name || '',
      brand_id: camera.brand_id || '',
      island: camera.island || '',
      ip: camera.ip || '',
      port: camera.port || 443,
      username: camera.username || 'admin',
      password: camera.password || '',
      enabled: camera.enabled !== false,
      counting_type: camera.counting_type || 'entrance'
    });
    setDialogOpen(true);
  };

  // Save camera (create or update)
  const handleSave = async () => {
    if (!formData.camera_id || !formData.camera_name || !formData.brand_id || !formData.ip) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      await authAxios.post('/brand-statistics/cameras-config', formData);
      toast.success(editingCamera ? 'Cámara actualizada' : 'Cámara añadida');
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving camera:', error);
      toast.error(error.response?.data?.detail || 'Error al guardar la cámara');
    }
    setLoading(false);
  };

  // Delete camera
  const handleDelete = async (cameraId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cámara?')) {
      return;
    }

    setLoading(true);
    try {
      await authAxios.delete(`/brand-statistics/cameras-config/${cameraId}`);
      toast.success('Cámara eliminada');
      fetchData();
    } catch (error) {
      console.error('Error deleting camera:', error);
      toast.error('Error al eliminar la cámara');
    }
    setLoading(false);
  };

  // Test camera connection
  const handleTestConnection = async (camera) => {
    toast.info('Probando conexión...');
    try {
      const response = await authAxios.post('/brand-statistics/realtime/refresh');
      const cameraData = response.data?.cameras?.[camera.camera_id];
      if (cameraData?.status === 'online') {
        toast.success(`Conexión exitosa: ${cameraData.entries || 0} visitas`);
      } else {
        toast.warning('Cámara no respondió correctamente');
      }
    } catch (error) {
      toast.error('Error al probar la conexión');
    }
  };

  return (
    <div className="space-y-6" data-testid="camera-config-panel">
      {/* Header */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <Settings className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Configuración de Cámaras de Conteo</h2>
                <p className="text-slate-400 text-sm">
                  Gestiona las cámaras Mobotix para el sistema de conteo de visitas
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button onClick={handleAddNew} className="bg-cyan-600 hover:bg-cyan-700">
                <Plus className="w-4 h-4 mr-2" />
                Añadir Cámara
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cameras Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cameras.map((camera) => {
          const brand = brands.find(b => b.id === camera.brand_id);
          const island = ISLANDS.find(i => i.id === camera.island);
          
          return (
            <Card 
              key={camera.camera_id}
              className={`overflow-hidden ${!camera.enabled ? 'opacity-60' : ''}`}
              style={{ borderTopColor: brand?.color || '#666', borderTopWidth: '4px' }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Camera className="w-6 h-6 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{camera.camera_name}</h3>
                      <p className="text-sm text-muted-foreground font-mono">{camera.camera_id}</p>
                    </div>
                  </div>
                  
                  <Badge variant={camera.enabled ? 'default' : 'secondary'}>
                    {camera.enabled ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium" style={{ color: brand?.color }}>
                      {brand?.name || 'Sin marca'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{island?.name || camera.island || 'Sin ubicación'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Wifi className="w-4 h-4" />
                    <span className="font-mono">{camera.ip}:{camera.port}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(camera)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleTestConnection(camera)}
                  >
                    <Wifi className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDelete(camera.camera_id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {/* Empty state */}
        {cameras.length === 0 && !loading && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Camera className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay cámaras configuradas</p>
              <p className="text-sm mb-4">Añade una cámara para comenzar a contar visitas</p>
              <Button onClick={handleAddNew}>
                <Plus className="w-4 h-4 mr-2" />
                Añadir Primera Cámara
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Camera Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-cyan-600" />
              {editingCamera ? 'Editar Cámara' : 'Nueva Cámara de Conteo'}
            </DialogTitle>
            <DialogDescription>
              Configura los datos de conexión de la cámara Mobotix con MxAnalytics
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID de Cámara *</Label>
                <Input 
                  placeholder="cam-001"
                  value={formData.camera_id}
                  onChange={(e) => setFormData({ ...formData, camera_id: e.target.value })}
                  disabled={!!editingCamera}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input 
                  placeholder="Entrada Principal"
                  value={formData.camera_name}
                  onChange={(e) => setFormData({ ...formData, camera_name: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca *</Label>
                <Select 
                  value={formData.brand_id} 
                  onValueChange={(v) => setFormData({ ...formData, brand_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: brand.color }}
                          />
                          {brand.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Isla</Label>
                <Select 
                  value={formData.island || "none"} 
                  onValueChange={(v) => setFormData({ ...formData, island: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar isla" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    {ISLANDS.map(island => (
                      <SelectItem key={island.id} value={island.id}>{island.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Conexión</p>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label>IP / Hostname *</Label>
                  <Input 
                    placeholder="192.168.1.100"
                    value={formData.ip}
                    onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Puerto</Label>
                  <Input 
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 443 })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <Label>Usuario</Label>
                  <Input 
                    placeholder="admin"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Contraseña</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <Label className="cursor-pointer font-medium">Cámara activa</Label>
                <p className="text-xs text-muted-foreground">
                  Las cámaras inactivas no se consultan
                </p>
              </div>
              <Switch 
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {editingCamera ? 'Guardar Cambios' : 'Añadir Cámara'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CameraConfigPanel;
