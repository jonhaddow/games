import { describe, expect, it } from 'vitest';
import {
	BREAK,
	CHILLI_FUSE,
	HEARTS,
	HIVE_EVERY,
	PLANTS,
	ROWS,
	START_HONEY,
	ZOMBIES,
	cantPlant,
	dig,
	newGarden,
	plant,
	step,
	waveShape,
	waveSpawns,
	type Garden,
	type ZombieKind
} from './garden.ts';

/** A garden with every plant open and no waves coming, to test one thing at a time. */
function quiet(): Garden {
	const g = newGarden(1);
	// One zombie far off, so the wave never ends.
	g.queue = [{ at: 1e9, kind: 'walker', lane: 0 }];
	g.waveTime = 0;
	g.wave = PLANTS.chilli.from;
	g.honey = 100;
	return g;
}

function addZombie(g: Garden, lane: number, y: number, kind: ZombieKind = 'walker') {
	const z = { id: g.nextId++, kind, lane, y, hp: ZOMBIES[kind].hp, eating: false, hit: 9 };
	g.zombies.push(z);
	return z;
}

/** Steps the garden for some seconds, collecting its events. */
function run(g: Garden, seconds: number, dt = 1 / 30) {
	const events = [];
	for (let t = 0; t < seconds; t += dt) {
		step(g, dt);
		events.push(...g.events);
	}
	return events;
}

describe('planting', () => {
	it('costs honey and takes a moment to grow another', () => {
		const g = newGarden(1);
		expect(plant(g, 'tomato', 2, 6)).toBe(true);
		expect(g.honey).toBe(START_HONEY - PLANTS.tomato.cost);
		g.honey = 100;
		expect(cantPlant(g, 'tomato', 3, 6)).toBe('growing');
		expect(cantPlant(g, 'tomato', 2, 6)).toBe('taken');
		g.time += PLANTS.tomato.cooldown;
		expect(cantPlant(g, 'tomato', 3, 6)).toBeNull();
	});

	it('needs enough honey, and later plants wait for their wave', () => {
		const g = newGarden(1);
		g.honey = 1;
		expect(cantPlant(g, 'hive', 0, 0)).toBe('honey');
		g.honey = 100;
		expect(cantPlant(g, 'chilli', 0, 0)).toBe('locked');
		g.wave = PLANTS.chilli.from;
		expect(cantPlant(g, 'chilli', 0, 0)).toBeNull();
		expect(cantPlant(g, 'hive', 0, ROWS)).toBe('outside');
	});

	it('digs a plant up', () => {
		const g = quiet();
		plant(g, 'hive', 1, 1);
		expect(dig(g, 1, 1)).toBe(true);
		expect(g.plants).toEqual([]);
		expect(dig(g, 1, 1)).toBe(false);
	});
});

describe('plants', () => {
	it('hives make honey, on top of the trickle', () => {
		const g = quiet();
		g.honey = 3;
		plant(g, 'hive', 0, 0);
		const events = run(g, HIVE_EVERY);
		expect(events.filter((e) => e.type === 'honey')).toHaveLength(1);
		expect(g.honey).toBeGreaterThanOrEqual(2 + 2);
	});

	it('tomatoes send a zombie to sleep, and only zombies up their lane', () => {
		const g = quiet();
		plant(g, 'tomato', 2, 6);
		addZombie(g, 3, 1);
		run(g, 1);
		expect(g.shots).toEqual([]);
		const z = addZombie(g, 2, 1);
		const events = run(g, 8);
		expect(z.hp).toBeLessThanOrEqual(0);
		expect(events).toContainEqual(expect.objectContaining({ type: 'sleep', lane: 2 }));
	});

	it('a pumpkin holds a zombie up while it munches', () => {
		const g = quiet();
		plant(g, 'pumpkin', 1, 4);
		const z = addZombie(g, 1, 2);
		run(g, 15);
		expect(z.eating).toBe(true);
		expect(z.y).toBeLessThan(4);
		expect(g.plants[0].hp).toBeLessThan(PLANTS.pumpkin.hp);
	});

	it('zombies eat a plant up, then walk on', () => {
		const g = quiet();
		plant(g, 'hive', 1, 4);
		const z = addZombie(g, 1, 3.5);
		const events = run(g, 6);
		expect(events).toContainEqual({ type: 'eaten', lane: 1, row: 4 });
		expect(g.plants).toEqual([]);
		expect(z.eating).toBe(false);
	});

	it('onions slow zombies near them', () => {
		const g = quiet();
		plant(g, 'onion', 0, 5);
		const slow = addZombie(g, 0, 3.2);
		const fast = addZombie(g, 1, 3.2);
		run(g, 1);
		expect(fast.y - 3.2).toBeCloseTo(ZOMBIES.walker.speed, 1);
		expect(slow.y - 3.2).toBeCloseTo(ZOMBIES.walker.speed / 2, 1);
	});

	it('a chilli goes bang, hitting its lane and the ones beside it', () => {
		const g = quiet();
		plant(g, 'chilli', 2, 3);
		const near = addZombie(g, 1, 3, 'bucket');
		const far = addZombie(g, 4, 3);
		const events = run(g, CHILLI_FUSE + 0.1);
		expect(events).toContainEqual({ type: 'bang', lane: 2, row: 3 });
		expect(near.hp).toBeLessThanOrEqual(0);
		expect(far.hp).toBeGreaterThan(0);
		expect(g.plants).toEqual([]);
	});
});

describe('waves', () => {
	it('start after a break, and clearing one scores it', () => {
		const g = newGarden(7);
		expect(g.queue).toHaveLength(waveShape(1).count);
		const events = run(g, BREAK + 0.1);
		expect(events).toContainEqual({ type: 'wave', wave: 1 });
		// See off every zombie as it comes.
		for (let t = 0; t < 60 && g.cleared === 0; t += 0.1) {
			step(g, 0.1);
			for (const z of g.zombies) z.hp = 0;
		}
		expect(g.cleared).toBe(1);
		expect(g.wave).toBe(2);
		expect(g.waveTime).toBeLessThan(0);
	});

	it('get bigger, with a big one every fifth', () => {
		expect(waveShape(5).count).toBeGreaterThan(waveShape(1).count);
		const g = newGarden(3);
		const kinds = (n: number) => waveSpawns(g, n).map((s) => s.kind);
		expect(kinds(1)).not.toContain('big');
		expect(kinds(5)).toContain('big');
		expect(kinds(1)).not.toContain('bucket');
	});

	it('are the same for the same seed', () => {
		expect(newGarden(42).queue).toEqual(newGarden(42).queue);
	});
});

describe('the house', () => {
	it('loses a heart for each zombie that gets there, and the game ends with none left', () => {
		const g = quiet();
		for (let i = 0; i < HEARTS; i++) addZombie(g, i, ROWS - 0.2, 'runner');
		const events = run(g, 2);
		expect(events.filter((e) => e.type === 'heart')).toHaveLength(HEARTS);
		expect(events.some((e) => e.type === 'sleep')).toBe(false);
		expect(g.hearts).toBe(0);
		expect(g.over).toBe(true);
		expect(plant(g, 'hive', 0, 0)).toBe(false);
	});
});
