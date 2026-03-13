export const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : '/api';

export const ALL_BRANDS = [
  { id: 'audi', name: 'AUDI', color: '#BB0A1E', logo: '/assets/brands/audi.png' },
  { id: 'volkswagen', name: 'VOLKSWAGEN', color: '#001E50', logo: '/assets/brands/volkswagen.png' },
  { id: 'skoda', name: 'SKODA', color: '#4BA82E', logo: '/assets/brands/skoda.png' },
  { id: 'honda', name: 'HONDA', color: '#CC0000', logo: '/assets/brands/honda.png' },
  { id: 'ducati', name: 'DUCATI', color: '#D40000', logo: '/assets/brands/ducati.png' },
  { id: 'daocasion', name: 'DAOCASION', color: '#FF6B00', logo: '/assets/brands/daocasion.png' },
];

export const ALL_ISLANDS = [
  { id: 'tenerife', name: 'Tenerife', short: 'TF', color: '#8B5CF6' },
  { id: 'gran-canaria', name: 'Gran Canaria', short: 'GC', color: '#5B8DB8' },
  { id: 'lanzarote', name: 'Lanzarote', short: 'LZ', color: '#3B82F6' },
  { id: 'fuerteventura', name: 'Fuerteventura', short: 'FV', color: '#F59E0B' },
  { id: 'la-palma', name: 'La Palma', short: 'LP', color: '#06B6D4' },
];

export const BRAND_COLORS = Object.fromEntries(ALL_BRANDS.map(b => [b.id, b.color]));

export const ISLAND_PNGS = {
  tenerife: '/islands/tenerife.png',
  'gran-canaria': '/islands/grancanaria.png',
  lanzarote: '/islands/lanzarote.png',
  fuerteventura: '/islands/fuerteventura.png',
  'la-palma': '/islands/lapalma.png',
};
