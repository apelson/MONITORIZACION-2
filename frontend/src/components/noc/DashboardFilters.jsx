/**
 * DashboardFilters - Filtros por organización y grupo para el NOC Dashboard
 */
import { Building2, Users, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const DashboardFilters = ({ 
  organizations = [], 
  groups = [], 
  filters, 
  onFiltersChange,
  className 
}) => {
  const handleOrganizationChange = (value) => {
    onFiltersChange({
      ...filters,
      organizationId: value,
      groupId: 'all' // Reset group when org changes
    });
  };

  const handleGroupChange = (value) => {
    onFiltersChange({
      ...filters,
      groupId: value
    });
  };

  // Filter groups based on selected organization
  const filteredGroups = filters.organizationId === 'all' 
    ? groups 
    : groups.filter(g => g.organization_id === filters.organizationId);

  const isFiltered = filters.organizationId !== 'all' || filters.groupId !== 'all';

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Filter indicator */}
      {isFiltered && (
        <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 text-[10px] gap-1">
          <Filter className="w-3 h-3" />
          Filtrado
        </Badge>
      )}

      {/* Organization filter */}
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-purple-400" />
        <Select value={filters.organizationId} onValueChange={handleOrganizationChange}>
          <SelectTrigger className="w-[180px] h-8 text-xs bg-slate-800/50 border-slate-700">
            <SelectValue placeholder="Organización" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las organizaciones</SelectItem>
            {organizations.map(org => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Group filter */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-blue-400" />
        <Select value={filters.groupId} onValueChange={handleGroupChange}>
          <SelectTrigger className="w-[160px] h-8 text-xs bg-slate-800/50 border-slate-700">
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los grupos</SelectItem>
            {filteredGroups.map(group => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear filters button */}
      {isFiltered && (
        <button 
          onClick={() => onFiltersChange({ organizationId: 'all', groupId: 'all' })}
          className="text-xs text-slate-400 hover:text-white underline"
        >
          Limpiar
        </button>
      )}
    </div>
  );
};

export default DashboardFilters;
