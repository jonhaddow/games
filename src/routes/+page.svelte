<script lang="ts">
	import { GAMES } from '#lib/games.ts';
	import Player from '#lib/components/Player.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Games</title></svelte:head>

<main class="page">
	<header>
		<h1>Games</h1>
		<Player player={data.player} />
	</header>

	<ul class="tiles">
		{#each GAMES as game (game.key)}
			{@const mine = data.bests[game.key]}
			<li class="tile">
				<a class="play" href={game.path}>
					<img src="/icons/{game.key}.png" alt="" width="96" height="96" />
					<span class="name">{game.name}</span>
					<span class="blurb">{game.blurb}</span>
				</a>
				{#if game.board}
					<a class="board" href="/boards/{game.key}">
						<span>{game.board.title}</span>
						{#if mine !== undefined}<strong>You: {game.board.format(mine)}</strong>{/if}
					</a>
				{/if}
			</li>
		{/each}
	</ul>
</main>

<style>
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 24px;
	}
	h1 {
		font-size: 44px;
	}
	.tiles {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 18px;
	}
	.tile {
		display: flex;
		flex-direction: column;
		background: var(--card);
		border: var(--line);
		border-radius: 14px;
		box-shadow: var(--shadow);
		overflow: hidden;
	}
	.play {
		flex: 1;
		display: grid;
		justify-items: start;
		align-content: start;
		gap: 4px;
		padding: 12px;
		color: inherit;
		text-decoration: none;
	}
	.play:active {
		background: var(--press);
	}
	img {
		width: 64px;
		height: 64px;
		border: var(--line);
		border-radius: 12px;
		margin-bottom: 6px;
	}
	.name {
		font: 20px/1 var(--display);
	}
	.blurb {
		font-size: 13px;
		line-height: 1.3;
	}
	.board {
		display: grid;
		padding: 8px 12px;
		border-top: var(--line);
		background: var(--ink);
		color: var(--bg);
		font-size: 12px;
		font-weight: 700;
		text-decoration: none;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.board strong {
		color: #fff;
		font-size: 13px;
		text-transform: none;
		letter-spacing: 0;
	}
</style>
