// Configuración dinámica de API según el host
const getApiUrl = () => {
  const hostname = window.location.hostname;
  
  // Entorno de desarrollo Emergent (preview)
  if (hostname.includes('preview.emergentagent.com')) {
    return window.location.origin;
  }
  
  // Si accedemos por IP local de producción
  if (hostname === '192.168.1.76') {
    return 'http://192.168.1.76';
  }
  
  // Si accedemos por el dominio externo
  if (hostname === 'siempriapp.com' || hostname === 'www.siempriapp.com' || hostname === 'monitor.siempriapp.com') {
    return 'https://siempriapp.com';
  }
  
  // Localhost (desarrollo local)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return window.location.origin;
  }
  
  // Fallback: usar el mismo origen
  return window.location.origin;
};

export const API_URL = getApiUrl();
export const API = `${API_URL}/api`;
export const BACKEND_URL = API_URL;
