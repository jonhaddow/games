<script lang="ts">
	import { dev } from '$app/env';
	import GamesButton from '#lib/components/GamesButton.svelte';
	import { postScore } from '#lib/scores.ts';
	import { drawLawn, drawPlant, drawShot, drawZombie } from './draw.ts';
	import {
		COLS,
		HEARTS,
		PATH,
		PLANTS,
		PLANT_KINDS,
		ROWS,
		cantPlant,
		newGarden,
		plantAt,
		plant,
		pointAt,
		rangeOf,
		sell,
		sellValue,
		startWave,
		step,
		upgrade,
		upgradeCost,
		type Garden,
		type PlantKind,
		type ZombieKind
	} from './garden.ts';

	type Props = {
		/** The player's most waves so far, or null before they've picked a name (then it's kept on this device). */
		best: number | null;
		/** Whether this device has picked a name, so scores go on the board. */
		signedIn: boolean;
	};
	let { best: serverBest, signedIn }: Props = $props();

	const BEST = 'garden-best';

	let phase = $state<'menu' | 'play' | 'paused' | 'over'>('menu');
	let best = $state(0);
	/** The card picked to plant. */
	let selected = $state<PlantKind | null>(null);
	/** A plant tapped on, to upgrade or sell. */
	let picked = $state<{
		id: number;
		kind: PlantKind;
		level: number;
		up: number | null;
		sell: number;
	} | null>(null);
	/** What the top bar and cards show, copied from the garden when it changes. */
	let hud = $state({ coins: 0, hearts: 0, wave: 1, cleared: 0, building: true });
	let banner = $state<{ text: string; sub?: string } | null>(null);
	let newBest = $state(false);
	let saveFailed = $state(false);
	let short = $state(false);

	/** The garden being played: plain, as it changes every frame. */
	let g: Garden = newGarden();

	$effect(() => {
		best = Number(localStorage.getItem(BEST)) || 0;
		// The device's best counts once a name is picked (see Stack).
		if (signedIn && best > (serverBest ?? 0)) void postScore('garden', best);
	});

	function start() {
		g = newGarden();
		selected = 'pea';
		picked = null;
		newBest = false;
		saveFailed = false;
		show('Get ready!', 'Plant beside the path, then start');
		sync();
		phase = 'play';
	}

	function sync() {
		// $state skips writes that don't change anything.
		hud.coins = g.coins;
		hud.hearts = g.hearts;
		hud.wave = g.wave;
		hud.cleared = g.cleared;
		hud.building = g.building;
	}

	/** Shows a plant's upgrade and sell buttons (or hides them, given nothing). */
	function pick(id?: number) {
		const p = g.plants.find((p) => p.id === id);
		picked = p
			? { id: p.id, kind: p.kind, level: p.level, up: upgradeCost(p), sell: sellValue(p) }
			: null;
	}

	async function gameOver() {
		phase = 'over';
		navigator.vibrate?.([60, 40, 60]);
		if (g.cleared > best) {
			best = g.cleared;
			newBest = true;
			localStorage.setItem(BEST, String(best));
		}
		if (signedIn && g.cleared > 0) saveFailed = !(await postScore('garden', g.cleared));
	}

	function go() {
		if (!startWave(g)) return;
		picked = null;
		sync();
	}

	function shake() {
		short = false;
		requestAnimationFrame(() => (short = true));
	}

	/** Puffs and floating words: drawn only, not part of the rules. */
	type Effect = {
		kind: 'text' | 'sleep' | 'splash';
		x: number;
		y: number;
		age: number;
		text?: string;
		zombie?: ZombieKind;
		r?: number;
		colour?: string;
	};
	const SPLASH: Partial<Record<PlantKind, string>> = { melon: '#ff6b6b', sprinkler: '#4cb3f0' };
	let effects: Effect[] = [];
	let bannerTimer: ReturnType<typeof setTimeout> | undefined;
	function show(text: string, sub?: string) {
		banner = { text, sub };
		clearTimeout(bannerTimer);
		bannerTimer = setTimeout(() => (banner = null), 2200);
	}
	$effect(() => () => clearTimeout(bannerTimer));

	/** Where the lawn sits on the canvas, in CSS pixels. */
	let view = { c: 40, ox: 0, oy: 0 };

	function tap(px: number, py: number) {
		if (phase !== 'play' || !g.building) return;
		const col = Math.floor((px - view.ox) / view.c);
		const row = Math.floor((py - view.oy) / view.c);
		const there = plantAt(g, col, row);
		if (there) {
			pick(there.id);
			return;
		}
		picked = null;
		if (!selected) return;
		const why = cantPlant(g, selected, col, row);
		if (why === 'coins') shake();
		if (!why) {
			plant(g, selected, col, row);
			navigator.vibrate?.(10);
			sync();
		}
	}

	/** Runs the garden on the canvas while it's on screen. */
	function run(canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d')!;
		let w = 0;
		let h = 0;
		const resize = () => {
			const r = canvas.getBoundingClientRect();
			const dpr = Math.min(devicePixelRatio || 1, 2);
			w = r.width;
			h = r.height;
			canvas.width = Math.round(w * dpr);
			canvas.height = Math.round(h * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			// Room for the hedge above (0.5 cells) and the house below (0.8).
			const c = Math.floor(Math.min(w / COLS, h / (ROWS + 1.3)));
			view = {
				c,
				ox: Math.round((w - c * COLS) / 2),
				oy: Math.round((h - c * (ROWS + 1.3)) / 2 + c * 0.5)
			};
		};
		resize();
		const observer = new ResizeObserver(resize);
		observer.observe(canvas);

		const update = (dt: number) => {
			step(g, dt);
			const { c, ox, oy } = view;
			for (const e of g.events) {
				if (e.type === 'sleep') {
					effects.push({ kind: 'sleep', x: ox + e.x * c, y: oy + e.y * c, age: 0, zombie: e.kind });
				} else if (e.type === 'splash') {
					effects.push({
						kind: 'splash',
						x: ox + e.x * c,
						y: oy + e.y * c,
						r: e.r * c,
						colour: SPLASH[e.kind] ?? '#fff',
						age: 0
					});
				} else if (e.type === 'eaten') {
					effects.push({
						kind: 'text',
						text: 'Munched!',
						x: ox + (e.col + 0.5) * c,
						y: oy + e.row * c,
						age: 0
					});
				} else if (e.type === 'heart') {
					const [x] = PATH[PATH.length - 1];
					effects.push({
						kind: 'text',
						text: '💔',
						x: ox + (x + 0.5) * c,
						y: oy + ROWS * c,
						age: 0
					});
					navigator.vibrate?.(80);
				} else if (e.type === 'cleared') {
					const fresh = PLANT_KINDS.find((k) => PLANTS[k].from === e.wave + 1);
					show(
						`Wave ${e.wave} done! +${e.coins} 🪙`,
						fresh ? `New: ${PLANTS[fresh].name}! ${PLANTS[fresh].about}` : undefined
					);
				}
			}
			effects = effects.filter((e) => (e.age += dt) < 1.4);
			sync();
			if (g.over) void gameOver();
		};

		const draw = () => {
			const { c, ox, oy } = view;
			const t = performance.now() / 1000;
			ctx.clearRect(0, 0, w, h);
			drawLawn(ctx, ox, oy, c, COLS, ROWS, PATH);
			if (selected && g.building && phase === 'play') {
				// A hint of where it can go: the free cells it fits.
				ctx.fillStyle = 'rgb(255 255 255 / 0.18)';
				for (let col = 0; col < COLS; col++) {
					for (let row = 0; row < ROWS; row++) {
						const why = cantPlant(g, selected, col, row);
						if (!why || why === 'coins')
							ctx.fillRect(ox + col * c + 4, oy + row * c + 4, c - 8, c - 8);
					}
				}
			}
			for (const p of g.plants) {
				drawPlant(ctx, p.kind, ox + p.col * c, oy + p.row * c, c, t, p.level);
			}
			const chosen = picked && g.plants.find((p) => p.id === picked!.id);
			if (chosen && PLANTS[chosen.kind].range) {
				ctx.fillStyle = 'rgb(255 255 255 / 0.2)';
				ctx.strokeStyle = 'rgb(255 255 255 / 0.9)';
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(
					ox + (chosen.col + 0.5) * c,
					oy + (chosen.row + 0.5) * c,
					rangeOf(chosen) * c,
					0,
					Math.PI * 2
				);
				ctx.fill();
				ctx.stroke();
			}
			// Further-down zombies drawn last, so they stand in front.
			const zs = g.zombies.map((z) => ({ z, at: pointAt(z.d) })).sort((a, b) => a.at.y - b.at.y);
			for (const { z, at } of zs) {
				const x = ox + at.x * c;
				const y = oy + at.y * c;
				drawZombie(ctx, z, x, y, c * 0.85, t + z.id);
				if (z.hp < z.maxHp) {
					ctx.fillStyle = 'rgb(0 0 0 / 0.4)';
					ctx.fillRect(x - c * 0.3, y - c * 0.55, c * 0.6, c * 0.08);
					ctx.fillStyle = z.slow < 1 ? '#4cb3f0' : '#7be04a';
					ctx.fillRect(x - c * 0.3, y - c * 0.55, c * 0.6 * Math.max(0, z.hp / z.maxHp), c * 0.08);
				}
			}
			for (const s of g.shots) drawShot(ctx, s.kind, ox + s.x * c, oy + s.y * c, c);
			ctx.textAlign = 'center';
			for (const e of effects) {
				ctx.globalAlpha = Math.max(0, 1 - e.age / 1.4);
				if (e.kind === 'text') {
					ctx.font = `${Math.round(c * 0.3)}px Bungee, system-ui`;
					ctx.fillStyle = '#fff';
					ctx.strokeStyle = '#203018';
					ctx.lineWidth = 4;
					ctx.strokeText(e.text!, e.x, e.y - e.age * c * 0.6);
					ctx.fillText(e.text!, e.x, e.y - e.age * c * 0.6);
				} else if (e.kind === 'sleep') {
					drawZombie(ctx, { kind: e.zombie!, eating: false, hit: 9 }, e.x, e.y, c * 0.85, t, true);
					ctx.font = `${Math.round(c * 0.3)}px Bungee, system-ui`;
					ctx.fillStyle = '#fff';
					ctx.fillText('Zzz', e.x + c * 0.3, e.y - c * 0.3 - e.age * c * 0.4);
				} else {
					ctx.globalAlpha = Math.max(0, 0.6 - e.age);
					ctx.fillStyle = e.colour!;
					ctx.beginPath();
					ctx.arc(e.x, e.y, e.r! * Math.min(1, 0.4 + e.age * 3), 0, Math.PI * 2);
					ctx.fill();
				}
			}
			ctx.globalAlpha = 1;
		};

		let last = performance.now();
		let frame = requestAnimationFrame(function loop(now) {
			// A long gap (another tab, a sleeping phone) doesn't jump the zombies on.
			const dt = Math.min((now - last) / 1000, 0.1);
			last = now;
			if (phase === 'play') update(dt);
			draw();
			frame = requestAnimationFrame(loop);
		});

		const down = (e: PointerEvent) => {
			const r = canvas.getBoundingClientRect();
			tap(e.clientX - r.left, e.clientY - r.top);
		};
		canvas.addEventListener('pointerdown', down);
		const hidden = () => {
			if (document.hidden && phase === 'play') phase = 'paused';
		};
		document.addEventListener('visibilitychange', hidden);
		if (dev) {
			window.__garden = {
				get garden() {
					return g;
				},
				/** Fast-forwards the game, as the frames would. */
				run(seconds: number) {
					for (let t = 0; t < seconds && phase === 'play'; t += 1 / 30) update(1 / 30);
				},
				/** Where a cell's middle is on the page. */
				screenOf(col: number, row: number) {
					const r = canvas.getBoundingClientRect();
					return {
						x: r.left + view.ox + (col + 0.5) * view.c,
						y: r.top + view.oy + (row + 0.5) * view.c
					};
				}
			};
		}
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			canvas.removeEventListener('pointerdown', down);
			document.removeEventListener('visibilitychange', hidden);
			delete window.__garden;
		};
	}

	/** Draws a plant on a card. */
	const icon = (kind: PlantKind) => (canvas: HTMLCanvasElement) => {
		const ctx = canvas.getContext('2d')!;
		ctx.scale(2, 2);
		drawPlant(ctx, kind, 0, 0, canvas.width / 2);
	};
