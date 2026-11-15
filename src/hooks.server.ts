import type { Handle } from '@sveltejs/kit/hooks';
import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '#lib/server/db/schema.ts';
import { PROFILE_COOKIE, findProfile } from '#lib/server/profiles.ts';

/** Sent with every page and endpoint (the CSP itself is configured in vite.config.ts). */
const SECURITY_HEADERS = {
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

export const handle: Handle = async ({ event, resolve }) => {
	const db = drizzle(env.DB, { schema });
	event.locals.db = db;
	const id = event.cookies.get(PROFILE_COOKIE);
	event.locals.profile = id ? await findProfile(db, id) : null;

	const response = await resolve(event);
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
	// Pages name this build's files, which the next deploy deletes. Without this,
	// iOS reopens the home-screen app from a cached page whose CSS and JS are gone.
	if (response.headers.get('content-type')?.startsWith('text/html'))
		response.headers.set('Cache-Control', 'no-store');
	return response;
};
