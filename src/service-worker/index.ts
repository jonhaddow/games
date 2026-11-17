// Offline play for Squid Spells, and only for it: registered with the scope
// /squid, so the rest of the games always go to the network.
//
// The squid page is server-rendered (it shows the player's name), and the
// files it needs aren't known here, so this keeps a copy of what the page
// actually used: each time it loads online, it sends the list (KEEP), and the
// copy becomes exactly that. The page itself comes from the network when it
// can (so a new deploy shows up), from the copy when it can't; its files,
// named by their content, come from the copy first.
import { self } from '$app/service-worker';

const CACHE = 'squid';
const PAGE = '/squid';

/** From the squid page: the files it loaded. */
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

/** Files named by their content (code, styles, the font) and squid's icons: never stale. */
const keepable = (p: string) => p.startsWith('/_app/immutable/') || p.startsWith('/squid/');

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
