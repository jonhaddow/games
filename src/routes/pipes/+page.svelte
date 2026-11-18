<script lang="ts">
	import Pipes from '#lib/pipes/Pipes.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Pipes · Games</title></svelte:head>

<Pipes best={data.best} signedIn={!!data.player} />
