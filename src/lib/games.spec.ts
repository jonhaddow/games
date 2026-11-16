import { expect, it } from 'vitest';
import { lapTime } from './games.ts';

it('formats lap times', () => {
	expect(lapTime(75_456)).toBe('1:15.46');
	expect(lapTime(5_000)).toBe('0:05.00');
});
