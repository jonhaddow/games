import { expect, it } from 'vitest';
import { safeBack } from './forms.ts';

it('follows links within the app', () => {
	expect(safeBack('/boards/stack?x=1#y')).toBe('/boards/stack?x=1#y');
	expect(safeBack('/stack')).toBe('/stack');
});

it('refuses anywhere else', () => {
	for (const bad of ['//evil.example', '/\\evil.example', '/.//evil.example', 'evil.example', null])
		expect(safeBack(bad)).toBe('/');
});
