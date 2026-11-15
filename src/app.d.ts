import type { DB } from '#lib/server/db/index.ts';
import type { Profile } from '#lib/server/db/schema.ts';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			db: DB;
			/** This device's player, from the profile cookie, if they've picked a name. */
			profile: Profile | null;
		}
	}
}

export {};
