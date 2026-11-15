-- Made-up data for the end-to-end tests.
INSERT INTO profile (id, name, colour, created_at) VALUES
	('p-sam', 'Sam', '#ff5a5f', '2026-11-01T00:00:00.000Z'),
	('p-kim', 'Kim', '#2ec4b6', '2026-11-01T00:00:00.000Z');
INSERT INTO best (game, profile_id, value, at) VALUES
	('stack', 'p-sam', 42, '2026-11-01T18:00:00.000Z'),
	('stack', 'p-kim', 17, '2026-11-02T18:00:00.000Z'),
	('race', 'p-kim', 71230, '2026-11-02T18:00:00.000Z');
