/**
 * BrandRankingPanel - Vehicle Brand Visit Ranking System
 * Shows real-time ranking of brand visits from cameras across islands
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Trophy, TrendingUp, Car, RefreshCw, Calendar, 
  MapPin, ArrowUp, ArrowDown, BarChart3, Minus 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell 
} from 'recharts';
import { toast } from 'sonner';

const ISLANDS = [
  { id: 'tenerife', name: 'Tenerife' },
  { id: 'gran-canaria', name: 'Gran Canaria' },
  { id: 'lanzarote', name: 'Lanzarote' },
  { id: 'fuerteventura', name: 'Fuerteventura' },
  { id: 'la-palma', name: 'La Palma' },
  { id: 'la-gomera', name: 'La Gomera' },
  { id: 'el-hierro', name: 'El Hierro' }
];

const BrandRankingPanel = ({ authAxios }) => {
  const [ranking, setRanking] = useState([]);
  const [summary, setSummary] = useState(null);
  const [matrixData, setMatrixData] = useState(null);
  const [selectedIsland, setSelectedIsland] = useState('');
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ranking');

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (selectedIsland) params.append('island', selectedIsland);
      
      const response = await authAxios.get(`/brand-statistics/ranking?${params}`);
      setRanking(response.data.ranking || []);
    } catch (error) {
      console.error('Error fetching brand ranking:', error);
      toast.error('Error al cargar el ranking de marcas');
    }
    setLoading(false);
  }, [authAxios, period, selectedIsland]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await authAxios.get('/brand-statistics/summary');
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }, [authAxios]);

  const fetchMatrixData = useCallback(async () => {
    try {
      const response = await authAxios.get(`/brand-statistics/ranking-by-island?period=${period}`);
      setMatrixData(response.data);
    } catch (error) {
      console.error('Error fetching matrix data:', error);
    }
  }, [authAxios, period]);

  useEffect(() => {
    fetchRanking();
    fetchSummary();
  }, [fetchRanking, fetchSummary]);

  useEffect(() => {
    if (activeTab === 'comparison') {
      fetchMatrixData();
    }
  }, [activeTab, fetchMatrixData]);

  const handleRefresh = () => {
    fetchRanking();
    fetchSummary();
    if (activeTab === 'comparison') {
      fetchMatrixData();
    }
    toast.success('Datos actualizados');
  };

  const chartData = useMemo(() => {
    return ranking.map(item => ({
      name: item.brand_name,
      visitas: item.total_visits,
      entradas: item.entries || 0,
      salidas: item.exits || 0,
      fill: item.brand_color
    }));
  }, [ranking]);

  const totalVisits = useMemo(() => {
    return ranking.reduce((sum, item) => sum + item.total_visits, 0);
  }, [ranking]);

  const topBrand = ranking.length > 0 ? ranking[0] : null;

  return (
    <div className="space-y-6" data-testid="brand-ranking-panel">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Marca Líder</p>
                <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                  {topBrand?.brand_name || '-'}
                </p>
              </div>
              <Trophy className="w-10 h-10 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Visitas Hoy</p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  {summary?.today_visits?.toLocaleString() || '0'}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Esta Semana</p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                  {summary?.week_visits?.toLocaleString() || '0'}
                </p>
              </div>
              <BarChart3 className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Este Mes</p>
                <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                  {summary?.month_visits?.toLocaleString() || '0'}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedIsland || "all"} onValueChange={(v) => setSelectedIsland(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todas las islas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las islas</SelectItem>
                  {ISLANDS.map(island => (
                    <SelectItem key={island.id} value={island.id}>{island.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Hoy</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                  <SelectItem value="year">Este año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ranking">
            <Trophy className="w-4 h-4 mr-2" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="chart">
            <BarChart3 className="w-4 h-4 mr-2" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="comparison">
            <MapPin className="w-4 h-4 mr-2" />
            Por Isla
          </TabsTrigger>
        </TabsList>

        {/* Ranking Tab */}
        <TabsContent value="ranking">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Ranking de Marcas por Visitas
              </CardTitle>
              <CardDescription>
                {selectedIsland 
                  ? `Visitas en ${ISLANDS.find(i => i.id === selectedIsland)?.name || selectedIsland}`
                  : 'Todas las islas'
                } - {period === 'day' ? 'Hoy' : period === 'week' ? 'Esta semana' : period === 'month' ? 'Este mes' : 'Este año'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : ranking.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay datos de visitas para el período seleccionado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ranking.map((brand, index) => {
                    const percentage = totalVisits > 0 
                      ? ((brand.total_visits / totalVisits) * 100).toFixed(1) 
                      : 0;
                    
                    return (
                      <div 
                        key={brand.brand_id}
                        className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        {/* Position */}
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                          ${index === 0 ? 'bg-amber-500 text-white' : ''}
                          ${index === 1 ? 'bg-gray-400 text-white' : ''}
                          ${index === 2 ? 'bg-amber-700 text-white' : ''}
                          ${index > 2 ? 'bg-muted-foreground/20 text-muted-foreground' : ''}
                        `}>
                          {index + 1}
                        </div>

                        {/* Brand info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            {/* Brand Logo */}
                            {brand.brand_logo && (
                              <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-white p-1 shadow-sm">
                                <img 
                                  src={brand.brand_logo} 
                                  alt={brand.brand_name}
                                  className="max-w-full max-h-full object-contain"
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                              </div>
                            )}
                            {!brand.brand_logo && (
                              <div 
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: brand.brand_color }}
                              >
                                {brand.brand_name.charAt(0)}
                              </div>
                            )}
                            <span className="font-semibold text-lg">{brand.brand_name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 ml-13">
                            <span className="flex items-center gap-1">
                              <ArrowDown className="w-3 h-3 text-green-500" />
                              {brand.entries || 0} entradas
                            </span>
                            <span className="flex items-center gap-1">
                              <ArrowUp className="w-3 h-3 text-red-500" />
                              {brand.exits || 0} salidas
                            </span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="text-right">
                          <p className="text-2xl font-bold" style={{ color: brand.brand_color }}>
                            {brand.total_visits.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">{percentage}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chart Tab */}
        <TabsContent value="chart">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Visitas por Marca</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="visitas" name="Visitas Totales">
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                    Sin datos disponibles
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Visitas</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 && totalVisits > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        dataKey="visitas"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                    Sin datos disponibles
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparison by Island Tab */}
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Comparación por Isla
              </CardTitle>
              <CardDescription>
                Visitas de cada marca por isla
              </CardDescription>
            </CardHeader>
            <CardContent>
              {matrixData ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Marca</th>
                        {ISLANDS.map(island => (
                          <th key={island.id} className="text-center p-3 font-medium">
                            {island.name}
                          </th>
                        ))}
                        <th className="text-center p-3 font-medium bg-muted">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrixData.brands?.map(brand => {
                        const brandData = matrixData.matrix?.[brand.id];
                        return (
                          <tr key={brand.id} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: brand.color }}
                                />
                                <span className="font-medium">{brand.name}</span>
                              </div>
                            </td>
                            {ISLANDS.map(island => (
                              <td key={island.id} className="text-center p-3">
                                {brandData?.islands?.[island.id] || 0}
                              </td>
                            ))}
                            <td className="text-center p-3 font-bold bg-muted">
                              {brandData?.total || 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrandRankingPanel;
