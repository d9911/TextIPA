import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

// Only the application shell is cached. API responses and personal imports are excluded.
export function serviceWorkerSource(version: string, assets: string[]): string {
  return `const CACHE = 'text-ipa-shell-${version}';
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('text-ipa-shell-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE).then(cache => cache.match('/index.html'))));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname)).then(cached => cached || fetch(request)));
  }
});
`;
}

export function pwaPlugin(): Plugin {
  let publicDir = '';
  return {
    name: 'text-ipa-pwa',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    async generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).map((name) => '/' + name);
      const hash = createHash('sha256');
      for (const name of Object.keys(bundle).sort()) {
        const item = bundle[name]!;
        hash.update(name).update(item.type === 'chunk' ? item.code : item.source);
      }
      const walk = async (directory: string, prefix: string): Promise<void> => {
        for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
          const file = resolve(directory, entry.name);
          const url = prefix + entry.name;
          if (entry.isDirectory()) await walk(file, url + '/');
          else {
            assets.push(url);
            hash.update(url).update(await readFile(file));
          }
        }
      };
      await walk(publicDir, '/');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: serviceWorkerSource(hash.digest('hex').slice(0, 16), assets.sort()) });
    },
  };
}
