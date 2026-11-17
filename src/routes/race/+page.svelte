<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { Game, Hud } from '#lib/race/game.ts';
	import '@fontsource/russo-one/latin.css';
	import { LAPS, RECORD_KEY, formatTime } from '#lib/race/race.ts';
	import { postScore } from '#lib/scores.ts';
	import GamesButton from '#lib/components/GamesButton.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let game: Game | undefined;
	let hud = $state<Hud>();
	let touch = $state(false);
	let tilt = $state(false);
	let portrait = $state(false);
	let wakeLock: WakeLockSentinel | undefined;

	/** Where this player stands on the Race board, once they've picked a name. */
	let rank = $state<number>();

	/** Sends a best lap (seconds) to the board, in milliseconds. It keeps the faster. */
	async function sendBest(seconds: number) {
		if (!data.player || !(seconds > 0)) return;
		rank = (await postScore('race', Math.round(seconds * 1000)))?.rank;
	}

	// The best lap on this device, from before a name was picked or from offline.
	$effect(() => {
		void sendBest(Number(localStorage.getItem(RECORD_KEY)));
	});

	// And at the end of each race. A plain number, so the HUD's refresh every
	// 80ms doesn't send it again.
	let finishedBest = $derived(hud?.phase === 'finished' ? (hud.bestLap ?? 0) : undefined);
	$effect(() => {
		if (finishedBest !== undefined) void sendBest(finishedBest);
	});

	// The game (three.js) only loads in the browser, after the page shows.
	const mount: Attachment<HTMLCanvasElement> = (canvas) => {
		let stopped = false;
		let timer: ReturnType<typeof setInterval> | undefined;
		void import('#lib/race/game.ts').then(({ Game }) => {
			if (stopped) return;
			game = new Game(canvas);
			// The HUD needn't redraw every frame.
			timer = setInterval(() => {
				if (!game) return;
				hud = { ...game.hud };
				tilt = game.input.hasTilt;
			}, 80);
		});
		const coarse = matchMedia('(pointer: coarse)');
		const tall = matchMedia('(orientation: portrait)');
		const media = () => {
			touch = coarse.matches;
			portrait = tall.matches;
		};
		media();
		coarse.addEventListener('change', media);
		tall.addEventListener('change', media);
		return () => {
			stopped = true;
			clearInterval(timer);
			coarse.removeEventListener('change', media);
			tall.removeEventListener('change', media);
			game?.dispose();
			void wakeLock?.release();
			wakeLock = undefined;
		};
	};

	async function start() {
		if (!game) return;
		// iOS only asks for motion access from a tap, so this goes first.
		const { askForMotion } = await import('#lib/race/input.ts');
		if (touch) await askForMotion();
		if (touch && !document.fullscreenElement) {
			await document.documentElement.requestFullscreen?.().catch(() => {});
			const o = screen.orientation as ScreenOrientation & { lock?(o: string): Promise<void> };
			await o.lock?.('landscape').catch(() => {});
		}
		await wakeLock?.release();
		wakeLock = await navigator.wakeLock?.request('screen').catch(() => undefined);
		game.start();
		hud = { ...game.hud };
	}

	function setPaused(paused: boolean) {
		game?.setPaused(paused);
		if (game) hud = { ...game.hud };
	}

	function quit() {
		if (!game) return;
		game.hud.phase = 'menu';
		setPaused(false);
		void wakeLock?.release();
	}

	function onVisibility() {
		const racing = hud?.phase === 'countdown' || hud?.phase === 'racing';
		if (document.visibilityState === 'hidden' && racing) setPaused(true);
	}

	function onKey(e: KeyboardEvent) {
		if (e.code === 'Escape' || e.code === 'KeyP') {
			if (hud?.phase === 'racing' || hud?.phase === 'countdown') setPaused(!hud.paused);
		}
		if (e.code === 'Enter' && (hud?.phase === 'menu' || hud?.phase === 'finished')) void start();
	}

	/** Holds a control down while a finger is on the button. */
	const hold =
		(key: 'throttle' | 'brake' | 'left' | 'right'): Attachment<HTMLElement> =>
		(el) => {
			const set = (on: boolean) => (e: PointerEvent) => {
				e.preventDefault();
				if (game) game.input.touch[key] = on;
				el.classList.toggle('down', on);
			};
			const down = set(true);
			const up = set(false);
			el.addEventListener('pointerdown', down);
			el.addEventListener('pointerup', up);
			el.addEventListener('pointercancel', up);
			el.addEventListener('pointerleave', up);
			return () => {
				el.removeEventListener('pointerdown', down);
				el.removeEventListener('pointerup', up);
				el.removeEventListener('pointercancel', up);
				el.removeEventListener('pointerleave', up);
			};
		};

	const ordinal = (n: number) => ['1st', '2nd', '3rd'][n - 1] ?? `${n}th`;
	const playing = $derived(hud?.phase === 'countdown' || hud?.phase === 'racing');
