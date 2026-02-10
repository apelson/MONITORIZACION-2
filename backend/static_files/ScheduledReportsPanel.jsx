/**
 * ScheduledReportsPanel - Scheduled reports configuration
 * Extracted from App.js for better maintainability
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Calendar, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ScheduledReportsPanel = ({ organizations, authAxios }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState({
    enabled: false,
    frequency: "weekly",
    day_of_week: 0,
    day_of_month: 1,
    hour: 8,
    recipient_emails: [],
    include_offline_list: true,
    include_uptime_stats: true,
    organization_ids: []
  });
  const [emailInput, setEmailInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await authAxios.get("/scheduled-reports");
        if (res.data.config) setConfig(res.data.config);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchConfig();
  }, [authAxios]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authAxios.post("/scheduled-reports", config);
      toast.success("Configuracion de reportes guardada");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al guardar");
    }
    setSaving(false);
  };

  const handleSendNow = async () => {
    setSending(true);
    try {
      await authAxios.post("/scheduled-reports/send-now");
      toast.success("Reporte enviado correctamente");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al enviar reporte");
    }
    setSending(false);
  };

  const addEmail = () => {
    if (emailInput && emailInput.includes("@") && !config.recipient_emails.includes(emailInput)) {
      setConfig({ ...config, recipient_emails: [...config.recipient_emails, emailInput] });
      setEmailInput("");
    }
  };

  const removeEmail = (email) => {
    setConfig({ ...config, recipient_emails: config.recipient_emails.filter(e => e !== email) });
  };

  const dayNames = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

  if (loading) return <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>;

  return (
    <Card data-testid="scheduled-reports-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Reportes Programados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="font-medium">Reportes automaticos</p>
            <p className="text-sm text-muted-foreground">Enviar reportes de estado periodicamente</p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={(v) => setConfig({ ...config, enabled: v })} data-testid="scheduled-reports-toggle" />
        </div>

        {config.enabled && (
          <>
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select value={config.frequency} onValueChange={(v) => setConfig({ ...config, frequency: v })}>
                <SelectTrigger data-testid="report-frequency-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.frequency === "weekly" && (
              <div className="space-y-2">
                <Label>Dia de la semana</Label>
                <Select value={config.day_of_week.toString()} onValueChange={(v) => setConfig({ ...config, day_of_week: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dayNames.map((day, i) => <SelectItem key={i} value={i.toString()}>{day}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.frequency === "monthly" && (
              <div className="space-y-2">
                <Label>Dia del mes</Label>
                <Select value={config.day_of_month.toString()} onValueChange={(v) => setConfig({ ...config, day_of_month: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[...Array(28)].map((_, i) => <SelectItem key={i+1} value={(i+1).toString()}>{i+1}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Hora de envio (UTC)</Label>
              <Select value={config.hour.toString()} onValueChange={(v) => setConfig({ ...config, hour: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...Array(24)].map((_, i) => <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}:00</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destinatarios</Label>
              <div className="flex gap-2">
                <Input placeholder="email@ejemplo.com" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())} data-testid="report-recipient-input" />
                <Button type="button" variant="outline" onClick={addEmail} data-testid="add-report-recipient-btn"><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2" data-testid="report-recipients-list">
                {config.recipient_emails.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button onClick={() => removeEmail(email)} className="ml-1 hover:text-red-500">&times;</button>
                  </Badge>
                ))}
              </div>
              {config.recipient_emails.length === 0 && (
                <p className="text-xs text-muted-foreground">Se usara el email de alertas configurado</p>
              )}
            </div>

            <div className="space-y-3">
              <Label>Contenido del reporte</Label>
              <div className="flex items-center gap-2">
                <Switch checked={config.include_uptime_stats} onCheckedChange={(v) => setConfig({ ...config, include_uptime_stats: v })} />
                <span className="text-sm">Incluir estadisticas de uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={config.include_offline_list} onCheckedChange={(v) => setConfig({ ...config, include_offline_list: v })} />
                <span className="text-sm">Incluir lista de dispositivos offline</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Organizaciones a incluir</Label>
              <div className="flex flex-wrap gap-2" data-testid="report-organizations-list">
                {organizations.map((org) => (
                  <Badge 
                    key={org.id} 
                    variant={config.organization_ids.includes(org.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const ids = config.organization_ids.includes(org.id)
                        ? config.organization_ids.filter(id => id !== org.id)
                        : [...config.organization_ids, org.id];
                      setConfig({ ...config, organization_ids: ids });
                    }}
                  >
                    {org.name}
                  </Badge>
                ))}
              </div>
              {config.organization_ids.length === 0 && (
                <p className="text-xs text-muted-foreground">Todas las organizaciones seran incluidas</p>
              )}
            </div>
          </>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} data-testid="save-scheduled-reports-btn">
            {saving ? t('common.saving', 'Guardando...') : t('settings.saveConfig', 'Guardar configuracion')}
          </Button>
          <Button variant="outline" onClick={handleSendNow} disabled={sending || !config.enabled} data-testid="send-scheduled-report-btn">
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Enviando..." : "Enviar ahora"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScheduledReportsPanel;
