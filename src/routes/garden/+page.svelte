<script lang="ts">
	import Garden from '#lib/garden/Garden.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Garden Defence · Games</title></svelte:head>

<Garden best={data.best} signedIn={!!data.player} />
