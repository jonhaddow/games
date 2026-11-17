import { expect, it } from 'vitest';
import { exportLink, importSave } from './handoff.ts';

function memory(items: Record<string, string> = {}) {
	const map = new Map(Object.entries(items));
	return {
		getItem: (k: string) => map.get(k) ?? null,
		setItem: (k: string, v: string) => void map.set(k, v),
		map
	};
}

const old = {
	'squid-spells-v1': JSON.stringify([{ best: 9, color: '#ff5fa2', hat: 'crown' }]),
	'squid-device': '0b6e1c62-5d1e-4c1a-9a3e-2f1d8c7b6a50',
	'squid-install-seen': '1',
	other: 'ignored'
};

it('moves the old save over and returns its device', () => {
	const store = memory();
	expect(importSave({ hash: exportLink(old) }, store)).toBe(old['squid-device']);
	expect(store.map.get('squid-spells-v1')).toBe(old['squid-spells-v1']);
	expect(store.map.get('squid-install-seen')).toBe('1');
	expect(store.map.has('other')).toBe(false);
});

it('keeps a save already here, but still links the device', () => {
	const store = memory({ 'squid-spells-v1': '[]' });
	expect(importSave({ hash: exportLink(old) }, store)).toBe(old['squid-device']);
	expect(store.map.get('squid-spells-v1')).toBe('[]');
});

it('ignores other links and bad data', () => {
	const store = memory();
	expect(importSave({ hash: '' }, store)).toBeNull();
	expect(importSave({ hash: '#import=!!' }, store)).toBeNull();
	expect(importSave({ hash: '#import=bm9wZQ' }, store)).toBeNull();
	expect(store.map.size).toBe(0);
});
