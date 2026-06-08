// Service worker de la app móvil "Unergy Solar".
// Se registra SOLO con scope '/m/', así que nunca controla las páginas de la
// plataforma. Estrategia: network-first con caché de respaldo para el shell.
// Los datos (/api) NUNCA se cachean — siempre van en vivo.

const CACHE = 'unergy-solar-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api')) return // datos siempre en vivo

  event.respondWith((async () => {
    try {
      const res = await fetch(req)
      if (res && res.ok) {
        const cache = await caches.open(CACHE)
        cache.put(req, res.clone()).catch(() => {})
      }
      return res
    } catch (err) {
      const cached = await caches.match(req)
      if (cached) return cached
      if (req.mode === 'navigate') {
        const shell = (await caches.match('/m/solar')) || (await caches.match('/index.html'))
        if (shell) return shell
      }
      throw err
    }
  })())
})
