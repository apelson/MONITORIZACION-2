/**
 * OrganizationFeaturesManager - Gestión de features por organización
 * Permite al superadmin habilitar/deshabilitar módulos para cada organización
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Building2, Camera, Bell, Shield, HardDrive, Video, 
  ClipboardList, FileText, Brain, Image, Network, Server,
  Search, RefreshCw, Save, CheckCircle, XCircle, Settings2
} from 'lucide-react';

// Feature configuration with icons and descriptions
const FEATURES_CONFIG = {
  devices: { label: 'Dispositivos', icon: Camera, description: 'Cámaras y dispositivos de red', color: 'blue' },
  alerts: { label: 'Alertas', icon: Bell, description: 'Sistema de alertas y notificaciones', color: 'yellow' },
  cra: { label: 'CRA', icon: Shield, description: 'Central Receptora de Alarmas', color: 'red' },
  dahua: { label: 'Grabadores', icon: HardDrive, description: 'DVR/NVR Dahua P2P', color: 'purple' },
  live_view: { label: 'Vista en Directo', icon: Video, description: 'Streaming de cámaras', color: 'green' },
  incidents: { label: 'Incidencias', icon: ClipboardList, description: 'Gestión de incidentes', color: 'orange' },
  reports: { label: 'Reportes', icon: FileText, description: 'Estadísticas y reportes', color: 'indigo' },
  ai_insights: { label: 'AI Insights', icon: Brain, description: 'Panel de inteligencia artificial', color: 'pink' },
  gallery: { label: 'Galería', icon: Image, description: 'Galería de imágenes', color: 'cyan' },
  vpn: { label: 'VPN', icon: Network, description: 'Túneles VPN', color: 'emerald' },
  infrastructure: { label: 'Infraestructura', icon: Server, description: 'Dispositivos de infraestructura', color: 'slate' },
};

const OrganizationFeaturesManager = ({ authAxios }) => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingChanges, setPendingChanges] = useState({});

  const fetchOrganizations = useCallback(async () => {
    if (!authAxios) return;
    setLoading(true);
    try {
      const res = await authAxios.get('/organizations/all/features');
      setOrganizations(res.data.organizations || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Error al cargar organizaciones');
    }
    setLoading(false);
  }, [authAxios]);

  useEffect(() => { fetchOrganizations(); }, [fetchOrganizations]);

  const handleFeatureToggle = (orgId, featureKey, newValue) => {
    // Track pending changes
    setPendingChanges(prev => ({
      ...prev,
      [orgId]: {
        ...(prev[orgId] || {}),
        [featureKey]: newValue
      }
    }));
    
    // Update local state for immediate UI feedback
    setOrganizations(prev => prev.map(org => {
      if (org.id === orgId) {
        return {
          ...org,
          feature_flags: {
            ...org.feature_flags,
            [featureKey]: newValue
          }
        };
      }
      return org;
    }));
  };

  const saveChanges = async (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    if (!org) return;

    setSaving(prev => ({ ...prev, [orgId]: true }));
    try {
      await authAxios.put(`/organizations/${orgId}/features`, org.feature_flags);
      toast.success(`Features actualizados para ${org.name}`);
      // Clear pending changes for this org
      setPendingChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[orgId];
        return newChanges;
      });
    } catch (error) {
      console.error('Error saving features:', error);
      toast.error('Error al guardar features');
    }
    setSaving(prev => ({ ...prev, [orgId]: false }));
  };

  const enableAllFeatures = async (orgId) => {
    const allEnabled = {};
    Object.keys(FEATURES_CONFIG).forEach(key => { allEnabled[key] = true; });
    
    setOrganizations(prev => prev.map(org => {
      if (org.id === orgId) {
        return { ...org, feature_flags: allEnabled };
      }
      return org;
    }));
    
    setPendingChanges(prev => ({ ...prev, [orgId]: allEnabled }));
  };

  const disableAllFeatures = async (orgId) => {
    const allDisabled = {};
    Object.keys(FEATURES_CONFIG).forEach(key => { allDisabled[key] = false; });
    
    setOrganizations(prev => prev.map(org => {
      if (org.id === orgId) {
        return { ...org, feature_flags: allDisabled };
      }
      return org;
    }));
    
    setPendingChanges(prev => ({ ...prev, [orgId]: allDisabled }));
  };

  const filteredOrgs = organizations.filter(org => 
    org.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const countEnabledFeatures = (flags) => {
    if (!flags) return 0;
    return Object.values(flags).filter(v => v === true).length;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Gestión de Features por Organización
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-purple-600" />
          Gestión de Features por Organización
        </CardTitle>
        <CardDescription>
          Controla qué módulos están disponibles para cada organización. Los usuarios de esa organización solo verán los módulos habilitados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and refresh */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar organización..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={fetchOrganizations}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Organizations list */}
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {filteredOrgs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay organizaciones
              </div>
            ) : (
              filteredOrgs.map(org => {
                const enabledCount = countEnabledFeatures(org.feature_flags);
                const totalFeatures = Object.keys(FEATURES_CONFIG).length;
                const hasPendingChanges = pendingChanges[org.id] && Object.keys(pendingChanges[org.id]).length > 0;
                
                return (
                  <Card key={org.id} className={`border ${hasPendingChanges ? 'border-yellow-400 bg-yellow-50/50' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-blue-600" />
                          <div>
                            <CardTitle className="text-base">{org.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={enabledCount === totalFeatures ? 'default' : enabledCount === 0 ? 'destructive' : 'secondary'}>
                                {enabledCount}/{totalFeatures} activos
                              </Badge>
                              {hasPendingChanges && (
                                <Badge variant="outline" className="text-yellow-600 border-yellow-400">
                                  Cambios pendientes
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => enableAllFeatures(org.id)}
                            className="text-green-600"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Todos
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => disableAllFeatures(org.id)}
                            className="text-red-600"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Ninguno
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => saveChanges(org.id)}
                            disabled={saving[org.id] || !hasPendingChanges}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            {saving[org.id] ? 'Guardando...' : 'Guardar'}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Object.entries(FEATURES_CONFIG).map(([key, config]) => {
                          const Icon = config.icon;
                          const isEnabled = org.feature_flags?.[key] ?? true;
                          
                          return (
                            <div 
                              key={key}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                isEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${isEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                                <span className={`text-sm font-medium ${isEnabled ? '' : 'text-gray-500'}`}>
                                  {config.label}
                                </span>
                              </div>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => handleFeatureToggle(org.id, key, checked)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default OrganizationFeaturesManager;
