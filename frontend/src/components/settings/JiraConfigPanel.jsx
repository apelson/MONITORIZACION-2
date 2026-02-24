/**
 * JiraConfigPanel - Panel de configuracion de integracion JIRA
 * Permite a cada tenant configurar su propia instancia de JIRA
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Settings2, Link2, TestTube, Save, RefreshCw, CheckCircle2, XCircle,
  Ticket, Clock, AlertTriangle, Eye, EyeOff, ExternalLink, Loader2
} from 'lucide-react';

const JiraConfigPanel = ({ authAxios }) => {
  const [config, setConfig] = useState({
    enabled: false,
    jira_type: 'cloud',
    jira_url: '',
    jira_email: '',
    jira_api_token: '',
    default_project: '',
    auto_ticket_enabled: false,
    auto_ticket_offline_minutes: 10,
    auto_ticket_issue_type: 'Task',
    auto_ticket_priority: 'High',
    manual_tickets_enabled: true,
    sync_enabled: false,
    dashboard_widget_enabled: true,
    has_credentials: false
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [projects, setProjects] = useState([]);
  const [issueTypes, setIssueTypes] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authAxios.get('/jira/config');
      setConfig(prev => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error('Error fetching JIRA config:', error);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  const fetchMetadata = useCallback(async () => {
    if (!config.enabled || !config.has_credentials) return;
    
    try {
      setLoadingMeta(true);
      const [projectsRes, prioritiesRes] = await Promise.all([
        authAxios.get('/jira/projects'),
        authAxios.get('/jira/priorities')
      ]);
      
      setProjects(projectsRes.data.projects || []);
      setPriorities(prioritiesRes.data.priorities || []);
      
      // Get issue types if project is selected
      if (config.default_project) {
        const typesRes = await authAxios.get(`/jira/issue-types?project_key=${config.default_project}`);
        setIssueTypes(typesRes.data.issue_types || []);
      }
    } catch (error) {
      console.error('Error fetching JIRA metadata:', error);
    } finally {
      setLoadingMeta(false);
    }
  }, [authAxios, config.enabled, config.has_credentials, config.default_project]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config.enabled && config.has_credentials) {
      fetchMetadata();
    }
  }, [config.enabled, config.has_credentials, fetchMetadata]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updateData = {
        enabled: config.enabled,
        jira_type: config.jira_type,
        jira_url: config.jira_url,
        jira_email: config.jira_email,
        default_project: config.default_project,
        auto_ticket_enabled: config.auto_ticket_enabled,
        auto_ticket_offline_minutes: config.auto_ticket_offline_minutes,
        auto_ticket_issue_type: config.auto_ticket_issue_type,
        auto_ticket_priority: config.auto_ticket_priority,
        manual_tickets_enabled: config.manual_tickets_enabled,
        sync_enabled: config.sync_enabled,
        dashboard_widget_enabled: config.dashboard_widget_enabled
      };
      
      // Only include token if it's been changed
      if (config.jira_api_token && config.jira_api_token !== '********') {
        updateData.jira_api_token = config.jira_api_token;
      }
      
      await authAxios.put('/jira/config', updateData);
      toast.success('Configuracion JIRA guardada');
      fetchConfig();
    } catch (error) {
      toast.error('Error al guardar configuracion');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      
      const response = await authAxios.post('/jira/config/test');
      setTestResult(response.data);
      
      if (response.data.success) {
        toast.success('Conexion exitosa con JIRA');
        fetchMetadata();
      } else {
        toast.error('Error de conexion: ' + response.data.error);
      }
    } catch (error) {
      setTestResult({ success: false, error: error.response?.data?.detail || error.message });
      toast.error('Error al probar conexion');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="jira-config-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <img src="https://cdn.worldvectorlogo.com/logos/jira-1.svg" alt="JIRA" className="w-6 h-6" />
            Integracion JIRA
          </h2>
          <p className="text-sm text-muted-foreground">
            Conecta con Atlassian JIRA para gestionar tickets automaticamente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
            data-testid="jira-enabled-toggle"
          />
          <span className="text-sm">{config.enabled ? 'Habilitado' : 'Deshabilitado'}</span>
        </div>
      </div>

      {config.enabled && (
        <Tabs defaultValue="connection" className="space-y-4">
          <TabsList>
            <TabsTrigger value="connection" className="gap-2">
              <Link2 className="w-4 h-4" />
              Conexion
            </TabsTrigger>
            <TabsTrigger value="automation" className="gap-2">
              <Clock className="w-4 h-4" />
              Automatizacion
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-2">
              <Settings2 className="w-4 h-4" />
              Funcionalidades
            </TabsTrigger>
          </TabsList>

          {/* Connection Tab */}
          <TabsContent value="connection" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Credenciales JIRA</CardTitle>
                <CardDescription>
                  Configura la conexion con tu instancia de JIRA Cloud o Server
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de JIRA</Label>
                    <Select
                      value={config.jira_type}
                      onValueChange={(value) => setConfig(prev => ({ ...prev, jira_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cloud">JIRA Cloud (atlassian.net)</SelectItem>
                        <SelectItem value="server">JIRA Server / Data Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>URL de JIRA</Label>
                    <Input
                      placeholder="https://tu-empresa.atlassian.net"
                      value={config.jira_url}
                      onChange={(e) => setConfig(prev => ({ ...prev, jira_url: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="tu@email.com"
                      value={config.jira_email}
                      onChange={(e) => setConfig(prev => ({ ...prev, jira_email: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>API Token</Label>
                    <div className="relative">
                      <Input
                        type={showToken ? 'text' : 'password'}
                        placeholder={config.has_credentials ? '********' : 'API Token de Atlassian'}
                        value={config.jira_api_token}
                        onChange={(e) => setConfig(prev => ({ ...prev, jira_api_token: e.target.value }))}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <a 
                        href="https://id.atlassian.com/manage-profile/security/api-tokens" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline inline-flex items-center gap-1"
                      >
                        Obtener API Token <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Proyecto por defecto</Label>
                  {projects.length > 0 ? (
                    <Select
                      value={config.default_project}
                      onValueChange={(value) => setConfig(prev => ({ ...prev, default_project: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un proyecto" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.key} value={p.key}>
                            {p.key} - {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="KAN, SOPORTE, IT..."
                      value={config.default_project}
                      onChange={(e) => setConfig(prev => ({ ...prev, default_project: e.target.value.toUpperCase() }))}
                    />
                  )}
                </div>
                
                <div className="flex items-center gap-4 pt-4">
                  <Button
                    onClick={handleTestConnection}
                    disabled={testing || !config.jira_url || !config.jira_email}
                    variant="outline"
                    className="gap-2"
                  >
                    {testing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <TestTube className="w-4 h-4" />
                    )}
                    Probar Conexion
                  </Button>
                  
                  {testResult && (
                    <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-green-500' : 'text-red-500'}`}>
                      {testResult.success ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Conectado como {testResult.user}
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          {testResult.error}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Tickets Automaticos por Dispositivos Offline
                </CardTitle>
                <CardDescription>
                  Crea tickets automaticamente cuando un dispositivo lleve tiempo offline
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Habilitar tickets automaticos</p>
                    <p className="text-sm text-muted-foreground">
                      Se creara un ticket cuando un dispositivo este offline por el tiempo configurado
                    </p>
                  </div>
                  <Switch
                    checked={config.auto_ticket_enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, auto_ticket_enabled: checked }))}
                  />
                </div>
                
                {config.auto_ticket_enabled && (
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Minutos offline para crear ticket</Label>
                      <Input
                        type="number"
                        min="1"
                        max="1440"
                        value={config.auto_ticket_offline_minutes}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          auto_ticket_offline_minutes: parseInt(e.target.value) || 10 
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Tipo de Issue</Label>
                      {issueTypes.length > 0 ? (
                        <Select
                          value={config.auto_ticket_issue_type}
                          onValueChange={(value) => setConfig(prev => ({ ...prev, auto_ticket_issue_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {issueTypes.map((it) => (
                              <SelectItem key={it.id} value={it.name}>{it.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder="Task, Bug, Incident..."
                          value={config.auto_ticket_issue_type}
                          onChange={(e) => setConfig(prev => ({ ...prev, auto_ticket_issue_type: e.target.value }))}
                        />
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Prioridad</Label>
                      {priorities.length > 0 ? (
                        <Select
                          value={config.auto_ticket_priority}
                          onValueChange={(value) => setConfig(prev => ({ ...prev, auto_ticket_priority: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {priorities.map((p) => (
                              <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder="High, Medium, Low..."
                          value={config.auto_ticket_priority}
                          onChange={(e) => setConfig(prev => ({ ...prev, auto_ticket_priority: e.target.value }))}
                        />
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funcionalidades</CardTitle>
                <CardDescription>
                  Activa o desactiva las diferentes funcionalidades de la integracion
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <Ticket className="w-4 h-4" />
                      Crear tickets manuales
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Permite crear tickets JIRA desde el panel de incidencias
                    </p>
                  </div>
                  <Switch
                    checked={config.manual_tickets_enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, manual_tickets_enabled: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Sincronizacion bidireccional
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Sincroniza estados entre JIRA y el sistema de incidencias
                    </p>
                  </div>
                  <Switch
                    checked={config.sync_enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, sync_enabled: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Widget en Dashboard
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Muestra tickets recientes de JIRA en el dashboard
                    </p>
                  </div>
                  <Switch
                    checked={config.dashboard_widget_enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, dashboard_widget_enabled: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Guardar Configuracion
        </Button>
      </div>
    </div>
  );
};

export default JiraConfigPanel;
