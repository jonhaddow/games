// The score API the games call from their own sites (see cors.ts):
// GET a game's board, POST a finished game's score. Both answer with the board
// and the player ({ player: null } when this device hasn't picked a name).
import { error, json } from '@sveltejs/kit';
import { byKey } from '#lib/games.ts';
import { cors } from '#lib/server/cors.ts';
import { standings, submit, validScore } from '#lib/server/scores.ts';
import type { RequestEvent, RequestHandler } from './$types';

function boardFor(game: string) {
	const board = byKey(game)?.board;
	if (!board) error(404, 'No such board');
	return board;
}

async function reply({ params, locals, request }: RequestEvent) {
	const board = boardFor(params.game);
	const p = locals.profile;
	return json(
		{
			player: p && { name: p.name, colour: p.colour },
			...(await standings(locals.db, params.game, board, p?.id ?? null))
		},
		{ headers: cors(request) }
	);
}

export const GET: RequestHandler = reply;

export const POST: RequestHandler = async (event) => {
	const { params, locals, request } = event;
	const board = boardFor(params.game);
	const { value } = (await request.json().catch(() => ({}))) as { value?: unknown };
	if (!validScore(board, value)) error(400, 'Bad score');
	if (locals.profile) await submit(locals.db, params.game, board, locals.profile.id, value);
	return reply(event);
};

export const OPTIONS: RequestHandler = ({ request }) =>
	new Response(null, { status: 204, headers: cors(request) });
