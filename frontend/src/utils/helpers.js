/**
 * Utility functions and helpers
 */
import { Camera, HardDrive, Network, Router, Server, Printer, Box, Monitor } from 'lucide-react';

// Icon mapping for device types
export const ICON_MAP = {
  camera: Camera,
  database: HardDrive,
  network: Network,
  router: Router,
  server: Server,
  printer: Printer,
  box: Box,
  monitor: Monitor
};

export const getIcon = (iconName) => ICON_MAP[iconName] || Server;

// Re-export from config for backwards compatibility
import { API_URL, API as API_PATH } from '../config';
export const BACKEND_URL = API_URL;
export const API = API_PATH;

export const LOGO_URL = "https://customer-assets.emergentagent.com/job_equip-tracker-39/artifacts/796492pi_version%20autorizada%202.png";
export const LOGO_HORIZONTAL_URL = "https://customer-assets.emergentagent.com/job_monitorsys-2/artifacts/qs1jn738_logo%20principal.png";
export const MOBOTIX_LOGO_URL = "https://www.mobotix.com/sites/default/files/2019-10/MOBOTIX-Logo.svg";
export const DEVICES_PER_PAGE = 24;

// Format date for display
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get time ago string
export const getTimeAgo = (dateString) => {
  if (!dateString) return 'Nunca';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${days}d`;
};
