<script lang="ts">
	let {
		icon: Icon,
		label,
		color = 'sky',
		size = 'md'
	}: {
		icon?: any;
		label?: string;
		color?: 'sky' | 'purple' | 'green' | 'red' | 'orange' | 'yellow' | 'blue' | 'gray';
		size?: 'sm' | 'md';
	} = $props();

	const colorClasses = {
		sky: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
		purple: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
		green: 'bg-green-500/10 text-green-300 border-green-500/30',
		red: 'bg-red-500/10 text-red-300 border-red-500/30',
		orange: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
		yellow: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
		blue: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
		gray: 'bg-gray-500/10 text-gray-300 border-gray-500/30'
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
	{#if Icon}
		<Icon class="h-4 w-4" />
	{/if}
	{#if label}
		{label}
	{/if}
</div>
