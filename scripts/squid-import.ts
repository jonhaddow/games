// One-off: copies the old Squid Spells board (D1 `squid`, a row per device)
// into games. Each device becomes a profile `squid:<device>`, with its best
// Challenge game and its friends in all games; the colour is the nearest
// profile colour. When a device opens the old app, its save moves here and
// that profile joins the device's player (src/lib/server/squid.ts).
//
//   node scripts/squid-import.ts            prints the SQL
//   node scripts/squid-import.ts --apply    runs it on the live games database
//
// Needs CLOUDFLARE_API_TOKEN. Safe to run again: it only adds what's missing.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { COLOURS } from '../src/lib/games.ts';

type Row = {
	device: string;
	name: string;
	color: string;
	best: number;
	total: number;
	updated_at: number;
};

function wrangler(...args: string[]) {
	return execFileSync('npx', ['wrangler', ...args], { encoding: 'utf8' });
}

const [{ results }] = JSON.parse(
	wrangler('d1', 'execute', 'squid', '--remote', '--json', '--command', 'SELECT * FROM scores')
) as [{ results: Row[] }];

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function nearest(hex: string) {
	const [r, g, b] = rgb(hex);
	const dist = (c: string) => {
		const [r2, g2, b2] = rgb(c);
		return (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
	};
	return COLOURS.reduce((a, c) => (dist(c) < dist(a) ? c : a));
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const lines = results.flatMap((row) => {
	const id = q(`squid:${row.device}`);
	const at = q(new Date(row.updated_at).toISOString());
	const name = q(row.name.trim() || 'Squid');
	const out = [
		`INSERT OR IGNORE INTO profile (id, name, colour, created_at) VALUES (${id}, ${name}, ${q(nearest(row.color))}, ${at});`
	];
	for (const [game, value] of [
		['squid', row.best],
		['squid-total', row.total]
	] as const)
		if (value > 0)
			out.push(
				`INSERT OR IGNORE INTO best (game, profile_id, value, at) VALUES (${q(game)}, ${id}, ${value}, ${at});`
			);
	return out;
});

const sql = lines.join('\n') + '\n';
if (!process.argv.includes('--apply')) process.stdout.write(sql);
else {
	const file = '.wrangler/squid-import.sql';
	writeFileSync(file, sql);
	process.stdout.write(wrangler('d1', 'execute', 'games', '--remote', '--file', file));
	console.log(`${results.length} squids copied.`);
}
