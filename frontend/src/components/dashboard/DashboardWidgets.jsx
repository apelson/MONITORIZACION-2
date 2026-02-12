/**
 * Dashboard Widget System
 * Configurable widgets for customizable NOC dashboard
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { cn } from '@/lib/utils';
import { 
  Settings, X, Plus, GripVertical, Maximize2, Minimize2,
  Server, Wifi, WifiOff, Activity, AlertTriangle, Building2,
  Shield, History, Bell, MapPin, TrendingUp, Eye, EyeOff,
  RotateCcw, Save, Filter, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

// Default widget configurations
const DEFAULT_WIDGETS = {
  uptime: {
    id: 'uptime',
    name: 'Gráfico Uptime',
    icon: Activity,
    color: 'cyan',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 2, h: 1 },
    enabled: true
  },
  systemMonitor: {
    id: 'systemMonitor',
    name: 'Monitor del Sistema (ECG)',
    icon: Activity,
    color: 'amber',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    enabled: true
  },
  cra: {
    id: 'cra',
    name: 'CRA - Central Receptora',
    icon: Shield,
    color: 'red',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 2, h: 1 },
    enabled: true
  },
  organizations: {
    id: 'organizations',
    name: 'Organizaciones',
    icon: Building2,
    color: 'purple',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 1 },
    enabled: true
  },
  offline: {
    id: 'offline',
    name: 'Dispositivos Offline',
    icon: WifiOff,
    color: 'red',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 1 },
    enabled: true
  },
  history: {
    id: 'history',
    name: 'Historial de Caídas',
    icon: History,
    color: 'orange',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 1 },
    enabled: true
  },
  alerts: {
    id: 'alerts',
    name: 'Alertas Recientes',
    icon: Bell,
    color: 'amber',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 1 },
    enabled: true
  },
  stats: {
    id: 'stats',
    name: 'Estadísticas Rápidas',
    icon: TrendingUp,
    color: 'emerald',
    defaultSize: { w: 12, h: 1 },
    minSize: { w: 6, h: 1 },
    enabled: true
  }
};

// Default layout for 12-column grid
const DEFAULT_LAYOUT = [
  { i: 'stats', x: 0, y: 0, w: 12, h: 1 },
  { i: 'uptime', x: 0, y: 1, w: 4, h: 2 },
  { i: 'systemMonitor', x: 4, y: 1, w: 4, h: 2 },
  { i: 'cra', x: 8, y: 1, w: 4, h: 2 },
  { i: 'organizations', x: 0, y: 3, w: 3, h: 2 },
  { i: 'offline', x: 3, y: 3, w: 3, h: 2 },
  { i: 'history', x: 6, y: 3, w: 3, h: 2 },
  { i: 'alerts', x: 9, y: 3, w: 3, h: 2 },
];

/**
 * Hook to manage dashboard preferences
 */
