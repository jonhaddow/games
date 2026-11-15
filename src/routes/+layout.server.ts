import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	player: locals.profile && { name: locals.profile.name, colour: locals.profile.colour }
});
