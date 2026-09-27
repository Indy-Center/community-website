<script lang="ts">
	let {
		children,
		text,
		position = 'top',
		align = 'center'
	}: {
		children: any;
		text: string;
		position?: 'top' | 'bottom';
		align?: 'center' | 'end';
	} = $props();

	let showTooltip = $state(false);

	const positionClasses = $derived(position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2');
	const alignClasses = $derived(
		align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2 transform'
	);
	const arrowClasses = $derived(
		[
			position === 'bottom'
				? 'bottom-full border-b-4 border-b-gray-900'
				: 'top-full border-t-4 border-t-gray-900',
			align === 'end' ? 'right-3' : 'left-1/2 -translate-x-1/2 transform'
		].join(' ')
	);
</script>

<div
	class="relative inline-block"
	onmouseenter={() => (showTooltip = true)}
	onmouseleave={() => (showTooltip = false)}
>
	{@render children()}

	{#if showTooltip}
		<div
			class="absolute z-50 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg {positionClasses} {alignClasses}"
		>
			{text}
			<div
				class="absolute h-0 w-0 border-r-4 border-l-4 border-r-transparent border-l-transparent {arrowClasses}"
			></div>
		</div>
	{/if}
</div>
