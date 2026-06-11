/**
 * ═══════════════════════════════════════════════════════════════════
 *  Rastreio Online — Service Worker (sw.js)
 *  Estratégia: Cache-First para assets locais (Splash Screen)
 *              Network-First para tudo mais
 * ═══════════════════════════════════════════════════════════════════
 *
 *  ⚠️  PROBLEMA DE MIXED CONTENT (HTTP vs HTTPS)
 *  ───────────────────────────────────────────────────────────────
 *  Seu PWA deve estar em HTTPS (exigência para instalação).
 *  O site alvo (http://www.brgps.com) é HTTP puro.
 *  Isso causa bloqueio de "Mixed Content" no iframe.
 *
 *  SOLUÇÃO — Proxy Reverso no seu servidor:
 *
 *  Opção A — Nginx (recomendado):
 *  ──────────────────────────────
 *  No seu nginx.conf, adicione dentro do bloco `server`:
 *
 *    location /proxy/ {
 *        proxy_pass         http://www.brgps.com/;
 *        proxy_set_header   Host www.brgps.com;
 *        proxy_set_header   X-Real-IP $remote_addr;
 *        proxy_http_version 1.1;
 *        proxy_set_header   Upgrade $http_upgrade;
 *        proxy_set_header   Connection 'upgrade';
 *        proxy_cache_bypass $http_upgrade;
 *
 *        # Remove o header X-Frame-Options do site de destino
 *        # para permitir exibição no iframe
 *        proxy_hide_header  X-Frame-Options;
 *        proxy_hide_header  Content-Security-Policy;
 *
 *        # Reescreve links internos do site para passar pelo proxy
 *        sub_filter_once    off;
 *        sub_filter         'http://www.brgps.com' '/proxy';
 *        sub_filter         'href="/'              'href="/proxy/';
 *        sub_filter         'src="/'               'src="/proxy/';
 *    }
 *
 *  Opção B — Vercel (vercel.json):
 *  ────────────────────────────────
 *  {
 *    "rewrites": [
 *      {
 *        "source": "/proxy/:path*",
 *        "destination": "http://www.brgps.com/:path*"
 *      }
 *    ]
 *  }
 *  Atenção: Vercel não garante reescrita de conteúdo HTML interno.
 *  O Nginx é mais confiável para este caso.
 *
 *  Opção C — Cloudflare Worker (gratuito):
 *  ────────────────────────────────────────
 *  Se tiver Cloudflare, crie um Worker com este script:
 *
 *  addEventListener('fetch', event => {
 *    event.respondWith(handleRequest(event.request))
 *  })
 *  async function handleRequest(request) {
 *    const url = new URL(request.url)
 *    const targetUrl = 'http://www.brgps.com' + url.pathname + url.search
 *    const response = await fetch(targetUrl, request)
 *    const newResponse = new Response(response.body, response)
 *    newResponse.headers.delete('X-Frame-Options')
 *    newResponse.headers.delete('Content-Security-Policy')
 *    return newResponse
 *  }
 *
 * ═══════════════════════════════════════════════════════════════════
 */

const CACHE_NAME    = 'rastreio-online-v1';
const CACHE_VERSION = 1;

// Assets locais que devem ser cacheados para a Splash Screen carregar offline
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Google Fonts (opcionalmente já embutidas no HTML para fallback offline)
];

// ── INSTALL: pré-cacheia os assets da splash screen ─────────────────
self.addEventListener('install', event => {
  console.log('[SW] Instalando versão', CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pré-cacheando assets...');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting()) // Ativa imediatamente, sem esperar tab fechar
      .catch(err => console.warn('[SW] Falha no pré-cache:', err))
  );
});

// ── ACTIVATE: remove caches antigos ─────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Ativando...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] Removendo cache antigo:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim()) // Assume controle de todas as abas abertas
  );
});

// ── FETCH: estratégia híbrida ────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições externas (o iframe do brgps.com)
  if (url.origin !== self.location.origin) {
    return; // Deixa o browser tratar normalmente
  }

  // Para assets locais: Cache-First (splash carrega instantaneamente)
  const isLocalAsset = PRECACHE_ASSETS.some(asset => {
    return url.pathname === asset || url.pathname === asset.replace(/\/$/, '/index.html');
  });

  if (isLocalAsset || isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Para tudo mais: Network-First com fallback para cache
  event.respondWith(networkFirst(request));
});

// ── Estratégia Cache-First ────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline — asset não encontrado.', { status: 503 });
  }
}

// ── Estratégia Network-First ──────────────────────────────────────
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback final: retorna o index.html (SPA fallback)
    return caches.match('/index.html');
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function isStaticAsset(pathname) {
  return /\.(png|jpg|jpeg|svg|webp|ico|woff2?|css|js)$/i.test(pathname);
}

// ── Mensagem de controle (para forçar update via JS) ──────────────
self.addEventListener('message', event => {
  if (event.data?.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
