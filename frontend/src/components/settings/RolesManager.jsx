/**
 * RolesManager Component
 * Manages roles and permissions for users
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner';
import { 
  Shield, 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Lock, 
  Eye, 
  EyeOff,
  Save,
  X,
  RefreshCw,
  Settings,
  AlertTriangle
} from 'lucide-react';

const RolesManager = ({ authAxios, users = [], onUserUpdate }) => {
  const [roles, setRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [groups, setGroups] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {},
    group_access: 'all',
    organization_access: 'all',
    allowed_groups: [],
    allowed_organizations: []
  });

  // Fetch roles and permissions
  const fetchData = useCallback(async () => {
    if (!authAxios) return;
    
    setLoading(true);
    try {
      const [rolesRes, permsRes, groupsRes, orgsRes] = await Promise.all([
        authAxios.get('/roles'),
        authAxios.get('/roles/available-permissions'),
        authAxios.get('/groups'),
        authAxios.get('/organizations')
      ]);
      
      setRoles(rolesRes.data.roles || []);
      setAvailablePermissions(permsRes.data.permissions || {});
      setGroups(groupsRes.data.groups || groupsRes.data || []);
      setOrganizations(orgsRes.data.organizations || orgsRes.data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Error al cargar los roles');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Initialize form for new role
  const initializeNewRole = () => {
    const emptyPermissions = {};
    Object.keys(availablePermissions).forEach(section => {
      emptyPermissions[section] = [];
    });
    
    setFormData({
      name: '',
      description: '',
      permissions: emptyPermissions,
      group_access: 'all',
      organization_access: 'all',
      allowed_groups: [],
      allowed_organizations: []
    });
    setIsCreating(true);
    setIsEditing(true);
    setSelectedRole(null);
  };

  // Load role for editing
  const loadRoleForEdit = (role) => {
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || {},
      group_access: role.group_access || 'all',
      organization_access: role.organization_access || 'all',
      allowed_groups: role.allowed_groups || [],
      allowed_organizations: role.allowed_organizations || []
    });
    setSelectedRole(role);
    setIsEditing(true);
    setIsCreating(false);
  };

  // Handle permission toggle
  const togglePermission = (section, permission) => {
    setFormData(prev => {
      const sectionPerms = prev.permissions[section] || [];
      const newPerms = sectionPerms.includes(permission)
        ? sectionPerms.filter(p => p !== permission)
        : [...sectionPerms, permission];
      
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [section]: newPerms
        }
      };
    });
  };

  // Toggle all permissions for a section
  const toggleSectionPermissions = (section) => {
    const allPerms = availablePermissions[section]?.permissions || [];
    const currentPerms = formData.permissions[section] || [];
    const hasAll = allPerms.every(p => currentPerms.includes(p));
    
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [section]: hasAll ? [] : [...allPerms]
      }
    }));
  };

  // Save role
  const saveRole = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre del rol es obligatorio');
      return;
    }
    
    try {
      if (isCreating) {
        await authAxios.post('/roles', formData);
        toast.success('Rol creado correctamente');
      } else {
        await authAxios.put(`/roles/${selectedRole.id}`, formData);
        toast.success('Rol actualizado correctamente');
      }
      
      setIsEditing(false);
      setIsCreating(false);
      fetchData();
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error(error.response?.data?.detail || 'Error al guardar el rol');
    }
  };

  // Delete role
  const deleteRole = async () => {
    if (!selectedRole) return;
    
    try {
      await authAxios.delete(`/roles/${selectedRole.id}`);
      toast.success('Rol eliminado correctamente');
      setShowDeleteConfirm(false);
      setSelectedRole(null);
      setIsEditing(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error(error.response?.data?.detail || 'Error al eliminar el rol');
    }
  };

  // Assign role to user
  const assignRoleToUser = async (userId, roleId) => {
    try {
      await authAxios.put(`/users/${userId}`, { role_id: roleId });
      toast.success('Rol asignado correctamente');
      if (onUserUpdate) onUserUpdate();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error('Error al asignar el rol');
    }
  };

  // Permission label translations
  const permissionLabels = {
    view: 'Ver',
    edit: 'Editar',
    delete: 'Eliminar',
    create: 'Crear',
    upload: 'Subir',
    manage: 'Gestionar',
    acknowledge: 'Confirmar',
    export: 'Exportar',
    pdf: 'PDF',
    excel: 'Excel',
    csv: 'CSV',
    schedule: 'Programar'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Cargando roles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Gestión de Roles y Permisos
          </h2>
          <p className="text-muted-foreground">
            Configura los permisos de acceso para cada tipo de usuario
          </p>
        </div>
        <Button onClick={initializeNewRole} className="gap-2">
          <Plus className="w-4 h-4" />
          Crear Nuevo Rol
        </Button>
      </div>

      <Tabs defaultValue="roles" className="w-full">
        <TabsList>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="w-4 h-4" />
            Roles ({roles.length})
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Asignar a Usuarios
          </TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-4">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Roles List */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Roles Disponibles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {roles.map(role => (
                  <div
                    key={role.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedRole?.id === role.id 
                        ? 'border-primary bg-primary/10' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => {
                      setSelectedRole(role);
                      setIsEditing(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className={`w-4 h-4 ${role.is_system ? 'text-blue-500' : 'text-gray-500'}`} />
                        <span className="font-medium">{role.name}</span>
                      </div>
                      {role.is_system && (
                        <Badge variant="secondary" className="text-xs">Sistema</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {role.description || 'Sin descripción'}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Role Details / Editor */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {isCreating ? 'Crear Nuevo Rol' : isEditing ? 'Editar Rol' : 'Detalles del Rol'}
                  </CardTitle>
                  {selectedRole && !isEditing && (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => loadRoleForEdit(selectedRole)}
                        disabled={selectedRole.id === 'admin'}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      {!selectedRole.is_system && (
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedRole && !isCreating ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Selecciona un rol para ver sus detalles</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-6">
                      {/* Basic Info */}
                      {isEditing && (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name">Nombre del Rol *</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Ej: Técnico Avanzado"
                              disabled={selectedRole?.id === 'admin'}
                            />
                          </div>
                          <div>
                            <Label htmlFor="description">Descripción</Label>
                            <Input
                              id="description"
                              value={formData.description}
                              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Descripción del rol..."
                            />
                          </div>
                        </div>
                      )}

                      {/* Permissions Grid */}
                      <div>
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Permisos por Sección
                        </h3>
                        <div className="grid gap-4">
                          {Object.entries(availablePermissions).map(([section, config]) => {
                            const currentPerms = isEditing 
                              ? (formData.permissions[section] || [])
                              : (selectedRole?.permissions?.[section] || []);
                            const allPerms = config.permissions || [];
                            const hasAll = allPerms.every(p => currentPerms.includes(p));
                            const hasNone = currentPerms.length === 0;
                            
                            return (
                              <div key={section} className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{config.name}</span>
                                    {!hasNone && (
                                      <Badge variant={hasAll ? 'default' : 'secondary'} className="text-xs">
                                        {hasAll ? 'Acceso total' : `${currentPerms.length}/${allPerms.length}`}
                                      </Badge>
                                    )}
                                  </div>
                                  {isEditing && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleSectionPermissions(section)}
                                    >
                                      {hasAll ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-3">
                                  {allPerms.map(perm => (
                                    <div key={perm} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`${section}-${perm}`}
                                        checked={currentPerms.includes(perm)}
                                        onCheckedChange={() => isEditing && togglePermission(section, perm)}
                                        disabled={!isEditing}
                                      />
                                      <Label 
                                        htmlFor={`${section}-${perm}`}
                                        className={`text-sm ${!isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                                      >
                                        {permissionLabels[perm] || perm}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Group/Organization Access */}
                      {isEditing && (
                        <div className="space-y-4">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Acceso a Grupos y Organizaciones
                          </h3>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label>Acceso a Grupos</Label>
                              <Select
                                value={formData.group_access}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, group_access: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todos los grupos</SelectItem>
                                  <SelectItem value="assigned">Solo grupos asignados</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Acceso a Organizaciones</Label>
                              <Select
                                value={formData.organization_access}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, organization_access: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todas las organizaciones</SelectItem>
                                  <SelectItem value="assigned">Solo organizaciones asignadas</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {isEditing && (
                        <div className="flex justify-end gap-2 pt-4 border-t">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setIsEditing(false);
                              setIsCreating(false);
                            }}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancelar
                          </Button>
                          <Button onClick={saveRole}>
                            <Save className="w-4 h-4 mr-1" />
                            {isCreating ? 'Crear Rol' : 'Guardar Cambios'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Assignment Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Asignar Roles a Usuarios</CardTitle>
              <CardDescription>Selecciona el rol para cada usuario del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay usuarios registrados</p>
                ) : (
                  users.map(user => (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.email || 'Sin email'}</p>
                      </div>
                      <Select
                        value={user.role_id || 'admin'}
                        onValueChange={(value) => assignRoleToUser(user.id, value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map(role => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Eliminar Rol
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar el rol "{selectedRole?.name}"? 
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteRole}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesManager;
