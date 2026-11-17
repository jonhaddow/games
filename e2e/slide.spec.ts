import { expect, test, type Page } from '@playwright/test';
import { open } from './helpers.ts';
import { today } from '../src/lib/games.ts';
import { SIZE, puzzleFor, type Move } from '../src/lib/slide/slide.ts';

/** Swipes one row or column a place along. */
async function swipe(page: Page, { line, index, dir }: Move) {
	const box = (await page.locator('.board').boundingBox())!;
	const cell = box.width / SIZE;
	const x = box.x + (line === 'row' ? 2 : index) * cell + cell / 2;
	const y = box.y + (line === 'row' ? index : 2) * cell + cell / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(
		x + (line === 'row' ? dir * cell : 0),
		y + (line === 'col' ? dir * cell : 0),
		{
			steps: 5
		}
	);
	await page.mouse.up();
}

test('sort today’s puzzle and go on today’s board', async ({ page }) => {
	await open(page, '/profile?back=/slide');
	await page.getByRole('button', { name: 'That’s me: Sam' }).click();
	await expect(page).toHaveURL('/slide');

	// A wasted move, then undoing how the puzzle was mixed up.
	const first: Move = { line: 'row', index: 0, dir: 1 };
	await swipe(page, first);
	await swipe(page, { ...first, dir: -1 });
	await expect(page.getByTestId('moves')).toHaveText('2');
	const { mix } = puzzleFor(today());
	for (const m of mix.toReversed()) await swipe(page, { ...m, dir: m.dir === 1 ? -1 : 1 });

	const moves = mix.length + 2;
	await expect(page.getByRole('heading', { name: `Sorted in ${moves} moves!` })).toBeVisible();
	await page.getByRole('link', { name: 'Scores' }).first().click();
	await expect(page).toHaveURL('/boards/slide');
	await expect(page.locator('.rows li.me')).toContainText(new RegExp(`Sam.*${moves} moves`));
	await open(page, '/');
	await expect(page.getByText(`You: ${moves} moves`)).toBeVisible();
});
