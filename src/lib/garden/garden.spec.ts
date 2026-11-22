import { describe, expect, it } from 'vitest';
import {
	HEARTS,
	PATH,
	PATH_END,
	PLANTS,
	START_COINS,
	ZOMBIES,
	cantPlant,
	newGarden,
	onPath,
	plant,
	pointAt,
	sell,
	sellValue,
	startWave,
	step,
	upgrade,
	upgradeCost,
	waveReward,
	waveShape,
	waveSpawns,
	type Garden,
	type ZombieKind
} from './garden.ts';

/** Grass beside the path at its start, and a path cell further on. */
const GRASS = [2, 1] as const;
const PATH_CELL = PATH[5];

/** A garden mid-wave with every plant open and no more zombies coming, to test one thing at a time. */
function quiet(): Garden {
	const g = newGarden(1);
	g.wave = PLANTS.sunflower.from;
	g.coins = 100;
	return g;
}

/** Plants in a quiet garden, then lets the wave run. */
function fight(g: Garden) {
	g.building = false;
	// One zombie far off, so the wave never ends.
	g.queue = [{ at: 1e9, kind: 'walker' }];
}

function addZombie(g: Garden, d: number, kind: ZombieKind = 'walker') {
	const hp = ZOMBIES[kind].hp;
	const z = { id: g.nextId++, kind, d, hp, maxHp: hp, slow: 1, slowFor: 0, eating: false, hit: 9 };
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

describe('the path', () => {
	it('runs one cell at a time from above the hedge to below the house', () => {
		expect(PATH[0][1]).toBeLessThan(0);
		expect(PATH[PATH.length - 1][1]).toBeGreaterThanOrEqual(10);
		for (let i = 1; i < PATH.length; i++) {
			const [ax, ay] = PATH[i - 1];
			const [bx, by] = PATH[i];
			expect(Math.abs(ax - bx) + Math.abs(ay - by)).toBe(1);
		}
		expect(pointAt(5)).toEqual({ x: PATH[5][0] + 0.5, y: PATH[5][1] + 0.5 });
	});
});

describe('planting', () => {
	it('costs coins, shooters beside the path and walls on it', () => {
		const g = newGarden(1);
		expect(onPath(...GRASS)).toBe(false);
		expect(plant(g, 'pea', ...GRASS)).toBe(true);
		expect(g.coins).toBe(START_COINS - PLANTS.pea.cost);
		expect(cantPlant(g, 'pea', ...GRASS)).toBe('taken');
		expect(cantPlant(g, 'pea', ...PATH_CELL)).toBe('path');
		expect(cantPlant(g, 'pumpkin', 0, 0)).toBe('grass');
		expect(cantPlant(g, 'pumpkin', ...PATH_CELL)).toBeNull();
	});

	it('needs enough coins, later plants wait for their wave, and none during a wave', () => {
		const g = newGarden(1);
		g.coins = 1;
		expect(cantPlant(g, 'pea', 0, 0)).toBe('coins');
		g.coins = 100;
		expect(cantPlant(g, 'sunflower', 0, 0)).toBe('locked');
		g.wave = PLANTS.sunflower.from;
		expect(cantPlant(g, 'sunflower', 0, 0)).toBeNull();
		startWave(g);
		expect(cantPlant(g, 'sunflower', 0, 0)).toBe('wave');
	});

	it('upgrades up to level 3, and sells for half what went in', () => {
		const g = quiet();
		plant(g, 'pea', 0, 0);
		const p = g.plants[0];
		const coins = g.coins;
		expect(upgrade(g, p.id)).toBe(true);
		expect(upgrade(g, p.id)).toBe(true);
		expect(p.level).toBe(3);
		expect(upgradeCost(p)).toBeNull();
		expect(upgrade(g, p.id)).toBe(false);
		const spent = coins - g.coins + PLANTS.pea.cost;
		expect(sellValue(p)).toBe(Math.floor(spent / 2));
		const before = g.coins;
		expect(sell(g, p.id)).toBe(true);
		expect(g.coins).toBe(before + Math.floor(spent / 2));
		expect(g.plants).toEqual([]);
	});
});

describe('plants', () => {
	it('a pea pod sends a zombie in reach to sleep', () => {
		const g = quiet();
		plant(g, 'pea', ...GRASS);
		fight(g);
		const far = addZombie(g, PATH.length - 3);
		const z = addZombie(g, 1);
		const events = run(g, 6);
		expect(z.hp).toBeLessThanOrEqual(0);
		expect(events).toContainEqual(expect.objectContaining({ type: 'sleep', kind: 'walker' }));
		expect(far.hp).toBe(ZOMBIES.walker.hp);
	});

	it('a higher level hits harder', () => {
		const hits = (level: number) => {
			const g = quiet();
			plant(g, 'pea', ...GRASS);
			g.plants[0].level = level;
			fight(g);
			const z = addZombie(g, 1, 'big');
			z.hp = 1000;
			run(g, 3);
			return 1000 - z.hp;
		};
		expect(hits(2)).toBeGreaterThan(hits(1));
	});

	it('a pumpkin holds a zombie up while it munches, and goes once eaten', () => {
		const g = quiet();
		plant(g, 'pumpkin', ...PATH_CELL);
		fight(g);
		const z = addZombie(g, 3);
		run(g, 4);
		expect(z.eating).toBe(true);
		expect(z.d).toBeLessThan(5);
		const events = run(g, 15);
		expect(events).toContainEqual({ type: 'eaten', col: PATH_CELL[0], row: PATH_CELL[1] });
		expect(z.d).toBeGreaterThan(5);
	});

	it('mud and frost slow zombies', () => {
		const g = quiet();
		plant(g, 'mud', ...PATH_CELL);
		fight(g);
		const slow = addZombie(g, 4.6);
		const fast = addZombie(g, 1.6);
		run(g, 0.5);
		expect(slow.d - 4.6).toBeLessThan((fast.d - 1.6) * 0.6);

		const f = quiet();
		plant(f, 'frost', ...GRASS);
		fight(f);
		const z = addZombie(f, 1, 'big');
		run(f, 1);
		expect(z.slow).toBe(PLANTS.frost.slow);
	});

	it('a melon splashes zombies close together', () => {
		const g = quiet();
		plant(g, 'melon', ...GRASS);
		fight(g);
		const a = addZombie(g, 2, 'bucket');
		const b = addZombie(g, 2.3, 'bucket');
		const events = run(g, 1);
		expect(events).toContainEqual(expect.objectContaining({ type: 'splash', kind: 'melon' }));
		expect(a.hp).toBeLessThan(ZOMBIES.bucket.hp);
		expect(b.hp).toBeLessThan(ZOMBIES.bucket.hp);
	});

	it('a sprinkler soaks everyone close by at once', () => {
		const g = quiet();
		plant(g, 'sprinkler', ...GRASS);
		fight(g);
		const zs = [1, 2, 3].map((d) => addZombie(g, d, 'bucket'));
		run(g, 0.1);
		for (const z of zs) expect(z.hp).toBeLessThan(ZOMBIES.bucket.hp);
	});
});

describe('waves', () => {
	it('start when asked, and clearing one pays coins and goes back to building', () => {
		const g = newGarden(7);
		run(g, 5);
		expect(g.zombies).toEqual([]);
		expect(startWave(g)).toBe(true);
		expect(g.queue).toHaveLength(waveShape(1).count);
		// See off every zombie as it comes.
		const events = [];
		for (let t = 0; t < 60 && g.cleared === 0; t += 0.1) {
			step(g, 0.1);
			events.push(...g.events);
			for (const z of g.zombies) z.hp = 0;
		}
		expect(g.cleared).toBe(1);
		expect(g.wave).toBe(2);
		expect(g.building).toBe(true);
		expect(g.coins).toBe(START_COINS + waveReward(1));
		expect(events).toContainEqual({ type: 'cleared', wave: 1, coins: waveReward(1) });
	});

	it('mends walls between waves', () => {
		const g = quiet();
		plant(g, 'pumpkin', ...PATH_CELL);
		g.plants[0].hp = 1;
		startWave(g);
		g.queue = [];
		step(g, 0.1);
		expect(g.building).toBe(true);
		expect(g.plants[0].hp).toBe(PLANTS.pumpkin.hp);
	});

	it('get bigger, with a big one every fifth', () => {
		const g = newGarden(3);
		const kinds = (n: number) => waveSpawns(g, n).map((s) => s.kind);
		expect(kinds(1)).not.toContain('big');
		expect(kinds(5)).toContain('big');
		expect(kinds(1)).not.toContain('bucket');
	});

	it('are the same for the same seed', () => {
		expect(waveSpawns(newGarden(42), 4)).toEqual(waveSpawns(newGarden(42), 4));
	});
});

describe('the house', () => {
	it('loses a heart for each zombie that gets there, and the game ends with none left', () => {
		const g = quiet();
		fight(g);
		for (let i = 0; i < HEARTS; i++) addZombie(g, PATH_END - 0.2, 'runner');
		const events = run(g, 2);
		expect(events.filter((e) => e.type === 'heart')).toHaveLength(HEARTS);
		expect(events.some((e) => e.type === 'sleep')).toBe(false);
		expect(g.hearts).toBe(0);
		expect(g.over).toBe(true);
		expect(startWave(g)).toBe(false);
	});
});
