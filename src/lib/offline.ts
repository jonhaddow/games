// Offline play for a game that installs as its own app: registers the service
// worker (src/service-worker/) with the game's scope and sends it what the page
// loaded, to keep. Call from onMount; returns the clean-up.
import { dev } from '$app/env';

export function keepOffline(scope: string) {
	// Not in dev, where files aren't named by their content and would go stale.
	const sw = navigator.serviceWorker;
	if (!sw || dev) return () => {};
	const keep = async () => {
		const reg = await sw.register('/service-worker.js', { scope });
		await sw.ready;
		// What this page loaded (code, fonts): the copy to play offline.
		const urls = performance.getEntriesByType('resource').map((e) => e.name);
		reg.active?.postMessage({ type: 'keep', urls });
	};
	const loaded = () => void keep().catch(() => {});
	if (document.readyState === 'complete') loaded();
	else addEventListener('load', loaded, { once: true });
	return () => removeEventListener('load', loaded);
}
