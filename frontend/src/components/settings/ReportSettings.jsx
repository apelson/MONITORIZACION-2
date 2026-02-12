/**
 * Report Settings Component
 * Configure daily email reports
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Clock, Users, Send, Check, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const ReportSettings = ({ authAxios }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [settings, setSettings] = useState({
    daily_report_enabled: false,
    daily_report_time: '08:00',
    daily_report_recipients: []
  });
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await authAxios.get('/reports/settings');
      setSettings({
        daily_report_enabled: res.data.daily_report_enabled || false,
        daily_report_time: res.data.daily_report_time || '08:00',
        daily_report_recipients: res.data.daily_report_recipients || []
      });
    } catch (error) {
      console.error('Error fetching report settings:', error);
      toast.error('Error al cargar configuración de reportes');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await authAxios.put('/reports/settings', settings);
      toast.success('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const addRecipient = () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Introduce un email válido');
      return;
    }
    if (settings.daily_report_recipients.includes(newEmail)) {
      toast.error('Este email ya está en la lista');
      return;
    }
    setSettings(prev => ({
      ...prev,
      daily_report_recipients: [...prev.daily_report_recipients, newEmail]
    }));
    setNewEmail('');
  };

  const removeRecipient = (email) => {
    setSettings(prev => ({
      ...prev,
      daily_report_recipients: prev.daily_report_recipients.filter(e => e !== email)
    }));
  };

  const sendTestReport = async () => {
    if (settings.daily_report_recipients.length === 0) {
      toast.error('Añade al menos un destinatario');
      return;
    }
    setSendingTest(true);
    try {
      const res = await authAxios.post('/reports/send', {
        recipients: settings.daily_report_recipients,
        days: 1
      });
      if (res.data.success) {
        toast.success(`Reporte enviado a ${res.data.recipients.join(', ')}`);
      } else {
        toast.error(res.data.error || 'Error al enviar reporte');
      }
    } catch (error) {
      console.error('Error sending test report:', error);
      toast.error('Error al enviar reporte de prueba');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          {t('settings.reports', 'Reportes por Email')}
        </CardTitle>
        <CardDescription>
          Configura el envío automático de reportes diarios con el estado de los dispositivos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <Label className="text-base font-medium">Reportes diarios automáticos</Label>
            <p className="text-sm text-muted-foreground">
              Recibe un resumen diario con dispositivos offline y alertas
            </p>
          </div>
          <Switch
            checked={settings.daily_report_enabled}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, daily_report_enabled: checked }))}
          />
        </div>

        {/* Time */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Hora de envío
          </Label>
          <Input
            type="time"
            value={settings.daily_report_time}
            onChange={(e) => setSettings(prev => ({ ...prev, daily_report_time: e.target.value }))}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            El reporte se enviará todos los días a esta hora
          </p>
        </div>

        {/* Recipients */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Destinatarios
          </Label>
          
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@ejemplo.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
              className="flex-1"
            />
            <Button onClick={addRecipient} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Añadir
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-muted/30 rounded-lg">
            {settings.daily_report_recipients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay destinatarios configurados</p>
            ) : (
              settings.daily_report_recipients.map((email) => (
                <Badge key={email} variant="secondary" className="px-3 py-1">
                  {email}
                  <button
                    onClick={() => removeRecipient(email)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Guardar configuración
          </Button>
          
          <Button variant="outline" onClick={sendTestReport} disabled={sendingTest}>
            {sendingTest ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar reporte de prueba
          </Button>
        </div>

        {/* Info */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            ℹ️ Información del reporte
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Resumen de dispositivos online/offline</li>
            <li>• Lista de dispositivos con caídas en las últimas 24h</li>
            <li>• Historial de alertas del período</li>
            <li>• Estado actual del sistema</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportSettings;
