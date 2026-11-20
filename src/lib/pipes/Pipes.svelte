<script lang="ts">
	import GamesButton from '#lib/components/GamesButton.svelte';
	import { postScore } from '#lib/scores.ts';
	import { E, N, S, W, flow, levelFor, turn, type Puzzle } from './pipes.ts';

	type Props = {
		/** The player's levels on the board, or null before they've picked a name (then it's kept on this device). */
		best: number | null;
		/** Whether this device has picked a name, so scores go on the board. */
		signedIn: boolean;
	};
	let { best: serverBest, signedIn }: Props = $props();

	/** Levels cleared on this device. (It was the best run when Pipes had a clock, which carries on.) */
	const SAVE = 'pipes-best';
	/** How long the water takes to run along each tile once it's solved, in ms. */
	const RUN = 90;

	let phase = $state<'menu' | 'playing' | 'watered'>('menu');
	let cleared = $state(0);
	/** The level being played. */
	let level = $state(1);
	let puzzle = $state<Puzzle | null>(null);
	let saveFailed = $state(false);
	let water = $derived(puzzle ? flow(puzzle) : null);

	// Carry on from the furthest level, on this device or the board.
	$effect(() => {
		const local = Number(localStorage.getItem(SAVE) ?? 0) || 0;
		cleared = Math.max(local, serverBest ?? 0);
		// The device's levels count once a name is picked (see Stack).
		if (signedIn && local > (serverBest ?? 0)) void postScore('pipes', local);
	});

	function play() {
		level = cleared + 1;
		saveFailed = false;
		puzzle = levelFor(level);
		phase = 'playing';
	}

	function tap(i: number) {
		if (phase !== 'playing' || !puzzle) return;
		turn(puzzle, i);
		const { solved, depth } = flow(puzzle);
		if (!solved) return;
		phase = 'watered';
		navigator.vibrate?.(15);
		cleared++;
		localStorage.setItem(SAVE, String(cleared));
		if (signedIn) void postScore('pipes', cleared).then((me) => (saveFailed = !me));
		const longest = Math.max(...depth.values());
		setTimeout(
			() => {
				// Unless they've gone to the menu meanwhile.
				if (phase === 'watered') play();
			},
			longest * RUN + 900
		);
	}

	/** The arms of a pipe, from the middle of the tile to each opening's edge. */
	const ARMS = [
		{ bit: N, x: 38, y: 0, w: 24, h: 62 },
		{ bit: E, x: 38, y: 38, w: 62, h: 24 },
		{ bit: S, x: 38, y: 38, w: 24, h: 62 },
		{ bit: W, x: 0, y: 38, w: 62, h: 24 }
	];
	/** Each tile's shape as first drawn, which CSS then turns: so it spins the short way round. */
	let shapes = $derived(puzzle?.tiles.map((t) => unturn(t.open, t.turns)) ?? []);
	function unturn(open: number, turns: number) {
		for (let k = 0; k < (4 - (turns % 4)) % 4; k++) open = ((open << 1) | (open >> 3)) & 15;
		return open;
	}
</script>

