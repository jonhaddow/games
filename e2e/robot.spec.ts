import { expect, test, type Page } from '@playwright/test';
import { open } from './helpers.ts';
import { DIRS, levelFor, run, type Dir } from '../src/lib/robot/robot.ts';

/** The arrows that solve level n in par, found by trying them all. */
function answer(n: number) {
	const level = levelFor(n);
	const find = (program: Dir[]): Dir[] | null => {
		if (program.length === level.par) return run(level, program).solved ? program : null;
		for (const dir of DIRS) {
			const found = find([...program, dir]);
			if (found) return found;
		}
		return null;
	};
	return find([])!;
}

async function enter(page: Page, program: Dir[]) {
	for (const dir of program) await page.getByRole('button', { name: dir, exact: true }).click();
	await page.getByRole('button', { name: 'Go' }).click();
}

test('a miss sends the robot back; a solve earns stars for the board', async ({ page }) => {
	await open(page, '/profile?back=/robot');
	await page.getByRole('button', { name: 'That’s me: Kim' }).click();
	await expect(page).toHaveURL('/robot');
	await page.getByRole('button', { name: 'Play level 1' }).click();

	// Some arrow that leaves the gem behind.
	const level = levelFor(1);
	const wrong = DIRS.find((d) => !run(level, [d]).solved)!;
	await enter(page, [wrong]);
	await expect(page.getByText('Missed a gem!')).toBeVisible();

	await page.getByRole('button', { name: 'Undo' }).click();
	await enter(page, answer(1));
	await expect(page.getByText('Perfect: that’s par!')).toBeVisible();
	await page.getByRole('button', { name: 'Next level' }).click();
	await expect(page.getByTestId('level')).toHaveText('2');

	await open(page, '/boards/robot');
	await expect(page.locator('.rows li.me')).toContainText(/Kim.*3 stars/);
	await open(page, '/robot');
	await expect(page.getByTestId('total')).toHaveText('★ 3');
	await expect(page.getByRole('button', { name: 'Play level 2' })).toBeVisible();
});
