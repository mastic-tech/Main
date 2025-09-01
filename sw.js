/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const CACHE_NAME = 'pixshop-cache-v1';
// This list includes all local components and critical external resources.
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/assets.ts',
  '/services/geminiService.ts',
  '/components/AdjustmentPanel.tsx',
  '/components/CollagePanel.tsx',
  '/components/CompareControls.tsx',
  '/components/CropPanel.tsx',
  '/components/CutoutPanel.tsx',
  '/components/EditorPanel.tsx',
  '/components/FilterPanel.tsx',
  '/components/GeneratorPanel.tsx',
  '/components/Header.tsx',
  '/components/icons.tsx',
  '/components/Spinner.tsx',
  '/components/StartScreen.tsx',
  '/components/TextPanel.tsx',
  '/components/Tutorial.tsx',
  '/components/ZoomControls.tsx',
  // External resources from index.html
  'https://cdn.tailwindcss.com',
  'https://esm.sh/react@^18.2.0',
  'https://esm.sh/react@^18.2.0/jsx-runtime',
  'https://esm.sh/react-dom@^18.2.0/client',
  'https://esm.sh/@google/genai@^1.10.0',
  'https://esm.sh/react-image-crop@^11.0.6',
  'https://esm.sh/react-image-crop@^11.0.6/dist/ReactCrop.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lobster&family=Playfair+Display&family=Merriweather&family=Lato&family=Montserrat&family=Open+Sans&family=Pacifico&family=Dancing+Script&family=Oswald&family=Raleway&family=Source+Code+Pro&display=swap',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Use addAll with a catch block for individual resource failures
        return Promise.all(
          urlsToCache.map(url => 
            cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err))
          )
        );
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Do not cache non-GET requests (e.g., API calls to Gemini)
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Cache-first strategy for all GET requests
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response to cache
            // We cache basic and CORS responses to store assets from CDNs.
            if (!response || response.status !== 200) {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});