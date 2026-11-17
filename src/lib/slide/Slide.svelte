<script lang="ts">
	import { flip } from 'svelte/animate';
	import GamesButton from '#lib/components/GamesButton.svelte';
	import { today } from '#lib/games.ts';
	import { postScore } from '#lib/scores.ts';
	import { PAR, SIZE, puzzleFor, slide, sorted, type Move } from './slide.ts';

	type Props = {
		/** The player's fewest moves today, or null before they've picked a name (then it's kept on this device). */
		best: number | null;
		/** Whether this device has picked a name, so scores go on the board. */
		signedIn: boolean;
	};
	let { best: serverBest, signedIn }: Props = $props();

	/** This device's fewest moves, and the day they were for. */
	const LOCAL_BEST = 'slide-best';
	/** A colour and a shape for each colour of tile, so they're told apart without colour too. */
	const TILES = [
		{ colour: '#ff5a5f', shape: 'M50 22 78 72H22z' },
		{ colour: '#ffbe0b', shape: 'M50 22a28 28 0 1 1 0 56 28 28 0 0 1 0-56z' },
		{ colour: '#2ec4b6', shape: 'M26 26h48v48H26z' },
		{ colour: '#3a86ff', shape: 'M50 18 82 50 50 82 18 50z' },
		{ colour: '#b388ff', shape: 'M50 18l9 21 23 2-17 15 5 23-20-12-20 12 5-23-17-15 23-2z' }
	];

	const day = today();
	const start = puzzleFor(day).grid;

	let grid = $state(start);
	/** Each tile's id, moved along with the colours, so it slides rather than jumps. */
	let ids = $state(start.map((_, i) => i));
	let moves = $state(0);
	let done = $derived(sorted(grid));
	let best = $derived(serverBest);
	let newBest = $state(false);
	let saving = $state(false);
	let saveFailed = $state(false);

	type Local = { day: string; moves: number };
	const readLocal = (): Local | null => {
		try {
			const saved = JSON.parse(localStorage.getItem(LOCAL_BEST) ?? 'null') as Local | null;
			return saved?.day === day ? saved : null;
		} catch {
			return null;
		}
	};

	// Today's best on this device counts too (see Stack).
	$effect(() => {
		const local = readLocal()?.moves;
		if (!signedIn) best = local ?? null;
		else if (local && (serverBest === null || local < serverBest))
			void postScore('slide', local).then((me) => {
				if (me) best = me.value;
			});
	});

	function move(m: Move) {
		if (done) return;
		grid = slide(grid, m);
		ids = slide(ids, m);
		moves++;
		navigator.vibrate?.(5);
		if (sorted(grid)) void solved();
	}

	async function solved() {
		newBest = best === null || moves < best;
		if (newBest) best = moves;
		const local = readLocal();
		if (!local || moves < local.moves)
			localStorage.setItem(LOCAL_BEST, JSON.stringify({ day, moves }));
		if (!signedIn) return;
		saving = true;
		saveFailed = false;
		const me = await postScore('slide', moves);
		saving = false;
		if (me) best = me.value;
		else saveFailed = true;
	}

	function again() {
		grid = start;
		ids = start.map((_, i) => i);
		moves = 0;
		newBest = false;
	}

	// Swiping: once a finger has gone a third of a tile along a row or column, that
	// line slides one place. One slide per swipe.
	let drag: { x: number; y: number; row: number; col: number; size: number } | null = null;

	function down(e: PointerEvent) {
		const board = e.currentTarget as HTMLElement;
		const box = board.getBoundingClientRect();
		const size = box.width / SIZE;
		const col = Math.floor((e.clientX - box.left) / size);
		const row = Math.floor((e.clientY - box.top) / size);
		if (col < 0 || row < 0 || col >= SIZE || row >= SIZE) return;
		board.setPointerCapture(e.pointerId);
		drag = { x: e.clientX, y: e.clientY, row, col, size };
	}

	function across(e: PointerEvent) {
		if (!drag) return;
		const dx = e.clientX - drag.x;
		const dy = e.clientY - drag.y;
		if (Math.max(Math.abs(dx), Math.abs(dy)) < drag.size / 3) return;
		if (Math.abs(dx) > Math.abs(dy)) move({ line: 'row', index: drag.row, dir: dx > 0 ? 1 : -1 });
		else move({ line: 'col', index: drag.col, dir: dy > 0 ? 1 : -1 });
		drag = null;
	}

	const up = () => (drag = null);
	const plural = (n: number) => `${n} ${n === 1 ? 'move' : 'moves'}`;
</script>

