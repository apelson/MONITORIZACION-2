/**
 * HistoricalStatsPanel - Historical data visualization with advanced comparisons
 * Supports: Month vs Month, Week vs Week, Year vs Year, Island comparisons
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Download, TrendingUp, TrendingDown, Minus,
  BarChart3, LineChart as LineChartIcon, RefreshCw, Filter,
  MapPin, ArrowUpRight, ArrowDownRight, CalendarDays
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  ResponsiveContainer, BarChart, Bar, 
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

const MONTHS = [
  { id: 1, name: 'Enero' },
  { id: 2, name: 'Febrero' },
  { id: 3, name: 'Marzo' },
  { id: 4, name: 'Abril' },
  { id: 5, name: 'Mayo' },
  { id: 6, name: 'Junio' },
  { id: 7, name: 'Julio' },
  { id: 8, name: 'Agosto' },
  { id: 9, name: 'Septiembre' },
  { id: 10, name: 'Octubre' },
  { id: 11, name: 'Noviembre' },
  { id: 12, name: 'Diciembre' }
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const currentWeek = Math.ceil((new Date() - new Date(currentYear, 0, 1)) / (7 * 24 * 60 * 60 * 1000));

const HistoricalStatsPanel = ({ authAxios }) => {
  const [brands, setBrands] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('daily');
  
  // Filters
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedIsland, setSelectedIsland] = useState('all');
  const [days, setDays] = useState(30);
  
  // Month comparison
  const [month1, setMonth1] = useState(currentMonth);
  const [year1, setYear1] = useState(currentYear - 1);
  const [month2, setMonth2] = useState(currentMonth);
  const [year2, setYear2] = useState(currentYear);
  const [monthComparison, setMonthComparison] = useState(null);
  
  // Week comparison
  const [week1, setWeek1] = useState(currentWeek);
  const [weekYear1, setWeekYear1] = useState(currentYear - 1);
  const [week2, setWeek2] = useState(currentWeek);
  const [weekYear2, setWeekYear2] = useState(currentYear);
  const [weekComparison, setWeekComparison] = useState(null);
  
  // Year comparison
  const [yearComparison, setYearComparison] = useState(null);
  
  // Island comparison
  const [islandComparison, setIslandComparison] = useState(null);

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

  // Compare months
  const compareMonths = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month1: month1.toString(),
        year1: year1.toString(),
        month2: month2.toString(),
        year2: year2.toString()
      });
      if (selectedBrand !== 'all') params.append('brand_id', selectedBrand);
      if (selectedIsland !== 'all') params.append('island', selectedIsland);
      
      const response = await authAxios.get(`/brand-statistics/history/compare-months?${params}`);
      setMonthComparison(response.data);
      toast.success('Comparación de meses completada');
    } catch (error) {
      console.error('Error comparing months:', error);
      toast.error('Error al comparar meses');
    }
    setLoading(false);
  };

  // Compare weeks
  const compareWeeks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        week1: week1.toString(),
        year1: weekYear1.toString(),
        week2: week2.toString(),
        year2: weekYear2.toString()
      });
      if (selectedBrand !== 'all') params.append('brand_id', selectedBrand);
      if (selectedIsland !== 'all') params.append('island', selectedIsland);
      
      const response = await authAxios.get(`/brand-statistics/history/compare-weeks?${params}`);
      setWeekComparison(response.data);
      toast.success('Comparación de semanas completada');
    } catch (error) {
      console.error('Error comparing weeks:', error);
      toast.error('Error al comparar semanas');
    }
    setLoading(false);
  };

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

  // Fetch island comparison
  const fetchIslandComparison = useCallback(async () => {
    setLoading(true);
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });
      if (selectedBrand !== 'all') params.append('brand_id', selectedBrand);
      
      const response = await authAxios.get(`/brand-statistics/history/by-island?${params}`);
      setIslandComparison(response.data);
    } catch (error) {
      console.error('Error fetching island comparison:', error);
    }
    setLoading(false);
  }, [authAxios, days, selectedBrand]);

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyHistory();
    } else if (activeTab === 'yearly') {
      fetchYearComparison();
    } else if (activeTab === 'islands') {
      fetchIslandComparison();
    }
  }, [activeTab, fetchDailyHistory, fetchYearComparison, fetchIslandComparison]);

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate
      });
      if (selectedBrand !== 'all') params.append('brand_id', selectedBrand);
      if (selectedIsland !== 'all') params.append('island', selectedIsland);
      
      const response = await authAxios.get(`/brand-statistics/export/csv?${params}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `visitas_${startDate}_${endDate}.csv`);
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
  }, [dailyData, brands]);

  const totalVisits = useMemo(() => {
    return dailyData.reduce((sum, r) => sum + (r.visits || 0), 0);
  }, [dailyData]);

  // Generate year options
  const yearOptions = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    yearOptions.push(y);
  }

  // Generate week options
  const weekOptions = [];
  for (let w = 1; w <= 53; w++) {
    weekOptions.push(w);
  }

  return (
    <div className="space-y-6" data-testid="historical-stats-panel">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Marca:</Label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las marcas</SelectItem>
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
                  <SelectItem value="all">Todas las islas</SelectItem>
                  {ISLANDS.map(island => (
                    <SelectItem key={island.id} value={island.id}>{island.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Período:</Label>
              <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
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

      {/* Summary Cards */}
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
                  {dailyData.length > 0 ? Math.round(totalVisits / Math.max(chartData.length, 1)) : 0}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="daily">
            <Calendar className="w-4 h-4 mr-2" />
            Diario
          </TabsTrigger>
          <TabsTrigger value="months">
            <CalendarDays className="w-4 h-4 mr-2" />
            Meses
          </TabsTrigger>
          <TabsTrigger value="weeks">
            <BarChart3 className="w-4 h-4 mr-2" />
            Semanas
          </TabsTrigger>
          <TabsTrigger value="yearly">
            <LineChartIcon className="w-4 h-4 mr-2" />
            Años
          </TabsTrigger>
          <TabsTrigger value="islands">
            <MapPin className="w-4 h-4 mr-2" />
            Por Isla
          </TabsTrigger>
        </TabsList>

        {/* Daily Tab */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Tendencia Diaria de Visitas</CardTitle>
              <CardDescription>Últimos {days} días</CardDescription>
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
                    <Tooltip />
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
                        stroke={brands.find(b => b.id === selectedBrand)?.color}
                        fill={brands.find(b => b.id === selectedBrand)?.color}
                        fillOpacity={0.3}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay datos históricos disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Months Comparison Tab */}
        <TabsContent value="months">
          <Card>
            <CardHeader>
              <CardTitle>Comparar Meses</CardTitle>
              <CardDescription>
                Compara visitas entre dos meses de diferentes años (ej: Marzo 2025 vs Marzo 2026)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Period 1 */}
                <div className="space-y-3 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-900/20">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Badge variant="outline">Período 1</Badge>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Mes</Label>
                      <Select value={month1.toString()} onValueChange={(v) => setMonth1(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map(m => (
                            <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Año</Label>
                      <Select value={year1.toString()} onValueChange={(v) => setYear1(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map(y => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {/* Period 2 */}
                <div className="space-y-3 p-4 border rounded-lg bg-green-50/50 dark:bg-green-900/20">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Badge variant="outline">Período 2</Badge>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Mes</Label>
                      <Select value={month2.toString()} onValueChange={(v) => setMonth2(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map(m => (
                            <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Año</Label>
                      <Select value={year2.toString()} onValueChange={(v) => setYear2(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map(y => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button onClick={compareMonths} disabled={loading} className="w-full md:w-auto">
                <BarChart3 className="w-4 h-4 mr-2" />
                Comparar Meses
              </Button>
              
              {/* Month Comparison Result */}
              {monthComparison && (
                <ComparisonResults 
                  data={monthComparison}
                  period1Label={`${monthComparison.period1.month_name} ${monthComparison.period1.year}`}
                  period2Label={`${monthComparison.period2.month_name} ${monthComparison.period2.year}`}
                  field1="month1_visits"
                  field2="month2_visits"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weeks Comparison Tab */}
        <TabsContent value="weeks">
          <Card>
            <CardHeader>
              <CardTitle>Comparar Semanas</CardTitle>
              <CardDescription>
                Compara visitas entre dos semanas de diferentes años (ej: Semana 10 de 2025 vs Semana 10 de 2026)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Period 1 */}
                <div className="space-y-3 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-900/20">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Badge variant="outline">Período 1</Badge>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Semana</Label>
                      <Select value={week1.toString()} onValueChange={(v) => setWeek1(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {weekOptions.map(w => (
                            <SelectItem key={w} value={w.toString()}>Semana {w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Año</Label>
                      <Select value={weekYear1.toString()} onValueChange={(v) => setWeekYear1(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map(y => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {/* Period 2 */}
                <div className="space-y-3 p-4 border rounded-lg bg-green-50/50 dark:bg-green-900/20">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Badge variant="outline">Período 2</Badge>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Semana</Label>
                      <Select value={week2.toString()} onValueChange={(v) => setWeek2(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {weekOptions.map(w => (
                            <SelectItem key={w} value={w.toString()}>Semana {w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Año</Label>
                      <Select value={weekYear2.toString()} onValueChange={(v) => setWeekYear2(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map(y => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button onClick={compareWeeks} disabled={loading} className="w-full md:w-auto">
                <BarChart3 className="w-4 h-4 mr-2" />
                Comparar Semanas
              </Button>
              
              {/* Week Comparison Result */}
              {weekComparison && (
                <ComparisonResults 
                  data={weekComparison}
                  period1Label={`Semana ${weekComparison.period1.week} de ${weekComparison.period1.year}`}
                  period2Label={`Semana ${weekComparison.period2.week} de ${weekComparison.period2.year}`}
                  field1="week1_visits"
                  field2="week2_visits"
                />
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
                        {item.brand_logo && (
                          <img 
                            src={item.brand_logo} 
                            alt={item.brand_name}
                            className="w-10 h-10 object-contain"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
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

        {/* Islands Tab */}
        <TabsContent value="islands">
          <Card>
            <CardHeader>
              <CardTitle>Visitas por Isla</CardTitle>
              <CardDescription>
                Comparación de visitas entre islas en los últimos {days} días
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : islandComparison?.islands ? (
                <div className="space-y-4">
                  {/* Island Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {ISLANDS.map(island => {
                      const data = islandComparison.islands[island.id];
                      return (
                        <Card key={island.id} className="text-center">
                          <CardContent className="p-3">
                            <p className="text-sm font-medium truncate">{island.name}</p>
                            <p className="text-2xl font-bold text-primary">
                              {(data?.total || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">visitas</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  
                  {/* Detailed breakdown */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium">Marca</th>
                          {ISLANDS.map(island => (
                            <th key={island.id} className="text-center p-3 font-medium">
                              {island.name.split(' ')[0]}
                            </th>
                          ))}
                          <th className="text-center p-3 font-medium bg-muted">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brands.map(brand => {
                          let brandTotal = 0;
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
                              {ISLANDS.map(island => {
                                const visits = islandComparison.islands[island.id]?.brands?.[brand.id] || 0;
                                brandTotal += visits;
                                return (
                                  <td key={island.id} className="text-center p-3">
                                    {visits > 0 ? visits.toLocaleString() : '-'}
                                  </td>
                                );
                              })}
                              <td className="text-center p-3 font-bold bg-muted">
                                {brandTotal.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay datos por isla disponibles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Reusable Comparison Results Component
const ComparisonResults = ({ data, period1Label, period2Label, field1, field2 }) => {
  if (!data?.comparison) return null;
  
  return (
    <div className="mt-6 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{period1Label}</p>
          <p className="text-2xl font-bold">{data.period1.total?.toLocaleString() || 0}</p>
        </div>
        <div className="flex items-center justify-center">
          {data.period2.total > data.period1.total ? (
            <ArrowUpRight className="w-8 h-8 text-green-500" />
          ) : data.period2.total < data.period1.total ? (
            <ArrowDownRight className="w-8 h-8 text-red-500" />
          ) : (
            <Minus className="w-8 h-8 text-gray-500" />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{period2Label}</p>
          <p className="text-2xl font-bold">{data.period2.total?.toLocaleString() || 0}</p>
        </div>
      </div>
      
      {/* By Brand */}
      <div className="space-y-2">
        {data.comparison.map(item => (
          <div 
            key={item.brand_id}
            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border"
          >
            <div className="flex items-center gap-3">
              {item.brand_logo && (
                <img 
                  src={item.brand_logo} 
                  alt={item.brand_name}
                  className="w-8 h-8 object-contain"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              <span className="font-medium">{item.brand_name}</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <span className="w-16 text-right">{(item[field1] || 0).toLocaleString()}</span>
              <div className={`flex items-center gap-1 w-20 justify-center ${
                item.trend === 'up' ? 'text-green-600' : 
                item.trend === 'down' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {item.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                {item.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                {item.trend === 'stable' && <Minus className="w-4 h-4" />}
                <span className="font-bold">
                  {item.change_percent > 0 ? '+' : ''}{item.change_percent}%
                </span>
              </div>
              <span className="w-16 text-right font-bold">{(item[field2] || 0).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoricalStatsPanel;
