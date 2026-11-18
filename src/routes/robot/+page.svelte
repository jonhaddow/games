<script lang="ts">
	import Robot from '#lib/robot/Robot.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Robot Path · Games</title></svelte:head>

<Robot best={data.best} signedIn={!!data.player} />
