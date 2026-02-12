/**
 * Uptime Chart Widget
 */
import { Activity, Maximize2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

const UptimeWidget = ({ 
  uptimeData, 
  timeRange, 
  setTimeRange, 
  onMaximize, 
  editMode = false 
}) => {
  return (
    <div className={cn(
      "h-full bg-slate-900/80 border rounded-lg p-3 flex flex-col transition-all",
      editMode ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : "border-slate-700/50"
    )}>
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Uptime</span>
        </div>
        <div className="flex gap-1 items-center">
          <Button 
            variant={timeRange === '24h' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-6 px-2 text-[10px]" 
            onClick={() => setTimeRange?.('24h')}
          >
            24h
          </Button>
          <Button 
            variant={timeRange === '7d' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-6 px-2 text-[10px]" 
            onClick={() => setTimeRange?.('7d')}
          >
            7d
          </Button>
          {onMaximize && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 text-slate-400 hover:text-cyan-400" 
              onClick={onMaximize}
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={uptimeData}>
            <defs>
              <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} interval="preserveStartEnd" />
            <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={[80, 100]} tickFormatter={(v) => `${v}%`} />
            <Area type="monotone" dataKey="uptime" stroke="#06b6d4" strokeWidth={2} fill="url(#uptimeGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default UptimeWidget;
