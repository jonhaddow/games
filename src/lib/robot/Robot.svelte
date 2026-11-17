<script lang="ts">
	import GamesButton from '#lib/components/GamesButton.svelte';
	import { postScore } from '#lib/scores.ts';
	import { MAX_ARROWS, levelFor, roll, run, starsFor, type Dir, type Level } from './robot.ts';

	type Props = {
		/** The player's most stars so far, or null before they've picked a name (then it's kept on this device). */
		best: number | null;
		/** Whether this device has picked a name, so scores go on the board. */
		signedIn: boolean;
	};
	let { best: serverBest, signedIn }: Props = $props();

	/** Stars won on each level (index 0 is level 1). */
	const SAVE = 'robot-v1';
	/** How long the robot takes to roll one cell, in ms. */
	const STEP = 130;
	const ARROW: Record<Dir, string> = { up: '↑', right: '→', down: '↓', left: '←' };

	let stars = $state<number[]>([]);
	let total = $derived(stars.reduce((a, b) => a + b, 0));
	let phase = $state<'menu' | 'plan' | 'running' | 'won'>('menu');
	let n = $state(1);
	let level = $state<Level>(levelFor(1));
	let program = $state<Dir[]>([]);
	/** Where the robot is (a cell), and which arrow it's on while running. */
	let at = $state(0);
	let arrow = $state(-1);
	let got = $state<number[]>([]);
	let missed = $state(false);
	let won = $state(0);
	let saveFailed = $state(false);

	$effect(() => {
		let saved: number[] = [];
		try {
			saved = (JSON.parse(localStorage.getItem(SAVE) ?? '{}') as { stars?: number[] }).stars ?? [];
		} catch {
			// A broken save starts again.
		}
		stars = saved;
		// The device's stars count once a name is picked (see Stack).
		const sum = saved.reduce((a, b) => a + b, 0);
		if (signedIn && sum > (serverBest ?? 0)) void postScore('robot', sum);
	});

	function play(levelNumber: number) {
		n = levelNumber;
		level = levelFor(n);
		program = [];
		saveFailed = false;
		reset();
		phase = 'plan';
	}

	function reset() {
		at = level.start;
		arrow = -1;
		got = [];
	}

	function add(dir: Dir) {
		if (phase !== 'plan' || program.length >= MAX_ARROWS) return;
		missed = false;
		program.push(dir);
	}

	let timer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => () => clearTimeout(timer));

	function go() {
		if (phase !== 'plan' || !program.length) return;
		missed = false;
		reset();
		phase = 'running';
		// Each arrow's cells in turn, so the strip can show which arrow is running.
		const steps: { cell: number; arrow: number }[] = [];
		let from = level.start;
		program.forEach((dir, i) => {
			const cells = roll(level, from, dir);
			for (const cell of cells) steps.push({ cell, arrow: i });
			// An arrow that can't move still takes a beat.
			if (!cells.length) steps.push({ cell: from, arrow: i });
			from = cells.at(-1) ?? from;
		});
		const solved = run(level, program).solved;
		let k = 0;
		const next = () => {
			if (k < steps.length) {
				at = steps[k].cell;
				arrow = steps[k].arrow;
				if (level.gems.includes(at) && !got.includes(at)) got.push(at);
				k++;
				timer = setTimeout(next, STEP);
			} else if (solved) {
				void win();
			} else {
				missed = true;
				timer = setTimeout(() => {
					reset();
					phase = 'plan';
				}, 700);
			}
		};
		timer = setTimeout(next, STEP);
	}

	async function win() {
		won = starsFor(level, program.length);
		phase = 'won';
		navigator.vibrate?.(20);
		if (won <= (stars[n - 1] ?? 0)) return;
		const next = Array.from({ length: Math.max(stars.length, n) }, (_, i) => stars[i] ?? 0);
		next[n - 1] = won;
		stars = next;
		localStorage.setItem(SAVE, JSON.stringify({ stars }));
		if (!signedIn) return;
		saveFailed = !(await postScore('robot', total));
	}

	/** The next level to play: the first without stars. */
	let nextLevel = $derived(stars.findIndex((s) => !s) + 1 || stars.length + 1);
	const cellStyle = (cell: number) =>
		`--x:${cell % level.cols};--y:${Math.floor(cell / level.cols)}`;
	const starText = (k: number) => '★'.repeat(k) + '☆'.repeat(3 - k);
</script>

