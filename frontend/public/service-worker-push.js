/* eslint-disable no-restricted-globals */

// Service Worker for Push Notifications - WatchTower by Siempria

const CACHE_NAME = 'watchtower-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Push notification received
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  let data = {
    title: 'WatchTower Alert',
    body: 'Nueva notificación',
    icon: '/logo192.png',
    badge: '/logo192.png',
    tag: 'default',
    data: {}
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/logo192.png',
    badge: data.badge || '/logo192.png',
    tag: data.tag,
    data: data.data,
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: data.data?.type === 'cra_alert',
    actions: [
      { action: 'open', title: 'Ver Dashboard' },
      { action: 'dismiss', title: 'Descartar' }
    ]
  };
  
  // For CRA alerts, add urgency
  if (data.data?.type === 'cra_alert' && data.data?.status === 'offline') {
    options.vibrate = [500, 200, 500, 200, 500];
    options.requireInteraction = true;
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Open or focus the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
  );
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
});

// Background sync (for offline support)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
});

// Message handler (communication with main app)
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
