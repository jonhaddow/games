import { describe, expect, it } from 'vitest';
import {
	E,
	N,
	S,
	W,
	flow,
	generate,
	levelFor,
	levelSize,
	rotate,
	turn,
	type Puzzle
} from './pipes.ts';
import { seeded } from '../random.ts';

/** Whether some way of turning the tiles gets water from the tap to the plant. */
function solvable(p: Puzzle) {
	const dirs = [
		{ bit: N, dx: 0, dy: -1, back: S },
		{ bit: E, dx: 1, dy: 0, back: W },
		{ bit: S, dx: 0, dy: 1, back: N },
		{ bit: W, dx: -1, dy: 0, back: E }
	];
	const seen = new Set<number>();
	const go = (x: number, y: number, from: number): boolean => {
		const i = y * p.cols + x;
		seen.add(i);
		let open = p.tiles[i].open;
		for (let k = 0; k < 4; k++, open = rotate(open)) {
			if (!(open & from)) continue;
			if (x === p.cols - 1 && y === p.endRow && open & E) return true;
			for (const d of dirs) {
				const nx = x + d.dx;
				const ny = y + d.dy;
				if (d.bit === from || !(open & d.bit)) continue;
				if (nx < 0 || ny < 0 || nx >= p.cols || ny >= p.rows || seen.has(ny * p.cols + nx))
					continue;
				if (go(nx, ny, d.back)) return true;
			}
		}
		seen.delete(i);
		return false;
	};
	return go(0, p.startRow, W);
}

describe('rotate', () => {
	it('turns openings a quarter clockwise', () => {
		expect(rotate(N)).toBe(E);
		expect(rotate(W)).toBe(N);
		expect(rotate(N | E)).toBe(E | S);
		expect(rotate(rotate(rotate(rotate(N | E | S))))).toBe(N | E | S);
	});
});

describe('flow', () => {
	it('follows connected pipes from the tap to the plant', () => {
		const p: Puzzle = {
			cols: 2,
			rows: 1,
			tiles: [
				{ open: W | E, turns: 0, home: W | E },
				{ open: W | E, turns: 0, home: W | E }
			],
			startRow: 0,
			endRow: 0
		};
		expect(flow(p).solved).toBe(true);
		expect([...flow(p).depth.values()]).toEqual([0, 1]);
		turn(p, 1);
		expect(flow(p).solved).toBe(false);
		expect(flow(p).depth.size).toBe(1);
	});
});

describe('generate', () => {
	it('grows with the level, up to a phone-sized grid', () => {
		expect(levelSize(1)).toEqual({ cols: 4, rows: 4 });
		expect(levelSize(100)).toEqual({ cols: 6, rows: 8 });
	});

	it('makes unsolved puzzles that can be solved', () => {
		for (let seed = 1; seed <= 200; seed++) {
			const p = generate(1 + (seed % 3), seeded(seed));
			expect(flow(p).solved).toBe(false);
			expect(p.tiles.every((t) => t.open && t.turns === 0)).toBe(true);
			expect(solvable(p)).toBe(true);
			for (const t of p.tiles) t.open = t.home;
			expect(flow(p).solved).toBe(true);
		}
	});

	it('is quick even on the biggest grids', () => {
		const t = performance.now();
		for (let seed = 1; seed <= 500; seed++) generate(20, seeded(seed));
		expect(performance.now() - t).toBeLessThan(2000);
	});

	it('repeats with the same seed', () => {
		expect(generate(5, seeded(7))).toEqual(generate(5, seeded(7)));
	});

	it('gives everyone the same level n', () => {
		expect(levelFor(3)).toEqual(levelFor(3));
		expect(levelFor(3)).not.toEqual(levelFor(4));
	});
});
