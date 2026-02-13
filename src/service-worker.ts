/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />

import { build, files, version } from '$service-worker';

const sw = self as ServiceWorkerGlobalScope;
const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(ASSETS);
    })()
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    })()
  );
});

sw.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      const url = new URL(event.request.url);
      const cache = await caches.open(CACHE);

      const isStaticAsset = ASSETS.includes(url.pathname);

      if (isStaticAsset) {
        const cachedAsset = await cache.match(url.pathname);
        if (cachedAsset) return cachedAsset;

        try {
          const response = await fetch(event.request);
          if (response instanceof Response && response.ok) {
            void cache.put(url.pathname, response.clone());
          }
          return response;
        } catch (error) {
          const fallbackAsset = await cache.match(url.pathname);
          if (fallbackAsset) return fallbackAsset;
          throw error;
        }
      }

      return fetch(event.request);
    })()
  );
});
