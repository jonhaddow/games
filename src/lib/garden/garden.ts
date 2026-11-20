// Garden Defence's rules: pure, no drawing, so they can be unit tested.
//
// The garden is LANES columns wide and ROWS rows deep. Zombies walk down each
// lane from the top (y < 0) towards the house at the bottom (y = ROWS). A
// position is in rows: a zombie's y is its middle, and a plant at row r fills
// r to r + 1. Everything moves on `step(state, dt)`, dt in seconds.

export const LANES = 5;
export const ROWS = 8;
export const HEARTS = 3;
export const START_HONEY = 6;
/** Honey trickles in by itself, one every this many seconds, so a game can't get stuck. */
export const TRICKLE = 3;
/** The rest between waves, in seconds. */
export const BREAK = 5;

export type PlantKind = 'hive' | 'tomato' | 'pumpkin' | 'onion' | 'chilli';
export type ZombieKind = 'walker' | 'bucket' | 'runner' | 'big';

type PlantInfo = {
	name: string;
	cost: number;
	/** Seconds before another can be planted. */
	cooldown: number;
	hp: number;
	/** The first wave it can be planted in. */
	from: number;
	about: string;
};

export const PLANTS: Record<PlantKind, PlantInfo> = {
	hive: { name: 'Beehive', cost: 3, cooldown: 4, hp: 6, from: 1, about: 'Makes honey' },
	tomato: { name: 'Tomato', cost: 4, cooldown: 4, hp: 8, from: 1, about: 'Throws tomatoes' },
	pumpkin: { name: 'Pumpkin', cost: 3, cooldown: 10, hp: 50, from: 2, about: 'A big wall' },
	onion: {
		name: 'Onion',
		cost: 4,
		cooldown: 8,
		hp: 16,
		from: 3,
		about: 'So smelly, zombies slow down'
	},
	chilli: { name: 'Chilli', cost: 6, cooldown: 20, hp: 99, from: 4, about: 'Boom! Hits all around' }
};
export const PLANT_KINDS = Object.keys(PLANTS) as PlantKind[];

type ZombieInfo = { hp: number; speed: number; bite: number };
/** Speed in rows a second, bite in damage a second. */
export const ZOMBIES: Record<ZombieKind, ZombieInfo> = {
	walker: { hp: 10, speed: 0.25, bite: 2 },
	bucket: { hp: 28, speed: 0.25, bite: 2 },
	runner: { hp: 7, speed: 0.5, bite: 2 },
	big: { hp: 70, speed: 0.16, bite: 6 }
};

export const HIVE_EVERY = 8;
export const HIVE_HONEY = 2;
export const TOMATO_EVERY = 1.4;
export const TOMATO_DAMAGE = 2;
export const SHOT_SPEED = 6;
/** How far behind (towards the house) an onion's smell reaches, and how much it slows. */
export const ONION_REACH = 2;
export const ONION_SLOW = 0.5;
export const CHILLI_FUSE = 0.6;
export const CHILLI_DAMAGE = 60;
/** How close a zombie gets to a plant before it stops to munch. */
const REACH = 0.85;

export type Plant = {
	id: number;
	kind: PlantKind;
	lane: number;
	row: number;
	hp: number;
	/** Counts down to its next tomato, honey or bang. */
	timer: number;
};

export type Zombie = {
	id: number;
	kind: ZombieKind;
	lane: number;
	y: number;
	hp: number;
	/** Munching a plant this step (for drawing). */
	eating: boolean;
	/** Seconds since it was last hit (for a flash). */
	hit: number;
};

export type Shot = { id: number; lane: number; y: number };

/** Things that happened in a step, for sounds and puffs. */
export type GardenEvent =
	| { type: 'honey'; amount: number; lane: number; row: number }
	| { type: 'sleep'; lane: number; y: number; kind: ZombieKind }
	| { type: 'bang'; lane: number; row: number }
	| { type: 'eaten'; lane: number; row: number }
	| { type: 'heart'; lane: number }
	| { type: 'wave'; wave: number }
	| { type: 'cleared'; wave: number };

export type Spawn = { at: number; kind: ZombieKind; lane: number };

