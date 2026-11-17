<!-- The way back to the home screen from inside a game. Every game shows it in the
     same place with the same look (the home screen's, not the game's), on its own
     menus and end screens, never mid-play. Colours and font are fixed because each
     game redefines --ink, --display and friends. Stopping pointerdown keeps Stack
     from starting a round, as it starts on a tap anywhere. -->
<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		/**
		 * The game installs as its own home-screen app (full screen, its own scope).
		 * There the button would take a kid out of the app, or to an error page
		 * offline, so it only shows in the browser. iOS reports every home-screen
		 * app as standalone, so on iOS it's off in the Games app too.
		 */
		ownApp?: boolean;
		/** In the game's own top bar rather than fixed in the corner. */
		inline?: boolean;
	};
	let { ownApp = false, inline = false }: Props = $props();

	/** Not installed as an app: known once it's in the browser. */
	let inBrowser = $state(false);
	onMount(() => {
		inBrowser = !(
			matchMedia('(display-mode: fullscreen)').matches ||
			(navigator as { standalone?: boolean }).standalone === true
		);
	});
	const show = $derived(!ownApp || inBrowser);
</script>

{#if show}
	<a class="games-button" class:inline href="/" onpointerdown={(e) => e.stopPropagation()}>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<rect x="3" y="3" width="8" height="8" rx="2" />
			<rect x="13" y="3" width="8" height="8" rx="2" />
			<rect x="3" y="13" width="8" height="8" rx="2" />
			<rect x="13" y="13" width="8" height="8" rx="2" />
		</svg>
		Games
	</a>
{/if}

<style>
	.games-button {
		position: fixed;
		z-index: 10;
		top: max(12px, env(safe-area-inset-top));
		left: max(12px, env(safe-area-inset-left));
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px 8px 9px;
		background: #ffd400;
		border: 3px solid #111;
		border-radius: 999px;
		box-shadow: 3px 3px 0 #111;
		color: #111;
		font:
			15px/1 'Bungee',
			system-ui,
			sans-serif;
		text-decoration: none;
		pointer-events: auto;
		-webkit-tap-highlight-color: transparent;
	}
	.inline {
		position: static;
	}
	.games-button:active {
		transform: translate(2px, 2px);
		box-shadow: 1px 1px 0 #111;
	}
	svg {
		width: 18px;
		height: 18px;
		fill: currentColor;
	}
</style>
