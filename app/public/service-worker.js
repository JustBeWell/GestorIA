self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const priority = data.priority ?? 'media';
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: data.url || '/' },
    requireInteraction: priority === 'critica',
    tag: data.tag,
  };
  event.waitUntil(self.registration.showNotification(data.title || 'GestorIA', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((windowClient) => windowClient.url.includes(url));
      if (existing) {
        return existing.focus();
      }
      return clients.openWindow(url);
    }),
  );
});
