/**
 * Organizations Widget
 */
import { useTranslation } from 'react-i18next';
import { Building2, Maximize2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const OrganizationsWidget = ({ 
  devicesByOrg = [], 
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
          <Building2 className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">{t('noc.organizations', 'Organizations')}</span>
        </div>
        {onMaximize && (
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400 hover:text-purple-400" onClick={onMaximize}>
            <Maximize2 className="w-3 h-3" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 pr-2">
          {devicesByOrg.slice(0, 8).map(({ org, online, offline }) => (
            <div 
              key={org.id} 
              className={cn(
                "p-1.5 rounded border flex items-center justify-between", 
                offline > 0 ? "bg-red-500/5 border-red-500/20" : "bg-slate-800/50 border-slate-700/30"
              )}
            >
              <span className="text-[11px] text-white truncate flex-1">{org.name}</span>
              <div className="flex items-center gap-1 ml-2">
                <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1 py-0">{online}</Badge>
                {offline > 0 && <Badge className="bg-red-500/20 text-red-400 text-[9px] px-1 py-0">{offline}</Badge>}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default OrganizationsWidget;
