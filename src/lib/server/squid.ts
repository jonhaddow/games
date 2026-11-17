// Squid Spells came from its own app (squid.app.haddow.me), where the board
// had a row per device. Each row became a profile with the id `squid:<device>`
// (scripts/squid-import.ts). When a device's save moves here, its squid
// profile joins this device's player: taken over if there isn't one, merged
// into them if there is.
import { eq } from 'drizzle-orm';
import { boardByKey } from '../games.ts';
import { best, profile } from './db/schema.ts';
import { findProfile } from './profiles.ts';
import { submit } from './scores.ts';
import type { DB } from './db/index.ts';

export const squidProfileId = (device: string) => `squid:${device}`;

/**
 * Links an old squid device to this device's player. Returns the profile this
 * device should now use, or null if there's nothing to link.
 */
export async function linkSquid(db: DB, device: string, current: string | null) {
	if (!/^[\w-]{16,64}$/.test(device)) return null;
	const id = squidProfileId(device);
	if (id === current || !(await findProfile(db, id))) return null;
	if (!current || !(await findProfile(db, current))) return id;
	// Already a player here: their squid scores join them, keeping the better.
	const rows = await db.select().from(best).where(eq(best.profileId, id));
	for (const row of rows) {
		const board = boardByKey(row.game);
		if (board) await submit(db, row.game, board, current, row.value, new Date(row.at));
	}
	await db.delete(profile).where(eq(profile.id, id));
	return current;
}
