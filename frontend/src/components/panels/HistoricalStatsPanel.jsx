/**
 * HistoricalStatsPanel - Historical data visualization with comparisons
 * Shows daily/weekly/monthly trends and allows period comparisons
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Download, TrendingUp, TrendingDown, Minus,
  BarChart3, LineChart as LineChartIcon, RefreshCw, Filter,
  ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, 
  XAxis, YAxis, Tooltip, Legend, CartesianGrid, Area, AreaChart
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

const BRAND_COLORS = {
  audi: "#BB0A1E",
  volkswagen: "#001E50",
  skoda: "#4BA82E",
  honda: "#CC0000",
  ducati: "#D40000",
  daocasion: "#FF6B00"
};

const HistoricalStatsPanel = ({ authAxios }) => {
  const [brands, setBrands] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [yearComparison, setYearComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('daily');
  
  // Filters
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedIsland, setSelectedIsland] = useState('all');
  const [days, setDays] = useState(30);
  
  // Comparison
  const [period1Start, setPeriod1Start] = useState('');
  const [period1End, setPeriod1End] = useState('');
  const [period2Start, setPeriod2Start] = useState('');
  const [period2End, setPeriod2End] = useState('');
  const [comparisonResult, setComparisonResult] = useState(null);

  // Fetch brands
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await authAxios.get('/brand-statistics/brands');
        setBrands(response.data.brands || []);
      } catch (error) {
        console.error('Error fetching brands:', error);
      }
    };
    fetchBrands();
  }, [authAxios]);

  // Fetch daily history
  const fetchDailyHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: days.toString() });
      if (selectedBrand !== 'all') params.append('brand_id', selectedBrand);
      if (selectedIsland !== 'all') params.append('island', selectedIsland);
      
      const response = await authAxios.get(`/brand-statistics/history/daily?${params}`);
      setDailyData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching daily history:', error);
      toast.error('Error al cargar datos históricos');
    }
    setLoading(false);
  }, [authAxios, days, selectedBrand, selectedIsland]);

  // Fetch weekly history
  const fetchWeeklyHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ weeks: '12' });
      if (selectedBrand !== 'all') params.append('brand_id', selectedBrand);
      if (selectedIsland !== 'all') params.append('island', selectedIsland);
      
      const response = await authAxios.get(`/brand-statistics/history/weekly?${params}`);
      setWeeklyData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching weekly history:', error);
    }
    setLoading(false);
  }, [authAxios, selectedBrand, selectedIsland]);

  // Fetch year comparison
  const fetchYearComparison = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBrand !== 'all') params.append('brand_id', selectedBrand);
      if (selectedIsland !== 'all') params.append('island', selectedIsland);
      
      const response = await authAxios.get(`/brand-statistics/history/year-over-year?${params}`);
      setYearComparison(response.data);
    } catch (error) {
      console.error('Error fetching year comparison:', error);
    }
    setLoading(false);
  }, [authAxios, selectedBrand, selectedIsland]);

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyHistory();
    } else if (activeTab === 'weekly') {
      fetchWeeklyHistory();
    } else if (activeTab === 'yearly') {
      fetchYearComparison();
    }
  }, [activeTab, fetchDailyHistory, fetchWeeklyHistory, fetchYearComparison]);

  // Compare periods
  const handleCompare = async () => {
    if (!period1Start || !period1End || !period2Start || !period2End) {
      toast.error('Selecciona las fechas de ambos períodos');
      return;
    }
    
    if (selectedBrand === 'all') {
      toast.error('Selecciona una marca para comparar');
      return;
    }
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        brand_id: selectedBrand,
        period1_start: period1Start,
        period1_end: period1End,
        period2_start: period2Start,
        period2_end: period2End
      });
      if (selectedIsland !== 'all') params.append('island', selectedIsland);
      
      const response = await authAxios.get(`/brand-statistics/history/compare?${params}`);
      setComparisonResult(response.data);
      toast.success('Comparación completada');
    } catch (error) {
      console.error('Error comparing periods:', error);
      toast.error('Error al comparar períodos');
    }
    setLoading(false);
  };

  // Export CSV
  const handleExportCSV = async () => {
    if (!period1Start || !period1End) {
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setPeriod1Start(start);
      setPeriod1End(end);
    }
    
    try {
      const params = new URLSearchParams({
        start_date: period1Start || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: period1End || new Date().toISOString().split('T')[0]
      });
      if (selectedBrand !== 'all') params.append('brand_id', selectedBrand);
      if (selectedIsland !== 'all') params.append('island', selectedIsland);
      
      const response = await authAxios.get(`/brand-statistics/export/csv?${params}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `visitas_${params.get('start_date')}_${params.get('end_date')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Archivo CSV descargado');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Error al exportar CSV');
    }
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (activeTab === 'daily') {
      // Group by date
      const byDate = {};
      dailyData.forEach(record => {
        const date = record.date;
        if (!byDate[date]) {
          byDate[date] = { date, total: 0 };
          brands.forEach(b => { byDate[date][b.id] = 0; });
        }
        byDate[date][record.brand_id] = (byDate[date][record.brand_id] || 0) + (record.visits || 0);
        byDate[date].total += record.visits || 0;
      });
      return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    }
    return [];
  }, [dailyData, brands, activeTab]);

  const totalVisits = useMemo(() => {
    return dailyData.reduce((sum, r) => sum + (r.visits || 0), 0);
  }, [dailyData]);

  return (
    <div className="space-y-6" data-testid="historical-stats-panel">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Marca:</Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Isla:</Label>
              <Select value={selectedIsland} onValueChange={setSelectedIsland}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {ISLANDS.map(island => (
                    <SelectItem key={island.id} value={island.id}>{island.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Días:</Label>
              <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 días</SelectItem>
                  <SelectItem value="14">14 días</SelectItem>
                  <SelectItem value="30">30 días</SelectItem>
                  <SelectItem value="60">60 días</SelectItem>
                  <SelectItem value="90">90 días</SelectItem>
                  <SelectItem value="365">1 año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Visitas</p>
                <p className="text-3xl font-bold">{totalVisits.toLocaleString()}</p>
              </div>
              <BarChart3 className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Registros</p>
                <p className="text-3xl font-bold">{dailyData.length}</p>
              </div>
              <Calendar className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Promedio Diario</p>
                <p className="text-3xl font-bold">
                  {dailyData.length > 0 ? Math.round(totalVisits / dailyData.length) : 0}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="daily">
            <Calendar className="w-4 h-4 mr-2" />
            Diario
          </TabsTrigger>
          <TabsTrigger value="weekly">
            <BarChart3 className="w-4 h-4 mr-2" />
            Semanal
          </TabsTrigger>
          <TabsTrigger value="yearly">
            <LineChartIcon className="w-4 h-4 mr-2" />
            Anual
          </TabsTrigger>
          <TabsTrigger value="compare">
            <Filter className="w-4 h-4 mr-2" />
            Comparar
          </TabsTrigger>
        </TabsList>

        {/* Daily Tab */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Tendencia Diaria de Visitas</CardTitle>
              <CardDescription>
                Últimos {days} días
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value.slice(5)}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [value, brands.find(b => b.id === name)?.name || name]}
                    />
                    <Legend />
                    {selectedBrand === 'all' ? (
                      brands.map(brand => (
                        <Area
                          key={brand.id}
                          type="monotone"
                          dataKey={brand.id}
                          name={brand.name}
                          stroke={brand.color}
                          fill={brand.color}
                          fillOpacity={0.3}
                          stackId="1"
                        />
                      ))
                    ) : (
                      <Area
                        type="monotone"
                        dataKey={selectedBrand}
                        name={brands.find(b => b.id === selectedBrand)?.name}
                        stroke={BRAND_COLORS[selectedBrand]}
                        fill={BRAND_COLORS[selectedBrand]}
                        fillOpacity={0.3}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay datos históricos disponibles</p>
                  <p className="text-sm">Los datos se almacenan automáticamente cada hora</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly Tab */}
        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle>Resumen Semanal</CardTitle>
              <CardDescription>Últimas 12 semanas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : weeklyData.length > 0 ? (
                <div className="space-y-2">
                  {weeklyData.slice(0, 12).map((week, idx) => {
                    const brand = brands.find(b => b.id === week.brand_id);
                    return (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            Sem {week.week}/{week.year}
                          </Badge>
                          <span 
                            className="font-medium"
                            style={{ color: brand?.color }}
                          >
                            {brand?.name || week.brand_id}
                          </span>
                          {week.island && (
                            <span className="text-sm text-muted-foreground">
                              ({week.island})
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-lg">
                          {week.visits?.toLocaleString() || 0} visitas
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay datos semanales disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Yearly Tab */}
        <TabsContent value="yearly">
          <Card>
            <CardHeader>
              <CardTitle>Comparación Año Actual vs Anterior</CardTitle>
              <CardDescription>
                {yearComparison?.current_year} vs {yearComparison?.previous_year}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : yearComparison?.comparison ? (
                <div className="space-y-3">
                  {yearComparison.comparison.map(item => (
                    <div 
                      key={item.brand_id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.brand_color }}
                        />
                        <span className="font-semibold">{item.brand_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">{item.previous_year}</p>
                          <p className="font-medium">{item.previous_visits.toLocaleString()}</p>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {item.trend === 'up' && <ArrowUpRight className="w-5 h-5 text-green-500" />}
                          {item.trend === 'down' && <ArrowDownRight className="w-5 h-5 text-red-500" />}
                          {item.trend === 'stable' && <Minus className="w-5 h-5 text-gray-500" />}
                          <span className={`font-bold ${
                            item.trend === 'up' ? 'text-green-600' : 
                            item.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {item.change_percent > 0 ? '+' : ''}{item.change_percent}%
                          </span>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">{item.current_year}</p>
                          <p className="font-bold text-lg">{item.current_visits.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <LineChartIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay datos anuales disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare">
          <Card>
            <CardHeader>
              <CardTitle>Comparar Períodos</CardTitle>
              <CardDescription>
                Compara visitas entre dos períodos de tiempo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Period 1 */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-semibold">Período 1</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Inicio</Label>
                      <Input 
                        type="date" 
                        value={period1Start}
                        onChange={(e) => setPeriod1Start(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Fin</Label>
                      <Input 
                        type="date" 
                        value={period1End}
                        onChange={(e) => setPeriod1End(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Period 2 */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-semibold">Período 2</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Inicio</Label>
                      <Input 
                        type="date" 
                        value={period2Start}
                        onChange={(e) => setPeriod2Start(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Fin</Label>
                      <Input 
                        type="date" 
                        value={period2End}
                        onChange={(e) => setPeriod2End(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <Button onClick={handleCompare} disabled={loading || selectedBrand === 'all'}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Comparar
              </Button>
              
              {selectedBrand === 'all' && (
                <p className="text-sm text-amber-600">
                  Selecciona una marca específica para comparar períodos
                </p>
              )}
              
              {/* Comparison Result */}
              {comparisonResult && (
                <div className="mt-6 p-6 bg-muted/50 rounded-lg">
                  <h4 className="font-bold text-lg mb-4">{comparisonResult.brand_name}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        {comparisonResult.period1.start} - {comparisonResult.period1.end}
                      </p>
                      <p className="text-3xl font-bold mt-2">
                        {comparisonResult.period1.total_visits.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {comparisonResult.period1.days} días
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-center">
                      <div className={`text-center p-4 rounded-full ${
                        comparisonResult.comparison.trend === 'up' 
                          ? 'bg-green-100 text-green-700' 
                          : comparisonResult.comparison.trend === 'down'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {comparisonResult.comparison.trend === 'up' && <TrendingUp className="w-8 h-8 mx-auto" />}
                        {comparisonResult.comparison.trend === 'down' && <TrendingDown className="w-8 h-8 mx-auto" />}
                        {comparisonResult.comparison.trend === 'stable' && <Minus className="w-8 h-8 mx-auto" />}
                        <p className="text-2xl font-bold mt-1">
                          {comparisonResult.comparison.change_percent > 0 ? '+' : ''}
                          {comparisonResult.comparison.change_percent}%
                        </p>
                        <p className="text-sm">
                          {comparisonResult.comparison.change > 0 ? '+' : ''}
                          {comparisonResult.comparison.change} visitas
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        {comparisonResult.period2.start} - {comparisonResult.period2.end}
                      </p>
                      <p className="text-3xl font-bold mt-2">
                        {comparisonResult.period2.total_visits.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {comparisonResult.period2.days} días
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoricalStatsPanel;
