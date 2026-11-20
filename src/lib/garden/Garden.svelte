<script lang="ts">
	import { dev } from '$app/env';
	import GamesButton from '#lib/components/GamesButton.svelte';
	import { postScore } from '#lib/scores.ts';
	import { drawLawn, drawPlant, drawTomato, drawZombie } from './draw.ts';
	import {
		LANES,
		PLANTS,
		PLANT_KINDS,
		ROWS,
		cantPlant,
		dig,
		newGarden,
		plant,
		step,
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
	let selected = $state<PlantKind | 'dig' | null>(null);
	/** What the top bar and cards show, copied from the garden when it changes. */
	let hud = $state({ honey: 0, hearts: 0, wave: 1, cleared: 0 });
	let cooling = $state<Record<PlantKind, number>>({
		hive: 0,
		tomato: 0,
		pumpkin: 0,
		onion: 0,
		chilli: 0
	});
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
		selected = 'tomato';
		newBest = false;
		saveFailed = false;
		show('Get ready!', 'Plant some tomatoes');
		sync();
		phase = 'play';
	}

	function sync() {
		if (hud.honey !== g.honey) hud.honey = g.honey;
		if (hud.hearts !== g.hearts) hud.hearts = g.hearts;
		if (hud.wave !== g.wave) hud.wave = g.wave;
		if (hud.cleared !== g.cleared) hud.cleared = g.cleared;
		for (const k of PLANT_KINDS) {
			const left = Math.max(0, g.ready[k] - g.time) / PLANTS[k].cooldown;
			const shown = Math.ceil(left * 20) / 20;
			if (cooling[k] !== shown) cooling[k] = shown;
		}
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

	/** Puffs and floating words: drawn only, not part of the rules. */
	type Effect = {
		kind: 'text' | 'sleep' | 'bang';
		x: number;
		y: number;
		age: number;
		text?: string;
		zombie?: ZombieKind;
	};
	let effects: Effect[] = [];
	let bannerTimer: ReturnType<typeof setTimeout> | undefined;
	function show(text: string, sub?: string) {
		banner = { text, sub };
		clearTimeout(bannerTimer);
		bannerTimer = setTimeout(() => (banner = null), 1800);
	}
	$effect(() => () => clearTimeout(bannerTimer));

	/** Where the lawn sits on the canvas, in CSS pixels. */
	let view = { c: 40, ox: 0, oy: 0 };

	function cellAt(px: number, py: number) {
		const lane = Math.floor((px - view.ox) / view.c);
		const row = Math.floor((py - view.oy) / view.c);
		return { lane, row };
	}

	function tap(px: number, py: number) {
		if (phase !== 'play' || !selected) return;
		const { lane, row } = cellAt(px, py);
		if (selected === 'dig') {
			dig(g, lane, row);
			return;
		}
		const why = cantPlant(g, selected, lane, row);
		if (why === 'honey') {
			short = false;
			requestAnimationFrame(() => (short = true));
		}
		if (!why) {
			plant(g, selected, lane, row);
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
			const c = Math.floor(Math.min(w / LANES, h / (ROWS + 1.3)));
			view = {
				c,
				ox: Math.round((w - c * LANES) / 2),
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
				const x = ox + (e.type === 'wave' || e.type === 'cleared' ? 0 : (e.lane + 0.5) * c);
				if (e.type === 'honey') {
					effects.push({
						kind: 'text',
						text: `+${e.amount} 🍯`,
						x,
						y: oy + (e.row + 0.2) * c,
						age: 0
					});
				} else if (e.type === 'sleep') {
					effects.push({ kind: 'sleep', x, y: oy + e.y * c, age: 0, zombie: e.kind });
				} else if (e.type === 'bang') {
					effects.push({ kind: 'bang', x, y: oy + (e.row + 0.5) * c, age: 0 });
					navigator.vibrate?.(40);
				} else if (e.type === 'heart') {
					effects.push({ kind: 'text', text: '💔', x, y: oy + ROWS * c, age: 0 });
					navigator.vibrate?.(80);
				} else if (e.type === 'wave') {
					show(`Wave ${e.wave}`, e.wave % 5 === 0 ? 'A big one is coming!' : undefined);
				} else if (e.type === 'cleared') {
					const fresh = PLANT_KINDS.find((k) => PLANTS[k].from === e.wave + 1);
					show(
						`Wave ${e.wave} done!`,
						fresh && `New: ${PLANTS[fresh].name}! ${PLANTS[fresh].about}`
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
			drawLawn(ctx, ox, oy, c, LANES, ROWS);
			for (const p of g.plants) drawPlant(ctx, p.kind, ox + p.lane * c, oy + p.row * c, c, t);
			// Further-down zombies drawn last, so they stand in front.
			const zs = g.zombies.toSorted((a, b) => a.y - b.y);
			for (const z of zs) drawZombie(ctx, z, ox + (z.lane + 0.5) * c, oy + z.y * c, c, t + z.id);
			for (const s of g.shots) drawTomato(ctx, ox + (s.lane + 0.5) * c, oy + s.y * c, c);
			ctx.textAlign = 'center';
			for (const e of effects) {
				ctx.globalAlpha = Math.max(0, 1 - e.age / 1.4);
				if (e.kind === 'text') {
					ctx.font = `${Math.round(c * 0.32)}px Bungee, system-ui`;
					ctx.fillStyle = '#fff';
					ctx.strokeStyle = '#203018';
					ctx.lineWidth = 4;
					ctx.strokeText(e.text!, e.x, e.y - e.age * c * 0.6);
					ctx.fillText(e.text!, e.x, e.y - e.age * c * 0.6);
				} else if (e.kind === 'sleep') {
					drawZombie(ctx, { kind: e.zombie!, eating: false, hit: 9 }, e.x, e.y, c, t, true);
					ctx.font = `${Math.round(c * 0.3)}px Bungee, system-ui`;
					ctx.fillStyle = '#fff';
					ctx.fillText('Zzz', e.x + c * 0.3, e.y - c * 0.3 - e.age * c * 0.4);
				} else {
					ctx.fillStyle = '#ff9f1c';
					ctx.beginPath();
					ctx.arc(e.x, e.y, c * (0.6 + e.age * 2), 0, Math.PI * 2);
					ctx.fill();
				}
			}
			ctx.globalAlpha = 1;
			if (selected && selected !== 'dig' && phase === 'play') {
				// A hint of where it can go: the empty cells.
				ctx.fillStyle = 'rgb(255 255 255 / 0.12)';
				for (let l = 0; l < LANES; l++) {
					for (let r = 0; r < ROWS; r++) {
						if (!g.plants.some((p) => p.lane === l && p.row === r)) {
							ctx.fillRect(ox + l * c + 3, oy + r * c + 3, c - 6, c - 6);
						}
					}
				}
			}
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
				screenOf(lane: number, row: number) {
					const r = canvas.getBoundingClientRect();
					return {
						x: r.left + view.ox + (lane + 0.5) * view.c,
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
				The zombies want to get to your house! Plant veg on the lawn to stop them. Beehives make
				honey to buy more plants.
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
				{#each { length: 3 }, i (i)}<span class:lost={i >= hud.hearts}>♥</span>{/each}
			</span>
			<span>Wave <strong data-testid="wave">{hud.wave}</strong></span>
			<span class="honey" class:short data-testid="honey">🍯 {hud.honey}</span>
			<button
				class="small"
				onclick={() => (phase = 'paused')}
				disabled={phase !== 'play'}
				aria-label="Pause">❚❚</button
			>
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

		<div class="cards">
			{#each PLANT_KINDS as kind (kind)}
				{@const open = hud.wave >= PLANTS[kind].from}
				<button
					class="card"
					class:on={selected === kind}
					disabled={!open}
					aria-pressed={selected === kind}
					aria-label={PLANTS[kind].name}
					onclick={() => (selected = kind)}
					style:--cool={cooling[kind]}
					class:dear={open && hud.honey < PLANTS[kind].cost}
				>
					{#if open}
						<canvas width="96" height="96" {@attach icon(kind)}></canvas>
						<span class="cost">{PLANTS[kind].cost}</span>
					{:else}
						<span class="lock">🔒<small>Wave {PLANTS[kind].from}</small></span>
					{/if}
				</button>
			{/each}
			<button
				class="card dig"
				class:on={selected === 'dig'}
				aria-pressed={selected === 'dig'}
				aria-label="Dig up"
				onclick={() => (selected = 'dig')}>⛏</button
			>
		</div>

		{#if phase === 'paused'}
			<div class="cover">
				<div class="panel">
					<h2>Paused</h2>
					<button class="big" onclick={() => (phase = 'play')}>Keep going</button>
					<button class="big plain" onclick={() => (phase = 'menu')}>Stop</button>
				</div>
			</div>
		{:else if phase === 'over'}
			<GamesButton />
			<div class="cover">
				<div class="panel" role="status">
					<h2>The zombies got in!</h2>
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
		--honey: #ffb81c;
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
	.honey {
		padding: 4px 10px;
		background: var(--honey);
		border: 3px solid var(--ink);
		border-radius: 999px;
		font-size: 20px;
	}
	.honey.short {
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
		grid-template-columns: repeat(6, 1fr);
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
	/* Growing: a shade that drops away as it gets ready. */
	.card::after {
		content: '';
		position: absolute;
		inset: 0 0 auto;
		height: calc(var(--cool, 0) * 100%);
		background: rgb(0 0 0 / 0.3);
		pointer-events: none;
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
		content: '🍯';
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
	.dig {
		font-size: 28px;
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
