/**
 * Device Types Panel - Device type management and filtering
 */
import { useTranslation } from 'react-i18next';
import { 
  Plus, Tag, Edit, Trash2, Server, Cctv, HardDrive, Network, 
  Router, Monitor, Printer, Box, Layers, ShieldAlert 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Icon mapping
const ICON_MAP = {
  camera: Cctv, "hard-drive": HardDrive, network: Network, router: Router,
  server: Server, monitor: Monitor, printer: Printer, wifi: Network,
  shield: Server, box: Box, layers: Layers
};

const getIcon = (iconName) => ICON_MAP[iconName] || Server;

const DeviceTypesPanel = ({ 
  deviceTypes, 
  onCreateType, 
  onEditType, 
  onDeleteType, 
  canEdit, 
  onFilterByType, 
  devices 
}) => {
  const { t } = useTranslation();
  
  // Count devices per type
  const getDeviceCount = (typeId) => devices?.filter(d => d.device_type_id === typeId).length || 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />{t('deviceTypes.title', 'Tipos de Dispositivos')}
          </CardTitle>
          <CardDescription>{t('devices.clickToFilter', 'Haz clic en un tipo para filtrar dispositivos')}</CardDescription>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => onCreateType()}>
            <Plus className="w-4 h-4 mr-2" />{t('deviceTypes.addType', 'Nuevo Tipo')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {deviceTypes.map(dtype => {
            const Icon = getIcon(dtype.icon);
            const count = getDeviceCount(dtype.id);
            const isCritical = dtype.is_critical;
            return (
              <div 
                key={dtype.id} 
                className={`p-4 rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer group ${isCritical ? 'border-red-500/50 hover:border-red-400' : 'hover:border-cyan-300'}`}
                onClick={() => onFilterByType(dtype.id)}
              >
                <div className="relative">
                  {isCritical && (
                    <div className="absolute -top-1 -right-1">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                  <div 
                    className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform" 
                    style={{ backgroundColor: `${dtype.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: dtype.color }} />
                  </div>
                </div>
                <h4 className="font-medium text-sm text-center">{dtype.name}</h4>
                <p className="text-xs text-center text-muted-foreground mt-1">
                  {count} {t('nav.devices', 'dispositivo')}{count !== 1 ? 's' : ''}
                </p>
                {isCritical && (
                  <Badge className="w-full justify-center mt-1 bg-red-500/10 text-red-500 text-[10px]">
                    {t('deviceTypes.critical', 'Crítico')}
                  </Badge>
                )}
                {canEdit && !dtype.is_default && (
                  <div className="flex justify-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEditType(dtype); }}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDeleteType(dtype); }} className="text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                {dtype.is_default && (
                  <p className="text-xs text-muted-foreground mt-1 text-center">{t('deviceTypes.default', 'Predefinido')}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DeviceTypesPanel;
