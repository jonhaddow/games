import { expect, it } from 'vitest';
import { testDb } from './test-db.ts';
import {
	cleanName,
	findProfile,
	listProfiles,
	safeReturn,
	saveProfile,
	withProfile
} from './profiles.ts';

it('tidies names', () => {
	expect(cleanName('  Big   Al  ')).toBe('Big Al');
	expect(cleanName('   ')).toBeNull();
	expect(cleanName(3)).toBeNull();
	expect(cleanName('x'.repeat(50))).toHaveLength(20);
});

it('creates a profile, then updates the same one', async () => {
	const db = await testDb();
	const id = await saveProfile(db, null, 'Alex', '#3a86ff');
	expect(await saveProfile(db, id, 'Lex', 'not-a-colour')).toBe(id);
	expect(await findProfile(db, id)).toMatchObject({ name: 'Lex', colour: '#ff5a5f' });
	// A stale cookie gets a fresh profile.
	expect(await saveProfile(db, 'gone', 'Sam', '#ffffff')).not.toBe('gone');
});

it('only returns to this app or another of ours', () => {
	expect(safeReturn('/boards/stack')).toBe('/boards/stack');
	expect(safeReturn('https://stack.app.haddow.me/scores')).toBe(
		'https://stack.app.haddow.me/scores'
	);
	expect(safeReturn('https://evil.example')).toBe('/');
	expect(safeReturn('https://app.haddow.me.evil.example')).toBe('/');
	expect(safeReturn('http://stack.app.haddow.me')).toBe('/');
	expect(safeReturn('//evil.example')).toBe('/');
	expect(safeReturn(null)).toBe('/');
});

it('hands games the player in the link back', () => {
	expect(withProfile('https://stack.app.haddow.me/', 'abc')).toBe(
		'https://stack.app.haddow.me/#profile=abc'
	);
	expect(withProfile('/boards/stack', 'abc')).toBe('/boards/stack');
});

it('lists everyone by name, to claim', async () => {
	const db = await testDb();
	await saveProfile(db, null, 'Sam', '#ffffff');
	await saveProfile(db, null, 'Alex', '#ffffff');
	expect((await listProfiles(db)).map((p) => p.name)).toEqual(['Alex', 'Sam']);
});
