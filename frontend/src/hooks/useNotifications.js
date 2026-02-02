/**
 * useNotifications Hook - Easy access to notification service
 */
import { useState, useEffect, useCallback } from 'react';
import notificationService from '@/services/NotificationService';

export const useNotifications = () => {
  const [permission, setPermission] = useState('default');
  const [soundEnabled, setSoundEnabled] = useState(notificationService.isSoundEnabled());
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check support
    setIsSupported('Notification' in window);
    
    // Get current permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await notificationService.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const initialize = useCallback(async () => {
    const result = await notificationService.init();
    setPermission(notificationService.permission);
    return result;
  }, []);

  const showNotification = useCallback((title, options) => {
    return notificationService.show(title, options);
  }, []);

  const showAlert = useCallback((alert) => {
    return notificationService.showAlert(alert);
  }, []);

  const toggleSound = useCallback((enabled) => {
    notificationService.toggleSound(enabled);
    setSoundEnabled(enabled);
  }, []);

  const playTestSound = useCallback(() => {
    notificationService.playAlertSound('normal');
  }, []);

  return {
    permission,
    soundEnabled,
    isSupported,
    isEnabled: permission === 'granted',
    requestPermission,
    initialize,
    showNotification,
    showAlert,
    toggleSound,
    playTestSound,
    notifyDeviceOffline: notificationService.notifyDeviceOffline.bind(notificationService),
    notifyDeviceOnline: notificationService.notifyDeviceOnline.bind(notificationService),
    notifyNewIncident: notificationService.notifyNewIncident.bind(notificationService)
  };
};

export default useNotifications;
