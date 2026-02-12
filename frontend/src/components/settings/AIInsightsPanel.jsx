/**
 * AI Insights Panel Component
 * Shows AI-powered predictions, anomalies, and daily summaries
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Brain, TrendingUp, AlertTriangle, Sparkles, RefreshCw, 
  CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp,
  FileText, Zap, Shield, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const AIInsightsPanel = ({ authAxios }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState({
    predictions: false,
    anomalies: false,
    summary: false,
    smartAlerts: false
  });
  const [data, setData] = useState({
    predictions: null,
    anomalies: null,
    summary: null,
    smartAlerts: null
  });
  const [expanded, setExpanded] = useState({
    predictions: true,
    anomalies: true,
    summary: true,
    smartAlerts: false
  });

  // Load all AI insights on mount
  useEffect(() => {
    loadAllInsights();
  }, []);

  const loadAllInsights = async () => {
    await Promise.all([
      loadPredictions(),
      loadAnomalies(),
      loadDailySummary(),
      loadSmartAlerts()
    ]);
  };

  const loadPredictions = async () => {
    setLoading(prev => ({ ...prev, predictions: true }));
    try {
      const res = await authAxios.get('/ai/predictions');
      setData(prev => ({ ...prev, predictions: res.data }));
    } catch (error) {
      console.error('Error loading predictions:', error);
      toast.error('Error al cargar predicciones');
    } finally {
      setLoading(prev => ({ ...prev, predictions: false }));
    }
  };

  const loadAnomalies = async () => {
    setLoading(prev => ({ ...prev, anomalies: true }));
    try {
      const res = await authAxios.get('/ai/anomalies');
      setData(prev => ({ ...prev, anomalies: res.data }));
    } catch (error) {
      console.error('Error loading anomalies:', error);
    } finally {
      setLoading(prev => ({ ...prev, anomalies: false }));
    }
  };

  const loadDailySummary = async () => {
    setLoading(prev => ({ ...prev, summary: true }));
    try {
      const res = await authAxios.get('/ai/daily-summary');
      setData(prev => ({ ...prev, summary: res.data }));
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setLoading(prev => ({ ...prev, summary: false }));
    }
  };

  const loadSmartAlerts = async () => {
    setLoading(prev => ({ ...prev, smartAlerts: true }));
    try {
      const res = await authAxios.get('/ai/smart-alerts');
      setData(prev => ({ ...prev, smartAlerts: res.data }));
    } catch (error) {
      console.error('Error loading smart alerts:', error);
    } finally {
      setLoading(prev => ({ ...prev, smartAlerts: false }));
    }
  };

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'crítico':
      case 'critical':
      case 'alto':
      case 'high':
        return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'medio':
      case 'medium':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      case 'bajo':
      case 'low':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
      default:
        return 'text-slate-500 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Análisis con IA</h2>
            <p className="text-sm text-muted-foreground">
              Predicciones y análisis inteligente de tu infraestructura
            </p>
          </div>
        </div>
        <Button onClick={loadAllInsights} variant="outline" size="sm">
          <RefreshCw className={cn("w-4 h-4 mr-2", Object.values(loading).some(v => v) && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Daily Summary Card */}
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
        <Collapsible open={expanded.summary} onOpenChange={(v) => setExpanded(p => ({ ...p, summary: v }))}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <CardTitle className="text-lg">Resumen del Día</CardTitle>
                  {loading.summary && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                {expanded.summary ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {data.summary ? (
                <div className="space-y-4">
                  {/* Health Score */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Puntuación de Salud</span>
                        <span className={cn("text-2xl font-bold", getHealthScoreColor(data.summary.health_score || 0))}>
                          {data.summary.health_score || 0}/100
                        </span>
                      </div>
                      <Progress value={data.summary.health_score || 0} className="h-3" />
                    </div>
                    <Badge variant="outline" className={cn(
                      data.summary.trend === 'mejorando' ? 'border-emerald-500 text-emerald-500' :
                      data.summary.trend === 'empeorando' ? 'border-red-500 text-red-500' :
                      'border-slate-500 text-slate-500'
                    )}>
                      {data.summary.trend === 'mejorando' ? '↑ Mejorando' :
                       data.summary.trend === 'empeorando' ? '↓ Empeorando' : '→ Estable'}
                    </Badge>
                  </div>

                  {/* Executive Summary */}
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm">{data.summary.executive_summary}</p>
                  </div>

                  {/* Highlights & Concerns */}
                  <div className="grid grid-cols-2 gap-4">
                    {data.summary.highlights?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-emerald-500 mb-2 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Logros
                        </h4>
                        <ul className="space-y-1">
                          {data.summary.highlights.map((h, i) => (
                            <li key={i} className="text-xs text-muted-foreground">• {h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {data.summary.concerns?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-amber-500 mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> Puntos de Atención
                        </h4>
                        <ul className="space-y-1">
                          {data.summary.concerns.map((c, i) => (
                            <li key={i} className="text-xs text-muted-foreground">• {c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Recommendations */}
                  {data.summary.recommendations?.length > 0 && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-500 mb-2 flex items-center gap-1">
                        <Zap className="w-4 h-4" /> Recomendación Prioritaria
                      </h4>
                      <p className="text-sm">{data.summary.recommendations[0]}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  {loading.summary ? 'Analizando datos...' : 'Sin datos disponibles'}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Predictions Card */}
      <Card>
        <Collapsible open={expanded.predictions} onOpenChange={(v) => setExpanded(p => ({ ...p, predictions: v }))}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-500" />
                  <CardTitle className="text-lg">Predicción de Fallos</CardTitle>
                  {data.predictions?.risk_level && (
                    <Badge className={getRiskColor(data.predictions.risk_level)}>
                      Riesgo {data.predictions.risk_level}
                    </Badge>
                  )}
                  {loading.predictions && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                {expanded.predictions ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {data.predictions ? (
                <div className="space-y-4">
                  {/* Summary */}
                  {data.predictions.summary && (
                    <p className="text-sm text-muted-foreground">{data.predictions.summary}</p>
                  )}

                  {/* Predictions list */}
                  {data.predictions.predictions?.length > 0 && (
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {data.predictions.predictions.map((pred, i) => (
                          <div 
                            key={i}
                            className={cn("p-3 rounded-lg border", getRiskColor(pred.risk))}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{pred.device}</span>
                              <Badge variant="outline">{pred.risk}</Badge>
                            </div>
                            <p className="text-xs mt-1 opacity-80">{pred.reason}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {/* Recommendations */}
                  {data.predictions.recommendations?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Recomendaciones:</h4>
                      <ul className="space-y-1">
                        {data.predictions.recommendations.map((r, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <Shield className="w-3 h-3 mt-0.5 shrink-0 text-cyan-500" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  {loading.predictions ? 'Analizando patrones...' : 'Sin predicciones disponibles'}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Anomalies Card */}
      <Card>
        <Collapsible open={expanded.anomalies} onOpenChange={(v) => setExpanded(p => ({ ...p, anomalies: v }))}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-500" />
                  <CardTitle className="text-lg">Detección de Anomalías</CardTitle>
                  {data.anomalies?.alert_level && data.anomalies.alert_level !== 'normal' && (
                    <Badge className={getRiskColor(data.anomalies.alert_level)}>
                      {data.anomalies.alert_level}
                    </Badge>
                  )}
                  {loading.anomalies && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                {expanded.anomalies ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {data.anomalies ? (
                <div className="space-y-4">
                  {data.anomalies.summary && (
                    <p className="text-sm text-muted-foreground">{data.anomalies.summary}</p>
                  )}

                  {data.anomalies.anomalies?.length > 0 ? (
                    <div className="space-y-2">
                      {data.anomalies.anomalies.map((anomaly, i) => (
                        <div 
                          key={i}
                          className={cn("p-3 rounded-lg border", getRiskColor(anomaly.severity))}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{anomaly.metric}</span>
                            <Badge variant="outline">{anomaly.severity}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span>Actual: <strong>{anomaly.current}</strong></span>
                            <span>Esperado: <strong>{anomaly.expected}</strong></span>
                            <span className="text-red-500">Desviación: {anomaly.deviation}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-4 text-emerald-500">
                      <CheckCircle className="w-5 h-5" />
                      <span>Sin anomalías detectadas</span>
                    </div>
                  )}

                  {data.anomalies.immediate_action_required && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-sm font-medium text-red-500">
                        ⚠️ Se requiere acción inmediata
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  {loading.anomalies ? 'Detectando anomalías...' : 'Sin datos disponibles'}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};

export default AIInsightsPanel;
