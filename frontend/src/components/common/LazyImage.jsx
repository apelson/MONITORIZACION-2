/**
 * LazyImage - Image component with lazy loading and intersection observer
 * Only loads images when they are visible in the viewport
 */
import { useState, useEffect, useRef, memo } from 'react';
import { cn } from '@/lib/utils';

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect fill='%231e293b' width='400' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='Arial' font-size='14'%3ECargando...%3C/text%3E%3C/svg%3E";

const LazyImage = memo(({ 
  src, 
  alt = '', 
  className = '',
  placeholderClassName = '',
  loadingComponent = null,
  errorComponent = null,
  rootMargin = '100px',
  threshold = 0.1,
  onLoad,
  onError,
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Setup intersection observer
  useEffect(() => {
    const element = imgRef.current;
    if (!element) return;

    // If IntersectionObserver not supported, load immediately
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Stop observing once visible
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [rootMargin, threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
    onError?.();
  };

  // Error state
  if (hasError && errorComponent) {
    return errorComponent;
  }

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {/* Placeholder/Loading state */}
      {(!isLoaded || !isVisible) && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-slate-800",
          placeholderClassName
        )}>
          {loadingComponent || (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin" />
              <span className="text-xs text-slate-500">Cargando...</span>
            </div>
          )}
        </div>
      )}

      {/* Actual image - only load when visible */}
      {isVisible && (
        <img
          src={src || PLACEHOLDER}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          {...props}
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;

/**
 * LazyStreamImage - Specialized lazy image for camera streams
 * Handles auto-refresh and MJPEG streams
 */
export const LazyStreamImage = memo(({
  device,
  authAxios,
  baseUrl,
  refreshInterval = 2000,
  streamMode = 'snapshot',
  className = '',
  onStatusChange,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  // Setup intersection observer
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    isMountedRef.current = true;

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = isVisible;
        const nowVisible = entry.isIntersecting;
        
        if (wasVisible !== nowVisible) {
          setIsVisible(nowVisible);
        }
      },
      {
        rootMargin: '200px',
        threshold: 0
      }
    );

    observerRef.current.observe(element);

    return () => {
      isMountedRef.current = false;
      observerRef.current?.disconnect();
    };
  }, []);

  // Fetch image when visible (for snapshot mode)
  useEffect(() => {
    if (!isVisible || !device || streamMode !== 'snapshot' || !authAxios) {
      return;
    }

    const fetchImage = async () => {
      if (!isMountedRef.current) return;
      
      try {
        const response = await authAxios.get(
          `/camera-stream/snapshot/${device.id}?t=${Date.now()}`,
          { responseType: 'blob' }
        );
        
        if (!isMountedRef.current) return;
        
        const blobUrl = URL.createObjectURL(response.data);
        
        // Revoke previous blob URL
        if (imageUrl && imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(imageUrl);
        }
        
        setImageUrl(blobUrl);
        setIsLoading(false);
        setHasError(false);
        onStatusChange?.('online');
      } catch (error) {
        if (!isMountedRef.current) return;
        setHasError(true);
        setIsLoading(false);
        onStatusChange?.('error');
      }
    };

    fetchImage();
    
    // Setup refresh interval
    intervalRef.current = setInterval(fetchImage, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Clean up blob URL
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [isVisible, device?.id, streamMode, refreshInterval, authAxios]);

  // MJPEG mode URL
  const mjpegUrl = streamMode === 'mjpeg' && device 
    ? `${baseUrl}/api/camera-stream/mjpeg/${device.id}`
    : null;

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden bg-slate-900", className)}
    >
      {!isVisible ? (
        // Placeholder when not visible
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <span className="text-xs text-slate-500">Fuera de vista</span>
        </div>
      ) : isLoading && !mjpegUrl ? (
        // Loading state
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
          <div className="w-6 h-6 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : hasError ? (
        // Error state
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/90">
          <span className="text-xs text-red-400">Sin señal</span>
          <span className="text-[10px] text-slate-500 mt-1">{device?.name}</span>
        </div>
      ) : (
        // Image
        <img
          src={mjpegUrl || imageUrl || PLACEHOLDER}
          alt={device?.name || 'Camera'}
          className="w-full h-full object-cover"
          {...props}
        />
      )}
    </div>
  );
});

LazyStreamImage.displayName = 'LazyStreamImage';
