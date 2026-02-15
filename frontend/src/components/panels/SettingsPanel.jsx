/**
 * Settings Panel - SMTP Email Configuration
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Mail, Send, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const SettingsPanel = ({ settings, onSave, authAxios }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ 
    smtp_host: "smtp.gmail.com",
    smtp_port: 465,
    smtp_user: "",
    smtp_password: "",
    smtp_use_ssl: true,
    alert_email: ""
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    if (settings) {
      setFormData({ 
        smtp_host: settings.smtp_host || "smtp.gmail.com",
        smtp_port: settings.smtp_port || 465,
        smtp_user: settings.smtp_user || settings.gmail_user || "",
        smtp_password: "",
        smtp_use_ssl: settings.smtp_use_ssl !== false,
        alert_email: settings.alert_email || ""
      });
      // Show advanced if non-Gmail server
      if (settings.smtp_host && settings.smtp_host !== "smtp.gmail.com") {
        setShowAdvanced(true);
      }
      setLoading(false);
    }
  }, [settings]);

  const handleSave = async (e) => { 
    e.preventDefault(); 
    if (!formData.alert_email || !formData.smtp_user || !formData.smtp_password) { 
      toast.error("Completa todos los campos requeridos"); 
      return; 
    } 
    setSaving(true); 
    try {
      await authAxios.post("/settings/smtp", formData);
      toast.success("Configuración guardada");
      if (onSave) onSave(formData);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al guardar");
    }
    setSaving(false); 
  };
  
  const handleTest = async () => { 
    setTesting(true); 
    try { 
      await authAxios.post("/settings/test-email"); 
      toast.success("Email de prueba enviado"); 
    } catch (e) { 
      toast.error(e.response?.data?.detail || "Error al enviar"); 
    } 
    setTesting(false); 
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />Configuración Email (SMTP)
        </CardTitle>
        <CardDescription>Configura el servidor de correo para alertas y notificaciones</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Cargando Configuración</h3>
              <p className="text-sm text-muted-foreground">Obteniendo datos del servidor...</p>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email para alertas</Label>
              <Input 
                data-testid="settings-alert-email" 
                type="email" 
                placeholder="alertas@empresa.com" 
                value={formData.alert_email} 
                onChange={(e) => setFormData({ ...formData, alert_email: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Usuario SMTP</Label>
              <Input 
                data-testid="settings-smtp-user" 
                type="email" 
                placeholder="correo@empresa.com" 
                value={formData.smtp_user} 
                onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Contraseña SMTP</Label>
            <Input 
              data-testid="settings-smtp-password" 
              type="password" 
              placeholder={settings?.smtp_user ? "••••••••" : "Contraseña del correo"} 
              value={formData.smtp_password} 
              onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })} 
            />
          </div>
          
          {/* Advanced SMTP Settings */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                Configuración avanzada
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Servidor SMTP</Label>
                  <Input 
                    data-testid="settings-smtp-host" 
                    placeholder="smtp.gmail.com" 
                    value={formData.smtp_host} 
                    onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Puerto</Label>
                  <Input 
                    data-testid="settings-smtp-port" 
                    type="number" 
                    placeholder="465" 
                    value={formData.smtp_port} 
                    onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 465 })} 
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={formData.smtp_use_ssl} 
                  onCheckedChange={(v) => setFormData({ ...formData, smtp_use_ssl: v })} 
                />
                <Label>Usar SSL (puerto 465)</Label>
              </div>
            </CollapsibleContent>
          </Collapsible>
          
          <div className="flex gap-2 pt-4">
            <Button data-testid="save-settings-btn" type="submit" disabled={saving}>
              {saving ? t('common.saving', 'Guardando...') : t('common.save', 'Guardar')}
            </Button>
            <Button type="button" variant="outline" onClick={handleTest} disabled={testing || !settings?.smtp_user}>
              <Send className="w-4 h-4 mr-2" />{testing ? "Enviando..." : "Probar Email"}
            </Button>
          </div>
        </form>
        )}
      </CardContent>
    </Card>
  );
};

export default SettingsPanel;
