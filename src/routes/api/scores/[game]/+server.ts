// The score API the games call from their own sites (see cors.ts):
// GET a game's board, POST a finished game's score. The player is named by the
// x-games-profile header. Both answer with the board and the player
// ({ player: null } without a known one).
import { error, json } from '@sveltejs/kit';
import { byKey } from '#lib/games.ts';
import { cors } from '#lib/server/cors.ts';
import { PROFILE_HEADER, findProfile } from '#lib/server/profiles.ts';
import { standings, submit, validScore } from '#lib/server/scores.ts';
import type { RequestEvent, RequestHandler } from './$types';

function boardFor(game: string) {
	const board = byKey(game)?.board;
	if (!board) error(404, 'No such board');
	return board;
}

function player({ request, locals }: RequestEvent) {
	const id = request.headers.get(PROFILE_HEADER);
	return id ? findProfile(locals.db, id) : null;
}

async function reply(event: RequestEvent, p: Awaited<ReturnType<typeof player>>) {
	const { params, locals, request } = event;
	const board = boardFor(params.game);
	return json(
		{
			player: p && { name: p.name, colour: p.colour },
			...(await standings(locals.db, params.game, board, p?.id ?? null))
		},
		{ headers: cors(request) }
	);
}

export const GET: RequestHandler = async (event) => reply(event, await player(event));

export const POST: RequestHandler = async (event) => {
	const { params, locals, request } = event;
	const board = boardFor(params.game);
	const { value } = (await request.json().catch(() => ({}))) as { value?: unknown };
	if (!validScore(board, value)) error(400, 'Bad score');
	const p = await player(event);
	if (p) await submit(locals.db, params.game, board, p.id, value);
	return reply(event, p);
};

export const OPTIONS: RequestHandler = ({ request }) =>
	new Response(null, { status: 204, headers: cors(request) });
