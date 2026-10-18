<script lang="ts">
	// PROTOTYPE (prototype/chrome): a disclosure: a button that shows and hides a
	// panel. Navigation menus are lists of links, so no menu roles; Escape and
	// a click outside close it, and Escape puts focus back on the button.
	import type { Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';

	let {
		trigger,
		children,
		label,
		align = 'left',
		buttonClass = '',
		panelClass = ''
	}: {
		trigger: Snippet<[boolean]>;
		children: Snippet;
		label?: string;
		align?: 'left' | 'right';
		buttonClass?: string;
		panelClass?: string;
	} = $props();

	let open = $state(false);
	let root: HTMLElement;
	let button: HTMLButtonElement;
	const uid = $props.id();
	const id = `pop-${uid}`;

	afterNavigate(() => (open = false));
</script>

<svelte:document
	onclick={(e) => {
		if (open && !root.contains(e.target as Node)) open = false;
	}}
	onkeydown={(e) => {
		if (open && e.key === 'Escape') {
			open = false;
			button.focus();
		}
	}}
	onfocusin={(e) => {
		if (open && !root.contains(e.target as Node)) open = false;
	}}
/>

<div class="relative" bind:this={root}>
	<button
		bind:this={button}
		type="button"
		class={buttonClass}
		aria-expanded={open}
		aria-controls={id}
		aria-label={label}
		onclick={() => (open = !open)}
	>
		{@render trigger(open)}
	</button>
	<div
		{id}
		hidden={!open}
		class="absolute top-full z-50 mt-2 rounded-lg border border-slate-700 bg-slate-800 shadow-xl {align ===
		'right'
			? 'right-0'
			: 'left-0'} {panelClass}"
	>
		{@render children()}
	</div>
</div>
