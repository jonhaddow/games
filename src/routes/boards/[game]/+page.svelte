<script lang="ts">
	import { GAMES, byKey } from '#lib/games.ts';
	import Player from '#lib/components/Player.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let game = $derived(byKey(data.game)!);
	let board = $derived(game.board!);
	const boards = GAMES.filter((g) => g.board);
</script>

<svelte:head><title>{game.name} · Games</title></svelte:head>

<main class="page">
	<header>
		<a class="back" href="/">← Games</a>
		<Player player={data.player} />
	</header>

	<nav class="tabs" aria-label="Leaderboards">
		{#each boards as g (g.key)}
			<a href="/boards/{g.key}" aria-current={g.key === data.game ? 'page' : undefined}>{g.name}</a>
		{/each}
	</nav>

	<h1>{board.title}</h1>

	{#if data.rows.length}
		<ol class="rows">
			{#each data.rows as row, i (i)}
				<li class:me={row.me}>
					<span class="rank">{i + 1}</span>
					<span class="dot" style:--c={row.colour}>{row.name[0]}</span>
					<span class="who">{row.name}</span>
					<span class="value">{board.format(row.value)}</span>
				</li>
			{/each}
		</ol>
		{#if data.me && data.me.rank > data.rows.length}
			<p class="mine">You’re number {data.me.rank}, with {board.format(data.me.value)}.</p>
		{/if}
	{:else}
		<p class="empty">Nobody’s on this board yet.</p>
	{/if}

	<a class="button" href={game.url}>Play {game.name}</a>
</main>

<style>
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 18px;
	}
	.tabs {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		margin-bottom: 20px;
	}
	.tabs a {
		flex: none;
		padding: 8px 12px;
		border: var(--line);
		border-radius: 10px;
		background: var(--card);
		color: var(--ink);
		font-weight: 800;
		text-decoration: none;
	}
	.tabs a[aria-current='page'] {
		background: var(--ink);
		color: var(--bg);
	}
	h1 {
		font-size: 28px;
		margin-bottom: 14px;
	}
	.rows {
		list-style: none;
		margin: 0 0 24px;
		padding: 0;
		border: var(--line);
		border-radius: 14px;
		box-shadow: var(--shadow);
		overflow: hidden;
		background: var(--card);
	}
	.rows li {
		display: grid;
		grid-template-columns: 28px 34px 1fr auto;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
	}
	.rows li + li {
		border-top: 2px solid var(--ink);
	}
	.rows li.me {
		background: var(--press);
	}
	.rank {
		font: 18px/1 var(--display);
	}
	.dot {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border: var(--line);
		border-radius: 50%;
		background: var(--c);
		font: 15px/1 var(--display);
		text-transform: uppercase;
	}
	.who {
		font-weight: 800;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.value {
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}
	.mine {
		margin: -10px 0 24px;
		font-weight: 800;
	}
</style>
