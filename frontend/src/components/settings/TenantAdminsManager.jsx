/**
 * TenantAdminsManager - Gestión de usuarios Tenant Admin
 * Permite crear, editar y asignar organizaciones a usuarios tenant_admin
 * Para el sistema multi-tenancy de la plataforma principal
 * Incluye gestión de feature flags (módulos habilitados/deshabilitados)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Building2, Users, Plus, Pencil, Trash2, Eye, UserPlus,
  Shield, RefreshCw, Search, Key, Check, X,
  ChevronRight, Monitor, AlertCircle, Settings2,
  Camera, Bell, Video, FileText, Brain, Image, ClipboardList, HardDrive
} from 'lucide-react';

// Feature flag definitions with icons and labels
const FEATURE_FLAGS_CONFIG = {
  devices: { label: 'Dispositivos', icon: Camera, description: 'Cámaras y dispositivos de red' },
  alerts: { label: 'Alertas', icon: Bell, description: 'Sistema de alertas y notificaciones' },
  cra: { label: 'CRA', icon: Shield, description: 'Central Receptora de Alarmas' },
  dahua: { label: 'Grabadores', icon: HardDrive, description: 'DVR/NVR Dahua P2P' },
  live_view: { label: 'Vista en Directo', icon: Video, description: 'Streaming de cámaras' },
  incidents: { label: 'Incidencias', icon: ClipboardList, description: 'Gestión de incidentes' },
  reports: { label: 'Reportes', icon: FileText, description: 'Estadísticas y reportes' },
  ai_insights: { label: 'AI Insights', icon: Brain, description: 'Panel de inteligencia artificial' },
  gallery: { label: 'Galería', icon: Image, description: 'Galería de imágenes' },
};

const DEFAULT_FEATURE_FLAGS = {
  devices: true, alerts: true, cra: true, dahua: true,
  live_view: true, incidents: true, reports: true,
  ai_insights: true, gallery: true
};

const TenantAdminsManager = ({ authAxios }) => {
  // State
  const [tenantAdmins, setTenantAdmins] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showFlagsDialog, setShowFlagsDialog] = useState(false);
  
  // Selected item
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form states
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    organization_ids: []
  });
  const [editUser, setEditUser] = useState({
    email: '',
    full_name: '',
    organization_ids: [],
    is_active: true
  });
  const [newPassword, setNewPassword] = useState('');

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!authAxios) return;
    
    setLoading(true);
    try {
      const [adminsRes, orgsRes, statsRes] = await Promise.all([
        authAxios.get('/admin/tenants/tenant-admins'),
        authAxios.get('/admin/tenants/organizations'),
        authAxios.get('/admin/tenants/stats')
      ]);
      
      setTenantAdmins(adminsRes.data.tenant_admins || []);
      setOrganizations(orgsRes.data.organizations || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create new tenant admin
  const handleCreate = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast.error('Por favor complete los campos obligatorios');
      return;
    }
    
    try {
      const res = await authAxios.post('/admin/tenants/tenant-admins', newUser);
      toast.success('Usuario tenant_admin creado correctamente');
      setShowCreateDialog(false);
      setNewUser({ username: '', email: '', password: '', full_name: '', organization_ids: [] });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear usuario');
    }
  };

  // Update tenant admin
  const handleUpdate = async () => {
    if (!selectedUser) return;
    
    try {
      await authAxios.put(`/admin/tenants/tenant-admins/${selectedUser.id}`, editUser);
      toast.success('Usuario actualizado correctamente');
      setShowEditDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar usuario');
    }
  };

  // Set new password
  const handleSetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      await authAxios.post(`/admin/tenants/tenant-admins/${selectedUser.id}/set-password`, {
        new_password: newPassword
      });
      toast.success('Contraseña actualizada correctamente');
      setShowPasswordDialog(false);
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar contraseña');
    }
  };

  // Delete tenant admin
  const handleDelete = async () => {
    if (!selectedUser) return;
    
    try {
      await authAxios.delete(`/admin/tenants/tenant-admins/${selectedUser.id}`);
      toast.success('Usuario eliminado correctamente');
      setShowDeleteDialog(false);
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar usuario');
    }
  };

  // Open edit dialog
  const openEditDialog = (user) => {
    setSelectedUser(user);
    setEditUser({
      email: user.email,
      full_name: user.full_name || '',
      organization_ids: user.organization_ids || [],
      is_active: user.is_active !== false
    });
    setShowEditDialog(true);
  };

  // Open details dialog
  const openDetailsDialog = async (user) => {
    try {
      const res = await authAxios.get(`/admin/tenants/tenant-admins/${user.id}`);
      setSelectedUser(res.data);
      setShowDetailsDialog(true);
    } catch (error) {
      toast.error('Error al cargar detalles');
    }
  };

  // Filter tenant admins by search
  const filteredAdmins = tenantAdmins.filter(admin =>
    admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (admin.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle organization in selection
  const toggleOrganization = (orgId, currentList, setList) => {
    if (currentList.includes(orgId)) {
      setList(currentList.filter(id => id !== orgId));
    } else {
      setList([...currentList, orgId]);
    }
  };

  return (
    <div className="space-y-6" data-testid="tenant-admins-manager">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{stats.users?.tenant_admins || 0}</p>
                  <p className="text-xs text-slate-400">Tenant Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Building2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{stats.organizations?.total || 0}</p>
                  <p className="text-xs text-slate-400">Organizaciones</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{stats.organizations?.assigned || 0}</p>
                  <p className="text-xs text-slate-400">Asignadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">{stats.organizations?.unassigned || 0}</p>
                  <p className="text-xs text-slate-400">Sin asignar</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Card */}
      <Card className="border-slate-700 bg-slate-900/50">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-purple-400" />
              Gestión de Usuarios Tenant Admin
            </CardTitle>
            <CardDescription>
              Crea y gestiona usuarios que administran sus propias organizaciones
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="gap-1"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="gap-1 bg-purple-600 hover:bg-purple-700"
              data-testid="create-tenant-admin-btn"
            >
              <UserPlus className="w-4 h-4" />
              Nuevo Usuario
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, usuario o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700"
              data-testid="search-tenant-admins"
            />
          </div>

          {/* Tenant Admins List */}
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-500" />
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay usuarios tenant_admin</p>
                <p className="text-sm">Crea uno para empezar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAdmins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                    data-testid={`tenant-admin-row-${admin.username}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Users className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{admin.username}</span>
                          {admin.is_active === false && (
                            <Badge variant="destructive" className="text-xs">Inactivo</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400">{admin.email}</p>
                        {admin.full_name && (
                          <p className="text-xs text-slate-500">{admin.full_name}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-1" title="Organizaciones">
                          <Building2 className="w-4 h-4" />
                          <span>{admin.stats?.organizations || 0}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Grupos">
                          <Users className="w-4 h-4" />
                          <span>{admin.stats?.groups || 0}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Dispositivos">
                          <Monitor className="w-4 h-4" />
                          <span>{admin.stats?.devices || 0}</span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetailsDialog(admin)}
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(admin)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(admin);
                            setShowPasswordDialog(true);
                          }}
                          title="Cambiar contraseña"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(admin);
                            setShowDeleteDialog(true);
                          }}
                          title="Eliminar"
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-400" />
              Nuevo Usuario Tenant Admin
            </DialogTitle>
            <DialogDescription>
              Crea un nuevo usuario que administrará sus propias organizaciones
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Usuario *</Label>
                <Input
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  placeholder="usuario"
                  className="bg-slate-800 border-slate-700"
                  data-testid="new-tenant-username"
                />
              </div>
              <div className="space-y-2">
                <Label>Contraseña *</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="••••••"
                  className="bg-slate-800 border-slate-700"
                  data-testid="new-tenant-password"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="admin@empresa.com"
                className="bg-slate-800 border-slate-700"
                data-testid="new-tenant-email"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input
                value={newUser.full_name}
                onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                placeholder="Juan Pérez"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Asignar organizaciones</Label>
              <ScrollArea className="h-[150px] border border-slate-700 rounded-lg p-2">
                {organizations.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">
                    No hay organizaciones disponibles
                  </p>
                ) : (
                  <div className="space-y-2">
                    {organizations.map((org) => (
                      <label
                        key={org.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-slate-800 cursor-pointer"
                      >
                        <Checkbox
                          checked={newUser.organization_ids.includes(org.id)}
                          onCheckedChange={() => 
                            toggleOrganization(
                              org.id, 
                              newUser.organization_ids, 
                              (ids) => setNewUser({...newUser, organization_ids: ids})
                            )
                          }
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{org.name}</p>
                          <p className="text-xs text-slate-400">{org.group_count || 0} grupos</p>
                        </div>
                        {org.is_assigned && (
                          <Badge variant="outline" className="text-xs">
                            Asignada
                          </Badge>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="confirm-create-tenant"
            >
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-400" />
              Editar Usuario: {selectedUser?.username}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editUser.email}
                onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input
                value={editUser.full_name}
                onChange={(e) => setEditUser({...editUser, full_name: e.target.value})}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                checked={editUser.is_active}
                onCheckedChange={(checked) => setEditUser({...editUser, is_active: checked})}
              />
              <Label>Usuario activo</Label>
            </div>
            
            <div className="space-y-2">
              <Label>Organizaciones asignadas</Label>
              <ScrollArea className="h-[150px] border border-slate-700 rounded-lg p-2">
                {organizations.map((org) => (
                  <label
                    key={org.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-slate-800 cursor-pointer"
                  >
                    <Checkbox
                      checked={editUser.organization_ids.includes(org.id)}
                      onCheckedChange={() => 
                        toggleOrganization(
                          org.id, 
                          editUser.organization_ids, 
                          (ids) => setEditUser({...editUser, organization_ids: ids})
                        )
                      }
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{org.name}</p>
                      <p className="text-xs text-slate-400">{org.group_count || 0} grupos</p>
                    </div>
                  </label>
                ))}
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-green-400" />
              Detalles: {selectedUser?.username}
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400">Email</Label>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Nombre</Label>
                  <p className="font-medium">{selectedUser.full_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Creado</Label>
                  <p className="font-medium">
                    {new Date(selectedUser.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-400">Estado</Label>
                  <Badge variant={selectedUser.is_active !== false ? 'default' : 'destructive'}>
                    {selectedUser.is_active !== false ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </div>
              
              {/* Device Stats */}
              {selectedUser.device_stats && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">
                      {selectedUser.device_stats.online}
                    </p>
                    <p className="text-xs text-slate-400">Online</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-400">
                      {selectedUser.device_stats.offline}
                    </p>
                    <p className="text-xs text-slate-400">Offline</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">
                      {selectedUser.device_stats.total}
                    </p>
                    <p className="text-xs text-slate-400">Total</p>
                  </div>
                </div>
              )}
              
              {/* Organizations */}
              <div className="space-y-2">
                <Label className="text-slate-400">Organizaciones asignadas ({selectedUser.organizations?.length || 0})</Label>
                <div className="space-y-2">
                  {selectedUser.organizations?.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-purple-400" />
                        <span className="font-medium">{org.name}</span>
                      </div>
                      <Badge variant="outline">{org.group_count || 0} grupos</Badge>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Groups */}
              {selectedUser.groups?.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-400">Grupos ({selectedUser.groups.length})</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedUser.groups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between p-2 bg-slate-800/50 rounded text-sm"
                      >
                        <span>{group.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {group.device_count || 0} dispositivos
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              Cambiar Contraseña: {selectedUser?.username}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nueva contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSetPassword}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Actualizar Contraseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              Eliminar Usuario
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar a <strong>{selectedUser?.username}</strong>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              data-testid="confirm-delete-tenant"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantAdminsManager;
