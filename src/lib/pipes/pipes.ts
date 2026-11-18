// Pipes: the rules. A grid of pipe tiles; tap one to turn it a quarter clockwise.
// Water comes in from the tap on the left of the start tile and has to reach the
// plant on the right of the end tile. Pure, so it's unit tested.

/** Openings as bits: north, east, south, west (clockwise, so rotating is a shift). */
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

export type Tile = {
	open: number;
	/** Quarter turns the player has given it. */
	turns: number;
	/** Its openings when the puzzle was made, before mixing up: the answer (for tests). */
	home: number;
};

export type Puzzle = {
	cols: number;
	rows: number;
	/** Row-major, cols × rows. */
	tiles: Tile[];
	/** The row of the start tile (column 0, tap to its left) and of the end tile (last column, plant to its right). */
	startRow: number;
	endRow: number;
};

const STEPS = [
	{ bit: N, dx: 0, dy: -1, back: S },
	{ bit: E, dx: 1, dy: 0, back: W },
	{ bit: S, dx: 0, dy: 1, back: N },
	{ bit: W, dx: -1, dy: 0, back: E }
];

/** A tile's openings turned a quarter clockwise. */
export const rotate = (open: number) => ((open << 1) | (open >> 3)) & 15;

/** The size of the puzzle for a level (1 up). */
export function levelSize(level: number) {
	return {
		cols: Math.min(3 + Math.floor((level + 1) / 2), 6),
		rows: Math.min(4 + Math.floor(level / 2), 8)
	};
}

/** Seconds on the clock at the start of a run, and added for each level cleared. */
export const START_TIME = 40;
export const levelBonus = (level: number) => 10 + Math.min(level, 10) * 2;

const pick = <T>(xs: T[], rand: () => number) => xs[Math.floor(rand() * xs.length)];

/** A winding path from the left column to the right one that never crosses itself. */
function path(cols: number, rows: number, rand: () => number) {
	const start = Math.floor(rand() * rows);
	const seen = new Set<number>();
	const route: number[] = [];
	// Depth first, trying moves in a random order (right a little more often), so
	// it wanders but always gets there.
	const walk = (x: number, y: number): boolean => {
		const i = y * cols + x;
		seen.add(i);
		route.push(i);
		// Long enough to be a puzzle: don't stop at the first touch of the right side.
		if (x === cols - 1 && route.length >= cols + rows / 2) return true;
		const moves = STEPS.map((s) => ({ s, key: rand() + (s.bit === E ? 0.25 : 0) })).sort(
			(a, b) => b.key - a.key
		);
		for (const { s } of moves) {
			const nx = x + s.dx;
			const ny = y + s.dy;
			if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen.has(ny * cols + nx)) continue;
			if (walk(nx, ny)) return true;
		}
		route.pop();
		return false;
	};
	if (!walk(0, start)) {
		// Every route that's long enough is boxed in (it happens on small grids): go straight across.
		route.length = 0;
		for (let x = 0; x < cols; x++) route.push(start * cols + x);
	}
	return { start, route };
}

/** A new puzzle for a level, with every tile turned at random (and not already solved). */
export function generate(level: number, rand: () => number = Math.random): Puzzle {
	const { cols, rows } = levelSize(level);
	const { start, route } = path(cols, rows, rand);
	const open = new Array<number>(cols * rows).fill(0);
	// Each step of the route opens the two tiles towards each other.
	open[route[0]] |= W;
	for (let k = 0; k + 1 < route.length; k++) {
		const a = route[k];
		const b = route[k + 1];
		const step = STEPS.find((s) => a + s.dx + s.dy * cols === b)!;
		open[a] |= step.bit;
		open[b] |= step.back;
	}
	const end = route[route.length - 1];
	open[end] |= E;
	// Everything else is a decoy: straights, bends and the odd T.
	const decoys = [N | S, N | E, N | E, N | E | S];
	for (let i = 0; i < open.length; i++) if (!open[i]) open[i] = pick(decoys, rand);

	const puzzle: Puzzle = {
		cols,
		rows,
		tiles: open.map((o) => ({ open: o, turns: 0, home: o })),
		startRow: start,
		endRow: Math.floor(end / cols)
	};
	do {
		for (const t of puzzle.tiles) {
			const n = Math.floor(rand() * 4);
			for (let k = 0; k < n; k++) t.open = rotate(t.open);
		}
	} while (flow(puzzle).solved);
	return puzzle;
}

/** Turns a tile a quarter clockwise (in place). */
export function turn(puzzle: Puzzle, i: number) {
	const t = puzzle.tiles[i];
	t.open = rotate(t.open);
	t.turns++;
}

/**
 * Where the water gets to: each wet tile's distance (in tiles) from the tap, and
 * whether it reaches the plant.
 */
export function flow(puzzle: Puzzle) {
	const { cols, rows, tiles } = puzzle;
	const depth = new Map<number, number>();
	const first = puzzle.startRow * cols;
	if (!(tiles[first].open & W)) return { depth, solved: false };
	depth.set(first, 0);
	const queue = [first];
	while (queue.length) {
		const i = queue.shift()!;
		const x = i % cols;
		const y = Math.floor(i / cols);
		for (const s of STEPS) {
			if (!(tiles[i].open & s.bit)) continue;
			const nx = x + s.dx;
			const ny = y + s.dy;
			if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
			const j = ny * cols + nx;
			if (depth.has(j) || !(tiles[j].open & s.back)) continue;
			depth.set(j, depth.get(i)! + 1);
			queue.push(j);
		}
	}
	const last = puzzle.endRow * cols + cols - 1;
	return { depth, solved: depth.has(last) && !!(tiles[last].open & E) };
}
