/**
 * History Widget - Downtime History
 */
import { useTranslation } from 'react-i18next';
import { History, AlertTriangle, Maximize2, GripVertical, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const HistoryWidget = ({ 
  downtimeHistory = [],
  onMaximize,
  editMode = false 
}) => {
  const { t } = useTranslation();
  
  return (
    <div className={cn(
      "h-full bg-slate-900/80 border rounded-lg p-2 flex flex-col transition-all",
      editMode ? "border-cyan-500/50 ring-1 ring-cyan-500/30" : "border-slate-700/50"
    )}>
      <div className="flex items-center justify-between mb-1.5 shrink-0">
        <div className="flex items-center gap-2">
          {editMode && <GripVertical className="w-4 h-4 text-cyan-400 cursor-grab" />}
          <History className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-semibold text-white">{t('noc.downtimeHistory', 'Downtime History')}</span>
          <Badge variant="outline" className="border-orange-500/30 text-orange-400 text-[10px]">{downtimeHistory.length}</Badge>
        </div>
        {onMaximize && (
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-orange-400" onClick={onMaximize}>
            <Maximize2 className="w-3 h-3" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        {downtimeHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-4">
            <CheckCircle className="w-8 h-8 text-emerald-500/50 mb-1" />
            <p className="text-xs text-slate-400">{t('noc.noDowntime', 'No downtime (7d)')}</p>
          </div>
        ) : (
          <div className="space-y-1 pr-2">
            {downtimeHistory.slice(0, 6).map((item, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "p-1.5 rounded border flex items-center justify-between",
                  item.count > 3 ? "bg-red-500/5 border-red-500/20" : "bg-slate-800/50 border-slate-700/30"
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <AlertTriangle className={cn("w-3 h-3 shrink-0", item.count > 3 ? "text-red-400" : "text-amber-400")} />
                  <span className="text-[11px] text-white truncate">{item.name}</span>
                </div>
                <Badge className={cn("text-[9px] px-1 py-0", item.count > 3 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400")}>
                  {item.count}x
                </Badge>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default HistoryWidget;
