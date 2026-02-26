/**
 * PNG Silhouettes for Canary Islands
 * Real island shapes from PNG images
 */
import { cn } from '@/lib/utils';

// Map island IDs to PNG file names
const ISLAND_IMAGES = {
  TF: '/islands/tenerife.png',
  GC: '/islands/grancanaria.png',
  LZ: '/islands/lanzarote.png',
  FV: '/islands/fuerteventura.png',
  LP: '/islands/lapalma.png',
};

// Get filter color based on device health
const getFilterStyle = (online, total) => {
  if (total === 0) return { filter: 'brightness(0.4) sepia(1) hue-rotate(180deg)' }; // Gray
  const percent = (online / total) * 100;
  if (percent >= 95) return { filter: 'brightness(0.8) sepia(1) saturate(2) hue-rotate(80deg)' }; // Green
  if (percent >= 80) return { filter: 'brightness(0.9) sepia(1) saturate(2) hue-rotate(15deg)' }; // Amber
  return { filter: 'brightness(0.9) sepia(1) saturate(2) hue-rotate(-15deg)' }; // Red
};

export const IslandSilhouette = ({ 
  islandId, 
  online = 0, 
  total = 0, 
  className = "",
  size = 40
}) => {
  const imageSrc = ISLAND_IMAGES[islandId];
  const hasOffline = total > online;
  const filterStyle = getFilterStyle(online, total);
  
  if (!imageSrc) {
    return null;
  }
  
  return (
    <div 
      className={cn(
        "relative flex-shrink-0 transition-all duration-300",
        hasOffline && "animate-pulse",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img 
        src={imageSrc}
        alt={islandId}
        className="w-full h-full object-contain"
        style={filterStyle}
      />
    </div>
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
