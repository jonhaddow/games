import { expect, test, type Page } from '@playwright/test';
import { open } from './helpers.ts';

/** Turns each tile until it's back how the puzzle was made, which solves it. */
async function solve(page: Page) {
	const tiles = page.locator('.tile');
	for (let i = 0; i < (await tiles.count()); i++) {
		const tile = tiles.nth(i);
		for (let k = 0; k < 4; k++) {
			if ((await page.locator('[data-phase=watered]').count()) > 0) return;
			if ((await tile.getAttribute('data-open')) === (await tile.getAttribute('data-home'))) break;
			await tile.click();
		}
	}
}

test('water plants level by level, and carry on later', async ({ page }) => {
	await page.clock.install();
	await open(page, '/profile?back=/pipes');
	await page.getByRole('button', { name: 'That’s me: Kim' }).click();
	await expect(page).toHaveURL('/pipes');
	await page.getByRole('button', { name: 'Play level 1' }).click();
	await expect(page.getByTestId('level')).toHaveText('1');

	await solve(page);
	await expect(page.getByLabel('Watered!')).toBeVisible();
	await page.clock.runFor(3000);
	await expect(page.getByTestId('level')).toHaveText('2');

	// No clock: it waits as long as it takes.
	await page.clock.runFor(600_000);
	await expect(page.getByTestId('level')).toHaveText('2');
	await page.getByRole('button', { name: 'Menu' }).click();
	await expect(page.getByTestId('cleared')).toHaveText('1 level done');

	await page.reload();
	await expect(page.getByRole('button', { name: 'Play level 2' })).toBeVisible();
	await page.getByRole('link', { name: 'Scores' }).click();
	await expect(page).toHaveURL('/boards/pipes');
	await expect(page.locator('.rows li.me')).toContainText(/Kim.*1 level/);
});
