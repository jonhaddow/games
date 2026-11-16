import { expect, test, type Page } from '@playwright/test';
import { open } from './helpers.ts';

async function playUntilOver(page: Page) {
	const game = page.locator('.game');
	await game.click();
	await expect(page.getByTestId('height')).toHaveText('0');
	// The first block starts off the left edge, so dropping at once still lands partly on.
	await game.click();
	await expect(page.getByTestId('height')).toHaveText('1');
	// Keep tapping until a block misses (each lands on less tower than the last).
	await expect(async () => {
		await game.click();
		await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible({ timeout: 200 });
	}).toPass({ timeout: 20_000 });
}

test('before picking a name, the best stays on the device', async ({ page }) => {
	await open(page, '/');
	await page.getByRole('link', { name: /Stack/ }).first().click();
	await expect(page.getByRole('heading', { name: 'Stack' })).toBeVisible();
	await playUntilOver(page);
	await expect(page.getByText(/New best!/)).toBeVisible();
	await page.getByRole('link', { name: 'Pick a name for the board' }).click();
	await expect(page).toHaveURL('/profile?back=/stack');
});

test('with a name, a finished game goes on the board', async ({ page }) => {
	await open(page, '/profile?back=/stack');
	await page.getByRole('button', { name: 'That’s me: Kim' }).click();
	await expect(page).toHaveURL('/stack');
	await expect(page.getByText('Best 17')).toBeVisible();
	await playUntilOver(page);
	await page.getByRole('link', { name: 'Scores' }).click();
	await expect(page).toHaveURL('/boards/stack');
	await expect(page.locator('.rows li.me')).toContainText('Kim');
});

test('a best from before the name was picked goes on the board', async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('stack-best', '50'));
	await open(page, '/profile?back=/stack');
	await page.getByRole('button', { name: 'That’s me: Sam' }).click();
	await expect(page).toHaveURL('/stack');
	await expect(page.getByText('Best 50')).toBeVisible();
	await open(page, '/boards/stack');
	await expect(page.locator('.rows li').first()).toContainText(/Sam.*50/);
});
