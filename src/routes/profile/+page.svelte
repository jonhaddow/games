<script lang="ts">
	import { enhance } from '$app/forms';
	import { COLOURS, NAME_MAX } from '#lib/games.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let colour = $derived(data.player?.colour ?? COLOURS[0]);
	let name = $derived(data.player?.name ?? '');
</script>

<svelte:head><title>Your name · Games</title></svelte:head>

<main class="page">
	<a class="back" href={data.back}>← Back</a>
	<h1>{data.player ? 'Your profile' : 'Pick a name'}</h1>
	<p class="lede">It goes on the leaderboards in every game on this device.</p>

	<form method="POST" use:enhance>
		<input type="hidden" name="back" value={data.back} />
		<label class="field">
			<span>Name</span>
			<input name="name" bind:value={name} maxlength={NAME_MAX} autocomplete="nickname" required />
		</label>

		<fieldset>
			<legend>Colour</legend>
			<div class="swatches">
				{#each COLOURS as c (c)}
					<label class="swatch" style:--c={c}>
						<input type="radio" name="colour" value={c} bind:group={colour} />
						<span class="sr">{c}</span>
					</label>
				{/each}
			</div>
		</fieldset>

		<div class="preview" style:--c={colour}>
			<span class="dot">{name.trim()[0] ?? '?'}</span>
			<span>{name.trim() || 'Your name'}</span>
		</div>

		{#if form?.error}<p class="error" role="alert">{form.error}</p>{/if}
		<button class="button">Save</button>
	</form>
</main>

<style>
	h1 {
		font-size: 36px;
	}
	.lede {
		margin: 8px 0 24px;
	}
	form {
		display: grid;
		gap: 22px;
	}
	.field {
		display: grid;
		gap: 6px;
		font-weight: 800;
	}
	input[name='name'] {
		padding: 12px 14px;
		border: var(--line);
		border-radius: 12px;
		box-shadow: var(--shadow-small);
		background: var(--card);
		color: var(--ink);
		font: 700 20px/1.2 var(--body);
	}
	input[name='name']:focus {
		outline: 3px solid var(--ink);
		outline-offset: 2px;
	}
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		padding: 0;
		margin-bottom: 8px;
		font-weight: 800;
	}
	.swatches {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px;
	}
	.swatch {
		aspect-ratio: 1;
		border: var(--line);
		border-radius: 50%;
		background: var(--c);
		cursor: pointer;
	}
	.swatch:has(:checked) {
		box-shadow:
			0 0 0 4px var(--bg),
			0 0 0 8px var(--ink);
	}
	.swatch:has(:focus-visible) {
		outline: 3px dashed var(--ink);
		outline-offset: 6px;
	}
	.swatch input,
	.sr {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
	.preview {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px;
		border: var(--line);
		border-radius: 999px;
		background: var(--card);
		font-weight: 800;
		font-size: 20px;
	}
	.dot {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: var(--line);
		border-radius: 50%;
		background: var(--c);
		font: 22px/1 var(--display);
		text-transform: uppercase;
	}
	.error {
		margin: 0;
		font-weight: 800;
	}
</style>