export type Garden = {
	time: number;
	honey: number;
	/** Part of the next trickled honey. */
	trickle: number;
	hearts: number;
	/** The wave being played, or about to be. */
	wave: number;
	/** Waves seen off: the score. */
	cleared: number;
	/** The wave's clock; negative during the break before it. */
	waveTime: number;
	queue: Spawn[];
	plants: Plant[];
	zombies: Zombie[];
	shots: Shot[];
	/** When each kind can next be planted (garden time). */
	ready: Record<PlantKind, number>;
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
	const g: Garden = {
		time: 0,
		honey: START_HONEY,
		trickle: 0,
		hearts: HEARTS,
		wave: 1,
		cleared: 0,
		waveTime: -BREAK,
		queue: [],
		plants: [],
		zombies: [],
		shots: [],
		ready: { hive: 0, tomato: 0, pumpkin: 0, onion: 0, chilli: 0 },
		events: [],
		over: false,
		seed: seed | 0,
		nextId: 1
	};
	g.queue = waveSpawns(g, 1);
	return g;
}

/** How many zombies come in wave n, and how long they take to arrive (seconds). */
export function waveShape(n: number) {
	return { count: 3 + 2 * n, length: 14 + 2 * n };
}

/** Zombies get a bit tougher each wave, so a game ends in the end. */
export const toughness = (n: number) => 1 + 0.1 * (n - 1);

/** The zombies of wave n: tougher kinds join as the waves go on, and a big one every fifth. */
export function waveSpawns(g: Garden, n: number): Spawn[] {
	const { count, length } = waveShape(n);
	const spawns: Spawn[] = [];
	for (let i = 0; i < count; i++) {
		const r = random(g);
		let kind: ZombieKind = 'walker';
		if (n >= 3 && r < Math.min(0.15 + 0.03 * n, 0.4)) kind = 'bucket';
		else if (n >= 2 && r > 1 - Math.min(0.1 + 0.03 * n, 0.3)) kind = 'runner';
		// Bunched up a little towards the end of the wave.
		const at = length * Math.sqrt(i / count) + random(g);
		spawns.push({ at, kind, lane: Math.floor(random(g) * LANES) });
	}
	if (n % 5 === 0) {
		for (let b = 0; b < n / 5; b++) {
			spawns.push({ at: length * 0.8 + b * 2, kind: 'big', lane: Math.floor(random(g) * LANES) });
		}
	}
	return spawns.sort((a, b) => a.at - b.at);
}

export const unlocked = (g: Garden, kind: PlantKind) => g.wave >= PLANTS[kind].from;

export const plantAt = (g: Garden, lane: number, row: number) =>
	g.plants.find((p) => p.lane === lane && p.row === row);

/** Why a plant can't go in now, or null if it can. */
export function cantPlant(g: Garden, kind: PlantKind, lane: number, row: number) {
	if (g.over) return 'over';
	if (!unlocked(g, kind)) return 'locked';
	if (lane < 0 || lane >= LANES || row < 0 || row >= ROWS) return 'outside';
	if (plantAt(g, lane, row)) return 'taken';
	if (g.honey < PLANTS[kind].cost) return 'honey';
	if (g.time < g.ready[kind]) return 'growing';
	return null;
}

/** Plants one, if it can. Returns whether it did. */
export function plant(g: Garden, kind: PlantKind, lane: number, row: number) {
	if (cantPlant(g, kind, lane, row)) return false;
	const info = PLANTS[kind];
	g.honey -= info.cost;
	g.ready[kind] = g.time + info.cooldown;
	const timer = kind === 'chilli' ? CHILLI_FUSE : kind === 'hive' ? HIVE_EVERY / 2 : 0;
	g.plants.push({ id: g.nextId++, kind, lane, row, hp: info.hp, timer });
	return true;
}

/** Digs a plant up (no honey back). */
export function dig(g: Garden, lane: number, row: number) {
	const before = g.plants.length;
	g.plants = g.plants.filter((p) => p.lane !== lane || p.row !== row);
	return g.plants.length < before;
}

/** Zombies on the lawn in a lane (not still walking in from off the top). */
const onLawn = (g: Garden, lane: number) =>
	g.zombies.filter((z) => z.lane === lane && z.y > -0.4 && z.hp > 0);

