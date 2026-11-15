import { myBests } from '#lib/server/scores.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	bests: locals.profile ? await myBests(locals.db, locals.profile.id) : {},
	/** Handed to each game in its link, so it knows who's playing. */
	profileId: locals.profile?.id ?? null
});
