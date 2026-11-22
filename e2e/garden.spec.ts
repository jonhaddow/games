import { expect, test, type Page } from '@playwright/test';
import { open } from './helpers.ts';

const garden = (page: Page) => page.evaluate(() => window.__garden!.garden);

async function tapCell(page: Page, col: number, row: number) {
	const at = await page.evaluate(([c, r]) => window.__garden!.screenOf(c, r), [col, row]);
	await page.mouse.click(at.x, at.y);
}

test('plant beside the path, see off a wave, and the waves go on the board', async ({ page }) => {
	await open(page, '/profile?back=/garden');
	await page.getByRole('button', { name: 'That’s me: Kim' }).click();
	await expect(page).toHaveURL('/garden');
	await page.getByRole('button', { name: 'Play' }).click();

	// A pea pod costs 5 of the 12 coins to start, and only goes on the grass.
	await page.getByRole('button', { name: 'Pea Pod' }).click();
	await tapCell(page, 1, 1);
	await tapCell(page, 2, 1);
	await expect(page.getByTestId('coins')).toHaveText('🪙 7');
	expect((await garden(page)).plants).toMatchObject([{ kind: 'pea', col: 2, row: 1, level: 1 }]);
	// A melon waits for wave 2.
	await expect(page.getByRole('button', { name: 'Melon' })).toBeDisabled();

	// Tap it to upgrade it.
	await tapCell(page, 2, 1);
	await page.getByRole('button', { name: /Upgrade/ }).click();
	await expect(page.getByTestId('coins')).toHaveText('🪙 2');
	expect((await garden(page)).plants[0].level).toBe(2);
	await page.getByRole('button', { name: 'Close' }).click();

	// More pea pods along the path see off wave 1.
	await page.evaluate(() => {
		const g = window.__garden!.garden;
		for (const [col, row] of [
			[0, 1],
			[2, 3],
			[4, 3],
			[6, 3],
			[4, 4]
		]) {
			g.plants.push({ id: 900 + col * 10 + row, kind: 'pea', col, row, level: 3, hp: 0, timer: 0 });
		}
	});
	await page.getByRole('button', { name: 'Start wave 1' }).click();
	await expect(page.getByText('Here they come!')).toBeVisible();
	await page.evaluate(() => {
		for (let t = 0; t < 120 && window.__garden!.garden.cleared === 0; t++) window.__garden!.run(1);
	});
	await expect(page.getByTestId('wave')).toHaveText('2');
	await expect(page.getByRole('button', { name: 'Melon' })).toBeEnabled();
	expect((await garden(page)).coins).toBeGreaterThan(2);

	// Then with no plants, the zombies get in.
	await page.evaluate(() => (window.__garden!.garden.plants = []));
	await page.getByRole('button', { name: 'Start wave 2' }).click();
	await page.evaluate(() => window.__garden!.run(200));
	await expect(page.getByText('The zombies got in!')).toBeVisible();
	await expect(page.getByTestId('score')).toHaveText('1');

	await open(page, '/boards/garden');
	await expect(page.locator('.rows li.me')).toContainText(/Kim.*1 wave/);
});
