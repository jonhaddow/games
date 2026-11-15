import { fail, redirect } from '@sveltejs/kit';
import { COLOURS } from '#lib/games.ts';
import {
	PROFILE_COOKIE,
	cleanName,
	findProfile,
	listProfiles,
	safeReturn,
	saveProfile,
	setProfileCookie,
	withProfile
} from '#lib/server/profiles.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => ({
	back: safeReturn(url.searchParams.get('back')),
	others: (await listProfiles(locals.db)).filter((p) => p.id !== locals.profile?.id)
});

/** Remembers the player here and goes back, handing a game the id. */
function done(
	cookies: Parameters<Actions[string]>[0]['cookies'],
	id: string,
	back: unknown
): never {
	setProfileCookie(cookies, id);
	const to = withProfile(safeReturn(back), id);
	redirect(303, to, to.startsWith('/') ? undefined : { external: [new URL(to).origin] });
}

export const actions: Actions = {
	save: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const name = cleanName(form.get('name'));
		const colour = String(form.get('colour') ?? COLOURS[0]);
		if (!name) return fail(400, { error: 'Type a name first.' });
		const id = await saveProfile(locals.db, cookies.get(PROFILE_COOKIE) ?? null, name, colour);
		done(cookies, id, form.get('back'));
	},
	// "That's me": the same player on another device or app.
	claim: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const p = await findProfile(locals.db, String(form.get('id')));
		if (!p) return fail(400, { error: 'That player’s gone.' });
		done(cookies, p.id, form.get('back'));
	}
};
