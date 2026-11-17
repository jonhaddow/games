import { error } from '@sveltejs/kit';
import { boardByKey } from '#lib/games.ts';
import { standings } from '#lib/server/scores.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const board = boardByKey(params.game);
	if (!board) error(404, 'No such board');
	return {
		game: params.game,
		...(await standings(locals.db, board, locals.profile?.id ?? null))
	};
};
