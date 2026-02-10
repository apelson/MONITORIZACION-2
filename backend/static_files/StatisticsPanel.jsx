/**
 * StatisticsPanel - Panel de estadísticas y conteo de personas
 * Extraído de App.js para mejor mantenibilidad
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, TrendingUp, Calendar, Download, BarChart3, 
  ChevronRight, ArrowUpRight, ArrowDownLeft, Flame, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_051d11b5-64eb-4eef-a44f-e7e0e5b16da5/artifacts/03lnmzfi_278325658_4943266082409281_2320348341249708641_n-removebg-preview.png";

const StatisticsPanel = ({ devices, groups, authAxios }) => {
  const { t } = useTranslation();
  const [camerasWithStats, setCamerasWithStats] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [heatmapImage, setHeatmapImage] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStatsTab, setActiveStatsTab] = useState("conteo");
  const [reportPeriod, setReportPeriod] = useState("week-current");
  const [heatmapPeriod, setHeatmapPeriod] = useState("week-last");
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const chartRef = useRef(null);
  
  useEffect(() => {
    const statsDevices = devices.filter(d => d.has_statistics === true && d.device_type_id === "type-camera");
    setCamerasWithStats(statsDevices);
  }, [devices]);
  
  const chartData = useMemo(() => {
    if (!reportData?.tables?.[0]?.data) return [];
    const data = reportData.tables[0].data;
    const colTitles = reportData.tables[0].columnTitles || [];
    const totalsRow = data[data.length - 1];
    if (!totalsRow) return [];
    return colTitles.map((day, idx) => {
      const cell = totalsRow[idx];
      if (Array.isArray(cell) && cell[0] >= 0) {
        return { name: day.substring(0, 3), entrada: cell[0], salida: cell[1], total: cell[0] + cell[1] };
      }
      return { name: day.substring(0, 3), entrada: 0, salida: 0, total: 0 };
    }).filter(d => d.total > 0);
  }, [reportData]);
  
  const totals = useMemo(() => {
    const entrada = chartData.reduce((sum, d) => sum + d.entrada, 0);
    const salida = chartData.reduce((sum, d) => sum + d.salida, 0);
    return { entrada, salida, total: entrada + salida };
  }, [chartData]);

  const fetchReport = async (camera, period) => {
    if (!camera) return;
    setLoading(true);
    try {
      const response = await authAxios.get(`/camera-stream/statistics/${camera.id}?period=${period}`);
      setReportData(response.data);
      toast.success('Informe cargado');
    } catch (error) {
      toast.error('Error al cargar el informe');
      console.error(error);
    }
    setLoading(false);
  };

  const fetchHeatmap = async (camera, period) => {
    if (!camera) return;
    setLoading(true);
    try {
      const response = await authAxios.get(`/camera-stream/heatmap/${camera.id}?period=${period}`, { responseType: 'blob' });
      const imageUrl = URL.createObjectURL(response.data);
      setHeatmapImage(imageUrl);
      toast.success('Mapa de calor cargado');
    } catch (error) {
      toast.error('Error al cargar el mapa de calor');
      console.error(error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
          <img src={LOGO_URL} alt="Siempria" className="absolute inset-0 m-auto w-10 h-10 object-contain" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">{t('stats.loading', 'Cargando Estadísticas')}</h3>
          <p className="text-sm text-muted-foreground">Obteniendo datos de conteo...</p>
        </div>
      </div>
    );
  }

  if (camerasWithStats.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">{t('stats.noCameras', 'Sin cámaras con estadísticas')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('stats.enableStats', 'Habilita estadísticas en la configuración de una cámara para ver datos de conteo.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="statistics-panel">
      {/* Camera Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('stats.title', 'Estadísticas de Conteo de Personas')}
          </CardTitle>
          <CardDescription>
            {t('stats.description', 'Selecciona una cámara para ver los datos de conteo y mapas de calor')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <Select value={selectedCamera?.id || ""} onValueChange={(v) => setSelectedCamera(camerasWithStats.find(c => c.id === v))}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Seleccionar cámara" />
              </SelectTrigger>
              <SelectContent>
                {camerasWithStats.map(cam => (
                  <SelectItem key={cam.id} value={cam.id}>{cam.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCamera && (
              <Button onClick={() => fetchReport(selectedCamera, reportPeriod)} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Cargar Datos
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Tabs */}
      {selectedCamera && (
        <Tabs value={activeStatsTab} onValueChange={setActiveStatsTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="conteo">
              <Users className="w-4 h-4 mr-2" />
              Conteo de Personas
            </TabsTrigger>
            <TabsTrigger value="heatmap">
              <Flame className="w-4 h-4 mr-2" />
              Mapa de Calor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conteo" className="space-y-4">
            {/* Period Selection */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <Select value={reportPeriod} onValueChange={(v) => { setReportPeriod(v); fetchReport(selectedCamera, v); }}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day-current">Hoy</SelectItem>
                      <SelectItem value="day-last">Ayer</SelectItem>
                      <SelectItem value="week-current">Esta semana</SelectItem>
                      <SelectItem value="week-last">Semana pasada</SelectItem>
                      <SelectItem value="month-current">Este mes</SelectItem>
                      <SelectItem value="month-last">Mes pasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Stats Summary */}
            {reportData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-green-50 to-green-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">Entradas</p>
                        <p className="text-3xl font-bold text-green-700">{totals.entrada}</p>
                      </div>
                      <ArrowDownLeft className="w-10 h-10 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-50 to-red-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-red-600 font-medium">Salidas</p>
                        <p className="text-3xl font-bold text-red-700">{totals.salida}</p>
                      </div>
                      <ArrowUpRight className="w-10 h-10 text-red-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Total</p>
                        <p className="text-3xl font-bold text-blue-700">{totals.total}</p>
                      </div>
                      <TrendingUp className="w-10 h-10 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Gráfico de Conteo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="entrada" fill="#22c55e" name="Entradas" />
                      <Bar dataKey="salida" fill="#ef4444" name="Salidas" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="heatmap" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <Select value={heatmapPeriod} onValueChange={(v) => { setHeatmapPeriod(v); fetchHeatmap(selectedCamera, v); }}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day-last">Ayer</SelectItem>
                      <SelectItem value="week-last">Semana pasada</SelectItem>
                      <SelectItem value="month-last">Mes pasado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => fetchHeatmap(selectedCamera, heatmapPeriod)} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Cargar Mapa
                  </Button>
                </div>
              </CardContent>
            </Card>

            {heatmapImage && (
              <Card>
                <CardHeader>
                  <CardTitle>Mapa de Calor</CardTitle>
                  <CardDescription>Zonas de mayor tráfico de personas</CardDescription>
                </CardHeader>
                <CardContent>
                  <img src={heatmapImage} alt="Heatmap" className="w-full rounded-lg" />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default StatisticsPanel;
