// Offline play for the games that install as their own app (Squid Spells,
// Crops). Each registers this file with its own scope (/squid, /crops), so
// each gets its own copy, and the rest of the site always goes to the network.
//
// The files a game's page needs aren't known here, so this keeps a copy of
// what the page actually used: each time it loads online, it sends the list
// (KEEP), and the copy becomes exactly that. The page itself comes from the
// network when it can (so a new deploy shows up), from the copy when it can't;
// its files, named by their content, come from the copy first.
import { self } from '$app/service-worker';

/** The game's page, e.g. /squid, from the scope it registered with; also its cache's name. */
const PAGE = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const CACHE = PAGE.slice(1);

/** From the game's page: the files it loaded. */
type Keep = { type: 'keep'; urls: string[] };

self.addEventListener('install', () => void self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
	const data = event.data as Keep | null;
	if (data?.type !== 'keep') return;
	event.waitUntil(
		(async () => {
			const paths = new Set([PAGE, ...data.urls.map(path).filter(keepable)]);
			const cache = await caches.open(CACHE);
			try {
				await cache.addAll([...paths]);
			} catch {
				return; // Offline partway: keep the copy there is.
			}
			for (const req of await cache.keys()) if (!paths.has(path(req.url))) await cache.delete(req);
		})()
	);
});

/** A URL's path, if it's on this site. */
function path(url: string) {
	const u = new URL(url, self.location.origin);
	return u.origin === self.location.origin ? u.pathname : '';
}

/** Files named by their content (code, styles, fonts) and the game's icons: never stale. */
const keepable = (p: string) => p.startsWith('/_app/immutable/') || p.startsWith(`${PAGE}/`);

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const p = path(req.url);
	if (req.mode === 'navigate' && p === PAGE)
		event.respondWith(fetch(req).catch(async () => (await caches.match(PAGE)) ?? Response.error()));
	// Everything else (page data, the score API, other pages) goes to the network as usual.
	else if (keepable(p))
		event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit ?? fetch(req)));
});
