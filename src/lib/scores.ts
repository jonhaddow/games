// Posting a game's score from the browser (see /api/scores/[game]).

/**
 * Sends a score for the player on this device; the board keeps their better
 * one. Returns where they stand, or null without a name (or offline).
 */
export async function postScore(game: string, value: number) {
	try {
		const res = await fetch(`/api/scores/${game}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ value })
		});
		if (!res.ok) return null;
		return ((await res.json()) as { me: { rank: number; value: number } | null }).me;
	} catch {
		return null;
	}
}
