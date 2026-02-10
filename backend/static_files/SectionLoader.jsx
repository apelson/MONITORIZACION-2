/**
 * SectionLoader - Loading overlay for sections that take > 2 seconds
 * Shows company logo with spinner animation
 */
import { useState, useEffect } from 'react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_051d11b5-64eb-4eef-a44f-e7e0e5b16da5/artifacts/03lnmzfi_278325658_4943266082409281_2320348341249708641_n-removebg-preview.png";

const SectionLoader = ({ isLoading, delay = 2000, message = "Cargando..." }) => {
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    let timer;
    if (isLoading) {
      // Only show loader after delay (default 2 seconds)
      timer = setTimeout(() => {
        setShowLoader(true);
      }, delay);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  if (!showLoader) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm"
      data-testid="section-loader"
    >
      <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-slate-800/90 border border-cyan-500/20 shadow-2xl">
        {/* Logo with spinner */}
        <div className="relative">
          {/* Spinner ring */}
          <div className="w-24 h-24 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
          {/* Logo in center */}
          <img 
            src={LOGO_URL} 
            alt="Siempria" 
            className="absolute inset-0 m-auto w-12 h-12 object-contain"
          />
        </div>
        
        {/* Loading message */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-1">{message}</h3>
          <p className="text-sm text-cyan-400/80">Por favor espere...</p>
        </div>

        {/* Animated dots */}
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

/**
 * Inline section loader - for use within a section/card
 */
export const InlineSectionLoader = ({ message = "Cargando datos..." }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-6" data-testid="inline-section-loader">
    <div className="relative">
      <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
      <img 
        src={LOGO_URL} 
        alt="Siempria" 
        className="absolute inset-0 m-auto w-10 h-10 object-contain"
      />
    </div>
    <div className="text-center">
      <h3 className="text-lg font-semibold">{message}</h3>
      <p className="text-sm text-muted-foreground">Obteniendo información...</p>
    </div>
  </div>
);

/**
 * Custom hook for delayed loading state
 * Shows loading only if operation takes longer than threshold
 */
export const useDelayedLoading = (isLoading, delay = 2000) => {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => setShowLoading(true), delay);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  return showLoading;
};

export default SectionLoader;