export const useDashboardPreferences = (userId, authAxios) => {
  const [preferences, setPreferences] = useState({
    layout: DEFAULT_LAYOUT,
    widgets: DEFAULT_WIDGETS,
    filters: {
      organizationId: 'all',
      groupId: 'all'
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences from server
  const loadPreferences = useCallback(async () => {
    if (!authAxios || !userId) {
      setLoading(false);
      return;
    }

    try {
      const res = await authAxios.get(`/users/${userId}/dashboard-preferences`);
      if (res.data && res.data.layout) {
        setPreferences(prev => ({
          ...prev,
          layout: res.data.layout || DEFAULT_LAYOUT,
          widgets: { ...DEFAULT_WIDGETS, ...res.data.widgets },
          filters: res.data.filters || prev.filters
        }));
      }
    } catch (error) {
      // If 404, use defaults (first time user)
      console.log('Using default dashboard preferences');
    } finally {
      setLoading(false);
    }
  }, [authAxios, userId]);

  // Save preferences to server
  const savePreferences = useCallback(async (newPrefs) => {
    if (!authAxios || !userId) return;

    setSaving(true);
    try {
      await authAxios.put(`/users/${userId}/dashboard-preferences`, newPrefs);
      toast.success('Preferencias guardadas');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Error al guardar preferencias');
    } finally {
      setSaving(false);
    }
  }, [authAxios, userId]);

  // Update layout
  const updateLayout = useCallback((newLayout) => {
    setPreferences(prev => {
      const updated = { ...prev, layout: newLayout };
      // Debounced save
      return updated;
    });
  }, []);

  // Toggle widget visibility
  const toggleWidget = useCallback((widgetId) => {
    setPreferences(prev => {
      const updated = {
        ...prev,
        widgets: {
          ...prev.widgets,
          [widgetId]: {
            ...prev.widgets[widgetId],
            enabled: !prev.widgets[widgetId]?.enabled
          }
        }
      };
      return updated;
    });
  }, []);

  // Update filters
  const updateFilters = useCallback((filters) => {
    setPreferences(prev => ({ ...prev, filters }));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setPreferences({
      layout: DEFAULT_LAYOUT,
      widgets: DEFAULT_WIDGETS,
      filters: { organizationId: 'all', groupId: 'all' }
    });
    toast.info('Dashboard restaurado a valores predeterminados');
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    saving,
    updateLayout,
    toggleWidget,
    updateFilters,
    savePreferences: () => savePreferences(preferences),
    resetToDefaults
  };
};

/**
 * Dashboard Configuration Panel
 */
export const DashboardConfigPanel = ({ 
  preferences, 
  onToggleWidget, 
  onResetDefaults,
  onSave,
  saving,
  organizations = [],
  groups = [],
  filters,
  onUpdateFilters
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Personalizar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Configurar Dashboard</h4>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Filters */}
          <div className="space-y-3 pb-3 border-b">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtros
            </Label>
            
            <Select 
              value={filters?.organizationId || 'all'} 
              onValueChange={(v) => onUpdateFilters({ ...filters, organizationId: v, groupId: 'all' })}
            >
              <SelectTrigger className="h-8 text-xs">
                <Building2 className="w-3 h-3 mr-1" />
                <SelectValue placeholder="Organización" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las organizaciones</SelectItem>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filters?.organizationId !== 'all' && (
              <Select 
                value={filters?.groupId || 'all'} 
                onValueChange={(v) => onUpdateFilters({ ...filters, groupId: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los grupos</SelectItem>
                  {groups
                    .filter(g => g.organization_id === filters?.organizationId)
                    .map(grp => (
                      <SelectItem key={grp.id} value={grp.id}>{grp.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Widget toggles */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Widgets visibles</Label>
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-2">
                {Object.values(preferences.widgets).map(widget => {
                  const Icon = widget.icon;
                  return (
                    <div 
                      key={widget.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-4 h-4", `text-${widget.color}-500`)} />
                        <span className="text-sm">{widget.name}</span>
                      </div>
                      <Switch
                        checked={widget.enabled}
                        onCheckedChange={() => onToggleWidget(widget.id)}
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onResetDefaults}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Restaurar
            </Button>
            <Button 
              size="sm" 
              className="flex-1"
              onClick={onSave}
              disabled={saving}
            >
              <Save className="w-3 h-3 mr-1" />
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            💡 Arrastra los widgets para reorganizarlos
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/**
 * Widget wrapper with drag handle and controls
 */
export const WidgetWrapper = ({ 
  id, 
  title, 
  icon: Icon, 
  color = 'slate',
  children,
  onMaximize,
  isEditMode = false
}) => {
  return (
    <div className={cn(
      "h-full flex flex-col bg-slate-900/80 border border-slate-700/50 rounded-lg overflow-hidden",
      isEditMode && "ring-2 ring-cyan-500/50"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-3 py-1.5 shrink-0 border-b border-slate-700/50",
        isEditMode && "cursor-move"
      )}>
        <div className="flex items-center gap-2">
          {isEditMode && (
            <GripVertical className="w-4 h-4 text-slate-500" />
          )}
          {Icon && <Icon className={cn("w-4 h-4", `text-${color}-400`)} />}
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        {onMaximize && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 hover:bg-slate-700"
            onClick={onMaximize}
          >
            <Maximize2 className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        {children}
      </div>
    </div>
  );
};

export { DEFAULT_WIDGETS, DEFAULT_LAYOUT };
