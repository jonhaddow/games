import type { Cookies } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { COLOURS, NAME_MAX } from '../games.ts';
import { profile } from './db/schema.ts';
import type { DB } from './db/index.ts';

export const PROFILE_COOKIE = 'games-profile';
/** How a game names its player to the score API (see the api route). */
export const PROFILE_HEADER = 'x-games-profile';
const SITE = 'app.haddow.me';

export function findProfile(db: DB, id: string) {
	return db
		.select()
		.from(profile)
		.where(eq(profile.id, id))
		.then(([p]) => p ?? null);
}

/** Everyone who's picked a name, to claim one on another device or app. */
export function listProfiles(db: DB) {
	return db
		.select({ id: profile.id, name: profile.name, colour: profile.colour })
		.from(profile)
		.orderBy(asc(profile.name));
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
 * The launcher's own profile cookie. Games don't use it: on iOS every
 * home-screen app has its own cookies, so each game keeps the id itself,
 * handed over in the link back (`withProfile`).
 */
export function setProfileCookie(cookies: Cookies, id: string) {
	cookies.set(PROFILE_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 400 * 86_400
	});
}

/** A link to a game that hands it the player's id (in the hash, so it's never sent to a server). */
export function withProfile(url: string, id: string) {
	if (url.startsWith('/')) return url;
	const u = new URL(url);
	u.hash = `profile=${id}`;
	return u.href;
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
