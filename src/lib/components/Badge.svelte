<script lang="ts">
	let {
		icon: Icon,
		label,
		color = 'sky',
		size = 'md'
	}: {
		icon: any;
		label?: string;
		color?: 'sky' | 'purple' | 'green';
		size?: 'sm' | 'md';
	} = $props();

	const colorClasses = {
		sky: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
		purple: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
		green: 'bg-green-500/10 text-green-300 border-green-500/30'
	};

	const sizeClasses = {
		sm: 'text-xs px-2 py-1',
		md: 'text-sm px-3 py-1.5'
	};
</script>

<div
	class="inline-flex items-center gap-2 rounded-lg border {sizeClasses[size]} {colorClasses[
		color
	]} font-medium backdrop-blur-sm"
>
	<Icon class="h-4 w-4" />
	{#if label}
		{label}
	{/if}
</div>