</script>

<div class="garden" data-phase={phase}>
	{#if phase === 'menu'}
		<GamesButton />
		<nav class="corner"><a href="/boards/garden">Scores</a></nav>
		<div class="menu">
			<h1>Garden<br />Defence</h1>
			<p>
				The zombies are coming down the path to your house! Before each wave, spend your coins on
				plants. Shooters go beside the path, and walls and mud go on it. You get more coins after
				each wave.
			</p>
			<ul class="kinds">
				{#each PLANT_KINDS as kind (kind)}
					<li>
						<canvas width="80" height="80" {@attach icon(kind)}></canvas>
						<span><strong>{PLANTS[kind].name}</strong> {PLANTS[kind].about}</span>
					</li>
				{/each}
			</ul>
			{#if best}<p class="best">Best: {best} {best === 1 ? 'wave' : 'waves'}</p>{/if}
			<button class="big" onclick={start}>Play</button>
		</div>
	{:else}
		<div class="hud">
			<span class="hearts" aria-label="{hud.hearts} hearts">
				{#each { length: HEARTS }, i (i)}<span class:lost={i >= hud.hearts}>♥</span>{/each}
			</span>
			<span>Wave <strong data-testid="wave">{hud.wave}</strong></span>
			<span class="coins" class:short data-testid="coins">🪙 {hud.coins}</span>
			<button
				class="small"
				onclick={() => (phase = 'paused')}
				disabled={phase !== 'play'}
				aria-label="Pause"
			>
				❚❚
			</button>
		</div>

		<div class="field">
			<canvas {@attach run}></canvas>
			{#if banner && phase === 'play'}
				<div class="banner" role="status">
					<strong>{banner.text}</strong>
					{#if banner.sub}<span>{banner.sub}</span>{/if}
				</div>
			{/if}
		</div>

		{#if picked}
			<div class="picked">
				<canvas width="96" height="96" {@attach icon(picked.kind)}></canvas>
				<span class="what">
					<strong>{PLANTS[picked.kind].name}</strong>
					<small>Level {picked.level}</small>
				</span>
				<button
					class="act"
					disabled={picked.up == null || hud.coins < picked.up}
					onclick={() => {
						if (picked && !upgrade(g, picked.id)) shake();
						pick(picked?.id);
						sync();
					}}
				>
					{#if picked.up == null}Top level{:else}Upgrade<small>🪙 {picked.up}</small>{/if}
				</button>
				<button
					class="act plain"
					onclick={() => {
						if (picked) sell(g, picked.id);
						picked = null;
						sync();
					}}
				>
					Sell<small>+🪙 {picked.sell}</small>
				</button>
				<button class="act plain shut" aria-label="Close" onclick={() => (picked = null)}>✕</button>
			</div>
		{:else}
			<div class="cards">
				{#each PLANT_KINDS as kind (kind)}
					{@const open = hud.wave >= PLANTS[kind].from}
					<button
						class="card"
						class:on={selected === kind}
						disabled={!open || !hud.building}
						aria-pressed={selected === kind}
						aria-label={PLANTS[kind].name}
						onclick={() => (selected = kind)}
						class:dear={open && hud.coins < PLANTS[kind].cost}
					>
						{#if open}
							<canvas width="96" height="96" {@attach icon(kind)}></canvas>
							<span class="cost">{PLANTS[kind].cost}</span>
						{:else}
							<span class="lock">🔒<small>Wave {PLANTS[kind].from}</small></span>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
		{#if hud.building}
			<button class="big go" onclick={go} disabled={phase !== 'play'}>
				Start wave {hud.wave} ▶
			</button>
		{:else}
			<p class="going">Here they come!</p>
		{/if}

		{#if phase === 'paused'}
			<div class="cover">
				<div class="panel">
					<h2>Paused</h2>
					<button class="big" onclick={() => (phase = 'play')}>Keep going</button>
					<button class="big plain" onclick={gameOver}>Stop</button>
				</div>
			</div>
		{:else if phase === 'over'}
			<GamesButton />
			<div class="cover">
				<div class="panel" role="status">
					<h2>{hud.hearts ? 'Game over' : 'The zombies got in!'}</h2>
					<p class="score">
						<strong data-testid="score">{hud.cleared}</strong>
						{hud.cleared === 1 ? 'wave' : 'waves'} survived
					</p>
					{#if newBest && hud.cleared}<p>That’s your best yet!</p>{:else if best}<p>
							Best: {best}
						</p>{/if}
					{#if saveFailed}<p class="note">Couldn’t save that one.</p>{/if}
					{#if !signedIn}<p class="note">
							<a href="/profile?back=/garden">Pick a name</a> to put your waves on the board.
						</p>{/if}
					<button class="big" onclick={start}>Play again</button>
					<a class="big plain" href="/boards/garden">Scores</a>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	/* Garden Defence's own look: a sunny lawn, chunky cards and the house at the bottom. */
	.garden {
		--sky: #bfe8ff;
		--ink: #203018;
		--leaf: #3f9b3a;
		--gold: #ffc93c;
		--safe-top: env(safe-area-inset-top);
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: calc(var(--safe-top) + 10px) 10px calc(env(safe-area-inset-bottom) + 10px);
		background: linear-gradient(var(--sky), #e7f6d9);
		color: var(--ink);
		font-family: var(--display);
		user-select: none;
		-webkit-user-select: none;
		box-sizing: border-box;
	}
	.garden[data-phase='menu'] {
		overflow-y: auto;
	}
	button {
		font-family: var(--display);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
		color: var(--ink);
	}
	.corner {
		position: absolute;
		top: max(12px, var(--safe-top));
		right: 12px;
	}
	.corner a {
		display: block;
		padding: 8px 12px;
		background: #fff;
		border: 3px solid var(--ink);
		border-radius: 10px;
		color: var(--ink);
		text-decoration: none;
	}
	.menu {
		margin-top: 52px;
		width: min(400px, 100%);
		display: grid;
		gap: 14px;
		text-align: center;
	}
	h1,
	h2 {
		margin: 0;
		line-height: 1;
	}
	h1 {
		font-size: 46px;
		color: var(--leaf);
		text-shadow: 3px 3px 0 var(--ink);
		-webkit-text-stroke: 1.5px var(--ink);
	}
	h2 {
		font-size: 28px;
	}
	p {
		margin: 0;
		font-family: system-ui, sans-serif;
		font-weight: 600;
	}
	.kinds {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 4px;
		text-align: left;
	}
	.kinds li {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 2px 8px;
		background: rgb(255 255 255 / 0.6);
		border-radius: 12px;
		font:
			600 15px system-ui,
			sans-serif;
	}
	.kinds canvas {
		width: 40px;
		height: 40px;
	}
	.kinds strong {
		font: 15px var(--display);
		margin-right: 4px;
	}
	.best {
		font: 22px var(--display);
	}
	.big {
		display: block;
		padding: 14px 18px;
		border: 3px solid var(--ink);
		border-radius: 14px;
		background: var(--leaf);
		box-shadow: 0 5px 0 var(--ink);
		color: #fff;
		font: 24px var(--display);
		text-align: center;
		text-decoration: none;
	}
	.big:active {
		transform: translateY(3px);
		box-shadow: 0 2px 0 var(--ink);
	}
	.big.plain {
		background: #fff;
		color: var(--ink);
	}
	.hud {
		width: min(480px, 100%);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 16px;
	}
	.hud strong {
		font-size: 24px;
		font-weight: 400;
	}
	.hearts {
		font-size: 26px;
		color: #e24b3b;
		letter-spacing: 2px;
	}
	.hearts .lost {
		color: rgb(0 0 0 / 0.18);
	}
	.coins {
		padding: 4px 10px;
		background: var(--gold);
		border: 3px solid var(--ink);
		border-radius: 999px;
		font-size: 20px;
	}
	.coins.short {
		animation: shake 0.35s;
	}
	@keyframes shake {
		25% {
			transform: translateX(-5px);
		}
		75% {
			transform: translateX(5px);
		}
	}
	.small {
		padding: 6px 12px;
		border: 3px solid var(--ink);
		border-radius: 10px;
		background: #fff;
		font-size: 15px;
	}
	.field {
		position: relative;
		flex: 1;
		width: 100%;
		min-height: 0;
	}
	.field canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		touch-action: none;
	}
	.banner {
		position: absolute;
		top: 6%;
		left: 50%;
		transform: translateX(-50%);
		display: grid;
		gap: 6px;
		padding: 12px 20px;
		background: rgb(255 255 255 / 0.92);
		border: 3px solid var(--ink);
		border-radius: 16px;
		text-align: center;
		pointer-events: none;
		white-space: nowrap;
	}
	.banner strong {
		font-size: 28px;
		font-weight: 400;
	}
	.banner span {
		font:
			600 15px system-ui,
			sans-serif;
	}
	.cards {
		width: min(480px, 100%);
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 6px;
	}
	.card {
		position: relative;
		aspect-ratio: 1 / 1.15;
		padding: 0;
		border: 3px solid var(--ink);
		border-radius: 12px;
		background: #fff8e0;
		overflow: hidden;
		display: grid;
		place-items: center;
	}
	.card.on {
		background: #ffe066;
		transform: translateY(-4px);
		box-shadow: 0 4px 0 var(--ink);
	}
	.card.dear canvas {
		opacity: 0.4;
	}
	.card:disabled {
		background: #d8d8d8;
		cursor: default;
	}
	.card canvas {
		width: 80%;
		margin-top: -14%;
	}
	.cost {
		position: absolute;
		bottom: 2px;
		left: 0;
		right: 0;
		font-size: 15px;
		text-align: center;
	}
	.cost::before {
		content: '🪙';
		font-size: 11px;
		margin-right: 2px;
	}
	.lock {
		display: grid;
		font-size: 18px;
	}
	.lock small {
		font-size: 10px;
	}
	.card:disabled canvas {
		opacity: 0.5;
	}
	.go {
		width: min(480px, 100%);
		padding: 10px 18px;
		font-size: 20px;
	}
	.go:disabled {
		opacity: 0.6;
	}
	.going {
		padding: 12px;
		font: 20px var(--display);
	}
	.picked {
		width: min(480px, 100%);
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px;
		background: #fff8e0;
		border: 3px solid var(--ink);
		border-radius: 14px;
		box-sizing: border-box;
	}
	.picked canvas {
		width: 48px;
		height: 48px;
	}
	.what {
		flex: 1;
		display: grid;
		font-size: 15px;
	}
	.what strong {
		font-weight: 400;
	}
	.what small {
		font:
			600 13px system-ui,
			sans-serif;
	}
	.act {
		display: grid;
		padding: 6px 10px;
		border: 3px solid var(--ink);
		border-radius: 10px;
		background: var(--leaf);
		color: #fff;
		font-size: 15px;
	}
	.act small {
		font-size: 12px;
	}
	.act.plain {
		background: #fff;
		color: var(--ink);
	}
	.act:disabled {
		opacity: 0.5;
	}
	.shut {
		align-self: stretch;
		place-items: center;
	}
	.cover {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		padding: 16px;
		background: rgb(32 48 24 / 0.5);
	}
	.panel {
		width: min(340px, 100%);
		display: grid;
		gap: 14px;
		padding: 22px;
		background: #fff8e0;
		border: 3px solid var(--ink);
		border-radius: 20px;
		text-align: center;
	}
	.score strong {
		display: block;
		font: 64px/1 var(--display);
		color: var(--leaf);
	}
	.note {
		font-size: 14px;
	}
	.note a {
		color: var(--ink);
	}
</style>
