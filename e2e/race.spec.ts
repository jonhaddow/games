import { devices, expect, test } from '@playwright/test';

// Race is played sideways, and its software-rendered 3D is slow under test.
test.use({ viewport: devices['Pixel 7 landscape'].viewport });
test.setTimeout(60_000);

test('starts a race, counts down and rides off with the gas held', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto('/race');
	const start = page.getByRole('button', { name: 'Start race' });
	// three.js loads after the page, then the button turns on.
	await expect(start).toBeEnabled({ timeout: 30_000 });
	await start.tap();

	await expect(page.getByTestId('lap')).toContainText('1/3');
	await expect(page.getByTestId('position')).toContainText('4/4');
	// No motion sensor here, so the steering buttons stand in for tilt.
	await expect(page.getByRole('button', { name: 'Steer left' })).toBeVisible();

	await page.getByRole('button', { name: 'Gas' }).dispatchEvent('pointerdown');
	await expect(page.getByTestId('speed')).not.toContainText(/^0km/, { timeout: 35_000 });

	await page.getByRole('button', { name: 'Pause' }).click();
	await page.getByRole('button', { name: 'Quit' }).click();
	await expect(start).toBeVisible();
	expect(errors).toEqual([]);
});

test('sends the best lap on the device to the leaderboard', async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('race:best-lap', '65.5'));
	await page.goto('/profile?back=/race');
	await page.getByRole('button', { name: 'That’s me: Sam' }).click();
	await expect(page).toHaveURL('/race');
	// Faster than Kim's 1:11.23 in the fixtures.
	await expect(page.getByRole('link', { name: 'Leaderboard · you’re 1st' })).toBeVisible();
	await page.getByRole('link', { name: /Leaderboard/ }).click();
	await expect(page.locator('.rows li').first()).toContainText(/Sam.*1:05\.50/);
});

test('before a name is picked, it offers one', async ({ page }) => {
	await page.goto('/race');
	await page.getByRole('link', { name: 'Pick a name for the leaderboard' }).click();
	await expect(page).toHaveURL('/profile?back=/race');
});