</script>

<svelte:document onvisibilitychange={onVisibility} />
<svelte:window onkeydown={onKey} />

<svelte:head><title>Race · Games</title></svelte:head>

<div class="race">
	<canvas {@attach mount} aria-label="Race track"></canvas>

	{#if !hud || hud.phase === 'menu'}
		<GamesButton />
		<section class="menu">
			<h1>Race<span>.</span></h1>
			<p class="tag">Three laps. Big hills. Bigger jumps.</p>
			<button class="go" onclick={start} disabled={!hud}>{hud ? 'Start race' : 'Loading…'}</button>
			<p class="help">
				{#if touch}
					Tilt the phone to steer. Hold <b>Gas</b> on the right, <b>Brake</b> on the left.
				{:else}
					Arrows or WASD to ride, Space to brake, Esc to pause.
				{/if}
			</p>
			{#if hud?.bestLap}<p class="record">Best lap {formatTime(hud.bestLap)}</p>{/if}
			<p class="links">
				{#if data.player}
					<a href="/boards/race">Leaderboard{rank ? ` · you’re ${ordinal(rank)}` : ''}</a>
				{:else}
					<a href="/profile?back=/race">Pick a name for the leaderboard</a>
				{/if}
			</p>
		</section>
	{/if}

	{#if hud && playing}
		<div class="hud">
			<div class="panel pos" data-testid="position">
				<small>Pos</small><strong>{hud.position}</strong><em>/{hud.racers}</em>
			</div>
			<div class="panel lap" data-testid="lap">
				<small>Lap</small><strong>{hud.lap}</strong><em>/{LAPS}</em>
			</div>
			<div class="panel times">
				<span>{formatTime(hud.lapTime)}</span>
				{#if hud.lastLap}<span class="last">Last {formatTime(hud.lastLap)}</span>{/if}
				{#if hud.bestLap}<span class="last">Best {formatTime(hud.bestLap)}</span>{/if}
			</div>
			<button class="panel pause" onclick={() => setPaused(true)} aria-label="Pause">
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zM14 5h3v14h-3z" /></svg>
			</button>
			<div class="speed" data-testid="speed">
				<strong>{hud.speedKmh}</strong><small>km/h</small>
			</div>
		</div>

		{#if hud.flash}
			<div class="cheer" aria-live="polite">{hud.flash}</div>
		{/if}

		{#if hud.phase === 'countdown'}
			<div class="count" aria-live="polite">{Math.ceil(hud.countdown)}</div>
		{:else if hud.raceTime < 1}
			<div class="count go-flash">Go</div>
		{/if}

		{#if touch}
			<div class="pedals">
				<div class="left">
					<button class="pad brake" {@attach hold('brake')}>Brake</button>
					{#if !tilt}
						<button class="pad steer" {@attach hold('left')} aria-label="Steer left">◀</button>
						<button class="pad steer" {@attach hold('right')} aria-label="Steer right">▶</button>
					{/if}
				</div>
				<button class="pad gas" {@attach hold('throttle')}>Gas</button>
			</div>
		{/if}
	{/if}

	{#if hud?.paused}
		<section class="sheet">
			<h2>Paused</h2>
			<button class="go" onclick={() => setPaused(false)}>Resume</button>
			<button class="ghost" onclick={start}>Restart</button>
			<button class="ghost" onclick={quit}>Quit</button>
		</section>
	{/if}

	{#if hud?.phase === 'finished' && hud.result}
		<GamesButton />
		<section class="sheet" data-testid="result">
			<p class="flag">Finished</p>
			<h2>{ordinal(hud.result.position)}</h2>
			<dl>
				<dt>Race</dt>
				<dd>{formatTime(hud.result.time)}</dd>
				<dt>Best lap</dt>
				<dd>{formatTime(hud.result.bestLap)}{hud.result.newRecord ? ' · record' : ''}</dd>
			</dl>
			{#if rank}<p class="links">
					<a href="/boards/race">{ordinal(rank)} on the leaderboard</a>
				</p>{/if}
			<button class="go" onclick={start}>Race again</button>
			<button class="ghost" onclick={quit}>Menu</button>
		</section>
	{/if}

	{#if touch && portrait}
		<div class="rotate">
			<svg viewBox="0 0 48 48" aria-hidden="true">
				<rect x="15" y="6" width="18" height="32" rx="2" />
				<path d="M8 30a18 18 0 0 0 16 12M8 30l-1 6M8 30l6 1" />
			</svg>
			<p>Turn your phone sideways</p>
		</div>
	{/if}
</div>

<style>
	/* Race: a dark, hard-edged HUD over the 3D scene. Signal yellow on near-black,
	   Russo One, square corners and a forward lean (skew) on every panel. */
	:global(:root:has(.race)) {
		--ink: #0d0f12;
		--panel: rgb(13 15 18 / 0.72);
		--line: rgb(255 255 255 / 0.14);
		--text: #f4f5f7;
		--muted: #a3a9b3;
		--signal: #ffd21f;
		--red: #e5323b;
		--display: 'Russo One', system-ui, sans-serif;
		--safe-l: max(14px, env(safe-area-inset-left));
		--safe-r: max(14px, env(safe-area-inset-right));
		--safe-b: max(14px, env(safe-area-inset-bottom));
		--safe-t: max(10px, env(safe-area-inset-top));
		color-scheme: dark;
	}

	:global(html:has(.race)),
	:global(html:has(.race) body) {
		margin: 0;
		height: 100%;
		overflow: hidden;
		background: var(--ink);
		color: var(--text);
		font:
			15px/1.4 system-ui,
			sans-serif;
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
		touch-action: none;
	}

	canvas {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}

	button {
		font: inherit;
		color: inherit;
		border: 0;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	h1,
	h2,
	.go,
	.ghost,
	.panel strong,
	.speed strong,
	.count,
	.pad,
	.flag {
		font-family: var(--display);
		font-weight: 400;
		text-transform: uppercase;
	}

	/* Menu: left-aligned over a dark wash, not a centred card. */
	.menu {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-start;
		gap: 10px;
		padding: var(--safe-t) var(--safe-r) var(--safe-b) calc(var(--safe-l) + 4vw);
		background: linear-gradient(
			90deg,
			rgb(13 15 18 / 0.92) 0%,
			rgb(13 15 18 / 0.55) 50%,
			transparent 80%
		);
	}

	h1 {
		margin: 0;
		font-size: clamp(64px, 15vmin, 140px);
		line-height: 0.9;
		letter-spacing: 0.02em;
		transform: skewX(-10deg);
	}

	h1 span {
		color: var(--signal);
	}

	.tag {
		margin: 0 0 10px;
		color: var(--muted);
		letter-spacing: 0.04em;
	}

	.go,
	.ghost {
		min-width: 200px;
		padding: 14px 26px;
		font-size: 20px;
		letter-spacing: 0.06em;
		clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
	}

	.go {
		background: var(--signal);
		color: var(--ink);
	}

	.go:disabled {
		opacity: 0.6;
	}

	.ghost {
		background: rgb(255 255 255 / 0.1);
		font-size: 16px;
		padding: 11px 26px;
	}

	.help,
	.record {
		margin: 4px 0 0;
		max-width: 34ch;
		color: var(--muted);
		font-size: 14px;
	}

	.help b {
		color: var(--text);
	}

	.record {
		color: var(--signal);
		font-family: var(--display);
	}

	/* HUD */
	.hud {
		position: fixed;
		inset: 0;
		pointer-events: none;
	}

	.panel {
		position: absolute;
		top: var(--safe-t);
		display: flex;
		align-items: baseline;
		gap: 4px;
		padding: 4px 14px 6px;
		background: var(--panel);
		border-bottom: 3px solid var(--signal);
		transform: skewX(-10deg);
	}

	.panel > * {
		transform: skewX(10deg);
	}

	.panel small {
		font-size: 11px;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-right: 4px;
	}

	.panel strong {
		font-size: 34px;
		line-height: 1;
	}

	.panel em {
		font-style: normal;
		color: var(--muted);
		font-family: var(--display);
		font-size: 16px;
	}

	.pos {
		left: var(--safe-l);
	}

	.lap {
		left: calc(var(--safe-l) + 128px);
	}

	.times {
		right: calc(var(--safe-r) + 58px);
		flex-direction: column;
		align-items: flex-end;
		gap: 0;
		font-variant-numeric: tabular-nums;
		font-family: var(--display);
		font-size: 20px;
	}

	.times .last {
		font-family: system-ui, sans-serif;
		font-size: 12px;
		color: var(--muted);
	}

	.pause {
		right: var(--safe-r);
		width: 46px;
		height: 46px;
		padding: 0;
		justify-content: center;
		align-items: center;
		pointer-events: auto;
		border-bottom-color: transparent;
	}

	.pause svg {
		width: 22px;
		fill: currentColor;
	}

	.speed {
		position: absolute;
		left: 50%;
		bottom: var(--safe-b);
		transform: translateX(-50%) skewX(-10deg);
		display: flex;
		align-items: baseline;
		gap: 6px;
		text-shadow: 0 2px 8px rgb(0 0 0 / 0.6);
	}

	.speed strong {
		font-size: 46px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		min-width: 3ch;
		text-align: right;
	}

	.speed small {
		color: var(--signal);
		font-weight: 600;
	}

	.count {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		font-size: clamp(90px, 30vmin, 220px);
		color: var(--signal);
		text-shadow: 0 6px 30px rgb(0 0 0 / 0.5);
		pointer-events: none;
		transform: skewX(-10deg);
	}

	.go-flash {
		animation: flash 1s ease-out forwards;
	}

	@keyframes flash {
		to {
			opacity: 0;
			transform: skewX(-10deg) scale(1.6);
		}
	}

	.cheer {
		position: fixed;
		left: 0;
		right: 0;
		top: 22%;
		text-align: center;
		font-family: var(--display);
		text-transform: uppercase;
		font-size: clamp(40px, 12vmin, 90px);
		color: var(--signal);
		-webkit-text-stroke: 2px var(--ink);
		text-shadow: 0 6px 20px rgb(0 0 0 / 0.45);
		pointer-events: none;
		animation: cheer 1.4s ease-out forwards;
	}

	@keyframes cheer {
		0% {
			transform: skewX(-10deg) scale(0.4);
		}
		15% {
			transform: skewX(-10deg) scale(1.15);
		}
		25%,
		80% {
			transform: skewX(-10deg) scale(1);
			opacity: 1;
		}
		100% {
			transform: skewX(-10deg) scale(1);
			opacity: 0;
		}
	}

	/* Touch pedals: big, at the thumbs. */
	.pedals {
		position: fixed;
		left: var(--safe-l);
		right: var(--safe-r);
		bottom: var(--safe-b);
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		pointer-events: none;
	}

	.pedals .left {
		display: flex;
		gap: 10px;
	}

	.pad {
		pointer-events: auto;
		width: 110px;
		height: 110px;
		padding: 0;
		font-size: 18px;
		letter-spacing: 0.06em;
		background: var(--panel);
		border: 2px solid var(--line);
		touch-action: none;
		clip-path: polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%);
	}

	.pad.gas {
		width: 130px;
		height: 130px;
		color: var(--ink);
		background: rgb(255 210 31 / 0.85);
	}

	.pad.brake {
		color: #fff;
		background: rgb(229 50 59 / 0.7);
	}

	.pad.steer {
		width: 80px;
		font-size: 26px;
	}

	.pad:global(.down) {
		filter: brightness(1.35);
		transform: scale(0.96);
	}

	/* Pause and results. */
	.sheet {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-start;
		gap: 10px;
		padding-left: calc(var(--safe-l) + 4vw);
		background: rgb(13 15 18 / 0.78);
	}

	.sheet h2 {
		margin: 0 0 8px;
		font-size: clamp(56px, 14vmin, 110px);
		line-height: 0.9;
		transform: skewX(-10deg);
		color: var(--signal);
	}

	.flag {
		margin: 0;
		color: var(--muted);
		letter-spacing: 0.2em;
	}

	dl {
		display: grid;
		grid-template-columns: auto auto;
		gap: 2px 18px;
		margin: 0 0 12px;
	}

	dt {
		color: var(--muted);
	}

	dd {
		margin: 0;
		font-family: var(--display);
		font-variant-numeric: tabular-nums;
	}

	.rotate {
		position: fixed;
		inset: 0;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 12px;
		background: var(--ink);
		font-family: var(--display);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.rotate svg {
		width: 72px;
		fill: none;
		stroke: var(--signal);
		stroke-width: 2;
		stroke-linecap: round;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 18px;
		margin: 10px 0 0;
		font-size: 14px;
	}
	.links a {
		color: var(--signal);
	}
</style>
