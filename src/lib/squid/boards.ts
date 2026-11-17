// Squid's two boards, from the games' score API: its best Challenge game and
// friends made in every game. Each time the start screen shows, it posts this
// device's scores (kept once the player's picked a name) and gets the boards.
import type { Player } from './progress.ts';

export type Row = { name: string; colour: string; value: number; me: boolean };
export type Boards = { best: Row[]; total: Row[] };

async function sync(board: string, value: number) {
	// Nothing to post yet: just look.
	const res = await fetch(
		`/api/scores/${board}`,
		value > 0
			? {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ value })
				}
			: {}
	);
	if (!res.ok) throw new Error(`${res.status}`);
	return ((await res.json()) as { rows: Row[] }).rows;
}

/** Posts the squid's scores and returns both boards, or null offline. */
export async function syncBoards(player: Player): Promise<Boards | null> {
	try {
		const [best, total] = await Promise.all([
			sync('squid', player.best),
			sync('squid-total', player.total)
		]);
		return { best, total };
	} catch {
		return null;
	}
}
