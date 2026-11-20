import { expect, test, type Page } from '@playwright/test';
import { open } from './helpers.ts';

const garden = (page: Page) => page.evaluate(() => window.__garden!.garden);

async function tapCell(page: Page, lane: number, row: number) {
	const at = await page.evaluate(([l, r]) => window.__garden!.screenOf(l, r), [lane, row]);
	await page.mouse.click(at.x, at.y);
}

test('plant tomatoes, see off a wave, and the waves go on the board', async ({ page }) => {
	await open(page, '/profile?back=/garden');
	await page.getByRole('button', { name: 'That’s me: Kim' }).click();
	await expect(page).toHaveURL('/garden');
	await page.getByRole('button', { name: 'Play' }).click();

	// A tomato costs 4 of the 6 honey to start.
	await page.getByRole('button', { name: 'Tomato' }).click();
	await tapCell(page, 2, 6);
	await expect(page.getByTestId('honey')).toHaveText('🍯 2');
	expect((await garden(page)).plants).toMatchObject([{ kind: 'tomato', lane: 2, row: 6 }]);
	// A pumpkin waits for wave 2.
	await expect(page.getByRole('button', { name: 'Pumpkin' })).toBeDisabled();

	// A tomato in every lane sees off wave 1.
	await page.evaluate(() => {
		const g = window.__garden!.garden;
		for (const lane of [0, 1, 3, 4]) {
			g.plants.push({ id: 900 + lane, kind: 'tomato', lane, row: 6, hp: 8, timer: 0 });
		}
		for (let t = 0; t < 60 && !g.cleared; t++) window.__garden!.run(1);
	});
	await expect(page.getByTestId('wave')).toHaveText('2');
	await expect(page.getByRole('button', { name: 'Pumpkin' })).toBeEnabled();

	// Then with no plants, the zombies get in.
	await page.evaluate(() => {
		window.__garden!.garden.plants = [];
		window.__garden!.run(200);
	});
	await expect(page.getByText('The zombies got in!')).toBeVisible();
	await expect(page.getByTestId('score')).toHaveText('1');

	await open(page, '/boards/garden');
	await expect(page.locator('.rows li.me')).toContainText(/Kim.*1 wave/);
});
