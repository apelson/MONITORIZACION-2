/**
 * Organizations Panel - Hierarchical structure management
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Building2, ChevronRight, MapPin, Download, FileSpreadsheet, 
  FileIcon, Edit, Trash2, Eye 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const OrganizationsPanel = ({ 
  organizations, 
  groups, 
  devices, 
  onCreateOrg, 
  onEditOrg, 
  onDeleteOrg, 
  onCreateGroup, 
  onEditGroup, 
  onDeleteGroup, 
  canEdit, 
  onExport, 
  onViewGroupDevices 
}) => {
  const { t } = useTranslation();
  const [openOrgs, setOpenOrgs] = useState({});
  const toggleOrg = (id) => setOpenOrgs(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('structure.title', 'Organizaciones y Grupos')}</h2>
          <p className="text-sm text-muted-foreground">{t('organizations.hierarchicalStructure', 'Estructura jerárquica de tus dispositivos')}</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button data-testid="add-org-btn" size="sm" onClick={() => onCreateOrg()}>
              <Plus className="w-4 h-4 mr-2" />{t('organizations.addOrganization', 'Nueva Organización')}
            </Button>
          )}
        </div>
      </div>

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground">{t('organizations.noOrganizations', 'No hay organizaciones')}</p>
            {canEdit && (
              <Button className="mt-4" onClick={() => onCreateOrg()}>
                <Plus className="w-4 h-4 mr-2" />{t('organizations.addOrganization', 'Crear Organización')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {organizations.map(org => {
            const orgGroups = groups.filter(g => g.organization_id === org.id);
            const orgDeviceCount = orgGroups.reduce((acc, g) => acc + (g.device_count || 0), 0);
            return (
              <Card key={org.id}>
                <Collapsible open={openOrgs[org.id]} onOpenChange={() => toggleOrg(org.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ChevronRight className={`w-5 h-5 transition-transform ${openOrgs[org.id] ? 'rotate-90' : ''}`} />
                          {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="h-8 w-8 object-contain rounded" />
                          ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: org.color }}>
                              <Building2 className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-base">{org.name}</CardTitle>
                            <div className="flex items-center gap-2">
                              {org.description && <CardDescription className="text-xs">{org.description}</CardDescription>}
                              {(org.country || org.city) && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {[org.city, org.country].filter(Boolean).join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{orgGroups.length} grupos • {orgDeviceCount} dispositivos</Badge>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => onExport('excel', org.id)}>
                                  <FileSpreadsheet className="w-4 h-4 mr-2" />Exportar Excel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onExport('pdf', org.id)}>
                                  <FileIcon className="w-4 h-4 mr-2" />Exportar PDF
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            {canEdit && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => onCreateGroup(org.id)}>
                                  <Plus className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => onEditOrg(org)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => onDeleteOrg(org)} className="text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4">
                      {orgGroups.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No hay grupos en esta organización</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-8">
                          {orgGroups.map(g => (
                            <div key={g.id} className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                                  <div>
                                    <h4 className="font-medium text-sm">{g.name}</h4>
                                    {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">{g.device_count || 0}</Badge>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => onViewGroupDevices(g.id)}>
                                  <Eye className="w-3 h-3 mr-1" />Ver dispositivos
                                </Button>
                                {canEdit && (
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => onEditGroup(g)}>
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => onDeleteGroup(g)} className="text-destructive">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrganizationsPanel;
