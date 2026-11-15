<script lang="ts">
	import { page } from '$app/state';
	type Props = { player: { name: string; colour: string } | null };
	let { player }: Props = $props();
</script>

<a
	class="player"
	href="/profile?back={encodeURIComponent(page.url.pathname)}"
	style:--dot={player?.colour ?? '#fff'}
>
	<span class="dot" aria-hidden="true">{player ? player.name[0] : '?'}</span>
	{player ? player.name : 'Pick a name'}
</a>

<style>
	.player {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 5px 12px 5px 5px;
		background: var(--card);
		border: var(--line);
		border-radius: 999px;
		box-shadow: var(--shadow-small);
		color: var(--ink);
		font-weight: 800;
		text-decoration: none;
		max-width: 55%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.dot {
		flex: none;
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border: var(--line);
		border-radius: 50%;
		background: var(--dot);
		font: 15px/1 var(--display);
		text-transform: uppercase;
	}
</style>
