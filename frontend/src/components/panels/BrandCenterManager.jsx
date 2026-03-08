/**
 * BrandCenterManager - Complete CRUD for brands and centers
 * Allows admins to create, edit, delete brands and centers/locations
 * Supports logo upload via file or URL
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Building2, Plus, Trash2, Edit, RefreshCw, Save, X, Palette, Image,
  MapPin, Tag, Check, AlertCircle, Store, Upload, Link
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

const BrandCenterManager = ({ authAxios }) => {
  const [brands, setBrands] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('brands');
  
  // Brand dialog state
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandForm, setBrandForm] = useState({ id: '', name: '', color: '#666666', logo: '' });
  const [logoInputMode, setLogoInputMode] = useState('url'); // 'url' or 'upload'
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Center dialog state
  const [centerDialogOpen, setCenterDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [centerForm, setCenterForm] = useState({ id: '', name: '', island: '', address: '', brand_id: '' });

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [brandsRes, centersRes] = await Promise.all([
        authAxios.get('/brand-statistics/brands'),
        authAxios.get('/brand-statistics/centers')
      ]);
      setBrands(brandsRes.data.brands || []);
      setCenters(centersRes.data.centers || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    }
    setLoading(false);
  }, [authAxios]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ============ BRANDS ============
  const handleAddBrand = () => {
    setEditingBrand(null);
    setBrandForm({ id: '', name: '', color: '#666666', logo: '' });
    setLogoInputMode('url');
    setBrandDialogOpen(true);
  };

  const handleEditBrand = (brand) => {
    setEditingBrand(brand);
    setBrandForm({ 
      id: brand.id, 
      name: brand.name, 
      color: brand.color || '#666666', 
      logo: brand.logo || '' 
    });
    setLogoInputMode('url');
    setBrandDialogOpen(true);
  };

  // Handle logo file upload
  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido. Usa: JPG, PNG, GIF, WebP o SVG');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Archivo demasiado grande. Máximo 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await authAxios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Construct full URL from the response
      const baseUrl = authAxios.defaults.baseURL || '';
      const logoUrl = baseUrl + response.data.url;
      
      setBrandForm(prev => ({ ...prev, logo: logoUrl }));
      toast.success('Logo subido correctamente');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Error al subir el logo');
    }
    setUploading(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveBrand = async () => {
    if (!brandForm.id || !brandForm.name) {
      toast.error('ID y Nombre son requeridos');
      return;
    }
    setLoading(true);
    try {
      if (editingBrand) {
        await authAxios.put(`/brand-statistics/brands/${editingBrand.id}`, {
          name: brandForm.name,
          color: brandForm.color,
          logo: brandForm.logo
        });
        toast.success('Marca actualizada');
      } else {
        await authAxios.post('/brand-statistics/brands', brandForm);
        toast.success('Marca creada');
      }
      setBrandDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar marca');
    }
    setLoading(false);
  };

  const handleDeleteBrand = async (brandId) => {
    if (!window.confirm('¿Eliminar esta marca?')) return;
    try {
      await authAxios.delete(`/brand-statistics/brands/${brandId}`);
      toast.success('Marca eliminada');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar marca');
    }
  };

  // ============ CENTERS ============
  const handleAddCenter = () => {
    setEditingCenter(null);
    setCenterForm({ id: '', name: '', island: '', address: '', brand_id: '' });
    setCenterDialogOpen(true);
  };

  const handleEditCenter = (center) => {
    setEditingCenter(center);
    setCenterForm({
      id: center.id,
      name: center.name,
      island: center.island || '',
      address: center.address || '',
      brand_id: center.brand_id || ''
    });
    setCenterDialogOpen(true);
  };

  const handleSaveCenter = async () => {
    if (!centerForm.id || !centerForm.name) {
      toast.error('ID y Nombre son requeridos');
      return;
    }
    setLoading(true);
    try {
      if (editingCenter) {
        await authAxios.put(`/brand-statistics/centers/${editingCenter.id}`, {
          name: centerForm.name,
          island: centerForm.island,
          address: centerForm.address,
          brand_id: centerForm.brand_id
        });
        toast.success('Centro actualizado');
      } else {
        await authAxios.post('/brand-statistics/centers', centerForm);
        toast.success('Centro creado');
      }
      setCenterDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar centro');
    }
    setLoading(false);
  };

  const handleDeleteCenter = async (centerId) => {
    if (!window.confirm('¿Eliminar este centro?')) return;
    try {
      await authAxios.delete(`/brand-statistics/centers/${centerId}`);
      toast.success('Centro eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar centro');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Store className="w-10 h-10 text-purple-300" />
              <div>
                <h2 className="text-2xl font-bold">Gestor de Marcas y Centros</h2>
                <p className="text-purple-200 text-sm">Administra marcas, centros y localizaciones</p>
              </div>
            </div>
            <Button variant="outline" onClick={fetchData} disabled={loading} className="text-white border-white/30 hover:bg-white/10">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="brands" className="gap-2">
            <Tag className="w-4 h-4" /> Marcas ({brands.length})
          </TabsTrigger>
          <TabsTrigger value="centers" className="gap-2">
            <MapPin className="w-4 h-4" /> Centros ({centers.length})
          </TabsTrigger>
        </TabsList>

        {/* BRANDS TAB */}
        <TabsContent value="brands" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleAddBrand} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" /> Nueva Marca
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {brands.map((brand) => (
              <Card key={brand.id} className="overflow-hidden" style={{ borderTop: `4px solid ${brand.color}` }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {brand.logo ? (
                      <img src={brand.logo} alt={brand.name} className="w-12 h-12 object-contain rounded" onError={(e) => e.target.style.display='none'} />
                    ) : (
                      <div className="w-12 h-12 rounded flex items-center justify-center" style={{ backgroundColor: brand.color + '20' }}>
                        <Tag className="w-6 h-6" style={{ color: brand.color }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate">{brand.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{brand.id}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full border-2" style={{ backgroundColor: brand.color }} />
                    <span className="text-sm font-mono">{brand.color}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditBrand(brand)} className="flex-1">
                      <Edit className="w-4 h-4 mr-1" /> Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteBrand(brand.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* CENTERS TAB */}
        <TabsContent value="centers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleAddCenter} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Centro
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {centers.map((center) => {
              const brand = brands.find(b => b.id === center.brand_id);
              const island = ISLANDS.find(i => i.id === center.island);
              return (
                <Card key={center.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                          <Building2 className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-bold">{center.name}</h3>
                          <p className="text-xs text-muted-foreground font-mono">{center.id}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{island?.name || center.island}</Badge>
                    </div>
                    
                    {brand && (
                      <div className="flex items-center gap-2 mb-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }} />
                        <span>{brand.name}</span>
                      </div>
                    )}
                    
                    {center.address && (
                      <p className="text-sm text-muted-foreground mb-3">{center.address}</p>
                    )}
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditCenter(center)} className="flex-1">
                        <Edit className="w-4 h-4 mr-1" /> Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteCenter(center.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* BRAND DIALOG */}
      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-purple-600" />
              {editingBrand ? 'Editar Marca' : 'Nueva Marca'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ID único *</Label>
              <Input 
                placeholder="mi-marca" 
                value={brandForm.id} 
                onChange={(e) => setBrandForm({...brandForm, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                disabled={!!editingBrand}
              />
              <p className="text-xs text-muted-foreground">Solo letras minúsculas y guiones</p>
            </div>
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input 
                placeholder="Mi Marca" 
                value={brandForm.name} 
                onChange={(e) => setBrandForm({...brandForm, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={brandForm.color} 
                  onChange={(e) => setBrandForm({...brandForm, color: e.target.value})}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <Input 
                  value={brandForm.color} 
                  onChange={(e) => setBrandForm({...brandForm, color: e.target.value})}
                  className="flex-1 font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              {/* Toggle between URL and Upload */}
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant={logoInputMode === 'url' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLogoInputMode('url')}
                  className="flex-1"
                >
                  <Link className="w-4 h-4 mr-2" /> URL
                </Button>
                <Button
                  type="button"
                  variant={logoInputMode === 'upload' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLogoInputMode('upload')}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" /> Subir archivo
                </Button>
              </div>
              
              {logoInputMode === 'url' ? (
                <Input 
                  placeholder="https://..." 
                  value={brandForm.logo} 
                  onChange={(e) => setBrandForm({...brandForm, logo: e.target.value})}
                />
              ) : (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Seleccionar imagen
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Formatos: JPG, PNG, GIF, WebP, SVG (máx 5MB)
                  </p>
                </div>
              )}
              
              {/* Logo Preview */}
              {brandForm.logo && (
                <div className="flex justify-center p-4 bg-muted rounded-lg relative">
                  <img 
                    src={brandForm.logo} 
                    alt="Preview" 
                    className="max-h-16 object-contain" 
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }} 
                  />
                  <span className="text-sm text-muted-foreground hidden">Error al cargar imagen</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1"
                    onClick={() => setBrandForm({...brandForm, logo: ''})}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrandDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveBrand} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              <Save className="w-4 h-4 mr-2" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CENTER DIALOG */}
      <Dialog open={centerDialogOpen} onOpenChange={setCenterDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              {editingCenter ? 'Editar Centro' : 'Nuevo Centro'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ID único *</Label>
              <Input 
                placeholder="centro-norte" 
                value={centerForm.id} 
                onChange={(e) => setCenterForm({...centerForm, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                disabled={!!editingCenter}
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input 
                placeholder="Centro Norte" 
                value={centerForm.name} 
                onChange={(e) => setCenterForm({...centerForm, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Isla</Label>
              <Select value={centerForm.island || 'none'} onValueChange={(v) => setCenterForm({...centerForm, island: v === 'none' ? '' : v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {ISLANDS.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marca asociada</Label>
              <Select value={centerForm.brand_id || 'none'} onValueChange={(v) => setCenterForm({...centerForm, brand_id: v === 'none' ? '' : v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asociar</SelectItem>
                  {brands.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: b.color}} />
                        {b.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input 
                placeholder="Av. Principal 123" 
                value={centerForm.address} 
                onChange={(e) => setCenterForm({...centerForm, address: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCenterDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCenter} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="w-4 h-4 mr-2" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandCenterManager;
