// Service Worker do Mapas Temáticos — permite que a VISUALIZAÇÃO de mapas e a
// localização funcionem offline, usando o que já foi carregado com internet.
// Envios de planilha, criação de fazenda e criação de mapa continuam exigindo
// internet (as chamadas ao Supabase nunca passam pelo cache deste arquivo).

const CACHE_VERSION = 'v2';
const STATIC_CACHE = 'mapas-tematicos-static-' + CACHE_VERSION;
const TILE_CACHE = 'mapas-tematicos-tiles-' + CACHE_VERSION;

const PRECACHE_URLS = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Work+Sans:wght@400;500;600;700&display=swap'
];

// Hosts de imagem de satélite/NDVI — cacheadas conforme o usuário for
// visitando cada área (não é um download antecipado de região inteira).
const TILE_HOSTS = [
  'server.arcgisonline.com',
  'tile.openstreetmap.org',
  'a.tile.openstreetmap.org', 'b.tile.openstreetmap.org', 'c.tile.openstreetmap.org',
  'gibs.earthdata.nasa.gov',
  'wayback.maptiles.arcgis.com',
  'sh.dataspace.copernicus.eu'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => Promise.all(
      PRECACHE_URLS.map((url) =>
        cache.add(new Request(url, { mode: 'cors' })).catch(() =>
          cache.add(new Request(url, { mode: 'no-cors' })).catch(() => {})
        )
      )
    )).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== TILE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isTileRequest(url){
  return TILE_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith('.' + h));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return;

  let url;
  try{ url = new URL(req.url); }catch(e){ return; }

  // Supabase: sempre direto pra rede — nunca cacheado (dado dinâmico/privado).
  // O fallback offline dos dados fica por conta do IndexedDB, no app.
  if(url.hostname.endsWith('supabase.co')) return;

  if(isTileRequest(url)){
    event.respondWith(
      caches.open(TILE_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const networkFetch = fetch(req).then((res) => {
            if(res && res.status === 200) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // A própria página (navegação): sempre tenta a rede primeiro, para que uma
  // atualização do sistema apareça na hora — só usa o cache se estiver
  // realmente offline. As bibliotecas de terceiros abaixo continuam
  // cache-primeiro, já que são URLs fixas por versão.
  if(req.mode === 'navigate'){
    event.respondWith(
      fetch(req).then((res) => {
        if(res && res.status === 200) caches.open(STATIC_CACHE).then((cache) => cache.put(req, res.clone()));
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('./')))
    );
    return;
  }

  // App e bibliotecas: cache primeiro (rápido e funciona offline), atualiza em segundo plano.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req).then((res) => {
        if(res && res.status === 200){
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, res.clone()));
        }
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
