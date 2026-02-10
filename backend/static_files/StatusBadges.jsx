/**
 * Status Components - Badges and indicators for device status
 */
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

// Status Dot Indicator
export const StatusDot = ({ status }) => {
  const cls = { 
    online: "status-dot-online animate-pulse-online", 
    offline: "status-dot-offline", 
    checking: "status-dot-checking animate-pulse", 
    unknown: "status-dot-unknown" 
  }[status] || "status-dot-unknown";
  return <div className={`status-dot ${cls}`} />;
};

// Status Badge
export const StatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const cfg = { 
    online: { label: t('devices.online'), cls: "badge-online" }, 
    offline: { label: t('devices.offline'), cls: "badge-offline" }, 
    checking: { label: t('devices.checking'), cls: "badge-checking" }, 
    unknown: { label: t('devices.unknown'), cls: "bg-muted text-muted-foreground" } 
  }[status] || { label: "?", cls: "bg-muted" };
  return <Badge variant="outline" className={`${cfg.cls} text-xs font-medium px-2 py-0.5`}>{cfg.label}</Badge>;
};

// Role Badge
export const RoleBadge = ({ role }) => {
  const { t } = useTranslation();
  const cfg = { 
    admin: { label: t('users.roleAdmin'), cls: "bg-red-100 text-red-700 border-red-200" }, 
    manager: { label: t('users.roleManager', 'Gestor'), cls: "bg-blue-100 text-blue-700 border-blue-200" }, 
    viewer: { label: t('users.roleViewer'), cls: "bg-gray-100 text-gray-700 border-gray-200" },
    operator: { label: t('users.roleOperator', 'Operador'), cls: "bg-purple-100 text-purple-700 border-purple-200" },
    technician: { label: t('users.roleTechnician'), cls: "bg-amber-100 text-amber-700 border-amber-200" }
  }[role] || { label: role, cls: "bg-gray-100" };
  return <Badge variant="outline" className={`${cfg.cls} text-xs`}>{cfg.label}</Badge>;
};

// Priority Badge
export const PriorityBadge = ({ priority }) => {
  const { t } = useTranslation();
  const cfg = {
    low: { label: t('incidents.priorityLow'), cls: "bg-gray-100 text-gray-700" },
    medium: { label: t('incidents.priorityMedium'), cls: "bg-yellow-100 text-yellow-700" },
    high: { label: t('incidents.priorityHigh'), cls: "bg-orange-100 text-orange-700" },
    critical: { label: t('incidents.priorityCritical'), cls: "bg-red-100 text-red-700" }
  }[priority] || { label: priority, cls: "bg-gray-100" };
  return <Badge variant="outline" className={`${cfg.cls} text-xs`}>{cfg.label}</Badge>;
};

// Incident Status Badge
export const IncidentStatusBadge = ({ status }) => {
  const { t } = useTranslation();
  const cfg = {
    open: { label: t('incidents.statusOpen'), cls: "bg-red-100 text-red-700" },
    in_progress: { label: t('incidents.statusInProgress'), cls: "bg-blue-100 text-blue-700" },
    resolved: { label: t('incidents.statusResolved'), cls: "bg-green-100 text-green-700" },
    closed: { label: t('incidents.statusClosed'), cls: "bg-gray-100 text-gray-700" }
  }[status] || { label: status, cls: "bg-gray-100" };
  return <Badge variant="outline" className={`${cfg.cls} text-xs`}>{cfg.label}</Badge>;
};
