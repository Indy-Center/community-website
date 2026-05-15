<script lang="ts">
	let { children, text }: { children: any; text: string } = $props();

	let showTooltip = $state(false);
</script>

<div
	class="relative inline-block"
	onmouseenter={() => (showTooltip = true)}
	onmouseleave={() => (showTooltip = false)}
>
	{@render children()}

	{#if showTooltip}
		<div
			class="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 transform rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg"
		>
			{text}
			<div
				class="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 transform border-t-4 border-r-4 border-l-4 border-t-gray-900 border-r-transparent border-l-transparent"
			></div>
		</div>
	{/if}
</div>
