/**
 * SVG Silhouettes for Canary Islands
 * Simplified shapes representing each island
 */
import { cn } from '@/lib/utils';

// Island silhouette SVG paths (simplified shapes)
const ISLAND_PATHS = {
  // Tenerife - triangular with Teide peak
  TF: "M20,45 L35,15 L40,20 L50,8 L55,25 L75,45 L60,50 L40,52 L25,48 Z",
  // Gran Canaria - round/circular
  GC: "M20,40 Q15,25 30,15 Q45,8 60,18 Q70,30 65,45 Q55,55 40,55 Q25,52 20,40 Z",
  // Lanzarote - elongated vertical
  LZ: "M25,55 Q20,45 25,30 Q30,15 40,10 Q50,15 55,25 Q60,40 55,50 Q45,58 35,58 Q28,57 25,55 Z",
  // Fuerteventura - very elongated
  FV: "M25,60 Q20,50 22,35 Q25,20 35,10 Q45,8 50,15 Q55,25 55,40 Q52,55 45,62 Q35,65 28,62 Z",
  // La Palma - pointed/volcanic
  LP: "M30,55 Q20,45 25,30 Q30,15 40,8 Q50,12 55,25 Q58,40 50,52 Q40,58 32,56 Z",
  // La Gomera - round small
  LG: "M25,45 Q20,35 28,25 Q38,18 50,22 Q58,30 55,42 Q48,52 38,52 Q28,50 25,45 Z",
  // El Hierro - small curved
  EH: "M25,45 Q22,35 30,28 Q40,22 50,28 Q55,38 50,48 Q40,54 32,50 Q25,48 25,45 Z",
  // La Graciosa - tiny
  LGR: "M30,45 Q28,38 35,32 Q42,30 48,35 Q50,42 45,48 Q38,50 32,47 Z"
};

// Island colors based on status
const getIslandColor = (online, total) => {
  if (total === 0) return { fill: '#374151', stroke: '#4b5563' }; // Gray for no devices
  const percent = (online / total) * 100;
  if (percent >= 95) return { fill: '#059669', stroke: '#10b981' }; // Emerald
  if (percent >= 80) return { fill: '#d97706', stroke: '#f59e0b' }; // Amber
  return { fill: '#dc2626', stroke: '#ef4444' }; // Red
};

export const IslandSilhouette = ({ 
  islandId, 
  online = 0, 
  total = 0, 
  className = "",
  size = 48
}) => {
  const path = ISLAND_PATHS[islandId] || ISLAND_PATHS.TF;
  const colors = getIslandColor(online, total);
  const hasOffline = total > online;
  
  return (
    <svg 
      viewBox="0 0 80 70" 
      className={cn("transition-all", hasOffline && "animate-pulse", className)}
      style={{ width: size, height: size * 0.875 }}
    >
      <defs>
        <linearGradient id={`island-grad-${islandId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.fill} stopOpacity="0.8" />
          <stop offset="100%" stopColor={colors.fill} stopOpacity="0.4" />
        </linearGradient>
        <filter id={`glow-${islandId}`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path 
        d={path} 
        fill={`url(#island-grad-${islandId})`}
        stroke={colors.stroke}
        strokeWidth="1.5"
        filter={hasOffline ? `url(#glow-${islandId})` : undefined}
      />
    </svg>
  );
};

// Mapping from island selection IDs to silhouette IDs
export const ISLAND_ID_MAP = {
  'tenerife': 'TF',
  'gran_canaria': 'GC',
  'lanzarote': 'LZ',
  'fuerteventura': 'FV',
  'la_palma': 'LP',
  'la_gomera': 'LG',
  'el_hierro': 'EH',
  'la_graciosa': 'LGR',
  // Also support short codes
  'TF': 'TF',
  'GC': 'GC',
  'LZ': 'LZ',
  'FV': 'FV',
  'LP': 'LP',
  'LG': 'LG',
  'EH': 'EH',
  'LGR': 'LGR'
};

export default IslandSilhouette;
