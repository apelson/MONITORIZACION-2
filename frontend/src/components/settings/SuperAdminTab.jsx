/**
 * SuperAdminTab - Panel de Super Admin integrado en la aplicación principal
 * Permite gestionar tenants/empresas desde el panel de admin existente
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Building2, Users, Server, Plus, Pencil, Trash2, Eye,
  Shield, BarChart3, RefreshCw, Search, Ban, Check,
  Calendar, Mail, Monitor, Activity, ChevronRight
} from 'lucide-react';

const SuperAdminTab = ({ authAxios }) => {
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  // Form state for new tenant
  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    email: '',
    adminUsername: '',
    adminPassword: '',
    plan: 'free'
  });

  // Fetch all tenants
  const fetchData = useCallback(async () => {
    if (!authAxios) return;
    
    setLoading(true);
    try {
      const [tenantsRes, statsRes] = await Promise.all([
        authAxios.get('/superadmin/tenants'),
        authAxios.get('/superadmin/stats')
      ]);
      
      setTenants(tenantsRes.data.tenants || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      if (error.response?.status === 403) {
        toast.error('No tienes permisos de Super Admin');
      } else {
        toast.error('Error al cargar datos');
      }
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create new tenant
  const createTenant = async () => {
    if (!newTenant.name || !newTenant.email || !newTenant.adminUsername || !newTenant.adminPassword) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    try {
      await authAxios.post('/superadmin/tenants', {
        name: newTenant.name,
        slug: newTenant.slug || newTenant.name.toLowerCase().replace(/\s+/g, '-'),
        email: newTenant.email,
        admin_username: newTenant.adminUsername,
        admin_password: newTenant.adminPassword,
        plan: newTenant.plan
      });
      
      toast.success('Empresa creada correctamente');
      setShowCreateDialog(false);
      setNewTenant({ name: '', slug: '', email: '', adminUsername: '', adminPassword: '', plan: 'free' });
      fetchData();
    } catch (error) {
      console.error('Error creating tenant:', error);
      toast.error(error.response?.data?.detail || 'Error al crear empresa');
    }
  };

  // Toggle tenant active status
  const toggleTenantStatus = async (tenantId, currentActive) => {
    try {
      if (currentActive) {
        await authAxios.post(`/superadmin/tenants/${tenantId}/suspend`);
        toast.success('Empresa suspendida');
      } else {
        await authAxios.post(`/superadmin/tenants/${tenantId}/activate`);
        toast.success('Empresa activada');
      }
      fetchData();
    } catch (error) {
      toast.error('Error al cambiar estado');
    }
  };

  // Delete tenant
  const deleteTenant = async (tenantId) => {
    if (!confirm('¿Estás seguro? Esta acción eliminará TODOS los datos de la empresa.')) {
      return;
    }

    try {
      await authAxios.delete(`/superadmin/tenants/${tenantId}`);
      toast.success('Empresa eliminada');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar empresa');
    }
  };

  // View tenant details
  const viewTenantDetails = async (tenant) => {
    try {
      const response = await authAxios.get(`/superadmin/tenants/${tenant.id}`);
      setSelectedTenant(response.data);
      setShowDetailsDialog(true);
    } catch (error) {
      toast.error('Error al cargar detalles');
    }
  };

  // Filter tenants
  const filteredTenants = tenants.filter(t =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
          <Shield className="absolute inset-0 m-auto w-10 h-10 text-purple-400" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Cargando Panel Super Admin</h3>
          <p className="text-sm text-muted-foreground">Obteniendo datos de empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-500" />
            Super Admin - Gestión de Empresas
          </h2>
          <p className="text-muted-foreground">
            Administra las empresas/clientes que usan la plataforma
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2 bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4" />
          Nueva Empresa
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_tenants || 0}</p>
                  <p className="text-xs text-muted-foreground">Empresas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active_tenants || 0}</p>
                  <p className="text-xs text-muted-foreground">Activas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_users || 0}</p>
                  <p className="text-xs text-muted-foreground">Usuarios</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                  <Monitor className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_devices || 0}</p>
                  <p className="text-xs text-muted-foreground">Dispositivos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar empresa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tenants List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Empresas Registradas ({filteredTenants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTenants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No hay empresas registradas</p>
              <Button variant="outline" onClick={() => setShowCreateDialog(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Crear primera empresa
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTenants.map(tenant => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      tenant.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      <Building2 className={`w-5 h-5 ${tenant.is_active ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tenant.name}</span>
                        <Badge variant={tenant.is_active ? 'default' : 'destructive'} className="text-xs">
                          {tenant.is_active ? 'Activa' : 'Suspendida'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {tenant.plan || 'free'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {tenant.email}
                        </span>
                        {tenant.stats && (
                          <>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {tenant.stats.users || 0} usuarios
                            </span>
                            <span className="flex items-center gap-1">
                              <Monitor className="w-3 h-3" />
                              {tenant.stats.devices || 0} dispositivos
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => viewTenantDetails(tenant)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTenantStatus(tenant.id, tenant.is_active)}
                    >
                      {tenant.is_active ? <Ban className="w-4 h-4 text-orange-500" /> : <Check className="w-4 h-4 text-green-500" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTenant(tenant.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Tenant Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-500" />
              Nueva Empresa
            </DialogTitle>
            <DialogDescription>
              Crea una nueva empresa/cliente en la plataforma
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Nombre de la Empresa *</Label>
              <Input
                placeholder="Ej: Empresa ABC"
                value={newTenant.name}
                onChange={(e) => setNewTenant(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div>
              <Label>Slug (URL)</Label>
              <Input
                placeholder="empresa-abc"
                value={newTenant.slug}
                onChange={(e) => setNewTenant(prev => ({ ...prev, slug: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Si lo dejas vacío, se generará automáticamente
              </p>
            </div>
            
            <div>
              <Label>Email de contacto *</Label>
              <Input
                type="email"
                placeholder="admin@empresa.com"
                value={newTenant.email}
                onChange={(e) => setNewTenant(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Credenciales del Admin</p>
              <div className="space-y-3">
                <div>
                  <Label>Usuario Admin *</Label>
                  <Input
                    placeholder="admin"
                    value={newTenant.adminUsername}
                    onChange={(e) => setNewTenant(prev => ({ ...prev, adminUsername: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Contraseña *</Label>
                  <Input
                    type="password"
                    placeholder="Contraseña segura"
                    value={newTenant.adminPassword}
                    onChange={(e) => setNewTenant(prev => ({ ...prev, adminPassword: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Plan</Label>
              <Select value={newTenant.plan} onValueChange={(v) => setNewTenant(prev => ({ ...prev, plan: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="basic">Básico</SelectItem>
                  <SelectItem value="professional">Profesional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={createTenant} className="bg-purple-600 hover:bg-purple-700">
              Crear Empresa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tenant Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {selectedTenant?.tenant?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTenant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedTenant.tenant.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <Badge>{selectedTenant.tenant.plan}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge variant={selectedTenant.tenant.is_active ? 'default' : 'destructive'}>
                    {selectedTenant.tenant.is_active ? 'Activa' : 'Suspendida'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Creada</p>
                  <p className="font-medium">
                    {new Date(selectedTenant.tenant.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Estadísticas</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{selectedTenant.stats?.devices || 0}</p>
                    <p className="text-xs text-muted-foreground">Dispositivos</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{selectedTenant.stats?.users || 0}</p>
                    <p className="text-xs text-muted-foreground">Usuarios</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{selectedTenant.stats?.alerts || 0}</p>
                    <p className="text-xs text-muted-foreground">Alertas</p>
                  </div>
                </div>
              </div>

              {selectedTenant.users && selectedTenant.users.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Usuarios ({selectedTenant.users.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedTenant.users.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>{user.username}</span>
                        <Badge variant="outline">{user.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminTab;
