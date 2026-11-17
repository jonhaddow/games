import { beforeEach, expect, it } from 'vitest';
import { testDb } from './test-db.ts';
import { boardByKey } from '../games.ts';
import { best, profile } from './db/schema.ts';
import { findProfile, saveProfile } from './profiles.ts';
import { myBests, submit } from './scores.ts';
import { linkSquid, squidProfileId } from './squid.ts';
import type { DB } from './db/index.ts';

const DEVICE = '0b6e1c62-5d1e-4c1a-9a3e-2f1d8c7b6a50';
const old = squidProfileId(DEVICE);
let db: DB;

beforeEach(async () => {
	db = await testDb();
	await db
		.insert(profile)
		.values({ id: old, name: 'Squiddy', colour: '#b388ff', createdAt: '2026-01-01T00:00:00Z' });
	await db.insert(best).values([
		{ game: 'squid', profileId: old, value: 9, at: '2026-01-02T00:00:00Z' },
		{ game: 'squid-total', profileId: old, value: 40, at: '2026-01-02T00:00:00Z' }
	]);
});

it('hands the squid profile to a device without a player', async () => {
	expect(await linkSquid(db, DEVICE, null)).toBe(old);
	expect(await linkSquid(db, DEVICE, 'gone')).toBe(old);
});

it('merges it into the player already here, keeping the better scores', async () => {
	const me = await saveProfile(db, null, 'Jon', '#3a86ff');
	await submit(db, 'squid', boardByKey('squid')!, me, 12);
	expect(await linkSquid(db, DEVICE, me)).toBe(me);
	expect(await myBests(db, me)).toEqual({ squid: 12, 'squid-total': 40 });
	expect(await findProfile(db, old)).toBeNull();
});

it('does nothing for an unknown device or one already linked', async () => {
	expect(await linkSquid(db, 'f'.repeat(32), null)).toBeNull();
	expect(await linkSquid(db, 'not ok', null)).toBeNull();
	expect(await linkSquid(db, DEVICE, old)).toBeNull();
});
