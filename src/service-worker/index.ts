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
			const urls = new Set([PAGE, ...data.urls.filter(ours)]);
			const cache = await caches.open(CACHE);
			try {
				await cache.addAll([...urls]);
			} catch {
				return; // Offline partway: keep the copy there is.
			}
			for (const req of await cache.keys())
				if (!urls.has(new URL(req.url).pathname)) await cache.delete(req);
		})()
	);
});

/** A file of this site worth keeping (not the score API). */
function ours(url: string) {
	const u = new URL(url, self.location.origin);
	return u.origin === self.location.origin && !u.pathname.startsWith('/api/');
}

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET' || !ours(req.url)) return;
	if (req.mode === 'navigate') {
		event.respondWith(fetch(req).catch(async () => (await caches.match(PAGE)) ?? Response.error()));
		return;
	}
	event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit ?? fetch(req)));
});
