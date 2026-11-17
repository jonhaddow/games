<script lang="ts">
	import { browser } from '$app/env';
	import Crops from '#lib/crops/Crops.svelte';
</script>

<svelte:head><title>Crops</title></svelte:head>

<!-- The farm is in localStorage, so the game only runs in the browser. The page
     is still server-rendered, so it opens offline with no data to fetch. -->
{#if browser}<Crops />{/if}
