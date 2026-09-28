<script lang="ts">
	import IconStar from '~icons/mdi/star';
	import IconStarHalf from '~icons/mdi/star-half-full';
	import IconStarOutline from '~icons/mdi/star-outline';

	// Read-only 0-5 star display, rounded to the nearest half star
	let {
		value,
		label,
		class: className = 'h-4 w-4'
	}: { value: number; label: string; class?: string } = $props();

	const rounded = $derived(Math.round(value * 2) / 2);
</script>

<span class="flex" role="img" aria-label={label}>
	{#each [1, 2, 3, 4, 5] as n}
		{#if n <= rounded}
			<IconStar class={className} />
		{:else if n - 0.5 === rounded}
			<IconStarHalf class={className} />
		{:else}
			<IconStarOutline class="{className} text-slate-600" />
		{/if}
	{/each}
</span>
