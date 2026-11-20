import type { DB } from '#lib/server/db/index.ts';
import type { Profile } from '#lib/server/db/schema.ts';
import type { Garden as GardenState } from '#lib/garden/garden.ts';
import type { Game as SquidGame } from '#lib/squid/game.ts';

// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	interface Window {
		/** Squid Spells' running game, for the end-to-end tests. */
		__squid?: SquidGame;
		/** Garden Defence's running game, in dev, for the end-to-end tests. */
		__garden?: {
			garden: GardenState;
			run(seconds: number): void;
			screenOf(lane: number, row: number): { x: number; y: number };
		};
	}
	namespace App {
		interface Locals {
			db: DB;
			/** This device's player, from the profile cookie, if they've picked a name. */
			profile: Profile | null;
		}
	}
}

export {};
