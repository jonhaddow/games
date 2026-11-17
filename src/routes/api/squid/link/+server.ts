// A save moving from the old squid app: link its device's board scores to
// this device's player (see #lib/server/squid.ts).
import { json } from '@sveltejs/kit';
import { PROFILE_COOKIE, setProfileCookie } from '#lib/server/profiles.ts';
import { linkSquid } from '#lib/server/squid.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const { device } = (await request.json().catch(() => ({}))) as { device?: unknown };
	if (typeof device !== 'string') return json({ linked: false });
	const id = await linkSquid(locals.db, device, cookies.get(PROFILE_COOKIE) ?? null);
	if (id) setProfileCookie(cookies, id);
	return json({ linked: !!id });
};
