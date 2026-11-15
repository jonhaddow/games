import { dev } from '$app/env';

// The games live on their own *.app.haddow.me sites and call the score API
// from the browser, naming the player in a header (no cookies).
const ALLOWED = /^https:\/\/[a-z0-9-]+\.app\.haddow\.me$/;
const LOCAL = /^http:\/\/localhost:\d+$/;

/** CORS headers for a game's request, or none if it isn't from one of ours. */
export function cors(request: Request): Record<string, string> {
	const origin = request.headers.get('origin');
	if (!origin || !(ALLOWED.test(origin) || (dev && LOCAL.test(origin)))) return {};
	return {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Methods': 'GET, POST',
		'Access-Control-Allow-Headers': 'content-type, x-games-profile',
		'Access-Control-Max-Age': '86400',
		Vary: 'Origin'
	};
}
