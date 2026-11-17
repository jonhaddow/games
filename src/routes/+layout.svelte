<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import '@fontsource/bungee';
	import './app.css';

	let { children }: { children: Snippet } = $props();

	/**
	 * Games that go on the home screen as their own app (static/<game>/): full
	 * screen and no zoom while playing. Everything else is the Games app.
	 */
	const APPS: Record<string, { title: string; theme: string }> = {
		'/squid': { title: 'Squid Spells', theme: '#071a3d' },
		'/crops': { title: 'Crops', theme: '#2f7a2c' }
	};
	const app = $derived(page.route.id ? APPS[page.route.id] : undefined);
</script>

<svelte:head>
	{#if app}
		<meta
			name="viewport"
			content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no"
		/>
		<link rel="manifest" href="{page.route.id}/manifest.webmanifest" />
		<link rel="apple-touch-icon" href="{page.route.id}/apple-touch-icon.png" />
		<meta name="apple-mobile-web-app-title" content={app.title} />
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
		<meta name="theme-color" content={app.theme} />
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
