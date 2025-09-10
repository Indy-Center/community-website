<script lang="ts">
	let {
		icon: Icon,
		label,
		color = 'sky'
	}: { icon: any; label: string; color?: 'sky' | 'purple' | 'green' } = $props();

	const colorClasses = {
		sky: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
		purple: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
		green: 'bg-green-500/10 text-green-300 border-green-500/30'
	};
</script>

<div
	class="inline-flex items-center gap-2 rounded-lg border {colorClasses[
		color
	]} px-3 py-1.5 text-sm font-medium backdrop-blur-sm"
>
	<Icon class="h-4 w-4" />
	{label}
</div>
