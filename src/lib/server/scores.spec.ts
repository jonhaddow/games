import { beforeEach, describe, expect, it } from 'vitest';
import { testDb } from './test-db.ts';
import { boardByKey, scoreKey } from '../games.ts';
import { myBests, standings, submit, validScore } from './scores.ts';
import { saveProfile } from './profiles.ts';
import type { DB } from './db/index.ts';

const stack = boardByKey('stack')!;
const race = boardByKey('race')!;
const slide = boardByKey('slide')!;

let db: DB;
let alex: string;
let sam: string;

beforeEach(async () => {
	db = await testDb();
	alex = await saveProfile(db, null, 'Alex', '#3a86ff');
	sam = await saveProfile(db, null, 'Sam', '#ff5a5f');
});

describe('submit', () => {
	it('keeps the highest score where higher is better', async () => {
		await submit(db, 'stack', stack, alex, 12);
		await submit(db, 'stack', stack, alex, 7);
		expect(await myBests(db, alex)).toEqual({ stack: 12 });
		await submit(db, 'stack', stack, alex, 20);
		expect(await myBests(db, alex)).toEqual({ stack: 20 });
	});

	it('keeps the lowest where lower is better', async () => {
		await submit(db, 'race', race, alex, 75_000);
		await submit(db, 'race', race, alex, 80_000);
		await submit(db, 'race', race, alex, 70_000);
		expect(await myBests(db, alex)).toEqual({ race: 70_000 });
	});
});

describe('standings', () => {
	it('ranks the board each way and marks the player', async () => {
		await submit(db, 'stack', stack, alex, 12);
		await submit(db, 'stack', stack, sam, 30);
		const s = await standings(db, stack, alex);
		expect(s.rows.map((r) => [r.name, r.value, r.me])).toEqual([
			['Sam', 30, false],
			['Alex', 12, true]
		]);
		expect(s.me).toEqual({ rank: 2, value: 12 });

		await submit(db, 'race', race, alex, 70_000);
		await submit(db, 'race', race, sam, 90_000);
		expect((await standings(db, race, sam)).me).toEqual({ rank: 2, value: 90_000 });
	});

	it('shows renamed players under their new name', async () => {
		await submit(db, 'stack', stack, alex, 12);
		await saveProfile(db, alex, 'Lex', '#ffffff');
		expect((await standings(db, stack, null)).rows[0]).toMatchObject({
			name: 'Lex',
			colour: '#ffffff',
			me: false
		});
	});
});

it('keeps a daily board for each day', async () => {
	await submit(db, 'slide:2000-01-01', slide, alex, 5);
	await submit(db, scoreKey(slide), slide, sam, 14);
	await submit(db, scoreKey(slide), slide, alex, 20);
	const s = await standings(db, slide, alex);
	expect(s.rows.map((r) => [r.name, r.value])).toEqual([
		['Sam', 14],
		['Alex', 20]
	]);
	expect(await myBests(db, alex)).toEqual({ slide: 20 });
});

it('accepts only sane whole scores', () => {
	expect(validScore(stack, 5)).toBe(true);
	expect(validScore(stack, 0)).toBe(false);
	expect(validScore(stack, 2.5)).toBe(false);
	expect(validScore(stack, '5')).toBe(false);
	expect(validScore(stack, 1e9)).toBe(false);
});
