// Garden Defence's rules: pure, no drawing, so they can be unit tested.
//
// The garden is COLS columns wide and ROWS rows deep, and a dirt path winds
// through it from the hedge at the top to the house at the bottom. Zombies walk
// along the path. Before each wave you spend coins on plants: shooters go on the
// grass beside the path, and walls and traps go on the path itself. Positions
// are in cells: (x, y) is a point, and the cell (col, row) fills col to col + 1.
// Everything moves on `step(state, dt)`, dt in seconds.

export const COLS = 7;
export const ROWS = 10;
export const HEARTS = 5;
export const START_COINS = 12;
/** Coins for seeing off wave n. */
export const waveReward = (n: number) => 6 + n;
/** Upgrades top out at this level. */
export const MAX_LEVEL = 3;

/**
 * The path, cell by cell, from just above the hedge to just below the porch.
 * The first and last cells are off the lawn: zombies walk in and out through them.
 */
export const PATH: readonly (readonly [number, number])[] = (() => {
	const corners: [number, number][] = [
		[1, -1],
		[1, 2],
		[5, 2],
		[5, 5],
		[1, 5],
		[1, 8],
		[4, 8],
		[4, ROWS]
	];
	const cells: [number, number][] = [corners[0]];
	for (let i = 1; i < corners.length; i++) {
		const [tx, ty] = corners[i];
		let [x, y] = cells[cells.length - 1];
		while (x !== tx || y !== ty) {
			x += Math.sign(tx - x);
			y += Math.sign(ty - y);
			cells.push([x, y]);
		}
	}
	return cells;
})();
/** Where on the path each lawn cell is (its index in PATH), if it's path. */
const PATH_INDEX = new Map(PATH.map(([x, y], i) => [`${x},${y}`, i]));
const pathIndex = (col: number, row: number) => PATH_INDEX.get(`${col},${row}`);
export const onPath = (col: number, row: number) => PATH_INDEX.has(`${col},${row}`);
/** A zombie past this far along the path has got to the house. */
export const PATH_END = PATH.length - 1.4;
/** The column where the path meets the house. */
export const HOUSE = PATH[PATH.length - 1][0];

/** The point `d` cells along the path, from the middle of its first cell. */
export function pointAt(d: number) {
	const i = Math.max(0, Math.min(PATH.length - 2, Math.floor(d)));
	const f = d - i;
	const [ax, ay] = PATH[i];
	const [bx, by] = PATH[i + 1];
	return { x: ax + 0.5 + (bx - ax) * f, y: ay + 0.5 + (by - ay) * f };
}

export type PlantKind = 'pea' | 'pumpkin' | 'melon' | 'mud' | 'frost' | 'sprinkler' | 'sunflower';
export type ZombieKind = 'walker' | 'bucket' | 'runner' | 'big';

type PlantInfo = {
	name: string;
	about: string;
	cost: number;
	/** The first wave it can be planted before. */
	from: number;
	/** On the path (walls and traps), or beside it (shooters). */
	path: boolean;
	/** Shooters: reach in cells, seconds between shots, and damage. */
	range?: number;
	every?: number;
	damage?: number;
	/** A wall's health. */
	hp?: number;
	/** How much it slows (speed multiplied by this), and for how long once hit. */
	slow?: number;
	slowFor?: number;
	/** Splash: everything this close to where a shot lands is hit. */
	splash?: number;
};

export const PLANTS: Record<PlantKind, PlantInfo> = {
	pea: {
		name: 'Pea Pod',
		about: 'Quick little peas',
		cost: 5,
		from: 1,
		path: false,
		range: 2.2,
		every: 0.6,
		damage: 1
	},
	pumpkin: {
		name: 'Pumpkin',
		about: 'A wall on the path',
		cost: 4,
		from: 1,
		path: true,
		hp: 30
	},
	melon: {
		name: 'Melon',
		about: 'Lobs melons that splash',
		cost: 8,
		from: 2,
		path: false,
		range: 2.8,
		every: 2,
		damage: 4,
		splash: 0.9
	},
	mud: {
		name: 'Mud',
		about: 'A sticky puddle on the path',
		cost: 4,
		from: 3,
		path: true,
		slow: 0.45
	},
	frost: {
		name: 'Frost Mint',
		about: 'Icy shots slow zombies',
		cost: 7,
		from: 4,
		path: false,
		range: 2.4,
		every: 0.9,
		damage: 1,
		slow: 0.5,
		slowFor: 2
	},
	sprinkler: {
		name: 'Sprinkler',
		about: 'Soaks everyone close by',
		cost: 8,
		from: 5,
		path: false,
		range: 1.6,
		every: 1.2,
		damage: 2,
		slow: 0.75,
		slowFor: 1
	},
	sunflower: {
		name: 'Sunflower',
		about: 'Big seeds, very far',
		cost: 12,
		from: 6,
		path: false,
		range: 5,
		every: 2,
		damage: 10
	}
};
export const PLANT_KINDS = Object.keys(PLANTS) as PlantKind[];

