import { error } from '@sveltejs/kit';
import { byKey } from '#lib/games.ts';
import { standings } from '#lib/server/scores.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const board = byKey(params.game)?.board;
	if (!board) error(404, 'No such board');
	return {
		game: params.game,
		...(await standings(locals.db, params.game, board, locals.profile?.id ?? null))
	};
};
