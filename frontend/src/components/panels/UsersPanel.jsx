/**
 * Users Panel - User management with roles
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Users, User, Shield, Lock, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RolesManager from '@/components/settings/RolesManager';

// Role Badge component
const RoleBadge = ({ role }) => {
  const colors = { admin: "bg-red-100 text-red-700", operator: "bg-blue-100 text-blue-700", viewer: "bg-gray-100 text-gray-700", technician: "bg-purple-100 text-purple-700" };
  const labels = { admin: "Admin", operator: "Operador", viewer: "Visor", technician: "Técnico" };
  return <Badge className={`text-xs ${colors[role] || 'bg-gray-100 text-gray-700'}`}>{labels[role] || role}</Badge>;
};

const UsersPanel = ({ 
  users, 
  onCreateUser, 
  onEditUser, 
  onDeleteUser, 
  onResetPassword, 
  authAxios, 
  onUserUpdate 
}) => {
  const { t } = useTranslation();
  const [activeUserTab, setActiveUserTab] = useState('users');
  
  return (
    <Tabs value={activeUserTab} onValueChange={setActiveUserTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="users" className="gap-2">
          <Users className="w-4 h-4" />
          Usuarios ({users.length})
        </TabsTrigger>
        <TabsTrigger value="roles" className="gap-2">
          <Shield className="w-4 h-4" />
          Roles y Permisos
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="users">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />{t('users.title', 'Usuarios')}
              </CardTitle>
            </div>
            <Button data-testid="add-user-btn" size="sm" onClick={() => onCreateUser()}>
              <Plus className="w-4 h-4 mr-2" />{t('common.add', 'Nuevo')}
            </Button>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="empty-state py-8 text-center">
                <Users className="w-12 h-12 mb-4 opacity-20 mx-auto" />
                <p className="text-muted-foreground">No hay usuarios</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{u.username}</span>
                          <RoleBadge role={u.role} />
                          {!u.is_active && (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-600">Inactivo</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onResetPassword(u.id)}>
                        <Lock className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onEditUser(u)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDeleteUser(u)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="roles">
        <RolesManager authAxios={authAxios} users={users} onUserUpdate={onUserUpdate} />
      </TabsContent>
    </Tabs>
  );
};

export default UsersPanel;
