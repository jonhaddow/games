-- Made-up data for the end-to-end tests.
INSERT INTO profile (id, name, colour, created_at) VALUES
	('p-sam', 'Sam', '#ff5a5f', '2026-11-01T00:00:00.000Z'),
	('p-kim', 'Kim', '#2ec4b6', '2026-11-01T00:00:00.000Z');
INSERT INTO best (game, profile_id, value, at) VALUES
	('stack', 'p-sam', 42, '2026-11-01T18:00:00.000Z'),
	('stack', 'p-kim', 17, '2026-11-02T18:00:00.000Z'),
	('race', 'p-kim', 71230, '2026-11-02T18:00:00.000Z');
-- Squid Spells: Sam's boards, and a squid from the old app's board waiting to be linked.
INSERT INTO profile (id, name, colour, created_at) VALUES
	('squid:0b6e1c62-5d1e-4c1a-9a3e-2f1d8c7b6a50', 'Squiddy', '#b388ff', '2026-11-01T00:00:00.000Z');
INSERT INTO best (game, profile_id, value, at) VALUES
	('squid', 'p-sam', 20, '2026-11-01T18:00:00.000Z'),
	('squid-total', 'p-sam', 30, '2026-11-01T18:00:00.000Z'),
	('squid', 'squid:0b6e1c62-5d1e-4c1a-9a3e-2f1d8c7b6a50', 9, '2026-11-01T18:00:00.000Z'),
	('squid-total', 'squid:0b6e1c62-5d1e-4c1a-9a3e-2f1d8c7b6a50', 40, '2026-11-01T18:00:00.000Z');
