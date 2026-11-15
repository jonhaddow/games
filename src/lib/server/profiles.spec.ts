import { expect, it } from 'vitest';
import { testDb } from './test-db.ts';
import { cleanName, findProfile, safeReturn, saveProfile } from './profiles.ts';

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

it('formats lap times the way race does', async () => {
	const { lapTime } = await import('../games.ts');
	expect(lapTime(75_456)).toBe('1:15.46');
	expect(lapTime(5_000)).toBe('0:05.00');
});
