/**
 * DeviceGallery - Component for managing device installation images
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner';
import { 
  Camera, Upload, Trash2, Edit, Calendar, User, Image as ImageIcon, 
  X, ZoomIn, Building2, MapPin, Download, Filter
} from 'lucide-react';

const DeviceGallery = ({ authAxios, devices = [], organizations = [], groups = [] }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Filters
  const [filterOrg, setFilterOrg] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterDevice, setFilterDevice] = useState('all');
  
  // Upload form
  const [uploadForm, setUploadForm] = useState({
    device_id: '',
    description: '',
    installation_date: new Date().toISOString().split('T')[0],
    file: null
  });
  
  // Edit form
  const [editForm, setEditForm] = useState({
    description: '',
    installation_date: ''
  });

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authAxios.get('/device-images');
      setImages(response.data.images || []);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error('Error al cargar imágenes');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Filter images based on selections
  const filteredImages = images.filter(img => {
    if (filterDevice !== 'all' && img.device_id !== filterDevice) return false;
    
    if (filterGroup !== 'all') {
      const device = devices.find(d => d.id === img.device_id);
      if (!device || device.group_id !== filterGroup) return false;
    }
    
    if (filterOrg !== 'all') {
      const device = devices.find(d => d.id === img.device_id);
      if (!device) return false;
      const group = groups.find(g => g.id === device.group_id);
      if (!group || group.organization_id !== filterOrg) return false;
    }
    
    return true;
  });

  // Get filtered groups based on organization
  const filteredGroups = filterOrg === 'all' 
    ? groups 
    : groups.filter(g => g.organization_id === filterOrg);

  // Get filtered devices based on group
  const filteredDevices = filterGroup === 'all'
    ? (filterOrg === 'all' ? devices : devices.filter(d => {
        const group = groups.find(g => g.id === d.group_id);
        return group && group.organization_id === filterOrg;
      }))
    : devices.filter(d => d.group_id === filterGroup);

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.device_id) {
      toast.error('Selecciona un dispositivo y una imagen');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('device_id', uploadForm.device_id);
      formData.append('description', uploadForm.description);
      formData.append('installation_date', uploadForm.installation_date);

      await authAxios.post('/device-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Imagen subida correctamente');
      setShowUploadDialog(false);
      setUploadForm({
        device_id: '',
        description: '',
        installation_date: new Date().toISOString().split('T')[0],
        file: null
      });
      fetchImages();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(error.response?.data?.detail || 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedImage) return;

    try {
      const formData = new FormData();
      formData.append('description', editForm.description);
      formData.append('installation_date', editForm.installation_date);

      await authAxios.put(`/device-images/${selectedImage.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Imagen actualizada');
      setShowEditDialog(false);
      fetchImages();
    } catch (error) {
      console.error('Error updating image:', error);
      toast.error('Error al actualizar imagen');
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm('¿Eliminar esta imagen?')) return;

    try {
      await authAxios.delete(`/device-images/${imageId}`);
      toast.success('Imagen eliminada');
      setShowImageDialog(false);
      fetchImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Error al eliminar imagen');
    }
  };

  const openImageDialog = (image) => {
    setSelectedImage(image);
    setShowImageDialog(true);
  };

  const openEditDialog = (image) => {
    setSelectedImage(image);
    setEditForm({
      description: image.description || '',
      installation_date: image.installation_date || ''
    });
    setShowEditDialog(true);
  };

  const getDeviceName = (deviceId) => {
    const device = devices.find(d => d.id === deviceId);
    return device?.name || 'Dispositivo desconocido';
  };

  const getGroupName = (deviceId) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return '';
    const group = groups.find(g => g.id === device.group_id);
    return group?.name || '';
  };

  const getOrgName = (deviceId) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return '';
    const group = groups.find(g => g.id === device.group_id);
    if (!group) return '';
    const org = organizations.find(o => o.id === group.organization_id);
    return org?.name || '';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="w-6 h-6" />
            Galería de Instalaciones
          </h2>
          <p className="text-muted-foreground">
            Documentación fotográfica de las instalaciones
          </p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Subir Imagen
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <Select value={filterOrg} onValueChange={(v) => { setFilterOrg(v); setFilterGroup('all'); setFilterDevice('all'); }}>
              <SelectTrigger className="w-[180px]">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Centro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterGroup} onValueChange={(v) => { setFilterGroup(v); setFilterDevice('all'); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los grupos</SelectItem>
                {filteredGroups.map(group => (
                  <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterDevice} onValueChange={setFilterDevice}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Dispositivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los dispositivos</SelectItem>
                {filteredDevices.map(device => (
                  <SelectItem key={device.id} value={device.id}>{device.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(filterOrg !== 'all' || filterGroup !== 'all' || filterDevice !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterOrg('all'); setFilterGroup('all'); setFilterDevice('all'); }}>
                <X className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            )}
            
            <Badge variant="secondary" className="ml-auto">
              {filteredImages.length} imagen{filteredImages.length !== 1 ? 'es' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-muted" />
              <CardContent className="p-3">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredImages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay imágenes</h3>
            <p className="text-muted-foreground mb-4">
              {filterOrg !== 'all' || filterGroup !== 'all' || filterDevice !== 'all'
                ? 'No hay imágenes con los filtros seleccionados'
                : 'Sube la primera imagen de instalación'}
            </p>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Subir Imagen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredImages.map(image => (
            <Card 
              key={image.id} 
              className="group cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
              onClick={() => openImageDialog(image)}
            >
              <div className="aspect-square relative bg-muted">
                <img
                  src={image.url}
                  alt={image.description || 'Instalación'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <CardContent className="p-3">
                <p className="font-medium text-sm truncate">{getDeviceName(image.device_id)}</p>
                <p className="text-xs text-muted-foreground truncate">{getOrgName(image.device_id)}</p>
                {image.installation_date && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(image.installation_date).toLocaleDateString('es-ES')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subir Imagen de Instalación</DialogTitle>
            <DialogDescription>
              Documenta la instalación con una fotografía
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Dispositivo *</Label>
              <Select value={uploadForm.device_id} onValueChange={(v) => setUploadForm({...uploadForm, device_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un dispositivo" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map(device => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name} ({device.ip_address})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Imagen *</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setUploadForm({...uploadForm, file: e.target.files[0]})}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formatos: JPG, PNG, GIF, WebP. Máximo 10MB
              </p>
            </div>

            <div>
              <Label>Fecha de Instalación</Label>
              <Input
                type="date"
                value={uploadForm.installation_date}
                onChange={(e) => setUploadForm({...uploadForm, installation_date: e.target.value})}
              />
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                placeholder="Ej: Cámara instalada en esquina noroeste del almacén"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Subiendo...' : 'Subir Imagen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-3xl">
          {selectedImage && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  {getDeviceName(selectedImage.device_id)}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden bg-black">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.description || 'Instalación'}
                    className="w-full max-h-[60vh] object-contain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Centro</p>
                    <p className="font-medium">{getOrgName(selectedImage.device_id) || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Grupo</p>
                    <p className="font-medium">{getGroupName(selectedImage.device_id) || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fecha de Instalación</p>
                    <p className="font-medium">
                      {selectedImage.installation_date 
                        ? new Date(selectedImage.installation_date).toLocaleDateString('es-ES')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Subida por</p>
                    <p className="font-medium">{selectedImage.uploaded_by || '-'}</p>
                  </div>
                  {selectedImage.description && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Descripción</p>
                      <p className="font-medium">{selectedImage.description}</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => openEditDialog(selectedImage)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button variant="destructive" onClick={() => handleDelete(selectedImage.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Imagen</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Fecha de Instalación</Label>
              <Input
                type="date"
                value={editForm.installation_date}
                onChange={(e) => setEditForm({...editForm, installation_date: e.target.value})}
              />
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeviceGallery;
