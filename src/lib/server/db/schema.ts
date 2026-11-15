import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Times are ISO timestamps.

/**
 * A player: a name and colour picked on one device, no sign-in. The id is a
 * random token in a cookie shared by every *.app.haddow.me game.
 */
export const profile = sqliteTable('profile', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	colour: text('colour').notNull(),
	createdAt: text('created_at').notNull()
});

export type Profile = typeof profile.$inferSelect;

/** Each player's best in each game (see GAMES for which way is better). */
export const best = sqliteTable(
	'best',
	{
		game: text('game').notNull(),
		profileId: text('profile_id')
			.notNull()
			.references(() => profile.id, { onDelete: 'cascade' }),
		value: integer('value').notNull(),
		at: text('at').notNull()
	},
	(t) => [
		primaryKey({ columns: [t.game, t.profileId] }),
		index('best_game_idx').on(t.game, t.value)
	]
);
