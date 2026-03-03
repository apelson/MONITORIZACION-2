/**
 * usePushNotifications - Hook para gestionar notificaciones push
 * Maneja suscripción, permisos y estado de las notificaciones
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const usePushNotifications = (authAxios) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 
                      'PushManager' in window && 
                      'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Get VAPID public key from server
  useEffect(() => {
    const fetchVapidKey = async () => {
      if (!authAxios || !isSupported) return;
      
      try {
        const res = await authAxios.get('/push/vapid-public-key');
        setVapidPublicKey(res.data.publicKey);
      } catch (err) {
        console.log('Push notifications not configured on server');
      }
    };
    
    fetchVapidKey();
  }, [authAxios, isSupported]);

  // Check existing subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) return;
      
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('Error checking subscription:', err);
      }
    };
    
    checkSubscription();
  }, [isSupported]);

  // Convert VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !vapidPublicKey || !authAxios) {
      toast.error('Notificaciones push no disponibles');
      return false;
    }

    setLoading(true);

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        toast.error('Permiso de notificaciones denegado');
        setLoading(false);
        return false;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/service-worker-push.js');
      await navigator.serviceWorker.ready;
      console.log('Service Worker registered');

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send subscription to server
      const subscriptionJson = subscription.toJSON();
      await authAxios.post('/push/subscribe', {
        endpoint: subscriptionJson.endpoint,
        keys: subscriptionJson.keys
      });

      setIsSubscribed(true);
      toast.success('Notificaciones push activadas');
      return true;

    } catch (err) {
      console.error('Error subscribing to push:', err);
      toast.error('Error al activar notificaciones');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, vapidPublicKey, authAxios]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!isSupported || !authAxios) return false;

    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();
        
        // Notify server
        const subscriptionJson = subscription.toJSON();
        await authAxios.delete('/push/unsubscribe', {
          data: {
            endpoint: subscriptionJson.endpoint,
            keys: subscriptionJson.keys
          }
        });
      }

      setIsSubscribed(false);
      toast.success('Notificaciones push desactivadas');
      return true;

    } catch (err) {
      console.error('Error unsubscribing:', err);
      toast.error('Error al desactivar notificaciones');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, authAxios]);

  // Test notification
  const sendTestNotification = useCallback(async () => {
    if (!authAxios) return;
    
    try {
      await authAxios.post('/push/test');
      toast.success('Notificación de prueba enviada');
    } catch (err) {
      toast.error('Error al enviar notificación de prueba');
    }
  }, [authAxios]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
    sendTestNotification,
    canSubscribe: isSupported && vapidPublicKey && permission !== 'denied'
  };
};

export default usePushNotifications;
