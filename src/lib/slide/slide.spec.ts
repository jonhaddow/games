import { describe, expect, it } from 'vitest';
import { PAR, SIZE, puzzleFor, slide, sorted, type Grid } from './slide.ts';

const rows: Grid = Array.from({ length: SIZE * SIZE }, (_, i) => Math.floor(i / SIZE));
const cols: Grid = Array.from({ length: SIZE * SIZE }, (_, i) => i % SIZE);

describe('slide', () => {
	it('moves a row along, wrapping round', () => {
		const g = slide(cols, { line: 'row', index: 0, dir: 1 });
		expect(g.slice(0, SIZE)).toEqual([4, 0, 1, 2, 3]);
		expect(g.slice(SIZE)).toEqual(cols.slice(SIZE));
		expect(slide(g, { line: 'row', index: 0, dir: -1 })).toEqual(cols);
	});

	it('moves a column up and down', () => {
		const g = slide(rows, { line: 'col', index: 2, dir: -1 });
		expect([0, 1, 2, 3, 4].map((r) => g[r * SIZE + 2])).toEqual([1, 2, 3, 4, 0]);
		expect(slide(g, { line: 'col', index: 2, dir: 1 })).toEqual(rows);
	});
});

describe('sorted', () => {
	it('takes rows or columns of one colour', () => {
		expect(sorted(rows)).toBe(true);
		expect(sorted(cols)).toBe(true);
		expect(sorted(slide(rows, { line: 'col', index: 0, dir: 1 }))).toBe(false);
	});
});

describe('puzzleFor', () => {
	it('is the same all day, different the next, and mixed up', () => {
		expect(puzzleFor('2026-11-17')).toEqual(puzzleFor('2026-11-17'));
		expect(puzzleFor('2026-11-17')).not.toEqual(puzzleFor('2026-11-18'));
		for (let d = 1; d <= 28; d++) {
			const { grid: g, mix } = puzzleFor(`2026-02-${String(d).padStart(2, '0')}`);
			expect(sorted(g)).toBe(false);
			expect(mix).toHaveLength(PAR);
			// Par is always enough: undoing the mix sorts it.
			const undone = mix.reduceRight(
				(acc, m) => slide(acc, { ...m, dir: m.dir === 1 ? -1 : 1 }),
				g
			);
			expect(sorted(undone)).toBe(true);
			// Still five of each colour.
			for (let c = 0; c < SIZE; c++) expect(g.filter((v) => v === c)).toHaveLength(SIZE);
		}
	});
});
