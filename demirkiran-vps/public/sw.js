const CACHE_NAME = 'demirkiran-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/index.css',
  '/src/index.tsx',
  '/src/App.tsx',
  '/src/components/Navbar.tsx',
  '/src/components/Footer.tsx',
  '/src/pages/HomePage.tsx',
  '/src/pages/GalleryPage.tsx',
  '/src/pages/MenuPage.tsx',
  '/src/pages/ContactPage.tsx',
  '/src/pages/AdminPage.tsx'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache if available
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
