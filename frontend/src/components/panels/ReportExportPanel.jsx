/**
 * ReportExportPanel - Panel para exportar informes PDF con comparativas
 * Permite seleccionar período y descargar el informe
 */
import { useState } from 'react';
import { 
  FileDown, Calendar, TrendingUp, TrendingDown, Minus,
  FileText, Download, Loader2, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const ReportExportPanel = ({ authAxios }) => {
  const [period, setPeriod] = useState('day');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  const periods = [
    { id: 'day', label: 'Día', description: 'Hoy vs Ayer' },
    { id: 'week', label: 'Semana', description: 'Esta semana vs Anterior' },
    { id: 'month', label: 'Mes', description: 'Este mes vs Anterior' }
  ];
  
  const loadPreview = async (selectedPeriod) => {
    setPeriod(selectedPeriod);
    setLoadingPreview(true);
    try {
      const res = await authAxios.get(`/brand-statistics/export/json?period=${selectedPeriod}`);
      setPreviewData(res.data);
    } catch (error) {
      console.error('Error loading preview:', error);
    }
    setLoadingPreview(false);
  };
  
  const downloadPDF = async () => {
    setLoading(true);
    try {
      const response = await authAxios.get(`/brand-statistics/export/pdf?period=${period}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `informe_visitas_${period}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error al descargar el informe');
    }
    setLoading(false);
  };
  
  const ChangeIndicator = ({ change }) => {
    if (!change) return null;
    
    const Icon = change.direction === 'up' ? TrendingUp : change.direction === 'down' ? TrendingDown : Minus;
    const color = change.direction === 'up' ? 'text-green-600' : change.direction === 'down' ? 'text-red-600' : 'text-gray-500';
    const bg = change.direction === 'up' ? 'bg-green-50' : change.direction === 'down' ? 'bg-red-50' : 'bg-gray-50';
    
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium", color, bg)}>
        <Icon className="w-3 h-3" />
        {change.percent}%
      </span>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Exportar Informe
        </CardTitle>
        <CardDescription>
          Genera informes PDF con comparativas entre períodos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Period selector */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Selecciona el período:
          </label>
          <div className="grid grid-cols-3 gap-3">
            {periods.map(p => (
              <button
                key={p.id}
                onClick={() => loadPreview(p.id)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left",
                  period === p.id 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">{p.label}</span>
                </div>
                <p className="text-xs text-gray-500">{p.description}</p>
              </button>
            ))}
          </div>
        </div>
        
        {/* Preview */}
        {loadingPreview ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : previewData && (
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Vista Previa del Informe
            </h4>
            
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 uppercase">Total Actual</p>
                <p className="text-2xl font-bold text-gray-900">
                  {previewData.summary?.current_total?.toLocaleString('es-ES') || 0}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 uppercase">Período Anterior</p>
                <p className="text-2xl font-bold text-gray-500">
                  {previewData.summary?.previous_total?.toLocaleString('es-ES') || 0}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 uppercase">Variación</p>
                <div className="mt-1">
                  <ChangeIndicator change={previewData.summary?.change} />
                </div>
              </div>
            </div>
            
            {/* Ranking preview */}
            {previewData.ranking?.length > 0 && (
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <p className="text-xs text-gray-500 uppercase mb-2">Top 5 Marcas</p>
                <div className="space-y-2">
                  {previewData.ranking.slice(0, 5).map((brand, index) => (
                    <div key={brand.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          index === 0 ? "bg-yellow-100 text-yellow-700" :
                          index === 1 ? "bg-gray-100 text-gray-700" :
                          index === 2 ? "bg-amber-100 text-amber-700" :
                          "bg-gray-50 text-gray-500"
                        )}>
                          {index + 1}
                        </span>
                        <span className="font-medium">{brand.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          {brand.current?.toLocaleString('es-ES')}
                        </span>
                        <ChangeIndicator change={brand.change} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Download button */}
        <Button 
          onClick={downloadPDF} 
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generando PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Descargar Informe PDF
            </>
          )}
        </Button>
        
        <p className="text-xs text-gray-500 text-center">
          El informe incluye ranking completo, comparativas y gráficos de evolución
        </p>
      </CardContent>
    </Card>
  );
};

export default ReportExportPanel;
