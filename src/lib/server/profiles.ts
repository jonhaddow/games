import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { COLOURS, NAME_MAX } from '../games.ts';
import { profile } from './db/schema.ts';
import type { DB } from './db/index.ts';

export const PROFILE_COOKIE = 'games-profile';
const SITE = 'app.haddow.me';

export function findProfile(db: DB, id: string) {
	return db
		.select()
		.from(profile)
		.where(eq(profile.id, id))
		.then(([p]) => p ?? null);
}

/** A tidy name, or null if there's nothing left of it. */
export function cleanName(raw: unknown) {
	if (typeof raw !== 'string') return null;
	const name = raw.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim();
	return name || null;
}

/** Creates this device's profile, or updates it if it has one. Returns its id. */
export async function saveProfile(
	db: DB,
	id: string | null,
	name: string,
	colour: string,
	now = new Date()
) {
	if (!COLOURS.includes(colour)) colour = COLOURS[0];
	if (id && (await findProfile(db, id))) {
		await db.update(profile).set({ name, colour }).where(eq(profile.id, id));
		return id;
	}
	const fresh = crypto.randomUUID();
	await db.insert(profile).values({ id: fresh, name, colour, createdAt: now.toISOString() });
	return fresh;
}

/**
 * The profile cookie. On the live site it's shared by every *.app.haddow.me
 * game, which send it with their score requests (same site, so SameSite=Lax
 * allows it). HttpOnly: the games never need to read it.
 */
export function setProfileCookie(cookies: Cookies, id: string, host: string) {
	cookies.set(PROFILE_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 400 * 86_400,
		...(host.endsWith(`.${SITE}`) ? { domain: SITE } : {})
	});
}

/** Where to go after saving a profile: a path here, or another *.app.haddow.me game. */
export function safeReturn(value: unknown) {
	if (typeof value !== 'string') return '/';
	if (value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')) return value;
	try {
		const url = new URL(value);
		if (url.protocol === 'https:' && url.hostname.endsWith(`.${SITE}`)) return url.href;
	} catch {
		// Not a URL.
	}
	return '/';
}
