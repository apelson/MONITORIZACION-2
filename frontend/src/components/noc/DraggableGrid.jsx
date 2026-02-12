/**
 * DraggableGrid - Grid Layout con Drag & Drop real para el NOC Dashboard
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Default layout configuration
export const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'uptime', x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'systemMonitor', x: 4, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'cra', x: 8, y: 0, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'organizations', x: 0, y: 4, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'offline', x: 3, y: 4, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'history', x: 6, y: 4, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'alerts', x: 9, y: 4, w: 3, h: 4, minW: 2, minH: 3 },
  ],
  md: [
    { i: 'uptime', x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'systemMonitor', x: 6, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'cra', x: 0, y: 4, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'organizations', x: 6, y: 4, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'offline', x: 0, y: 8, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'history', x: 4, y: 8, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'alerts', x: 8, y: 8, w: 4, h: 4, minW: 2, minH: 3 },
  ],
  sm: [
    { i: 'uptime', x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'systemMonitor', x: 0, y: 4, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'cra', x: 0, y: 8, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'organizations', x: 0, y: 12, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'offline', x: 0, y: 16, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'history', x: 0, y: 20, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'alerts', x: 0, y: 24, w: 6, h: 4, minW: 3, minH: 3 },
  ]
};

// Widget titles for configuration panel
export const WIDGET_CONFIG = {
  uptime: { title: 'Uptime', icon: 'Activity', color: 'cyan' },
  systemMonitor: { title: 'Monitor del Sistema', icon: 'Activity', color: 'cyan' },
  cra: { title: 'CRA', icon: 'Shield', color: 'red' },
  organizations: { title: 'Organizaciones', icon: 'Building2', color: 'purple' },
  offline: { title: 'Offline', icon: 'WifiOff', color: 'red' },
  history: { title: 'Historial', icon: 'History', color: 'orange' },
  alerts: { title: 'Alertas', icon: 'Bell', color: 'amber' },
};

/**
 * Widget wrapper with drag handle and visibility toggle
 */
const WidgetContainer = ({ 
  id, 
  children, 
  editMode, 
  visible, 
  onToggleVisibility,
  title 
}) => {
  if (!visible && !editMode) return null;

  return (
    <div className={cn(
      "h-full w-full rounded-lg overflow-hidden transition-all duration-200",
      editMode && "ring-2 ring-cyan-500/50 bg-slate-800/30",
      !visible && editMode && "opacity-50"
    )}>
      {/* Drag handle - only in edit mode */}
      {editMode && (
        <div className="drag-handle absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-cyan-500/20 to-transparent cursor-grab active:cursor-grabbing z-10 flex items-center justify-between px-2">
          <div className="flex items-center gap-1">
            <GripVertical className="w-3 h-3 text-cyan-400" />
            <span className="text-[9px] text-cyan-400 font-medium">{title}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(id);
            }}
          >
            {visible ? (
              <Eye className="w-3 h-3 text-cyan-400" />
            ) : (
              <EyeOff className="w-3 h-3 text-slate-500" />
            )}
          </Button>
        </div>
      )}
      
      {/* Widget content */}
      <div className={cn("h-full", editMode && "pt-6")}>
        {children}
      </div>
    </div>
  );
};

/**
 * Main DraggableGrid component
 */
const DraggableGrid = ({
  children,
  layouts,
  onLayoutChange,
  editMode,
  widgetVisibility,
  onToggleWidget,
  className
}) => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');

  const handleLayoutChange = useCallback((currentLayout, allLayouts) => {
    if (editMode && onLayoutChange) {
      onLayoutChange(allLayouts);
    }
  }, [editMode, onLayoutChange]);

  const handleBreakpointChange = useCallback((newBreakpoint) => {
    setCurrentBreakpoint(newBreakpoint);
  }, []);

  // Only render visible children
  const visibleChildren = children.filter(child => 
    widgetVisibility[child.key] !== false || editMode
  );

  return (
    <div className={cn("w-full h-full", className)}>
      {editMode && (
        <div className="mb-2 px-2 py-1 bg-cyan-500/10 rounded-lg border border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-cyan-400">
              Modo edición activo - Arrastra los widgets para reorganizar
            </span>
          </div>
          <div className="flex items-center gap-2">
            {Object.entries(WIDGET_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 px-2 text-[10px]",
                  widgetVisibility[key] !== false ? "text-white" : "text-slate-500"
                )}
                onClick={() => onToggleWidget(key)}
              >
                {widgetVisibility[key] !== false ? (
                  <Eye className="w-3 h-3 mr-1" />
                ) : (
                  <EyeOff className="w-3 h-3 mr-1" />
                )}
                {config.title}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 12, sm: 6 }}
        rowHeight={60}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        onLayoutChange={handleLayoutChange}
        onBreakpointChange={handleBreakpointChange}
        isDraggable={editMode}
        isResizable={editMode}
        draggableHandle=".drag-handle"
        useCSSTransforms={true}
        compactType="vertical"
        preventCollision={false}
      >
        {visibleChildren.map(child => (
          <div key={child.key} className="overflow-hidden">
            <WidgetContainer
              id={child.key}
              editMode={editMode}
              visible={widgetVisibility[child.key] !== false}
              onToggleVisibility={onToggleWidget}
              title={WIDGET_CONFIG[child.key]?.title || child.key}
            >
              {child}
            </WidgetContainer>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

export default DraggableGrid;
