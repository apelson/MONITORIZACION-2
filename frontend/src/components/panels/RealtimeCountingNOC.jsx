/**
 * RealtimeCountingNOC - Real-time NOC display for brand visit counting
 * Shows live data from Mobotix cameras with auto-refresh
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity, RefreshCw, Camera, TrendingUp, TrendingDown,
  Clock, AlertTriangle, CheckCircle2, MapPin, Wifi, WifiOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// Brand logos mapping
const BRAND_LOGOS = {
  audi: "https://customer-assets.emergentagent.com/job_a598a541-5b4a-4010-9cfe-1cebc43c189a/artifacts/g8sy2ozg_Logo_audi.jpg",
  volkswagen: "https://customer-assets.emergentagent.com/job_a598a541-5b4a-4010-9cfe-1cebc43c189a/artifacts/d772iqi2_Volkswagen_logo_2019.svg.png",
  skoda: "https://customer-assets.emergentagent.com/job_a598a541-5b4a-4010-9cfe-1cebc43c189a/artifacts/vbhseao1_%C5%A0koda_nieuw.png",
  honda: "https://customer-assets.emergentagent.com/job_a598a541-5b4a-4010-9cfe-1cebc43c189a/artifacts/syfdh3vw_Honda_Logo.svg.png",
  ducati: "https://customer-assets.emergentagent.com/job_a598a541-5b4a-4010-9cfe-1cebc43c189a/artifacts/380b1h0d_Ducati_red_logo.PNG",
  daocasion: "https://customer-assets.emergentagent.com/job_56a630f4-4ecb-45b7-b12a-65eeb5453053/artifacts/58znr83b_dag_ocasion_color.png",
  "ocasion-domingo-alonso": "https://customer-assets.emergentagent.com/job_56a630f4-4ecb-45b7-b12a-65eeb5453053/artifacts/2sliyeer_dag_ocasion_color.png"
};

const BRAND_COLORS = {
  audi: "#BB0A1E",
  volkswagen: "#001E50",
  skoda: "#4BA82E",
  honda: "#CC0000",
  ducati: "#D40000",
  daocasion: "#FF6B00",
  "ocasion-domingo-alonso": "#1E5AA8"
};

const RealtimeCountingNOC = ({ authAxios }) => {
  const [realtimeData, setRealtimeData] = useState(null);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const intervalRef = useRef(null);

  const fetchRealtimeData = useCallback(async () => {
    setLoading(true);
    try {
      const [realtimeRes, brandsRes] = await Promise.all([
        authAxios.get('/brand-statistics/realtime'),
        authAxios.get('/brand-statistics/brands')
      ]);
      
      setRealtimeData(realtimeRes.data);
      setBrands(brandsRes.data.brands || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching realtime data:', error);
    }
    setLoading(false);
  }, [authAxios]);

  const triggerRefresh = async () => {
    setLoading(true);
    try {
      await authAxios.post('/brand-statistics/realtime/refresh');
      await fetchRealtimeData();
      toast.success('Datos actualizados');
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error('Error al actualizar datos');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRealtimeData();
  }, [fetchRealtimeData]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchRealtimeData();
      }, refreshInterval * 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchRealtimeData]);

  const cameras = realtimeData?.cameras || {};
  const totals = realtimeData?.totals || { entries: 0, exits: 0 };
  const onlineCameras = Object.values(cameras).filter(c => c.status === 'online').length;
  const totalCameras = Object.keys(cameras).length;

  // Calculate brand totals from cameras
  const brandTotals = {};
  Object.values(cameras).forEach(cam => {
    if (cam.status === 'online' && cam.brand_id) {
      if (!brandTotals[cam.brand_id]) {
        brandTotals[cam.brand_id] = { entries: 0, exits: 0, cameras: 0 };
      }
      brandTotals[cam.brand_id].entries += cam.entries || 0;
      brandTotals[cam.brand_id].exits += cam.exits || 0;
      brandTotals[cam.brand_id].cameras += 1;
    }
  });

  return (
    <div className="space-y-6" data-testid="realtime-counting-noc">
      {/* NOC Header */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <Activity className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">NOC de Conteo en Tiempo Real</h2>
                <p className="text-slate-400 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Última actualización: {lastRefresh ? lastRefresh.toLocaleTimeString() : '-'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Auto-refresh toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Auto:</span>
                <Button 
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={autoRefresh ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {autoRefresh ? "ON" : "OFF"}
                </Button>
              </div>
              
              {/* Manual refresh */}
              <Button 
                onClick={triggerRefresh} 
                disabled={loading}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm">Visitas (Entradas)</span>
              </div>
              <p className="text-3xl font-bold">{totals.entries.toLocaleString()}</p>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <Camera className="w-4 h-4" />
                <span className="text-sm">Cámaras</span>
              </div>
              <p className="text-3xl font-bold">
                {onlineCameras}/{totalCameras}
                <span className="text-sm ml-2 text-slate-400">online</span>
              </p>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Última Sync</span>
              </div>
              <p className="text-xl font-bold">{lastRefresh ? lastRefresh.toLocaleTimeString() : '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map(brand => {
          const brandData = brandTotals[brand.id] || { entries: 0, cameras: 0 };
          const totalVisits = brandData.entries; // Solo entradas
          const maxVisits = Math.max(...Object.values(brandTotals).map(b => b.entries || 0), 1);
          const percentage = (totalVisits / maxVisits) * 100;
          
          return (
            <Card 
              key={brand.id} 
              className="overflow-hidden hover:shadow-lg transition-shadow"
              style={{ borderTopColor: brand.color, borderTopWidth: '4px' }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4 mb-4">
                  {/* Brand Logo */}
                  <div 
                    className="w-16 h-16 rounded-lg overflow-hidden flex items-center justify-center p-2"
                    style={{ backgroundColor: `${brand.color}10` }}
                  >
                    <img 
                      src={BRAND_LOGOS[brand.id] || brand.logo} 
                      alt={brand.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div 
                      className="hidden items-center justify-center text-2xl font-bold text-white w-full h-full rounded"
                      style={{ backgroundColor: brand.color }}
                    >
                      {brand.name.charAt(0)}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{brand.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Camera className="w-3 h-3" />
                      {brandData.cameras} cámara{brandData.cameras !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  {/* Total badge - Solo visitas (entradas) */}
                  <div 
                    className="text-right px-3 py-2 rounded-lg"
                    style={{ backgroundColor: `${brand.color}15` }}
                  >
                    <p className="text-2xl font-bold" style={{ color: brand.color }}>
                      {totalVisits.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">visitas</p>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mb-3">
                  <Progress 
                    value={percentage} 
                    className="h-2"
                    style={{ 
                      '--progress-background': brand.color 
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Camera Status Grid */}
      {totalCameras > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Estado de Cámaras
            </CardTitle>
            <CardDescription>
              {onlineCameras} de {totalCameras} cámaras en línea
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(cameras).map(([camId, cam]) => (
                <div 
                  key={camId}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border
                    ${cam.status === 'online' 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200' 
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    {cam.status === 'online' ? (
                      <Wifi className="w-5 h-5 text-green-600" />
                    ) : (
                      <WifiOff className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">{cam.camera_name || camId}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {cam.island || 'Sin ubicación'}
                      </p>
                    </div>
                  </div>
                  
                  {cam.status === 'online' && (
                    <div className="text-right">
                      <p className="font-bold">{cam.entries || 0}</p>
                      <p className="text-xs text-muted-foreground">visitas</p>
                    </div>
                  )}
                  
                  {cam.status !== 'online' && (
                    <Badge variant="destructive" className="text-xs">
                      Offline
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            
            {totalCameras === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay cámaras configuradas</p>
                <p className="text-sm">Añade cámaras en la configuración para ver datos en tiempo real</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealtimeCountingNOC;
