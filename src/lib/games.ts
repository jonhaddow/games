// The games in this app. Shared with the browser, so no server code here.

export type Board = {
	/** Its scores' key in the database, and its page (/boards/<key>). */
	key: string;
	/** What the board ranks, e.g. "Tallest tower". */
	title: string;
	/** Which way is better. */
	order: 'high' | 'low';
	/** Sanity limits for a posted score (whole numbers). */
	max: number;
	format: (value: number) => string;
	/** A new board each day (see scoreKey). */
	daily?: boolean;
};

export type Game = {
	key: string;
	name: string;
	/** Its page in this app. */
	path: string;
	blurb: string;
	boards: Board[];
};

/** Milliseconds as m:ss.cc. */
export function lapTime(ms: number) {
	const cs = Math.round(ms / 10);
	const m = Math.floor(cs / 6000);
	const s = ((cs % 6000) / 100).toFixed(2).padStart(5, '0');
	return `${m}:${s}`;
}

/** Today's date where the family is, as YYYY-MM-DD. */
const london = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' });
export const today = (now = new Date()) => london.format(now);

/** Where a board's scores are kept: its key, or for a daily board, its key and today's date. */
export const scoreKey = (board: Board, now = new Date()) =>
	board.daily ? `${board.key}:${today(now)}` : board.key;

const friends = (n: number) => `${n} ${n === 1 ? 'friend' : 'friends'}`;

export const GAMES: Game[] = [
	{
		key: 'stack',
		name: 'Stack',
		path: '/stack',
		blurb: 'Drop the blocks, build the tower',
		boards: [
			{
				key: 'stack',
				title: 'Tallest tower',
				order: 'high',
				max: 10_000,
				format: (n) => `${n} ${n === 1 ? 'block' : 'blocks'}`
			}
		]
	},
	{
		key: 'race',
		name: 'Race',
		path: '/race',
		blurb: 'Motorbikes, ramps and big air',
		boards: [
			{
				key: 'race',
				title: 'Fastest lap',
				order: 'low',
				max: 60 * 60 * 1000,
				format: lapTime
			}
		]
	},
	{
		key: 'squid',
		name: 'Squid Spells',
		path: '/squid',
		blurb: 'Draw spells, make friends under the sea',
		boards: [
			{
				key: 'squid',
				title: 'Most friends in a Challenge',
				order: 'high',
				max: 1_000_000,
				format: friends
			}
		]
	},
	{
		key: 'crops',
		name: 'Crops',
		path: '/crops',
		blurb: 'Grow a little farm, and a village round it',
		boards: []
	},
	{
		key: 'pipes',
		name: 'Pipes',
		path: '/pipes',
		blurb: 'Turn the pipes, water the plant',
		boards: [
			{
				key: 'pipes',
				title: 'Most levels',
				order: 'high',
				max: 10_000,
				format: (n) => `${n} ${n === 1 ? 'level' : 'levels'}`
			}
		]
	},
	{
		key: 'slide',
		name: 'Slide Sort',
		path: '/slide',
		blurb: 'One colour puzzle a day',
		boards: [
			{
				key: 'slide',
				title: 'Fewest moves today',
				order: 'low',
				max: 9_999,
				format: (n) => `${n} ${n === 1 ? 'move' : 'moves'}`,
				daily: true
			}
		]
	},
	{
		key: 'robot',
		name: 'Robot Path',
		path: '/robot',
		blurb: 'Plan the moves, grab the gems',
		boards: [
			{
				key: 'robot',
				title: 'Most stars',
				order: 'high',
				max: 1_000_000,
				format: (n) => `${n} ${n === 1 ? 'star' : 'stars'}`
			}
		]
	}
];

/** Every board, with its game. */
export const BOARDS = GAMES.flatMap((game) => game.boards.map((board) => ({ ...board, game })));

export const boardByKey = (key: string) => BOARDS.find((b) => b.key === key);

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
