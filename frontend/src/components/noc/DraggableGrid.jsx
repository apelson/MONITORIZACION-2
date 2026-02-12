/**
 * DraggableGrid - Grid Layout con Drag & Drop real para el NOC Dashboard
 * Versión compatible con react-grid-layout v2.x
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { GridLayout } from 'react-grid-layout';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Custom styles for grid items
const gridStyles = `
  .react-grid-item > div {
    height: 100%;
  }
  .react-grid-item.react-grid-placeholder {
    background: rgba(6, 182, 212, 0.2);
    border: 2px dashed rgba(6, 182, 212, 0.5);
    border-radius: 8px;
  }
`;

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
  ]
};

// Widget titles for configuration panel
export const WIDGET_CONFIG = {
  uptime: { title: 'Uptime', icon: 'Activity', color: 'cyan' },
  systemMonitor: { title: 'Monitor', icon: 'Activity', color: 'cyan' },
  cra: { title: 'CRA', icon: 'Shield', color: 'red' },
  organizations: { title: 'Orgs', icon: 'Building2', color: 'purple' },
  offline: { title: 'Offline', icon: 'WifiOff', color: 'red' },
  history: { title: 'Historial', icon: 'History', color: 'orange' },
  alerts: { title: 'Alertas', icon: 'Bell', color: 'amber' },
};

/**
 * Widget wrapper with drag handle
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
        <div className="drag-handle absolute top-0 left-0 right-0 h-7 bg-gradient-to-b from-cyan-500/30 to-transparent cursor-grab active:cursor-grabbing z-10 flex items-center justify-between px-2">
          <div className="flex items-center gap-1">
            <GripVertical className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] text-cyan-400 font-medium uppercase tracking-wide">{title}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-slate-700/50"
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
      <div className={cn("h-full", editMode && "pt-7")}>
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
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleLayoutChange = useCallback((newLayout) => {
    if (editMode && onLayoutChange) {
      onLayoutChange({ ...layouts, lg: newLayout });
    }
  }, [editMode, onLayoutChange, layouts]);

  // Get current layout (use lg as default)
  const currentLayout = layouts?.lg || DEFAULT_LAYOUTS.lg;
  
  // Filter layout to only show visible widgets
  const visibleLayout = currentLayout.filter(item => 
    widgetVisibility[item.i] !== false || editMode
  );

  // Only render visible children
  const visibleChildren = children.filter(child => 
    widgetVisibility[child.key] !== false || editMode
  );

  return (
    <div ref={containerRef} className={cn("w-full h-full", className)}>
      <style>{gridStyles}</style>
      {editMode && (
        <div className="mb-2 px-3 py-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-cyan-400">
              Modo edición - Arrastra para reorganizar
            </span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {Object.entries(WIDGET_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 px-2 text-[10px]",
                  widgetVisibility[key] !== false 
                    ? "text-white bg-slate-700/50" 
                    : "text-slate-500 bg-transparent"
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
      
      <GridLayout
        className="layout"
        layout={visibleLayout}
        cols={12}
        rowHeight={60}
        width={containerWidth}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        onLayoutChange={handleLayoutChange}
        isDraggable={editMode}
        isResizable={editMode}
        draggableHandle=".drag-handle"
        useCSSTransforms={true}
        compactType="vertical"
        preventCollision={false}
      >
        {visibleChildren.map(child => (
          <div key={child.key} className="overflow-hidden h-full">
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
      </GridLayout>
    </div>
  );
};

export default DraggableGrid;