type ZombieInfo = { hp: number; speed: number; bite: number };
/** Speed in cells a second, bite in damage a second. */
export const ZOMBIES: Record<ZombieKind, ZombieInfo> = {
	walker: { hp: 10, speed: 0.6, bite: 3 },
	bucket: { hp: 26, speed: 0.55, bite: 3 },
	runner: { hp: 7, speed: 1.1, bite: 3 },
	big: { hp: 80, speed: 0.38, bite: 8 }
};

export const SHOT_SPEED = 7;
/** How close a zombie gets to a wall before it stops to munch. */
const REACH = 0.6;

/** Each level up adds 60% of the first level's power. */
const power = (level: number) => 1 + 0.6 * (level - 1);
/** A plant's reach at its level. */
export const rangeOf = (p: Pick<Plant, 'kind' | 'level'>) =>
	(PLANTS[p.kind].range ?? 0) + 0.3 * (p.level - 1);
export const damageOf = (p: Pick<Plant, 'kind' | 'level'>) =>
	(PLANTS[p.kind].damage ?? 0) * power(p.level);
export const maxHpOf = (p: Pick<Plant, 'kind' | 'level'>) =>
	(PLANTS[p.kind].hp ?? 0) * power(p.level);
/** Mud gets stickier as it levels up. */
const mudSlow = (level: number) => PLANTS.mud.slow! ** (1 + 0.4 * (level - 1));
/** What the next level costs, or null at the top. */
export const upgradeCost = (p: Pick<Plant, 'kind' | 'level'>) =>
	p.level >= MAX_LEVEL ? null : PLANTS[p.kind].cost * p.level;
/** Selling gives back half of all that's been spent on it. */
export const sellValue = (p: Pick<Plant, 'kind' | 'level'>) => {
	// Level n costs cost × (n - 1) on top of the last.
	const spent = PLANTS[p.kind].cost * (1 + (p.level * (p.level - 1)) / 2);
	return Math.floor(spent / 2);
};

export type Plant = {
	id: number;
	kind: PlantKind;
	col: number;
	row: number;
	level: number;
	/** Walls: health left (others ignore it). */
	hp: number;
	/** Counts down to its next shot. */
	timer: number;
};

export type Zombie = {
	id: number;
	kind: ZombieKind;
	/** How far along the path it is, in cells. */
	d: number;
	hp: number;
	maxHp: number;
	/** Slowed to this (1 is full speed) for `slowFor` more seconds. */
	slow: number;
	slowFor: number;
	/** Munching a wall this step (for drawing). */
	eating: boolean;
	/** Seconds since it was last hit (for a flash). */
	hit: number;
};

/** A shot flying at a zombie. */
export type Shot = {
	id: number;
	kind: PlantKind;
	x: number;
	y: number;
	target: number;
	level: number;
};

/** Things that happened in a step, for sounds and puffs. */
export type GardenEvent =
	| { type: 'sleep'; x: number; y: number; kind: ZombieKind }
	| { type: 'splash'; x: number; y: number; r: number; kind: PlantKind }
	| { type: 'eaten'; col: number; row: number }
	| { type: 'heart' }
	| { type: 'wave'; wave: number }
	| { type: 'cleared'; wave: number; coins: number };

export type Spawn = { at: number; kind: ZombieKind };

export type Garden = {
	coins: number;
	hearts: number;
	/** The wave being played, or about to be. */
	wave: number;
	/** Waves seen off: the score. */
	cleared: number;
	/** Between waves: planting, upgrading and selling. */
	building: boolean;
	/** The wave's clock. */
	waveTime: number;
	queue: Spawn[];
	plants: Plant[];
	zombies: Zombie[];
	shots: Shot[];
	events: GardenEvent[];
	over: boolean;
	seed: number;
	nextId: number;
};

