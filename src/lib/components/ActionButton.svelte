<script lang="ts">
	let {
		icon: Icon,
		action,
		label,
		message,
		color = 'sky'
	}: {
		action: string;
		message?: string;
		label: string;
		icon: any;
		color?: 'sky' | 'purple' | 'green' | 'red';
	} = $props();

	const colorClasses = {
		sky: 'bg-sky-500/10 text-sky-300 border-sky-500/30 hover:bg-sky-500/20',
		purple: 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20',
		green: 'bg-green-500/10 text-green-300 border-green-500/30 hover:bg-green-500/20',
		red: 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20'
	};
</script>

<form
	method="POST"
	{action}
	onsubmit={(e) => {
		if (message) {
			if (!confirm(message)) {
				e.preventDefault();
			}
		}
	}}
	class="inline-block"
>
	<button
		type="submit"
		class="inline-flex w-full cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg transition-all {colorClasses[
			color
		]}"
	>
		<Icon {Icon} class="h-4 w-4" />
		{label}
	</button>
</form>
