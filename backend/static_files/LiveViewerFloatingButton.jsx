/**
 * LiveViewerFloatingButton - Floating button for quick access to Live Viewer
 * Shows prominent access to real-time camera viewing
 */
import { useState, useEffect, useCallback } from 'react';
import { Video, VideoOff, Eye, ChevronRight, Camera, Activity } from 'lucide-react';
import { Badge } from '../ui/badge';

const LiveViewerFloatingButton = ({ authAxios, onClick, isActive, devices = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Count cameras
  const cameraDevices = devices.filter(d => 
    d.device_type_id === 'type-camera' || 
    d.camera_user || 
    d.camera_path
  );
  
  const onlineCameras = cameraDevices.filter(d => d.status === 'online').length;
  const offlineCameras = cameraDevices.filter(d => d.status === 'offline').length;
  const totalCameras = cameraDevices.length;

  const hasOffline = offlineCameras > 0;

  return (
    <div 
      className={`fixed right-0 z-50 transition-all duration-300 sm:block`}
      style={{ top: 'calc(33% + 100px)' }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onClick={() => {
        if (window.innerWidth < 640) {
          onClick();
        }
      }}
    >
      <div 
        className={`
          flex items-center cursor-pointer shadow-2xl rounded-l-xl overflow-hidden
          transition-all duration-300
          ${hasOffline 
            ? 'bg-gradient-to-r from-purple-600 to-violet-500 text-white' 
            : 'bg-gradient-to-r from-violet-600 to-purple-500 text-white'
          }
          ${isActive ? 'ring-4 ring-purple-300 ring-opacity-50' : ''}
        `}
        onClick={onClick}
      >
        {/* Icon section - always visible, smaller on mobile */}
        <div className={`p-2 sm:p-3 flex flex-col items-center justify-center ${isExpanded ? 'sm:border-r border-white/20' : ''}`}>
          <Video className="w-5 h-5 sm:w-8 sm:h-8" />
          {totalCameras > 0 && (
            <span className="text-[10px] sm:text-xs font-bold mt-0.5 sm:mt-1">
              {onlineCameras}/{totalCameras}
            </span>
          )}
        </div>

        {/* Expanded content - hidden on mobile */}
        <div className={`overflow-hidden transition-all duration-300 hidden sm:block ${isExpanded ? 'w-48 opacity-100' : 'w-0 opacity-0'}`}>
          <div className="p-3 whitespace-nowrap">
            <div className="font-bold text-sm mb-1 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              En Directo
            </div>
            
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  Cámaras Online
                </span>
                <Badge variant="secondary" className="bg-white/20 text-white h-5">
                  {onlineCameras}
                </Badge>
              </div>
              
              {offlineCameras > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <VideoOff className="w-3 h-3" />
                    Offline
                  </span>
                  <Badge 
                    variant="destructive" 
                    className="h-5 bg-white text-red-600"
                  >
                    {offlineCameras}
                  </Badge>
                </div>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-xs">
              <span>Abrir visor</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Pulse animation for live indicator */}
      <div className="absolute top-1 sm:top-2 left-1 sm:left-2 pointer-events-none">
        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse" />
      </div>
    </div>
  );
};

export default LiveViewerFloatingButton;