/** A small seeded random number generator (mulberry32), returning [0, 1). */
function random(g: Garden) {
	g.seed = (g.seed + 0x6d2b79f5) | 0;
	let t = g.seed;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function newGarden(seed = Date.now()): Garden {
	return {
		coins: START_COINS,
		hearts: HEARTS,
		wave: 1,
		cleared: 0,
		building: true,
		waveTime: 0,
		queue: [],
		plants: [],
		zombies: [],
		shots: [],
		events: [],
		over: false,
		seed: seed | 0,
		nextId: 1
	};
}

/** How many zombies come in wave n, and how long they take to arrive (seconds). */
export function waveShape(n: number) {
	return { count: 4 + 2 * n, length: 10 + 1.5 * n };
}

/** Zombies get a bit tougher each wave, so a game ends in the end. */
const toughness = (n: number) => 1.14 ** (n - 1);

/** The zombies of wave n: tougher kinds join as the waves go on, and a big one every fifth. */
export function waveSpawns(g: Garden, n: number): Spawn[] {
	const { count, length } = waveShape(n);
	const spawns: Spawn[] = [];
	for (let i = 0; i < count; i++) {
		const r = random(g);
		let kind: ZombieKind = 'walker';
		if (n >= 3 && r < Math.min(0.15 + 0.03 * n, 0.4)) kind = 'bucket';
		else if (n >= 2 && r > 1 - Math.min(0.1 + 0.03 * n, 0.3)) kind = 'runner';
		spawns.push({ at: (length * i) / count + random(g) * 0.5, kind });
	}
	if (n % 5 === 0) {
		for (let b = 0; b < n / 5; b++) spawns.push({ at: length * 0.8 + b * 2, kind: 'big' });
	}
	return spawns.sort((a, b) => a.at - b.at);
}

export const plantAt = (g: Garden, col: number, row: number) =>
	g.plants.find((p) => p.col === col && p.row === row);

/** Why a plant can't go here now, or null if it can. */
export function cantPlant(g: Garden, kind: PlantKind, col: number, row: number) {
	if (!g.building) return 'wave';
	if (g.wave < PLANTS[kind].from) return 'locked';
	if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return 'outside';
	if (PLANTS[kind].path !== onPath(col, row)) return PLANTS[kind].path ? 'grass' : 'path';
	if (plantAt(g, col, row)) return 'taken';
	if (g.coins < PLANTS[kind].cost) return 'coins';
	return null;
}

/** Plants one, if it can. Returns whether it did. */
export function plant(g: Garden, kind: PlantKind, col: number, row: number) {
	if (cantPlant(g, kind, col, row)) return false;
	g.coins -= PLANTS[kind].cost;
	const p: Plant = { id: g.nextId++, kind, col, row, level: 1, hp: 0, timer: 0 };
	p.hp = maxHpOf(p);
	g.plants.push(p);
	return true;
}

/** Levels a plant up (a wall gets mended too), if there's the coin. */
export function upgrade(g: Garden, id: number) {
	const p = g.plants.find((p) => p.id === id);
	const cost = p && upgradeCost(p);
	if (!p || !g.building || cost == null || g.coins < cost) return false;
	g.coins -= cost;
	p.level++;
	p.hp = maxHpOf(p);
	return true;
}

/** Sells a plant for half what went into it. */
export function sell(g: Garden, id: number) {
	const p = g.plants.find((p) => p.id === id);
	if (!p || !g.building) return false;
	g.coins += sellValue(p);
	g.plants = g.plants.filter((q) => q !== p);
	return true;
}

/** Sends the zombies in. */
export function startWave(g: Garden) {
	if (!g.building) return false;
	g.building = false;
	g.waveTime = 0;
	g.queue = waveSpawns(g, g.wave);
	g.events.push({ type: 'wave', wave: g.wave });
	return true;
}

/** Zombies on the lawn, not still walking in through the hedge. */
const onLawn = (g: Garden) => g.zombies.filter((z) => z.d > 0.4 && z.hp > 0);

export function step(g: Garden, dt: number) {
	g.events = [];
	if (g.over || g.building) return g;
	g.waveTime += dt;
	while (g.queue.length && g.queue[0].at <= g.waveTime) {
		const s = g.queue.shift()!;
		const hp = Math.round(ZOMBIES[s.kind].hp * toughness(g.wave));
		g.zombies.push({
			id: g.nextId++,
			kind: s.kind,
			d: 0,
			hp,
			maxHp: hp,
			slow: 1,
			slowFor: 0,
			eating: false,
			hit: 9
		});
	}

	stepPlants(g, dt);
	stepShots(g, dt);
	stepZombies(g, dt);

	// Sleepy zombies leave, and munched walls go.
	for (const z of g.zombies) {
		if (z.hp <= 0) g.events.push({ type: 'sleep', ...pointAt(z.d), kind: z.kind });
	}
	g.zombies = g.zombies.filter((z) => z.hp > 0);
	for (const p of g.plants) {
		if (PLANTS[p.kind].hp && p.hp <= 0) g.events.push({ type: 'eaten', col: p.col, row: p.row });
	}
	g.plants = g.plants.filter((p) => !PLANTS[p.kind].hp || p.hp > 0);

	if (g.hearts <= 0) {
		g.over = true;
		return g;
	}
	if (!g.queue.length && !g.zombies.length) {
		const coins = waveReward(g.wave);
		g.cleared = g.wave;
		g.coins += coins;
		g.events.push({ type: 'cleared', wave: g.wave, coins });
		g.wave++;
		g.building = true;
		g.shots = [];
		// Walls are mended for the next wave.
		for (const p of g.plants) p.hp = maxHpOf(p);
	}
	return g;
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
	Math.hypot(a.x - b.x, a.y - b.y);

function soak(z: Zombie, info: PlantInfo) {
	if (!info.slow || !info.slowFor) return;
	z.slow = Math.min(z.slow, info.slow);
	z.slowFor = Math.max(z.slowFor, info.slowFor);
}

function stepPlants(g: Garden, dt: number) {
	const lawn = onLawn(g);
	for (const p of g.plants) {
		const info = PLANTS[p.kind];
		if (!info.every) continue;
		p.timer = Math.max(0, p.timer - dt);
		if (p.timer > 0) continue;
		const at = { x: p.col + 0.5, y: p.row + 0.5 };
		const range = rangeOf(p);
		const near = lawn.filter((z) => dist(pointAt(z.d), at) <= range);
		if (!near.length) continue;
		p.timer = info.every;
		if (p.kind === 'sprinkler') {
			for (const z of near) {
				z.hp -= damageOf(p);
				z.hit = 0;
				soak(z, info);
			}
			g.events.push({ type: 'splash', ...at, r: range, kind: p.kind });
			continue;
		}
		// The one furthest along, nearest the house.
		const target = near.reduce((a, b) => (b.d > a.d ? b : a));
		g.shots.push({ id: g.nextId++, kind: p.kind, ...at, target: target.id, level: p.level });
	}
}

function stepShots(g: Garden, dt: number) {
	const kept: Shot[] = [];
	for (const s of g.shots) {
		const target = g.zombies.find((z) => z.id === s.target && z.hp > 0);
		if (!target) continue;
		const to = pointAt(target.d);
		const gap = dist(s, to);
		const move = SHOT_SPEED * dt;
		if (gap > move) {
			s.x += ((to.x - s.x) / gap) * move;
			s.y += ((to.y - s.y) / gap) * move;
			kept.push(s);
			continue;
		}
		const info = PLANTS[s.kind];
		const damage = damageOf(s);
		if (info.splash) {
			for (const z of onLawn(g)) {
				if (dist(pointAt(z.d), to) <= info.splash) {
					z.hp -= damage;
					z.hit = 0;
				}
			}
			g.events.push({ type: 'splash', ...to, r: info.splash, kind: s.kind });
		} else {
			target.hp -= damage;
			target.hit = 0;
			soak(target, info);
		}
	}
	g.shots = kept;
}

function stepZombies(g: Garden, dt: number) {
	// Walls and mud, by where they are on the path.
	const onWay = g.plants
		.filter((p) => PLANTS[p.kind].path)
		.map((p) => ({ p, i: pathIndex(p.col, p.row)! }));
	for (const z of g.zombies) {
		// Beaten this step: it nods off where it is.
		if (z.hp <= 0) continue;
		const info = ZOMBIES[z.kind];
		z.hit += dt;
		z.slowFor = Math.max(0, z.slowFor - dt);
		if (!z.slowFor) z.slow = 1;
		// A wall just ahead to munch through.
		const wall = onWay.find(
			({ p, i }) => p.kind === 'pumpkin' && p.hp > 0 && z.d + REACH >= i && z.d < i
		);
		z.eating = !!wall;
		if (wall) {
			wall.p.hp -= info.bite * dt;
			continue;
		}
		let speed = info.speed * z.slow;
		for (const { p, i } of onWay) {
			if (p.kind === 'mud' && Math.abs(z.d - i) <= 0.5) speed *= mudSlow(p.level);
		}
		z.d += speed * dt;
		if (z.d >= PATH_END) {
			// It reaches the house: a heart lost, and it wanders off.
			g.hearts--;
			g.events.push({ type: 'heart' });
		}
	}
	// A zombie that reached the house isn't a sleepy one.
	g.zombies = g.zombies.filter((z) => z.d < PATH_END);
}
