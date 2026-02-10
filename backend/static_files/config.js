// Configuración dinámica de API según el host
const getApiUrl = () => {
  // Si hay una variable de entorno definida, usarla (desarrollo con Emergent)
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  const hostname = window.location.hostname;
  
  // Si accedemos por IP local de producción
  if (hostname === '192.168.1.76') {
    return 'http://192.168.1.76';
  }
  
  // Si accedemos por el dominio externo
  if (hostname === 'siempriapp.com' || hostname === 'www.siempriapp.com' || hostname === 'monitor.siempriapp.com') {
    return 'https://siempriapp.com';
  }
  
  // Fallback: usar el mismo origen
  return window.location.origin;
};

export const API_URL = getApiUrl();
export const API = `${API_URL}/api`;
export const BACKEND_URL = API_URL;
