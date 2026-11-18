// Squid's board, from the games' score API: most friends in one Challenge
// game. Each time the start screen shows, it posts this device's best (kept
// once the player's picked a name) and gets the board.

export type Row = { name: string; colour: string; value: number; me: boolean };

/** Posts the squid's best and returns the board, or null offline. */
export async function syncBoard(best: number): Promise<Row[] | null> {
	try {
		// Nothing to post yet: just look.
		const res = await fetch(
			'/api/scores/squid',
			best > 0
				? {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ value: best })
					}
				: {}
		);
		if (!res.ok) return null;
		return ((await res.json()) as { rows: Row[] }).rows;
	} catch {
		return null;
	}
}
