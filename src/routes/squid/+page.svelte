<script lang="ts">
	import Squid from '#lib/squid/Squid.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Squid Spells</title></svelte:head>

<Squid name={data.player?.name ?? null} />
