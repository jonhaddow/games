// Slide Sort: the rules. A square grid of coloured tiles; swiping a row or column
// slides it one place, the tile pushed off one end coming back on the other. It's
// sorted when every row is one colour, or every column is. One puzzle a day, the
// same for everyone. Pure, so it's unit tested.

import { seeded } from '../random.ts';

export const SIZE = 5;
/** How many random slides mix up the day's puzzle (so it can always be done in this many: par). */
export const PAR = 12;

/** Colour index per cell, row-major. */
export type Grid = number[];

export type Move = { line: 'row' | 'col'; index: number; dir: 1 | -1 };

/** The tiles in a row (or column), as indexes into the grid. */
const cells = (line: Move['line'], index: number) =>
	Array.from({ length: SIZE }, (_, k) => (line === 'row' ? index * SIZE + k : k * SIZE + index));

/** The grid after a slide: dir 1 moves tiles right (or down), -1 left (or up). */
export function slide(grid: Grid, { line, index, dir }: Move): Grid {
	const at = cells(line, index);
	const next = [...grid];
	at.forEach((cell, k) => {
		next[at[(k + dir + SIZE) % SIZE]] = grid[cell];
	});
	return next;
}

export function sorted(grid: Grid) {
	const uniform = (line: Move['line']) =>
		Array.from({ length: SIZE }, (_, i) => cells(line, i)).every((at) =>
			at.every((c) => grid[c] === grid[at[0]])
		);
	return uniform('row') || uniform('col');
}

const same = (a: Grid, b: Grid) => a.every((v, i) => v === b[i]);

/** A number for a day ("2026-11-17"), to seed its puzzle. */
const daySeed = (day: string) =>
	[...day].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261);

/**
 * The day's puzzle: sorted rows, mixed up by PAR random slides (each one
 * changing something). Also gives the slides, so tests can undo them.
 */
export function puzzleFor(day: string): { grid: Grid; mix: Move[] } {
	const rand = seeded(daySeed(day));
	const solved: Grid = Array.from({ length: SIZE * SIZE }, (_, i) => Math.floor(i / SIZE));
	for (;;) {
		let grid = solved;
		let last: Move | null = null;
		const mix: Move[] = [];
		for (let k = 0; k < PAR; k++) {
			let move: Move;
			do {
				move = {
					line: rand() < 0.5 ? 'row' : 'col',
					index: Math.floor(rand() * SIZE),
					dir: rand() < 0.5 ? 1 : -1
				};
				// Undoing the last slide, or one that changes nothing, doesn't mix it up.
			} while (
				(last && move.line === last.line && move.index === last.index && move.dir !== last.dir) ||
				same(slide(grid, move), grid)
			);
			grid = slide(grid, move);
			mix.push(move);
			last = move;
		}
		if (!sorted(grid)) return { grid, mix };
	}
}
