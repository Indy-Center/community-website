<script lang="ts">
	let {
		icon: Icon,
		action,
		currentState,
		label,
		color = 'sky',
		disabled = false
	}: {
		action: string;
		currentState: boolean;
		label: string;
		icon: any;
		color?: 'sky' | 'purple' | 'green' | 'red';
		disabled?: boolean;
	} = $props();

	const colorClasses = {
		sky: {
			active: 'bg-sky-500/20 text-sky-200 border-sky-400/40 hover:bg-sky-500/30',
			inactive: 'bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-600/50',
			circle: 'bg-sky-400'
		},
		purple: {
			active: 'bg-purple-500/20 text-purple-200 border-purple-400/40 hover:bg-purple-500/30',
			inactive: 'bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-600/50',
			circle: 'bg-purple-400'
		},
		green: {
			active: 'bg-green-500/20 text-green-200 border-green-400/40 hover:bg-green-500/30',
			inactive: 'bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-600/50',
			circle: 'bg-green-400'
		},
		red: {
			active: 'bg-red-500/20 text-red-200 border-red-400/40 hover:bg-red-500/30',
			inactive: 'bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-600/50',
			circle: 'bg-red-400'
		}
	};

	let buttonStyle = $derived(
		currentState ? colorClasses[color].active : colorClasses[color].inactive
	);
	let circleStyle = $derived(colorClasses[color].circle);
</script>

<form method="POST" {action} class="inline-block">
	<button
		type="submit"
		{disabled}
		class="inline-flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50 {buttonStyle}"
	>
		<div class="flex items-center gap-2">
			<Icon class="h-4 w-4" />
			{label}
		</div>
		<div class="flex h-5 w-5 items-center justify-center">
			{#if currentState}
				<div class="h-3 w-3 rounded-full {circleStyle}"></div>
			{:else}
				<div class="h-3 w-3 rounded-full border-2 border-slate-500"></div>
			{/if}
		</div>
	</button>
</form>