export function step(g: Garden, dt: number) {
	g.events = [];
	if (g.over) return g;
	g.time += dt;

	g.trickle += dt / TRICKLE;
	if (g.trickle >= 1) {
		g.honey += Math.floor(g.trickle);
		g.trickle %= 1;
	}

	// The wave: spawn its zombies as their time comes.
	const wasBreak = g.waveTime < 0;
	g.waveTime += dt;
	if (wasBreak && g.waveTime >= 0) g.events.push({ type: 'wave', wave: g.wave });
	while (g.queue.length && g.queue[0].at <= g.waveTime) {
		const s = g.queue.shift()!;
		g.zombies.push({
			id: g.nextId++,
			kind: s.kind,
			lane: s.lane,
			y: -0.6,
			hp: Math.round(ZOMBIES[s.kind].hp * toughness(g.wave)),
			eating: false,
			hit: 9
		});
	}

	stepPlants(g, dt);
	stepShots(g, dt);
	stepZombies(g, dt);

	// Sleepy zombies leave, and eaten plants go.
	for (const z of g.zombies) {
		if (z.hp <= 0) g.events.push({ type: 'sleep', lane: z.lane, y: z.y, kind: z.kind });
	}
	g.zombies = g.zombies.filter((z) => z.hp > 0);
	for (const p of g.plants) {
		if (p.hp <= 0 && p.kind !== 'chilli') {
			g.events.push({ type: 'eaten', lane: p.lane, row: p.row });
		}
	}
	g.plants = g.plants.filter((p) => p.hp > 0);

	if (g.hearts <= 0) {
		g.over = true;
		return g;
	}
	if (g.waveTime >= 0 && !g.queue.length && !g.zombies.length) {
		g.cleared = g.wave;
		g.events.push({ type: 'cleared', wave: g.wave });
		g.wave++;
		g.waveTime = -BREAK;
		g.queue = waveSpawns(g, g.wave);
		g.shots = [];
	}
	return g;
}

function stepPlants(g: Garden, dt: number) {
	for (const p of g.plants) {
		p.timer -= dt;
		if (p.kind === 'hive' && p.timer <= 0) {
			p.timer += HIVE_EVERY;
			g.honey += HIVE_HONEY;
			g.events.push({ type: 'honey', amount: HIVE_HONEY, lane: p.lane, row: p.row });
		} else if (p.kind === 'tomato') {
			// Only throws at a zombie up its lane (not one that's walked past it).
			const target = onLawn(g, p.lane).some((z) => z.y < p.row + 1);
			if (p.timer <= 0 && target) {
				p.timer = TOMATO_EVERY;
				g.shots.push({ id: g.nextId++, lane: p.lane, y: p.row + 0.3 });
			}
			p.timer = Math.max(p.timer, 0);
		} else if (p.kind === 'chilli' && p.timer <= 0) {
			for (const z of g.zombies) {
				if (Math.abs(z.lane - p.lane) <= 1 && Math.abs(z.y - (p.row + 0.5)) <= 1.6) {
					z.hp -= CHILLI_DAMAGE;
				}
			}
			p.hp = 0;
			g.events.push({ type: 'bang', lane: p.lane, row: p.row });
		}
	}
}

function stepShots(g: Garden, dt: number) {
	const kept: Shot[] = [];
	for (const s of g.shots) {
		const from = s.y;
		s.y -= SHOT_SPEED * dt;
		// The nearest zombie it passed.
		const hit = onLawn(g, s.lane)
			.filter((z) => z.y <= from + 0.2 && z.y >= s.y - 0.3)
			.sort((a, b) => b.y - a.y)[0];
		if (hit) {
			hit.hp -= TOMATO_DAMAGE;
			hit.hit = 0;
		} else if (s.y > -1) kept.push(s);
	}
	g.shots = kept;
}

function stepZombies(g: Garden, dt: number) {
	for (const z of g.zombies) {
		const info = ZOMBIES[z.kind];
		z.hit += dt;
		// The first plant in front of it, if it's close enough to munch.
		const food = g.plants
			.filter((p) => p.lane === z.lane && p.kind !== 'chilli')
			.filter((p) => z.y + REACH >= p.row && z.y < p.row + 1)
			.sort((a, b) => a.row - b.row)[0];
		z.eating = !!food;
		if (food) {
			food.hp -= info.bite * dt;
			continue;
		}
		const smelly = g.plants.some(
			(p) =>
				p.kind === 'onion' && p.lane === z.lane && z.y >= p.row - ONION_REACH && z.y < p.row + 1
		);
		z.y += info.speed * (smelly ? ONION_SLOW : 1) * dt;
		if (z.y >= ROWS + 0.3) {
			// It reaches the house: a heart lost, and it wanders off.
			z.hp = 0;
			g.hearts--;
			g.events.push({ type: 'heart', lane: z.lane });
		}
	}
	// A zombie that reached the house isn't a sleepy one.
	g.zombies = g.zombies.filter((z) => z.y < ROWS + 0.3);
}
