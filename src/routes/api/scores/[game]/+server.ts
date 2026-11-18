// The games' score API: GET a game's board, POST a finished game's score.
// Both answer with the board and the player ({ player: null } before this
// device has picked a name; the score isn't kept then).
import { error, json } from '@sveltejs/kit';
import { boardByKey, scoreKey } from '#lib/games.ts';
import { standings, submit, validScore } from '#lib/server/scores.ts';
import type { RequestEvent, RequestHandler } from './$types';

function boardFor(game: string) {
	const board = boardByKey(game);
	if (!board) error(404, 'No such board');
	return board;
}

async function reply({ params, locals }: RequestEvent) {
	const p = locals.profile;
	return json({
		player: p && { name: p.name, colour: p.colour },
		...(await standings(locals.db, boardFor(params.game), p?.id ?? null))
	});
}

export const GET: RequestHandler = reply;

export const POST: RequestHandler = async (event) => {
	const { params, locals, request } = event;
	const board = boardFor(params.game);
	const { value } = (await request.json().catch(() => ({}))) as { value?: unknown };
	if (!validScore(board, value)) error(400, 'Bad score');
	if (locals.profile) await submit(locals.db, scoreKey(board), board, locals.profile.id, value);
	return reply(event);
};
