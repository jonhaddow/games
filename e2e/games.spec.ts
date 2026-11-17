import { expect, test } from '@playwright/test';
import { open } from './helpers.ts';

test('pick a name, post a score, see it on the board', async ({ page }) => {
	await open(page, '/');
	await expect(page.getByRole('link', { name: /Stack/ }).first()).toHaveAttribute('href', '/stack');
	await page.getByRole('link', { name: 'Pick a name' }).click();
	await page.getByLabel('Name').fill('  Alex  ');
	await page.getByText('#3a86ff').click();
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page).toHaveURL('/');
	await expect(page.getByRole('link', { name: 'Alex' })).toBeVisible();

	// What a game does at the end of a round.
	const res = await page.request.post('/api/scores/stack', { data: { value: 20 } });
	const body = (await res.json()) as { player: { name: string }; me: { rank: number } };
	expect(body.player.name).toBe('Alex');
	expect(body.me.rank).toBe(2);

	await open(page, '/');
	await expect(page.getByText('You: 20 blocks')).toBeVisible();
	await page.getByRole('link', { name: 'Tallest tower' }).click();
	await expect(page.locator('.rows li')).toHaveText([/Sam.*42/, /Alex.*20/, /Kim.*17/]);
	await expect(page.locator('.rows li.me')).toContainText('Alex');

	await page.getByRole('link', { name: 'Race', exact: true }).click();
	await expect(page.locator('.rows li')).toHaveText([/Kim.*1:11\.23/]);

	// Renaming changes every board.
	await page.getByRole('link', { name: 'Alex' }).click();
	await page.getByLabel('Name').fill('Lex');
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page).toHaveURL('/boards/race');
	await open(page, '/boards/stack');
	await expect(page.locator('.rows li.me')).toContainText('Lex');
});

test('scores need a name, and sane values', async ({ request }) => {
	const anon = await request.post('/api/scores/stack', { data: { value: 99 } });
	expect(((await anon.json()) as { player: null }).player).toBeNull();
	expect((await request.post('/api/scores/stack', { data: { value: -1 } })).status()).toBe(400);
	expect((await request.get('/api/scores/crops')).status()).toBe(404);
});

test('claim an existing player on another device', async ({ page }) => {
	await open(page, '/profile?back=/boards/stack');
	await page.getByRole('button', { name: 'That’s me: Kim' }).click();
	await expect(page).toHaveURL('/boards/stack');
	await expect(page.locator('.rows li.me')).toContainText('Kim');
});

test('every game leads back to the home screen the same way', async ({ page }) => {
	await page.setViewportSize({ width: 844, height: 390 }); // Squid wants landscape.
	for (const path of ['/stack', '/race', '/squid', '/crops']) {
		await open(page, path);
		await page.getByRole('link', { name: 'Games', exact: true }).click();
		await expect(page).toHaveURL('/');
	}
});
