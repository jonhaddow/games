import { fail, redirect } from '@sveltejs/kit';
import { COLOURS } from '#lib/games.ts';
import {
	PROFILE_COOKIE,
	cleanName,
	safeReturn,
	saveProfile,
	setProfileCookie
} from '#lib/server/profiles.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => ({
	back: safeReturn(url.searchParams.get('back'))
});

export const actions: Actions = {
	default: async ({ request, cookies, locals, url }) => {
		const form = await request.formData();
		const name = cleanName(form.get('name'));
		const colour = String(form.get('colour') ?? COLOURS[0]);
		if (!name) return fail(400, { error: 'Type a name first.' });
		const id = await saveProfile(locals.db, cookies.get(PROFILE_COOKIE) ?? null, name, colour);
		setProfileCookie(cookies, id, url.hostname);
		const back = safeReturn(form.get('back'));
		redirect(303, back, back.startsWith('/') ? undefined : { external: [new URL(back).origin] });
	}
};
