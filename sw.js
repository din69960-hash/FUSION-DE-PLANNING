// Service worker de l'application « Sports Corbas »
// Réseau d'abord : les associations voient toujours la dernière version du site.
// Le cache ne sert qu'en secours, si le téléphone n'a pas de connexion.
const CACHE = 'sports-corbas-v2';
const FICHIERS = [
  './', './index.html', './creneaux.html', './manifestations.html', './commun.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'
];

// Copie « propre » d'une réponse : certains hébergeurs (Cloudflare Pages) redirigent page.html → /page ;
// une réponse marquée « redirigée » ne peut pas être resservie hors connexion, on la recopie donc.
const propre = rep => rep.redirected ? rep.blob().then(b => new Response(b, { status: rep.status, headers: rep.headers })) : Promise.resolve(rep);

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FICHIERS.map(f => fetch(f).then(r => r.ok ? propre(r).then(p => c.put(f, p)) : null).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // Uniquement les fichiers du site : jamais Supabase ni les autres domaines.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then(rep => {
        if (rep.ok) { const copie = rep.clone(); propre(copie).then(p => caches.open(CACHE).then(c => c.put(req, p))); }
        return rep;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
