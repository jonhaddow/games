import { and, asc, desc, eq, gt, lt, sql } from 'drizzle-orm';
import { BOARDS, scoreKey, type Board } from '../games.ts';
import { best, profile } from './db/schema.ts';
import type { DB } from './db/index.ts';

export const TOP = 20;

export type Row = { name: string; colour: string; value: number; me: boolean };

/** Whether a posted score is a sane whole number for this board. */
export function validScore(board: Board, value: unknown): value is number {
	return Number.isInteger(value) && (value as number) > 0 && (value as number) <= board.max;
}

/** Keeps the player's best for a game: higher or lower, as the board says. */
export async function submit(
	db: DB,
	game: string,
	board: Board,
	profileId: string,
	value: number,
	now = new Date()
) {
	const better =
		board.order === 'high'
			? sql`excluded.value > ${best.value}`
			: sql`excluded.value < ${best.value}`;
	await db
		.insert(best)
		.values({ game, profileId, value, at: now.toISOString() })
		.onConflictDoUpdate({
			target: [best.game, best.profileId],
			set: {
				value: sql`iif(${better}, excluded.value, ${best.value})`,
				at: sql`iif(${better}, excluded.at, ${best.at})`
			}
		});
}

/** The top of a board (today's, if it's daily), and where this player stands if they're on it. */
export async function standings(db: DB, board: Board, profileId: string | null) {
	const game = scoreKey(board);
	const high = board.order === 'high';
	const rows = await db
		.select({ name: profile.name, colour: profile.colour, value: best.value, id: best.profileId })
		.from(best)
		.innerJoin(profile, eq(best.profileId, profile.id))
		.where(eq(best.game, game))
		.orderBy(high ? desc(best.value) : asc(best.value), best.at)
		.limit(TOP);

	let me: { rank: number; value: number } | null = null;
	if (profileId) {
		const [mine] = await db
			.select({ value: best.value, at: best.at })
			.from(best)
			.where(and(eq(best.game, game), eq(best.profileId, profileId)));
		if (mine) {
			const [{ ahead }] = await db
				.select({ ahead: sql<number>`count(*)` })
				.from(best)
				.where(
					and(eq(best.game, game), high ? gt(best.value, mine.value) : lt(best.value, mine.value))
				);
			me = { rank: ahead + 1, value: mine.value };
		}
	}

	return {
		rows: rows.map(({ id, ...r }): Row => ({ ...r, me: id === profileId })),
		me
	};
}

/** This player's best on every board (today's, for a daily one), by board key. */
export async function myBests(db: DB, profileId: string) {
	const rows = await db
		.select({ game: best.game, value: best.value })
		.from(best)
		.where(eq(best.profileId, profileId));
	const mine = new Map(rows.map((r) => [r.game, r.value]));
	return Object.fromEntries(
		BOARDS.flatMap((b) => {
			const value = mine.get(scoreKey(b));
			return value === undefined ? [] : [[b.key, value]];
		})
	);
}
