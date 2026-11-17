// Robot Path: the rules. Plan a list of arrows, then press Go: for each arrow the
// robot rolls that way until it bumps into a rock or the edge, picking up every
// gem it rolls over. Get them all in as few arrows as you can. Level n is the
// same for everyone. Pure, so it's unit tested.

import { seeded } from '../random.ts';

export type Dir = 'up' | 'right' | 'down' | 'left';
export const DIRS: Dir[] = ['up', 'right', 'down', 'left'];
const STEP: Record<Dir, { dx: number; dy: number }> = {
	up: { dx: 0, dy: -1 },
	right: { dx: 1, dy: 0 },
	down: { dx: 0, dy: 1 },
	left: { dx: -1, dy: 0 }
};

export type Level = {
	cols: number;
	rows: number;
	/** Cells (row-major) with a rock in. */
	rocks: number[];
	start: number;
	gems: number[];
	/** The fewest arrows that get every gem. */
	par: number;
};

/** The cells the robot rolls through going one way from a cell, ending where it stops. */
export function roll(level: Level, from: number, dir: Dir) {
	const { dx, dy } = STEP[dir];
	const cells: number[] = [];
	let x = from % level.cols;
	let y = Math.floor(from / level.cols);
	for (;;) {
		const nx = x + dx;
		const ny = y + dy;
		if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows) break;
		if (level.rocks.includes(ny * level.cols + nx)) break;
		x = nx;
		y = ny;
		cells.push(y * level.cols + x);
	}
	return cells;
}

/** Runs a program: every cell the robot passes through in order, and whether it got all the gems. */
export function run(level: Level, program: Dir[]) {
	const path = [level.start];
	const left = new Set(level.gems);
	for (const dir of program) {
		for (const cell of roll(level, path[path.length - 1], dir)) {
			path.push(cell);
			left.delete(cell);
		}
	}
	return { path, solved: left.size === 0 };
}

/** The fewest arrows that get every gem, or null if it can't be done. */
export function solve(level: Omit<Level, 'par'>) {
	const all = (1 << level.gems.length) - 1;
	const lvl = { ...level, par: 0 };
	const key = (cell: number, got: number) => cell * 64 + got;
	const seen = new Set([key(level.start, 0)]);
	let frontier = [{ cell: level.start, got: 0 }];
	for (let moves = 1; frontier.length && moves <= 20; moves++) {
		const next: typeof frontier = [];
		for (const { cell, got } of frontier) {
			for (const dir of DIRS) {
				const cells = roll(lvl, cell, dir);
				if (!cells.length) continue;
				let g = got;
				for (const c of cells) {
					const i = level.gems.indexOf(c);
					if (i >= 0) g |= 1 << i;
				}
				if (g === all) return moves;
				const end = cells[cells.length - 1];
				if (seen.has(key(end, g))) continue;
				seen.add(key(end, g));
				next.push({ cell: end, got: g });
			}
		}
		frontier = next;
	}
	return null;
}

/** How big level n is, how many gems it has and the par it aims for. */
export function levelShape(n: number) {
	return {
		cols: Math.min(5 + Math.floor(n / 4), 7),
		rows: Math.min(6 + Math.floor(n / 3), 9),
		gems: n < 3 ? 1 : n < 8 ? 2 : 3,
		par: Math.min(2 + Math.floor(n / 2), 9)
	};
}

/** Level n (1 up): the same for everyone, as it's seeded from n. */
export function levelFor(n: number): Level {
	const rand = seeded(n * 7919 + 13);
	const shape = levelShape(n);
	const size = shape.cols * shape.rows;
	// Try until a layout's par is right for the level; fall back on the nearest.
	let nearest: Level | null = null;
	for (let tries = 0; tries < 400; tries++) {
		const free = Array.from({ length: size }, (_, i) => i);
		const take = () => free.splice(Math.floor(rand() * free.length), 1)[0];
		const rocks = Array.from({ length: Math.round(size * (0.14 + rand() * 0.1)) }, take);
		const start = take();
		const gems = Array.from({ length: shape.gems }, take);
		const par = solve({ ...shape, rocks, start, gems });
		if (par === null || par < 2) continue;
		const level = { cols: shape.cols, rows: shape.rows, rocks, start, gems, par };
		if (par === shape.par) return level;
		if (!nearest || Math.abs(par - shape.par) < Math.abs(nearest.par - shape.par)) nearest = level;
	}
	return nearest!;
}

/** Stars for a solve: 3 on par (or better), 2 within two arrows of it, else 1. */
export const starsFor = (level: Level, arrows: number) =>
	arrows <= level.par ? 3 : arrows <= level.par + 2 ? 2 : 1;

/** The most arrows a program can have. */
export const MAX_ARROWS = 14;
