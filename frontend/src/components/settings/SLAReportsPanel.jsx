/**
 * SLA Reports Panel Component
 * Generate and download SLA compliance PDF reports
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, Download, Calendar, Building2, Target, 
  Loader2, Eye, CheckCircle, XCircle, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SLAReportsPanel = ({ authAxios, organizations = [] }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [config, setConfig] = useState({
    organization_id: 'all',
    period: 'month',
    sla_target: 99.9
  });

  const periods = [
    { value: 'week', label: 'Última semana' },
    { value: 'month', label: 'Último mes' },
    { value: 'quarter', label: 'Último trimestre' }
  ];

  const loadPreview = async () => {
    setPreviewing(true);
    try {
      const params = new URLSearchParams({
        period: config.period
      });
      if (config.organization_id !== 'all') {
        params.append('organization_id', config.organization_id);
      }

      const res = await authAxios.get(`/sla-reports/preview?${params}`);
      setPreview(res.data);
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('Error al cargar vista previa');
    } finally {
      setPreviewing(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, [config.organization_id, config.period]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period: config.period,
        sla_target: config.sla_target.toString()
      });
      if (config.organization_id !== 'all') {
        params.append('organization_id', config.organization_id);
      }

      const response = await authAxios.get(`/sla-reports/generate?${params}`, {
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from header or generate one
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'SLA_Report.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/);
        if (match) filename = match[1];
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Informe SLA generado correctamente');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Error al generar el informe');
    } finally {
      setLoading(false);
    }
  };

  const slaMet = preview?.stats?.uptime_percent >= config.sla_target;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-500" />
          Informes SLA
        </CardTitle>
        <CardDescription>
          Genera informes PDF de cumplimiento SLA para tus clientes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Organization */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Organización
            </Label>
            <Select 
              value={config.organization_id} 
              onValueChange={(v) => setConfig(p => ({ ...p, organization_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las organizaciones</SelectItem>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Período
            </Label>
            <Select 
              value={config.period} 
              onValueChange={(v) => setConfig(p => ({ ...p, period: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periods.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SLA Target */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Objetivo SLA (%)
            </Label>
            <Input 
              type="number"
              min="90"
              max="100"
              step="0.1"
              value={config.sla_target}
              onChange={(e) => setConfig(p => ({ ...p, sla_target: parseFloat(e.target.value) || 99.9 }))}
            />
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Vista Previa del Informe
              </h4>
              {previewing && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>

            {/* SLA Status */}
            <div className={cn(
              "p-4 rounded-lg border-2 flex items-center justify-between",
              slaMet 
                ? "bg-emerald-500/10 border-emerald-500" 
                : "bg-red-500/10 border-red-500"
            )}>
              <div className="flex items-center gap-3">
                {slaMet ? (
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-500" />
                )}
                <div>
                  <p className="font-bold text-lg">
                    Estado SLA: {slaMet ? 'CUMPLIDO' : 'NO CUMPLIDO'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Objetivo: {config.sla_target}% | Actual: {preview.stats?.uptime_percent?.toFixed(2)}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn("text-3xl font-bold", slaMet ? "text-emerald-500" : "text-red-500")}>
                  {preview.stats?.uptime_percent?.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground">Disponibilidad</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-background rounded-lg border">
                <p className="text-2xl font-bold text-cyan-500">{preview.stats?.total_devices || 0}</p>
                <p className="text-xs text-muted-foreground">Total Dispositivos</p>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <p className="text-2xl font-bold text-emerald-500">{preview.stats?.online || 0}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <p className="text-2xl font-bold text-red-500">{preview.stats?.offline || 0}</p>
                <p className="text-xs text-muted-foreground">Offline</p>
              </div>
              <div className="p-3 bg-background rounded-lg border">
                <p className="text-2xl font-bold text-amber-500">{preview.stats?.total_alerts || 0}</p>
                <p className="text-xs text-muted-foreground">Alertas</p>
              </div>
            </div>

            {/* Period info */}
            <div className="text-xs text-muted-foreground">
              Período: {new Date(preview.period_start).toLocaleDateString('es-ES')} - {new Date(preview.period_end).toLocaleDateString('es-ES')}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={generateReport} disabled={loading} className="flex-1">
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Generar Informe PDF
          </Button>
          <Button variant="outline" onClick={loadPreview} disabled={previewing}>
            <Eye className="w-4 h-4 mr-2" />
            Actualizar Vista Previa
          </Button>
        </div>

        {/* Info */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            ℹ️ Contenido del Informe
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Resumen ejecutivo con estado de cumplimiento SLA</li>
            <li>• Métricas de disponibilidad y tiempo de respuesta</li>
            <li>• Estado de dispositivos por organización</li>
            <li>• Historial de incidencias del período</li>
            <li>• Resumen de alertas por tipo</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default SLAReportsPanel;
