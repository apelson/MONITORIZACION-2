/**
 * Notification Service - Push notifications and alerts
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

class NotificationService {
  constructor() {
    this.permission = 'default';
    this.swRegistration = null;
    this.soundEnabled = localStorage.getItem('alertSound') !== 'false';
    this.audioContext = null;
  }

  // Initialize the notification service
  async init() {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      return false;
    }

    // Request permission
    this.permission = await this.requestPermission();
    
    // Register service worker for push notifications
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.ready;
        console.log('Service Worker listo para notificaciones');
      } catch (error) {
        console.error('Error al registrar Service Worker:', error);
      }
    }

    return this.permission === 'granted';
  }

  // Request notification permission
  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    } catch (error) {
      console.error('Error al solicitar permiso de notificaciones:', error);
      return 'denied';
    }
  }

  // Check if notifications are enabled
  isEnabled() {
    return this.permission === 'granted';
  }

  // Show a browser notification
  async show(title, options = {}) {
    if (this.permission !== 'granted') {
      console.warn('Notificaciones no permitidas');
      return null;
    }

    const defaultOptions = {
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      tag: 'siempria-alert',
      ...options
    };

    try {
      // Use Service Worker notification if available (for background)
      if (this.swRegistration) {
        return await this.swRegistration.showNotification(title, defaultOptions);
      } else {
        // Fallback to regular notification
        return new Notification(title, defaultOptions);
      }
    } catch (error) {
      console.error('Error al mostrar notificación:', error);
      return null;
    }
  }

  // Show alert notification with sound
  async showAlert(alert) {
    const { device_name, type, message, severity } = alert;
    
    const title = `${severity === 'critical' ? '🚨' : '⚠️'} ${type === 'device_offline' ? 'Dispositivo Offline' : 'Alerta'}`;
    const body = `${device_name}: ${message}`;
    
    // Show browser notification
    const notification = await this.show(title, {
      body,
      tag: `alert-${alert.id || Date.now()}`,
      requireInteraction: severity === 'critical',
      data: { alert }
    });

    // Play sound if enabled and critical
    if (this.soundEnabled && (severity === 'critical' || severity === 'high')) {
      this.playAlertSound(severity);
    }

    return notification;
  }

  // Play alert sound
  playAlertSound(severity = 'normal') {
    if (!this.soundEnabled) return;

    try {
      // Create audio context if needed
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Different sounds for different severity
      if (severity === 'critical') {
        // Urgent beeping sound
        oscillator.frequency.value = 880;
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        
        // Beep pattern
        const beepDuration = 0.15;
        const beepGap = 0.1;
        for (let i = 0; i < 3; i++) {
          const startTime = ctx.currentTime + i * (beepDuration + beepGap);
          gainNode.gain.setValueAtTime(0.3, startTime);
          gainNode.gain.setValueAtTime(0, startTime + beepDuration);
        }
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.75);
      } else {
        // Single notification tone
        oscillator.frequency.value = 440;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
      }
    } catch (error) {
      console.error('Error al reproducir sonido:', error);
    }
  }

  // Toggle sound
  toggleSound(enabled) {
    this.soundEnabled = enabled;
    localStorage.setItem('alertSound', enabled ? 'true' : 'false');
  }

  // Get sound status
  isSoundEnabled() {
    return this.soundEnabled;
  }

  // Show device offline notification
  async notifyDeviceOffline(device) {
    return this.showAlert({
      device_name: device.name,
      type: 'device_offline',
      message: `${device.ip_address} no responde`,
      severity: 'high'
    });
  }

  // Show device online notification
  async notifyDeviceOnline(device) {
    if (this.permission !== 'granted') return;
    
    return this.show('Dispositivo Online', {
      body: `${device.name} (${device.ip_address}) vuelve a estar en línea`,
      tag: `online-${device.id}`,
      silent: true
    });
  }

  // Show new incident notification
  async notifyNewIncident(incident) {
    return this.showAlert({
      device_name: incident.device_name || 'Sistema',
      type: 'incident',
      message: incident.title,
      severity: incident.priority === 'critical' ? 'critical' : 'normal'
    });
  }
}

// Singleton instance
const notificationService = new NotificationService();

export default notificationService;
export { NotificationService };
