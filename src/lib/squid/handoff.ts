// Moving a save from the old squid app (squid.app.haddow.me), whose storage
// this site can't read. Its last version sends each device here with its
// localStorage in the link: /squid#import=<base64url JSON of key → value>.

type Store = Pick<Storage, 'getItem' | 'setItem'>;

/** The old app's save and the id its board row was kept under. */
const SAVE = 'squid-spells-v1';
const DEVICE = 'squid-device';

/** Writes `items` into a link (the old app's side). */
export function exportLink(items: Record<string, string>) {
	const bytes = new TextEncoder().encode(JSON.stringify(items));
	return `#import=${btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '')}`;
}

/**
 * Takes in a save from the link, unless this device already has one here.
 * Returns the old device's id, to link its board scores, or null.
 */
export function importSave(location: Pick<Location, 'hash'>, store: Store): string | null {
	const match = /^#import=([\w-]+)$/.exec(location.hash);
	if (!match) return null;
	try {
		const b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
		const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
		const items = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
		if (store.getItem(SAVE) === null)
			for (const [key, value] of Object.entries(items))
				if (key.startsWith('squid-') && typeof value === 'string') store.setItem(key, value);
		return typeof items[DEVICE] === 'string' ? items[DEVICE] : null;
	} catch {
		return null;
	}
}
