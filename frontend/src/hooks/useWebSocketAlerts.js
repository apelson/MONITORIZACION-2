/**
 * useWebSocketAlerts - Hook for real-time alert notifications via WebSocket
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

const WS_RECONNECT_DELAY = 3000; // 3 seconds
const WS_PING_INTERVAL = 30000; // 30 seconds

export const useWebSocketAlerts = (backendUrl, token, onNewAlert) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  // Build WebSocket URL
  const getWsUrl = useCallback(() => {
    if (!backendUrl) return null;
    
    // Convert HTTP(S) URL to WS(S) URL
    let wsUrl = backendUrl.replace(/^http/, 'ws');
    
    // Add WebSocket endpoint
    wsUrl = `${wsUrl}/api/ws/alerts`;
    
    // Add token if available
    if (token) {
      wsUrl += `?token=${token}`;
    }
    
    return wsUrl;
  }, [backendUrl, token]);

  // Handle incoming messages
  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'connected':
          console.log('[WS] Connected to alert stream');
          setConnectionStatus('connected');
          break;
          
        case 'alert':
          console.log('[WS] New alert received:', data.data);
          
          // Call the callback to update alerts state
          if (onNewAlert) {
            onNewAlert(data.data);
          }
          
          // Show toast notification
          const alertData = data.data;
          if (alertData.alert_type === 'device_down') {
            toast.error(`🔴 ${alertData.device_name} está OFFLINE`, {
              duration: 8000,
              description: alertData.message
            });
          } else if (alertData.alert_type === 'device_up') {
            toast.success(`🟢 ${alertData.device_name} está ONLINE`, {
              duration: 5000,
              description: alertData.message
            });
          } else if (alertData.alert_type === 'nas_disconnected') {
            toast.error(`💾 ${alertData.device_name} - NAS desconectado`, {
              duration: 8000,
              description: alertData.message
            });
          }
          
          // Browser notification if permitted
          if (Notification.permission === 'granted' && alertData.alert_type === 'device_down') {
            new Notification('⚠️ Alerta de Dispositivo', {
              body: `${alertData.device_name}: ${alertData.message}`,
              icon: '/favicon.ico',
              requireInteraction: true
            });
          }
          break;
          
        case 'device_status':
          console.log('[WS] Device status change:', data.data);
          break;
          
        case 'pong':
          // Heartbeat response
          break;
          
        default:
          console.log('[WS] Unknown message type:', data.type);
      }
    } catch (e) {
      console.error('[WS] Error parsing message:', e);
    }
  }, [onNewAlert]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    const wsUrl = getWsUrl();
    if (!wsUrl) {
      console.warn('[WS] No WebSocket URL available');
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionStatus('connecting');
    console.log('[WS] Connecting to:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connection established');
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        
        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, WS_PING_INTERVAL);
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('[WS] WebSocket error:', error);
        setConnectionStatus('error');
      };

      ws.onclose = (event) => {
        console.log('[WS] Connection closed:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Schedule reconnect (unless intentionally closed)
        if (event.code !== 1000) {
          console.log('[WS] Scheduling reconnect...');
          reconnectTimeoutRef.current = setTimeout(connect, WS_RECONNECT_DELAY);
        }
      };
    } catch (e) {
      console.error('[WS] Error creating WebSocket:', e);
      setConnectionStatus('error');
      
      // Schedule reconnect
      reconnectTimeoutRef.current = setTimeout(connect, WS_RECONNECT_DELAY);
    }
  }, [getWsUrl, handleMessage]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    // Clear timeouts/intervals
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    // Close connection
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    // Only connect if we have a backend URL
    if (backendUrl) {
      // Small delay to ensure auth is ready
      const timer = setTimeout(connect, 1000);
      return () => {
        clearTimeout(timer);
        disconnect();
      };
    }
  }, [backendUrl, connect, disconnect]);

  // Reconnect when token changes
  useEffect(() => {
    if (token && isConnected) {
      // Reconnect with new token
      disconnect();
      setTimeout(connect, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect
  };
};

export default useWebSocketAlerts;
