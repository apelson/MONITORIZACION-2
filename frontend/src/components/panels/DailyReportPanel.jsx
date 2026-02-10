/**
 * DailyReportPanel - Daily downtime report configuration
 * Extracted from App.js for better maintainability
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FileText, Plus, Mail, X, Eye, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

const DailyReportPanel = ({ authAxios }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState({
    enabled: false,
    time: "08:00",
    recipients: []
  });
  const [emailInput, setEmailInput] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await authAxios.get("/reports/settings");
        setConfig({
          enabled: res.data.daily_report_enabled || false,
          time: res.data.daily_report_time || "08:00",
          recipients: res.data.daily_report_recipients || []
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchSettings();
  }, [authAxios]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAxios.put("/reports/settings", {
        daily_report_enabled: config.enabled,
        daily_report_time: config.time,
        daily_report_recipients: config.recipients
      });
      toast.success("Configuracion guardada");
    } catch (e) {
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const handleSendNow = async () => {
    if (config.recipients.length === 0) {
      toast.error("Anade al menos un destinatario");
      return;
    }
    setSending(true);
    try {
      await authAxios.post(`/reports/send?days=1`, config.recipients);
      toast.success("Informe enviado correctamente");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al enviar");
    }
    setSending(false);
  };

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await authAxios.get("/reports/preview?days=1");
      setPreview(res.data);
    } catch (e) {
      toast.error("Error al cargar preview");
    }
    setLoadingPreview(false);
  };

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (email && email.includes("@") && !config.recipients.includes(email)) {
      setConfig({ ...config, recipients: [...config.recipients, email] });
      setEmailInput("");
    }
  };

  const removeEmail = (email) => {
    setConfig({ ...config, recipients: config.recipients.filter(e => e !== email) });
  };

  if (loading) return <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>;

  return (
    <Card data-testid="daily-report-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-600" />
          Informe Diario de Caidas
        </CardTitle>
        <CardDescription>Recibe un resumen diario con todas las caidas de dispositivos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
          <div>
            <p className="font-medium text-orange-900">Informe automatico diario</p>
            <p className="text-sm text-orange-700">Recibe cada dia un resumen de las caidas del sistema</p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} data-testid="daily-report-toggle" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Hora de envio</label>
            <Input type="time" value={config.time} onChange={(e) => setConfig({ ...config, time: e.target.value })} data-testid="report-time-input" />
            <p className="text-xs text-muted-foreground">Hora local del servidor</p>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Destinatarios</label>
          <div className="flex gap-2">
            <Input placeholder="email@ejemplo.com" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addEmail()} data-testid="recipient-email-input" />
            <Button onClick={addEmail} variant="outline" data-testid="add-recipient-btn"><Plus className="w-4 h-4" /></Button>
          </div>
          {config.recipients.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2" data-testid="recipients-list">
              {config.recipients.map(email => (
                <Badge key={email} variant="secondary" className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />{email}
                  <button onClick={() => removeEmail(email)} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-sm">Vista previa del informe</p>
            <Button variant="outline" size="sm" onClick={loadPreview} disabled={loadingPreview} data-testid="preview-report-btn">
              <Eye className="w-4 h-4 mr-1" />{loadingPreview ? t('common.loading', 'Cargando...') : t('reports.viewPreview', 'Ver preview')}
            </Button>
          </div>
          {preview && (
            <div className="grid grid-cols-4 gap-3 text-center" data-testid="report-preview">
              <div className="bg-white p-3 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{preview.summary.online_now}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{preview.summary.offline_now}</p>
                <p className="text-xs text-muted-foreground">Offline</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{preview.summary.total_downtime_events}</p>
                <p className="text-xs text-muted-foreground">Caidas (24h)</p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-2xl font-bold text-gray-600">{preview.summary.total_devices}</p>
                <p className="text-xs text-muted-foreground">{t('common.total', 'Total')}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} data-testid="save-report-config-btn">
            {saving ? t('common.saving', 'Guardando...') : t('settings.saveConfig', 'Guardar configuracion')}
          </Button>
          <Button variant="outline" onClick={handleSendNow} disabled={sending || config.recipients.length === 0} data-testid="send-report-now-btn">
            <Send className="w-4 h-4 mr-2" />{sending ? "Enviando..." : "Enviar ahora"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyReportPanel;
