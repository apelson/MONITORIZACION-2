/**
 * UserPermissionsManager - Panel para gestionar permisos de usuarios
 * Permite asignar marcas y centros permitidos a cada usuario
 */
import { useState, useEffect } from 'react';
import { 
  Shield, Users, Building2, Tag, Save, X, Check, AlertCircle,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const UserPermissionsManager = ({ authAxios, onClose }) => {
  const [users, setUsers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [centers, setCenters] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissions, setPermissions] = useState({ allowed_brands: [], allowed_centers: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [expandedSection, setExpandedSection] = useState('brands');
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, brandsRes, centersRes] = await Promise.all([
        authAxios.get('/users'),
        authAxios.get('/brand-statistics/brands'),
        authAxios.get('/brand-statistics/centers')
      ]);
      
      setUsers(usersRes.data.users || []);
      setBrands(brandsRes.data.brands || []);
      setCenters(centersRes.data.centers || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Error cargando datos' });
    }
    setLoading(false);
  };
  
  const selectUser = async (user) => {
    setSelectedUser(user);
    try {
      const res = await authAxios.get(`/users/${user.id}/permissions`);
      setPermissions({
        allowed_brands: res.data.allowed_brands || [],
        allowed_centers: res.data.allowed_centers || []
      });
    } catch (error) {
      // If endpoint doesn't exist, use user data directly
      setPermissions({
        allowed_brands: user.allowed_brands || [],
        allowed_centers: user.allowed_centers || []
      });
    }
  };
  
  const toggleBrand = (brandId) => {
    setPermissions(prev => ({
      ...prev,
      allowed_brands: prev.allowed_brands.includes(brandId)
        ? prev.allowed_brands.filter(id => id !== brandId)
        : [...prev.allowed_brands, brandId]
    }));
  };
  
  const toggleCenter = (centerId) => {
    setPermissions(prev => ({
      ...prev,
      allowed_centers: prev.allowed_centers.includes(centerId)
        ? prev.allowed_centers.filter(id => id !== centerId)
        : [...prev.allowed_centers, centerId]
    }));
  };
  
  const selectAllBrands = () => {
    setPermissions(prev => ({
      ...prev,
      allowed_brands: brands.map(b => b.id)
    }));
  };
  
  const clearAllBrands = () => {
    setPermissions(prev => ({
      ...prev,
      allowed_brands: []
    }));
  };
  
  const selectAllCenters = () => {
    setPermissions(prev => ({
      ...prev,
      allowed_centers: centers.map(c => c.id)
    }));
  };
  
  const clearAllCenters = () => {
    setPermissions(prev => ({
      ...prev,
      allowed_centers: []
    }));
  };
  
  const savePermissions = async () => {
    if (!selectedUser) return;
    
    setSaving(true);
    try {
      await authAxios.put(`/users/${selectedUser.id}/permissions`, permissions);
      setMessage({ type: 'success', text: 'Permisos guardados correctamente' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving permissions:', error);
      setMessage({ type: 'error', text: 'Error guardando permisos' });
    }
    setSaving(false);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Permisos de Usuario</h2>
            <p className="text-sm text-gray-500">Asigna marcas y centros a cada usuario</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>
      
      {/* Message */}
      {message && (
        <div className={cn(
          "mb-4 p-3 rounded-lg flex items-center gap-2",
          message.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        )}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}
      
      <div className="grid grid-cols-12 gap-6">
        {/* Users list */}
        <div className="col-span-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => selectUser(user)}
                    className={cn(
                      "w-full p-3 text-left hover:bg-gray-50 transition-colors",
                      selectedUser?.id === user.id && "bg-blue-50 border-l-4 border-blue-600"
                    )}
                  >
                    <div className="font-medium text-gray-900">{user.username}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                      {user.allowed_brands?.length > 0 && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs">
                          {user.allowed_brands.length} marcas
                        </Badge>
                      )}
                      {user.allowed_centers?.length > 0 && (
                        <Badge className="bg-cyan-100 text-cyan-700 text-xs">
                          {user.allowed_centers.length} centros
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Permissions editor */}
        <div className="col-span-8">
          {selectedUser ? (
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Permisos de {selectedUser.username}
                    </CardTitle>
                    <CardDescription>
                      Vacío = acceso a todo. Selecciona para restringir.
                    </CardDescription>
                  </div>
                  <Button onClick={savePermissions} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {/* Brands section */}
                <div className="mb-4">
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'brands' ? '' : 'brands')}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-purple-600" />
                      <span className="font-medium">Marcas Permitidas</span>
                      <Badge className="bg-purple-100 text-purple-700">
                        {permissions.allowed_brands.length === 0 
                          ? 'Todas' 
                          : `${permissions.allowed_brands.length}/${brands.length}`}
                      </Badge>
                    </div>
                    {expandedSection === 'brands' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {expandedSection === 'brands' && (
                    <div className="mt-3 p-3 border rounded-lg">
                      <div className="flex gap-2 mb-3">
                        <Button variant="outline" size="sm" onClick={selectAllBrands}>
                          Seleccionar todas
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearAllBrands}>
                          Limpiar (acceso total)
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {brands.map(brand => (
                          <label
                            key={brand.id}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                              permissions.allowed_brands.includes(brand.id)
                                ? "bg-purple-50 border border-purple-200"
                                : "hover:bg-gray-50 border border-transparent"
                            )}
                          >
                            <Checkbox
                              checked={permissions.allowed_brands.includes(brand.id)}
                              onCheckedChange={() => toggleBrand(brand.id)}
                            />
                            {brand.logo && (
                              <img src={brand.logo} alt={brand.name} className="w-8 h-8 object-contain" />
                            )}
                            <span className="font-medium">{brand.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Centers section */}
                <div>
                  <button
                    onClick={() => setExpandedSection(expandedSection === 'centers' ? '' : 'centers')}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-cyan-600" />
                      <span className="font-medium">Centros/Islas Permitidos</span>
                      <Badge className="bg-cyan-100 text-cyan-700">
                        {permissions.allowed_centers.length === 0 
                          ? 'Todos' 
                          : `${permissions.allowed_centers.length}/${centers.length}`}
                      </Badge>
                    </div>
                    {expandedSection === 'centers' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {expandedSection === 'centers' && (
                    <div className="mt-3 p-3 border rounded-lg">
                      <div className="flex gap-2 mb-3">
                        <Button variant="outline" size="sm" onClick={selectAllCenters}>
                          Seleccionar todos
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearAllCenters}>
                          Limpiar (acceso total)
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {centers.map(center => (
                          <label
                            key={center.id}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                              permissions.allowed_centers.includes(center.id)
                                ? "bg-cyan-50 border border-cyan-200"
                                : "hover:bg-gray-50 border border-transparent"
                            )}
                          >
                            <Checkbox
                              checked={permissions.allowed_centers.includes(center.id)}
                              onCheckedChange={() => toggleCenter(center.id)}
                            />
                            <span className="font-medium">{center.name}</span>
                            {center.island && (
                              <span className="text-xs text-gray-500">({center.island})</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500 py-16">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Selecciona un usuario para editar sus permisos</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPermissionsManager;
