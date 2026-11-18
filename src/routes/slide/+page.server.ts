import { myBests } from '#lib/server/scores.ts';
import type { PageServerLoad } from './$types';

/** Today's fewest moves, as the board is daily. */
export const load: PageServerLoad = async ({ locals }) => ({
	best: locals.profile ? ((await myBests(locals.db, locals.profile.id)).slide ?? null) : null
});
