/**
 * Fail2banPanel - Panel de integración con fail2ban
 * Monitorización y configuración del sistema de detección de intrusiones
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Shield, ShieldAlert, ShieldCheck, ShieldX, RefreshCw,
  Ban, Check, AlertTriangle, Terminal, Copy, Download,
  Settings, Info, Clock, Server, FileText
} from 'lucide-react';

const Fail2banPanel = ({ authAxios }) => {
  const [status, setStatus] = useState(null);
  const [jailStatus, setJailStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGuideDialog, setShowGuideDialog] = useState(false);
  const [guide, setGuide] = useState(null);
  const [banIP, setBanIP] = useState('');
  const [banning, setBanning] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      console.log('[Fail2banPanel] Fetching data...');
      const [statusRes, configRes, logsRes] = await Promise.all([
        authAxios.get('/fail2ban/status'),
        authAxios.get('/fail2ban/config'),
        authAxios.get('/fail2ban/logs?limit=20')
      ]);
      
      console.log('[Fail2banPanel] Status:', statusRes.data);
      setStatus(statusRes.data.status);
      setConfig(configRes.data.config);
      setLogs(logsRes.data.logs || []);

      // If fail2ban is running, get jail status
      if (statusRes.data.status?.running) {
        try {
          const jailRes = await authAxios.get('/fail2ban/jail/siempria-auth');
          setJailStatus(jailRes.data.jail_status);
        } catch (e) {
          console.log('[Fail2banPanel] Jail not found or not active');
        }
      }
    } catch (e) {
      console.error('[Fail2banPanel] Error fetching data:', e);
      // Set default values on error so component still renders
      setStatus({ installed: false, running: false, jails: [], jail_count: 0 });
      setConfig({ enabled: true, max_retry: 5, ban_time: 1800, find_time: 600, jail_name: 'siempria-auth', log_path: '/var/log/siempria/auth.log', notify_telegram: true, notify_email: true });
    }
    setLoading(false);
  }, [authAxios]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBanIP = async () => {
    if (!banIP) { toast.error('Introduce una IP'); return; }
    setBanning(true);
    try {
      await authAxios.post('/fail2ban/ban', { ip: banIP });
      toast.success(`IP ${banIP} bloqueada`);
      setBanIP('');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al bloquear IP');
    }
    setBanning(false);
  };

  const handleUnbanIP = async (ip) => {
    try {
      await authAxios.post('/fail2ban/unban', { ip });
      toast.success(`IP ${ip} desbloqueada`);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al desbloquear IP');
    }
  };

  const handleSync = async () => {
    try {
      const res = await authAxios.post('/fail2ban/sync');
      toast.success(`Sincronizado: ${res.data.result?.synced || 0} IPs`);
      fetchData();
    } catch (e) {
      toast.error('Error al sincronizar');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await authAxios.post('/fail2ban/config', config);
      toast.success('Configuración guardada');
    } catch (e) {
      toast.error('Error al guardar configuración');
    }
  };

  const loadGuide = async () => {
    try {
      const res = await authAxios.get('/fail2ban/installation-guide');
      setGuide(res.data);
      setShowGuideDialog(true);
    } catch (e) {
      toast.error('Error al cargar guía');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  if (loading) return <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-purple-600" />
          Fail2ban - Detección de Intrusiones
        </CardTitle>
        <CardDescription>
          Sistema de bloqueo automático a nivel de sistema operativo para proteger contra ataques de fuerza bruta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg border ${status?.installed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              {status?.installed ? <ShieldCheck className="w-4 h-4 text-green-600" /> : <ShieldX className="w-4 h-4 text-red-600" />}
              <span className="text-sm font-medium">Instalado</span>
            </div>
            <div className={`text-lg font-bold ${status?.installed ? 'text-green-700' : 'text-red-700'}`}>
              {status?.installed ? 'Sí' : 'No'}
            </div>
          </div>
          
          <div className={`p-4 rounded-lg border ${status?.running ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              {status?.running ? <Check className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-yellow-600" />}
              <span className="text-sm font-medium">Estado</span>
            </div>
            <div className={`text-lg font-bold ${status?.running ? 'text-green-700' : 'text-yellow-700'}`}>
              {status?.running ? 'Activo' : 'Inactivo'}
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-purple-50 border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Server className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Jails</span>
            </div>
            <div className="text-lg font-bold text-purple-700">
              {status?.jail_count || 0}
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-red-50 border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <Ban className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium">Bloqueados</span>
            </div>
            <div className="text-lg font-bold text-red-700">
              {jailStatus?.currently_banned || 0}
            </div>
          </div>
        </div>

        {/* Not installed message */}
        {!status?.installed && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-800">Fail2ban no está instalado</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Para protección a nivel de sistema, instala fail2ban en tu servidor. 
                  Haz clic en "Guía de Instalación" para ver los pasos.
                </p>
                <Button variant="outline" size="sm" onClick={loadGuide} className="mt-2">
                  <FileText className="w-4 h-4 mr-2" />
                  Guía de Instalación
                </Button>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="actions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="actions">Acciones</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
            <TabsTrigger value="logs">Historial</TabsTrigger>
          </TabsList>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4 pt-4">
            {/* Manual Ban */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Ban className="w-4 h-4" />
                Bloquear IP Manualmente
              </Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="IP a bloquear (ej: 192.168.1.100)" 
                  value={banIP}
                  onChange={(e) => setBanIP(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleBanIP} disabled={banning} variant="destructive">
                  {banning ? 'Bloqueando...' : 'Bloquear'}
                </Button>
              </div>
            </div>

            {/* Banned IPs */}
            {jailStatus?.banned_ips?.length > 0 && (
              <div className="space-y-2">
                <Label>IPs Actualmente Bloqueadas ({jailStatus.banned_ips.length})</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {jailStatus.banned_ips.map((ip, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded">
                      <span className="font-mono">{ip}</span>
                      <Button size="sm" variant="outline" onClick={() => handleUnbanIP(ip)}>
                        Desbloquear
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleSync}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar con Sistema Interno
              </Button>
              <Button variant="outline" onClick={loadGuide}>
                <Info className="w-4 h-4 mr-2" />
                Guía de Instalación
              </Button>
            </div>
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config" className="space-y-4 pt-4">
            {config && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Intentos máximos</Label>
                    <Input 
                      type="number" 
                      value={config.max_retry}
                      onChange={(e) => setConfig({...config, max_retry: parseInt(e.target.value)})}
                    />
                    <p className="text-xs text-muted-foreground">Intentos antes de bloquear</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Tiempo de baneo (segundos)</Label>
                    <Input 
                      type="number" 
                      value={config.ban_time}
                      onChange={(e) => setConfig({...config, ban_time: parseInt(e.target.value)})}
                    />
                    <p className="text-xs text-muted-foreground">{Math.floor(config.ban_time/60)} minutos</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Ventana de detección (segundos)</Label>
                    <Input 
                      type="number" 
                      value={config.find_time}
                      onChange={(e) => setConfig({...config, find_time: parseInt(e.target.value)})}
                    />
                    <p className="text-xs text-muted-foreground">{Math.floor(config.find_time/60)} minutos</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre del Jail</Label>
                    <Input 
                      value={config.jail_name}
                      onChange={(e) => setConfig({...config, jail_name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Label>Notificar por Telegram</Label>
                    <p className="text-xs text-muted-foreground">Alertas cuando una IP es bloqueada</p>
                  </div>
                  <Switch 
                    checked={config.notify_telegram}
                    onCheckedChange={(v) => setConfig({...config, notify_telegram: v})}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Label>Notificar por Email</Label>
                    <p className="text-xs text-muted-foreground">Alertas por correo electrónico</p>
                  </div>
                  <Switch 
                    checked={config.notify_email}
                    onCheckedChange={(v) => setConfig({...config, notify_email: v})}
                  />
                </div>

                <Button onClick={handleSaveConfig} className="w-full">
                  Guardar Configuración
                </Button>
              </>
            )}
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="pt-4">
            {logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay registros de acciones</p>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded-lg text-sm">
                      <Badge variant={log.action === 'ban' ? 'destructive' : 'default'}>
                        {log.action === 'ban' ? 'Bloqueado' : 'Desbloqueado'}
                      </Badge>
                      <span className="font-mono">{log.ip}</span>
                      {log.manual && <Badge variant="outline">Manual</Badge>}
                      <span className="text-muted-foreground ml-auto">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </CardContent>

      {/* Installation Guide Dialog */}
      <Dialog open={showGuideDialog} onOpenChange={setShowGuideDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Guía de Instalación de Fail2ban
            </DialogTitle>
            <DialogDescription>
              Sigue estos pasos para configurar fail2ban en tu servidor de producción
            </DialogDescription>
          </DialogHeader>

          {guide && (
            <div className="space-y-4">
              {guide.installation_steps?.map((step, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Paso {step.step}: {step.title}</h4>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(step.command)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <pre className="bg-slate-900 text-green-400 p-3 rounded text-sm overflow-x-auto">
                    {step.command}
                  </pre>
                  {step.content && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground">
                        Ver contenido del archivo
                      </summary>
                      <pre className="mt-2 bg-slate-100 p-3 rounded text-xs overflow-x-auto">
                        {step.content}
                      </pre>
                    </details>
                  )}
                </div>
              ))}

              {guide.notes && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Notas importantes</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {guide.notes.map((note, idx) => (
                      <li key={idx}>• {note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGuideDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Fail2banPanel;
