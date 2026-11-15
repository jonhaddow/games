// The games the launcher knows about. Shared with the browser, so no server code here.

export type Board = {
	/** What the board ranks, e.g. "Tallest tower". */
	title: string;
	/** Which way is better. */
	order: 'high' | 'low';
	/** Sanity limits for a posted score (whole numbers). */
	max: number;
	format: (value: number) => string;
};

export type Game = {
	key: string;
	name: string;
	url: string;
	blurb: string;
	board?: Board;
};

/** Milliseconds as m:ss.cc, the way race shows lap times. */
export function lapTime(ms: number) {
	const cs = Math.round(ms / 10);
	const m = Math.floor(cs / 6000);
	const s = ((cs % 6000) / 100).toFixed(2).padStart(5, '0');
	return `${m}:${s}`;
}

const app = (name: string) => `https://${name}.app.haddow.me`;

export const GAMES: Game[] = [
	{
		key: 'stack',
		name: 'Stack',
		url: app('stack'),
		blurb: 'Drop the blocks, build the tower',
		board: {
			title: 'Tallest tower',
			order: 'high',
			max: 10_000,
			format: (n) => `${n} ${n === 1 ? 'block' : 'blocks'}`
		}
	},
	{
		key: 'race',
		name: 'Race',
		url: app('race'),
		blurb: 'Motorbikes, ramps and big air',
		board: {
			title: 'Fastest lap',
			order: 'low',
			max: 60 * 60 * 1000,
			format: lapTime
		}
	},
	{
		key: 'squid',
		name: 'Squid Spells',
		url: app('squid'),
		blurb: 'Draw spells, make sea friends',
		board: {
			title: 'Most friends',
			order: 'high',
			max: 100_000,
			format: (n) => `${n} ${n === 1 ? 'friend' : 'friends'}`
		}
	},
	{
		key: 'crops',
		name: 'Crops',
		url: app('crops'),
		blurb: 'Farm, fish and ride round the village'
	}
];

export const byKey = (key: string) => GAMES.find((g) => g.key === key);

/** Profile colours: bold, and each readable with black text on it. */
export const COLOURS = [
	'#ff5a5f',
	'#ff9f1c',
	'#2ec4b6',
	'#3a86ff',
	'#b388ff',
	'#ff70a6',
	'#70e000',
	'#ffffff'
];

export const NAME_MAX = 20;
