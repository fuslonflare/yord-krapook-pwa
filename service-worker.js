const CACHE_NAME = 'money-tracker-cache-v1';
const urlsToCache = [
  '/',
  '/index.html', // หรือชื่อไฟล์ HTML หลักของคุณ
  '/manifest.json',
  '/service-worker.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  // เพิ่ม URL ของไอคอน PWA ของคุณที่นี่
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event: แคชไฟล์ที่จำเป็นเมื่อ Service Worker ถูกติดตั้ง
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to cache during install:', error);
      })
  );
});

// Fetch event: ดักจับ request และให้บริการจาก Cache หรือ Network
self.addEventListener('fetch', event => {
  // สำหรับ Google App Script API calls (google.script.run)
  // เราต้องการให้ข้อมูลเป็นปัจจุบันเสมอ จึงใช้ Network First หรือ Network Only
  // URL ของ App Script จะมีรูปแบบคล้าย: https://script.google.com/macros/s/AKfycb.../exec
  if (event.request.url.includes('script.google.com/macros/s/')) {
    event.respondWith(
      fetch(event.request).catch(error => {
        console.error('API fetch failed:', error);
        // สามารถเพิ่ม fallback UI สำหรับกรณีออฟไลน์และ API ไม่พร้อมใช้งานได้
        return new Response(JSON.stringify({ error: 'Network is unavailable.' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  } else {
    // สำหรับ Static assets (HTML, CSS, JS, Images) ใช้ Cache First
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Cache hit - return response
          if (response) {
            return response;
          }
          // No cache match - fetch from network
          return fetch(event.request).then(
            fetchResponse => {
              // Check if we received a valid response
              if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                return fetchResponse;
              }
              // IMPORTANT: Clone the response. A response is a stream
              // and can only be consumed once. We must clone it so that
              // we can consume the stream twice.
              const responseToCache = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              return fetchResponse;
            }
          );
        })
        .catch(error => {
          console.error('Fetch failed for static asset:', error);
          // Fallback for offline static assets
          // You might want to return an offline page here
          // For example: return caches.match('/offline.html');
        })
    );
  }
});

// Activate event: ลบ Cache เก่า
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
