<script lang="ts">
	import '@fontsource-variable/big-shoulders-stencil';
	import Game from '#lib/stack/Game.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Stack · Games</title></svelte:head>

<Game best={data.best} signedIn={!!data.player} />