<div class="robot" data-phase={phase}>
	{#if phase === 'menu'}
		<GamesButton />
		<nav class="corner"><a href="/boards/robot">Scores</a></nav>
		<div class="menu">
			<h1>Robot Path</h1>
			<p>
				Plan the robot’s moves with the arrows, then press Go. It rolls until it bumps into
				something. Collect every gem!
			</p>
			<p class="total" data-testid="total">★ {total}</p>
			<button class="big" onclick={() => play(nextLevel)}>Play level {nextLevel}</button>
			{#if stars.length}
				<ol class="levels" aria-label="Levels">
					{#each stars as s, i (i)}
						<li>
							<button onclick={() => play(i + 1)}>
								<strong>{i + 1}</strong>
								<span class="stars" aria-label="{s} stars">{starText(s)}</span>
							</button>
						</li>
					{/each}
				</ol>
			{/if}
		</div>
	{:else}
		{#if phase === 'won'}<GamesButton />{/if}
		<div class="hud">
			<span>Level <strong data-testid="level">{n}</strong></span>
			<span>Par <strong>{level.par}</strong></span>
			<button class="small" onclick={() => (phase = 'menu')} disabled={phase === 'running'}
				>Levels</button
			>
		</div>

		<div class="board" style:--cols={level.cols} style:--rows={level.rows} class:missed>
			{#each level.rocks as rock (rock)}
				<span class="thing rock" style={cellStyle(rock)}></span>
			{/each}
			{#each level.gems as gem (gem)}
				{#if !got.includes(gem)}
					<span class="thing gem" style={cellStyle(gem)} aria-label="Gem"></span>
				{/if}
			{/each}
			<span class="thing bot" style={cellStyle(at)} style:--step="{STEP}ms" aria-label="Robot">
				<svg viewBox="0 0 40 40" aria-hidden="true">
					<line x1="20" y1="4" x2="20" y2="10" />
					<circle class="tip" cx="20" cy="4" r="3" />
					<rect x="7" y="10" width="26" height="22" rx="7" />
					<circle class="eye" cx="15" cy="20" r="3.2" />
					<circle class="eye" cx="25" cy="20" r="3.2" />
					<rect class="mouth" x="14" y="26" width="12" height="2.5" rx="1.2" />
				</svg>
			</span>
		</div>

		<ol class="program" aria-label="Moves">
			{#each { length: MAX_ARROWS }, i (i)}
				<li class:on={i === arrow} class:filled={i < program.length}>{ARROW[program[i]] ?? ''}</li>
			{/each}
		</ol>

		{#if phase === 'won'}
			<div class="won" role="status">
				<p class="big-stars">{starText(won)}</p>
				<h2>{program.length === 1 ? '1 move' : `${program.length} moves`}</h2>
				<p>
					{#if won === 3}Perfect: that’s par!{:else}Par is {level.par}. Can you do it in fewer?{/if}
				</p>
				{#if saveFailed}<p class="note">Couldn’t save that one.</p>{/if}
				{#if !signedIn}<p class="note">
						<a href="/profile?back=/robot">Pick a name</a> to put your stars on the board.
					</p>{/if}
				<div class="row">
					<button class="big plain" onclick={() => play(n)}>Try again</button>
					<button class="big" onclick={() => play(n + 1)}>Next level</button>
				</div>
			</div>
		{:else}
			<p class="hint" aria-live="polite">
				{#if missed}Missed a gem! Change your moves and try again.{:else}&nbsp;{/if}
			</p>
			<div class="pad">
				{#each ['up', 'left', 'down', 'right'] as const as dir (dir)}
					<button
						class="key {dir}"
						onclick={() => add(dir)}
						disabled={phase !== 'plan'}
						aria-label={dir}>{ARROW[dir]}</button
					>
				{/each}
				<button
					class="key undo"
					onclick={() => program.pop()}
					disabled={phase !== 'plan' || !program.length}
					aria-label="Undo">⌫</button
				>
				<button class="key go" onclick={go} disabled={phase !== 'plan' || !program.length}
					>Go</button
				>
			</div>
		{/if}
	{/if}
</div>

<style>
	/* Robot Path's own look: a moonbase at night, a friendly teal robot and bright gems. */
	.robot {
		--night: #141b33;
		--floor: #e8ecf5;
		--ink: #fff;
		--teal: #22c3a6;
		--gem: #ff4fa3;
		--safe-top: env(safe-area-inset-top);
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: calc(var(--safe-top) + 14px) 14px 18px;
		background: radial-gradient(circle at 50% 0, #2a3766, var(--night) 70%);
		color: var(--ink);
		font-family: var(--display);
		overflow-y: auto;
		user-select: none;
		-webkit-user-select: none;
	}
	button {
		font-family: var(--display);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
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
		color: var(--night);
		text-decoration: none;
	}
	.menu {
		margin-top: 56px;
		width: min(380px, 100%);
		display: grid;
		gap: 14px;
		text-align: center;
	}
	h1,
	h2 {
		margin: 0;
		line-height: 1.05;
	}
	h1 {
		font-size: 46px;
		color: var(--teal);
	}
	p {
		margin: 0;
		font-family: system-ui, sans-serif;
		font-weight: 600;
	}
	.total {
		font: 34px/1 var(--display);
		color: #ffd400;
	}
	.big {
		padding: 14px 18px;
		border: 0;
		border-radius: 14px;
		background: var(--teal);
		box-shadow: 0 5px 0 #138772;
		color: var(--night);
		font-size: 22px;
		text-decoration: none;
	}
	.big:active {
		transform: translateY(3px);
		box-shadow: 0 2px 0 #138772;
	}
	.big.plain {
		background: #fff;
		box-shadow: 0 5px 0 #8f9bc0;
	}
	.levels {
		list-style: none;
		margin: 6px 0 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
	}
	.levels button {
		width: 100%;
		display: grid;
		gap: 2px;
		padding: 8px 4px;
		border: 0;
		border-radius: 10px;
		background: rgb(255 255 255 / 0.1);
		color: #fff;
	}
	.levels strong {
		font-size: 20px;
		font-weight: 400;
	}
	.stars {
		color: #ffd400;
		font-size: 13px;
		letter-spacing: 1px;
	}
	.hud {
		width: min(420px, 100%);
		min-height: 44px;
		padding-left: 130px;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 16px;
	}
	.hud strong {
		font-size: 26px;
		font-weight: 400;
	}
	.small {
		padding: 8px 12px;
		border: 0;
		border-radius: 10px;
		background: #fff;
		color: var(--night);
		font-size: 15px;
	}
	/* Things sit on the board by cell (--x, --y), so the robot can glide between them. */
	.board {
		--cell: min(calc((100vw - 28px) / var(--cols)), calc((100dvh - 380px) / var(--rows)), 60px);
		position: relative;
		width: calc(var(--cell) * var(--cols));
		height: calc(var(--cell) * var(--rows));
		background: repeating-conic-gradient(var(--floor) 0 25%, #d6dcea 0 50%) 0 0 /
			calc(var(--cell) * 2) calc(var(--cell) * 2);
		border: 4px solid #0a0f20;
		border-radius: 10px;
		box-sizing: content-box;
	}
	.board.missed {
		animation: shake 0.35s;
	}
	@keyframes shake {
		25% {
			transform: translateX(-6px);
		}
		75% {
			transform: translateX(6px);
		}
	}
	.thing {
		position: absolute;
		left: 0;
		top: 0;
		width: var(--cell);
		height: var(--cell);
		transform: translate(calc(var(--x) * var(--cell)), calc(var(--y) * var(--cell)));
	}
	.rock::before {
		content: '';
		position: absolute;
		inset: 8%;
		background: #6d7488;
		border-radius: 42% 50% 38% 46%;
		box-shadow: inset -4px -5px 0 #4b5163;
	}
	.gem::before {
		content: '';
		position: absolute;
		inset: 26%;
		background: var(--gem);
		transform: rotate(45deg);
		border-radius: 3px;
		box-shadow: inset 4px 4px 0 rgb(255 255 255 / 0.5);
		animation: glint 1.6s ease-in-out infinite;
	}
	@keyframes glint {
		50% {
			transform: rotate(45deg) scale(0.86);
		}
	}
	.bot {
		z-index: 1;
		transition: transform var(--step) linear;
	}
	.bot svg {
		width: 100%;
		height: 100%;
		stroke: #0a0f20;
		stroke-width: 2;
	}
	.bot rect {
		fill: var(--teal);
	}
	.bot .tip {
		fill: #ffd400;
	}
	.bot .eye,
	.bot .mouth {
		fill: #0a0f20;
		stroke: none;
	}
	.program {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(7, 34px);
		gap: 6px;
	}
	.program li {
		height: 34px;
		display: grid;
		place-items: center;
		border: 2px dashed rgb(255 255 255 / 0.25);
		border-radius: 8px;
		font:
			22px/1 system-ui,
			sans-serif;
		font-weight: 800;
	}
	.program li.filled {
		border: 0;
		background: #fff;
		color: var(--night);
	}
	.program li.on {
		background: #ffd400;
	}
	.hint {
		min-height: 1.3em;
		color: #ffb3d6;
		font-size: 15px;
		text-align: center;
	}
	.pad {
		display: grid;
		grid-template-columns: repeat(3, 64px) 18px 72px;
		grid-template-areas:
			'undo up . . go'
			'left down right . go';
		gap: 8px;
	}
	.key {
		height: 58px;
		border: 0;
		border-radius: 14px;
		background: #fff;
		box-shadow: 0 4px 0 #8f9bc0;
		color: var(--night);
		font:
			800 28px/1 system-ui,
			sans-serif;
	}
	.key:active:not(:disabled) {
		transform: translateY(3px);
		box-shadow: 0 1px 0 #8f9bc0;
	}
	.up {
		grid-area: up;
	}
	.left {
		grid-area: left;
	}
	.down {
		grid-area: down;
	}
	.right {
		grid-area: right;
	}
	.undo {
		grid-area: undo;
		font-size: 22px;
		background: #c9d0e4;
	}
	.go {
		grid-area: go;
		height: auto;
		background: var(--teal);
		box-shadow: 0 4px 0 #138772;
		font: 24px/1 var(--display);
	}
	.won {
		width: min(380px, 100%);
		display: grid;
		gap: 8px;
		text-align: center;
	}
	.big-stars {
		font-size: 44px;
		line-height: 1;
		color: #ffd400;
	}
	.note {
		font-size: 14px;
		opacity: 0.85;
	}
	.note a {
		color: #fff;
	}
	.row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-top: 6px;
	}
</style>