<div class="slide">
	{#if moves === 0 || done}<GamesButton />{/if}
	<nav class="corner"><a href="/boards/slide">Scores</a></nav>

	<header>
		<h1>Slide Sort</h1>
		<p>Swipe rows and columns until every row (or every column) is one colour.</p>
	</header>

	<div class="stats">
		<span>Moves <strong data-testid="moves">{moves}</strong></span>
		<span>Par <strong>{PAR}</strong></span>
		<span>Best <strong>{best ?? '–'}</strong></span>
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="board"
		class:done
		style:--size={SIZE}
		onpointerdown={down}
		onpointermove={across}
		onpointerup={up}
		onpointercancel={up}
	>
		{#each ids as id, i (id)}
			{@const tile = TILES[grid[i]]}
			<span
				class="tile"
				style:--c={tile.colour}
				data-colour={grid[i]}
				animate:flip={{ duration: 140 }}
			>
				<svg viewBox="0 0 100 100" aria-hidden="true"><path d={tile.shape} /></svg>
			</span>
		{/each}
	</div>

	{#if done}
		<div class="won" role="status">
			<h2>Sorted in {plural(moves)}!</h2>
			<p>
				{#if moves < PAR}Under par!{:else if moves === PAR}Right on par.{:else}Par is {PAR}.{/if}
				{#if newBest}A new best for today.{/if}
			</p>
			{#if saving}<p class="note">Saving…</p>{/if}
			{#if saveFailed}<p class="note">Couldn’t save that one.</p>{/if}
			<p class="note">A new puzzle tomorrow.</p>
			<div class="buttons">
				<button class="big" onclick={again}>Try for fewer</button>
				{#if signedIn}
					<a class="big plain" href="/boards/slide">Scores</a>
				{:else}
					<a class="big plain" href="/profile?back=/slide">Pick a name for the board</a>
				{/if}
			</div>
		</div>
	{:else if moves > 0}
		<button class="restart" onclick={again}>Start again</button>
	{/if}
</div>

<style>
	/* Slide Sort's own look: a dark tray of bright, chunky tiles. */
	.slide {
		--tray: #1d1b3a;
		--ink: #fff;
		--safe-top: env(safe-area-inset-top);
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding: calc(var(--safe-top) + 64px) 16px 24px;
		background: #2b2856;
		color: var(--ink);
		font-family: var(--display);
		overflow-y: auto;
		user-select: none;
		-webkit-user-select: none;
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
		border-radius: 10px;
		color: var(--tray);
		text-decoration: none;
	}
	header {
		text-align: center;
	}
	h1,
	h2 {
		margin: 0;
		line-height: 1.1;
	}
	h1 {
		font-size: 40px;
	}
	h2 {
		font-size: 24px;
	}
	p {
		margin: 6px 0 0;
		font-family: system-ui, sans-serif;
		font-weight: 600;
	}
	.stats {
		display: flex;
		gap: 22px;
		font-size: 16px;
	}
	.stats strong {
		font-size: 26px;
		font-weight: 400;
	}
	.board {
		--gap: 6px;
		width: min(100%, 420px);
		aspect-ratio: 1;
		display: grid;
		grid-template-columns: repeat(var(--size), 1fr);
		gap: var(--gap);
		padding: var(--gap);
		background: var(--tray);
		border-radius: 18px;
		touch-action: none;
		cursor: grab;
	}
	.tile {
		display: grid;
		place-items: center;
		background: var(--c);
		border-radius: 12px;
		box-shadow: inset 0 -5px 0 rgb(0 0 0 / 0.25);
	}
	.tile svg {
		width: 50%;
		fill: rgb(0 0 0 / 0.28);
	}
	.board.done .tile {
		animation: bounce 0.5s ease-out;
	}
	@keyframes bounce {
		40% {
			transform: scale(1.12);
		}
	}
	.won {
		width: min(100%, 420px);
		text-align: center;
	}
	.note {
		font-size: 14px;
		opacity: 0.8;
	}
	.buttons {
		display: grid;
		gap: 12px;
		margin-top: 14px;
	}
	.big,
	.restart {
		display: block;
		padding: 14px 18px;
		border: 0;
		border-radius: 14px;
		background: #ffbe0b;
		box-shadow: 0 5px 0 #b07f00;
		color: var(--tray);
		font: 22px/1 var(--display);
		text-decoration: none;
		cursor: pointer;
	}
	.big.plain {
		background: #fff;
		box-shadow: 0 5px 0 #9a97c4;
		font-size: 18px;
	}
	.restart {
		background: transparent;
		box-shadow: none;
		color: #fff;
		font-size: 16px;
		text-decoration: underline;
	}
</style>
