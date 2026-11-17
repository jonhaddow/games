<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import '@fontsource/bungee';
	import './app.css';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	{#if page.route.id === '/squid'}
		<!-- Squid Spells goes on the home screen as its own app: landscape, full screen, no zoom while drawing. -->
		<meta
			name="viewport"
			content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
		/>
		<link rel="manifest" href="/squid/manifest.webmanifest" />
		<link rel="apple-touch-icon" href="/squid/apple-touch-icon.png" />
		<meta name="apple-mobile-web-app-title" content="Squid Spells" />
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
		<meta name="theme-color" content="#071a3d" />
	{:else}
		<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
		<meta name="text-scale" content="scale" />
		<link rel="manifest" href="/manifest.webmanifest" />
		<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
		<meta name="apple-mobile-web-app-title" content="Games" />
		<meta name="theme-color" content="#ffd400" />
	{/if}
</svelte:head>

{@render children()}
