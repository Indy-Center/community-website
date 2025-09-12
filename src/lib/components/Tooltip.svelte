<script lang="ts">
	let { children, text }: { children: any; text: string } = $props();
	
	let showTooltip = $state(false);
</script>

<div
	class="relative inline-block"
	onmouseenter={() => showTooltip = true}
	onmouseleave={() => showTooltip = false}
>
	{@render children()}
	
	{#if showTooltip}
		<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap z-50">
			{text}
			<div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
		</div>
	{/if}
</div>