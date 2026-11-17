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

test('water a plant, then run out of time', async ({ page }) => {
	await page.clock.install();
	await open(page, '/profile?back=/pipes');
	await page.getByRole('button', { name: 'That’s me: Kim' }).click();
	await expect(page).toHaveURL('/pipes');
	await page.getByRole('button', { name: 'Start' }).click();
	await expect(page.getByTestId('level')).toHaveText('1');

	await solve(page);
	await expect(page.getByLabel('Watered!')).toBeVisible();
	await page.clock.runFor(3000);
	await expect(page.getByTestId('level')).toHaveText('2');

	await page.clock.runFor(120_000);
	await expect(page.getByText('Time’s up!')).toBeVisible();
	await expect(page.getByRole('heading', { name: '1' })).toBeVisible();
	await expect(page.getByText('New best!')).toBeVisible();
	await page.getByRole('link', { name: 'Scores' }).click();
	await expect(page).toHaveURL('/boards/pipes');
	await expect(page.locator('.rows li.me')).toContainText(/Kim.*1 level/);
});
