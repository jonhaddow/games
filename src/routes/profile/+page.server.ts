import { fail, redirect, type Cookies } from '@sveltejs/kit';
import { safeBack } from '#lib/server/forms.ts';
import { COLOURS } from '#lib/games.ts';
import {
	PROFILE_COOKIE,
	cleanName,
	findProfile,
	listProfiles,
	saveProfile,
	setProfileCookie
} from '#lib/server/profiles.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => ({
	back: safeBack(url.searchParams.get('back')),
	others: (await listProfiles(locals.db)).filter((p) => p.id !== locals.profile?.id)
});

/** Remembers the player on this device and goes back. */
function done(cookies: Cookies, id: string, back: FormDataEntryValue | null): never {
	setProfileCookie(cookies, id);
	redirect(303, safeBack(back));
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
