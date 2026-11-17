import { describe, expect, it } from 'vitest';
import { levelFor, roll, run, solve, starsFor, type Level } from './robot.ts';

// . . #
// R . G
// . . .
const level: Level = { cols: 3, rows: 3, rocks: [2], start: 3, gems: [5], par: 1 };

describe('roll', () => {
	it('goes until a rock or the edge', () => {
		expect(roll(level, 3, 'right')).toEqual([4, 5]);
		expect(roll(level, 4, 'up')).toEqual([1]);
		expect(roll(level, 5, 'up')).toEqual([]);
		expect(roll(level, 3, 'left')).toEqual([]);
	});
});

describe('run', () => {
	it('follows the arrows and picks up gems on the way', () => {
		expect(run(level, ['right'])).toEqual({ path: [3, 4, 5], solved: true });
		expect(run(level, ['up', 'right'])).toEqual({ path: [3, 0, 1], solved: false });
	});
});

describe('solve', () => {
	it('finds the fewest arrows, or null', () => {
		expect(solve(level)).toBe(1);
		expect(solve({ ...level, gems: [5, 8] })).toBe(2);
		// A gem walled in by rocks.
		expect(solve({ cols: 3, rows: 1, rocks: [1], start: 0, gems: [2] })).toBeNull();
	});
});

describe('levelFor', () => {
	it('is the same level every time, and can be done in par', () => {
		expect(levelFor(4)).toEqual(levelFor(4));
		for (let n = 1; n <= 40; n++) {
			const l = levelFor(n);
			expect(solve(l)).toBe(l.par);
			expect(new Set([...l.rocks, l.start, ...l.gems]).size).toBe(
				l.rocks.length + 1 + l.gems.length
			);
		}
	});

	it('gets harder', () => {
		expect(levelFor(1).par).toBeLessThan(levelFor(12).par);
		expect(levelFor(12).gems.length).toBe(3);
	});
});

it('gives stars by how close to par', () => {
	const l = { ...level, par: 4 };
	expect([3, 4, 5, 6, 7].map((n) => starsFor(l, n))).toEqual([3, 3, 2, 2, 1]);
});
