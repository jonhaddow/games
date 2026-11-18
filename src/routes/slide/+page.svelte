<script lang="ts">
	import Slide from '#lib/slide/Slide.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Slide Sort · Games</title></svelte:head>

<Slide best={data.best} signedIn={!!data.player} />
