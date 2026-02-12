/**
 * NOC Organizations Section Component
 * Organization status overview
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Building2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

const NOCOrganizationsSection = ({ 
  devicesByOrg,
  expanded = false,
  onToggleExpand,
  showExpandButton = true
}) => {
  const { t } = useTranslation();

  // Compact view for dashboard grid
  if (!expanded) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-white">
              {t('noc.orgs', 'Organizaciones')}
            </span>
            <Badge variant="outline" className="text-xs border-purple-500 text-purple-400">
              {devicesByOrg.length}
            </Badge>
          </div>
          {showExpandButton && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onToggleExpand}>
              <Maximize2 className="w-3 h-3" />
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1.5">
            {devicesByOrg.slice(0, 6).map(({ org, online, offline, total }) => {
              const uptimePercent = total > 0 ? (online / total) * 100 : 0;
              return (
                <div 
                  key={org.id} 
                  className={cn(
                    "p-2 rounded-lg border",
                    offline > 0 ? "bg-red-500/10 border-red-500/30" : "bg-slate-800/50 border-slate-700/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white truncate flex-1">{org.name}</span>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Badge variant="outline" className="text-[10px] h-4 px-1 border-emerald-500/50 text-emerald-400">
                        {online}
                      </Badge>
                      {offline > 0 && (
                        <Badge className="text-[10px] h-4 px-1 bg-red-500">
                          {offline}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Progress 
                    value={uptimePercent} 
                    className={cn("h-1", offline > 0 ? "bg-red-500/20" : "bg-slate-700")}
                  />
                </div>
              );
            })}
            {devicesByOrg.length > 6 && (
              <p className="text-xs text-center text-slate-400 mt-1">
                +{devicesByOrg.length - 6} más
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="flex-1 flex flex-col gap-4 p-4 bg-slate-900/50 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-purple-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">
              {t('noc.organizations', 'Estado por Organización')}
            </h2>
            <p className="text-slate-400">
              {devicesByOrg.length} {t('noc.activeOrgs', 'organizaciones activas')}
            </p>
          </div>
        </div>
        {showExpandButton && (
          <Button variant="ghost" size="sm" onClick={onToggleExpand}>
            <Minimize2 className="w-5 h-5" />
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 gap-4 p-2">
          {devicesByOrg.map(({ org, online, offline, total }) => {
            const uptimePercent = total > 0 ? (online / total) * 100 : 0;
            return (
              <div 
                key={org.id}
                className={cn(
                  "p-4 rounded-lg border transition-all",
                  offline > 0 ? "bg-red-500/10 border-red-500/50" : "bg-slate-800/50 border-slate-700"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-semibold text-white">{org.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/20 text-emerald-400">{online} online</Badge>
                    {offline > 0 && (
                      <Badge className="bg-red-500/20 text-red-400 animate-pulse">{offline} offline</Badge>
                    )}
                  </div>
                </div>
                <Progress value={uptimePercent} className="h-3 bg-slate-700" />
                <p className="text-sm text-slate-400 mt-2">
                  {total} {t('noc.devices', 'dispositivos')} - {uptimePercent.toFixed(1)}% {t('noc.availability', 'disponibilidad')}
                </p>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default NOCOrganizationsSection;
