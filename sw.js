// =============================================
// SERVICE WORKER - Expired Control D&D
// Magenta Aeon v1.0
// =============================================

const CACHE_NAME = 'expired-control-v3';
const OFFLINE_URL = '/index.html';

// Asset yang akan di-cache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/manifest.json',
  '/foto1.jpeg',
  '/foto2.jpeg'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('🔮 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Install complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Cache failed', error);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('🔮 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch Strategy: Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
  // Skip Google Script API requests
  if (event.request.url.includes('script.google.com')) {
    return;
  }
  
  // Skip analytics/tracking
  if (event.request.url.includes('google-analytics.com') || 
      event.request.url.includes('googletagmanager.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(async () => {
        // Offline: try cache first
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If HTML request, return offline page
        if (event.request.headers.get('accept').includes('text/html')) {
          const cache = await caches.open(CACHE_NAME);
          const offlinePage = await cache.match(OFFLINE_URL);
          if (offlinePage) {
            return offlinePage;
          }
        }
        
        // Return simple offline response
        return new Response(
          `<!DOCTYPE html>
          <html lang="id">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Offline - Expired Control D&D</title>
            <style>
              body {
                font-family: 'DM Sans', sans-serif;
                background: #fdf4ff;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
                text-align: center;
              }
              .offline-card {
                background: white;
                border-radius: 16px;
                padding: 32px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                max-width: 400px;
              }
              .offline-icon {
                font-size: 64px;
                margin-bottom: 16px;
              }
              .offline-title {
                font-size: 20px;
                font-weight: 700;
                color: #c026d3;
                margin-bottom: 8px;
              }
              .offline-text {
                font-size: 14px;
                color: #6b7280;
                margin-bottom: 24px;
                line-height: 1.5;
              }
              .retry-btn {
                background: #c026d3;
                color: white;
                border: none;
                border-radius: 10px;
                padding: 12px 24px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                font-family: 'DM Sans', sans-serif;
              }
              .retry-btn:active {
                background: #a21caf;
              }
            </style>
          </head>
          <body>
            <div class="offline-card">
              <div class="offline-icon">📡</div>
              <div class="offline-title">Anda Sedang Offline</div>
              <div class="offline-text">
                Tidak dapat terhubung ke server.<br>
                Periksa koneksi internet Anda dan coba lagi.
              </div>
              <button class="retry-btn" onclick="location.reload()">
                🔄 Coba Lagi
              </button>
            </div>
          </body>
          </html>`,
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/html; charset=utf-8',
            }),
          }
        );
      })
  );
});

// Handle Push Notifications (Optional)
self.addEventListener('push', (event) => {
  console.log('📬 Service Worker: Push received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Ada barang yang harus ditarik hari ini!',
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/index.html',
        dateOfArrival: Date.now(),
      },
      actions: [
        {
          action: 'open',
          title: '📋 Buka Aplikasi'
        },
        {
          action: 'close',
          title: '✕ Tutup'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Expired Control D&D',
        options
      )
    );
  }
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Service Worker: Notification clicked');
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // If window is already open, focus it
        for (const client of clientList) {
          if (client.url.includes('/index.html') && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/index.html');
        }
      })
  );
});

// Handle Sync (Background Sync)
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync');
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Try to sync offline data
      syncOfflineData()
    );
  }
});

// Sync offline data function
async function syncOfflineData() {
  try {
    // Post message to all clients to trigger sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_DATA',
        timestamp: Date.now()
      });
    });
    console.log('✅ Service Worker: Sync complete');
  } catch (error) {
    console.error('❌ Service Worker: Sync failed', error);
  }
}

// Handle Messages from Client
self.addEventListener('message', (event) => {
  console.log('📨 Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME)
        .then(() => {
          console.log('🗑️ Service Worker: Cache cleared');
          return self.clients.matchAll();
        })
        .then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CACHE_CLEARED',
              timestamp: Date.now()
            });
          });
        })
    );
  }
});

console.log('🔮 Service Worker: Expired Control D&D - Magenta Aeon v1.0 Ready');