<div class="pipes" data-phase={phase}>
	{#if phase === 'menu'}
		<GamesButton />
		<nav class="corner"><a href="/boards/pipes">Scores</a></nav>
		<div class="menu">
			<h1>Pipes</h1>
			<p>Tap the pipes to turn them. Get the water from the tap to the plant.</p>
			{#if cleared}<p class="best" data-testid="cleared">
					{cleared}
					{cleared === 1 ? 'level' : 'levels'} done
				</p>{/if}
			<button class="big" onclick={play}>Play level {cleared + 1}</button>
			{#if !signedIn}
				<a class="big plain" href="/profile?back=/pipes">Pick a name for the board</a>
			{/if}
		</div>
	{:else if puzzle && water}
		<div class="hud">
			<span>Level <strong data-testid="level">{level}</strong></span>
			{#if saveFailed}<span class="note">Couldn’t save that one.</span>{/if}
			<button class="small" onclick={() => (phase = 'menu')}>Menu</button>
		</div>
		<div class="board" style:--cols={puzzle.cols} style:--rows={puzzle.rows} style:--run="{RUN}ms">
			<span class="tap" style:grid-row={puzzle.startRow + 1} aria-hidden="true">
				<svg viewBox="0 0 40 40"
					><path d="M4 10h18v-6h8v6h4v12h-14v-4h-16z" /><circle
						class:dripping={water.depth.size > 0}
						cx="27"
						cy="30"
						r="4"
					/></svg
				>
			</span>
			{#each puzzle.tiles as tile, i (i)}
				{@const d = water.depth.get(i)}
				<button
					class="tile"
					class:wet={d !== undefined}
					style:grid-column={(i % puzzle.cols) + 2}
					style:grid-row={Math.floor(i / puzzle.cols) + 1}
					style:--d={d ?? 0}
					style:--turn="{tile.turns * 90}deg"
					aria-label="Pipe {i + 1}"
					data-open={tile.open}
					data-home={tile.home}
					onclick={() => tap(i)}
				>
					<!-- Outlines first, then fills over them, so the arms join without seams. -->
					<svg viewBox="0 0 100 100" aria-hidden="true">
						{#each ['edge', 'fill'] as layer (layer)}
							<g class={layer}>
								{#each ARMS as arm (arm.bit)}
									{#if shapes[i] & arm.bit}<rect
											x={arm.x}
											y={arm.y}
											width={arm.w}
											height={arm.h}
										/>{/if}
								{/each}
							</g>
						{/each}
					</svg>
				</button>
			{/each}
			<span
				class="plant"
				class:grown={phase === 'watered'}
				style:grid-row={puzzle.endRow + 1}
				style:grid-column={puzzle.cols + 2}
				aria-label={phase === 'watered' ? 'Watered!' : 'The plant'}
			>
				<svg viewBox="0 0 40 48" aria-hidden="true">
					<path class="stem" d="M20 34v-18" />
					<path
						class="leaf"
						d="M20 26c-8 0-12-4-12-10 7 0 12 4 12 10zM20 22c7 0 11-4 11-9-6 0-11 3-11 9z"
					/>
					<g class="flower">
						<circle cx="20" cy="11" r="8" />
						<circle class="middle" cx="20" cy="11" r="3.5" />
					</g>
					<path class="pot" d="M8 32h24l-3 14h-18z" />
				</svg>
			</span>
		</div>
	{/if}
</div>

<style>
	/* Pipes' own look: a garden, copper pipes and blue water. */
	.pipes {
		--grass: #7ccf5b;
		--soil: #6b4a2f;
		--ink: #233018;
		--copper: #c9783d;
		--water: #2f8fff;
		--safe-top: env(safe-area-inset-top);
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: calc(var(--safe-top) + 20px) 12px 20px;
		background: radial-gradient(circle at 50% 0, #a9e88a, var(--grass) 70%);
		color: var(--ink);
		font-family: var(--display);
		user-select: none;
		-webkit-user-select: none;
		overflow: hidden;
	}
	.corner {
		position: absolute;
		top: max(12px, var(--safe-top));
		right: 12px;
	}
	.corner a {
		display: block;
		padding: 8px 12px;
		background: var(--ink);
		border-radius: 10px;
		color: #fff;
		text-decoration: none;
	}
	.menu {
		margin-top: 70px;
		width: min(340px, 100%);
		display: grid;
		gap: 14px;
		text-align: center;
	}
	h1 {
		margin: 0;
		line-height: 1;
		font-size: 64px;
		color: var(--soil);
	}
	.menu p {
		margin: 0;
		font-family: system-ui, sans-serif;
		font-weight: 700;
	}
	.menu .best {
		font-family: var(--display);
		font-weight: 400;
		font-size: 22px;
	}
	.note {
		font-size: 14px;
	}
	.big {
		display: block;
		padding: 14px 18px;
		border: 3px solid var(--ink);
		border-radius: 14px;
		background: var(--copper);
		box-shadow: 0 5px 0 var(--ink);
		color: #fff;
		font: 24px/1 var(--display);
		text-decoration: none;
		cursor: pointer;
	}
	.big:active {
		transform: translateY(3px);
		box-shadow: 0 2px 0 var(--ink);
	}
	.big.plain {
		background: #fff;
		color: var(--ink);
		font-size: 18px;
	}
	.hud {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: min(440px, 100%);
		font-size: 20px;
	}
	.hud strong {
		font-size: 30px;
		font-weight: 400;
	}
	.small {
		padding: 8px 12px;
		border: 0;
		border-radius: 10px;
		background: #fff;
		color: var(--ink);
		font: 15px var(--display);
		cursor: pointer;
	}
	/* The tap and plant sit in the columns either side of the grid. */
	.board {
		--size: min(
			calc((100vw - 24px) / (var(--cols) + 1.6)),
			calc((100dvh - var(--safe-top) - 120px) / var(--rows)),
			84px
		);
		margin: auto 0;
		display: grid;
		grid-template-columns: calc(var(--size) * 0.8) repeat(var(--cols), var(--size)) calc(
				var(--size) * 0.8
			);
		grid-template-rows: repeat(var(--rows), var(--size));
	}
	.tile {
		margin: 0;
		padding: 0;
		border: 2px solid rgb(0 0 0 / 0.12);
		background: #8a6440;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}
	.tile svg {
		display: block;
		width: 100%;
		height: 100%;
		transform: rotate(var(--turn));
		transition: transform 0.15s ease-out;
	}
	.tile .edge rect {
		fill: #7a4320;
		stroke: #7a4320;
		stroke-width: 8;
	}
	.tile .fill rect {
		fill: var(--copper);
		transition: fill 0.2s;
	}
	.tile.wet .edge rect {
		fill: #1659a8;
		stroke: #1659a8;
	}
	.tile.wet .fill rect {
		fill: var(--water);
	}
	[data-phase='watered'] .tile.wet .fill rect {
		transition-delay: calc(var(--d) * var(--run));
		fill: #8fd3ff;
	}
	.tap,
	.plant {
		display: grid;
		place-items: center;
	}
	.tap {
		grid-column: 1;
	}
	.tap svg,
	.plant svg {
		width: 90%;
		fill: #9aa7b3;
		stroke: var(--ink);
		stroke-width: 2;
	}
	.tap circle {
		fill: var(--water);
		stroke: none;
		opacity: 0;
	}
	.tap circle.dripping {
		animation: drip 0.8s ease-in infinite;
	}
	@keyframes drip {
		0% {
			opacity: 1;
			transform: translateY(-4px);
		}
		100% {
			opacity: 0;
			transform: translateY(6px);
		}
	}
	.plant .pot {
		fill: #d0603a;
	}
	.plant .stem {
		fill: none;
		stroke: #2f7a1f;
		stroke-width: 3;
	}
	.plant .leaf {
		fill: #3fa52a;
		stroke-width: 1.5;
	}
	.plant .flower {
		fill: #ffcf33;
		stroke-width: 1.5;
		transform-origin: 20px 14px;
		transform: scale(0.2);
		opacity: 0;
		transition:
			transform 0.4s cubic-bezier(0.3, 1.6, 0.5, 1),
			opacity 0.2s;
	}
	.plant .middle {
		fill: #e0662b;
	}
	.plant.grown .flower {
		transform: none;
		opacity: 1;
		transition-delay: 0.5s;
	}
</style>
