<script lang="ts">
	import IconChevronDown from '~icons/mdi/chevron-down';
	import { format, parseISO } from 'date-fns';
	import type { VnasController } from '$lib/types/vnas';

	type Props = {
		controller: VnasController;
	};

	let { controller }: Props = $props();
	let expanded = $state(false);

	const primaryPosition = $derived.by(() => {
		return controller.positions.find((position) => position.isPrimary && position.isActive);
	});

	function formatFrequency(frequency: number) {
		return (frequency / 1000000).toFixed(3);
	}

	function getControllerInfoLines(controllerInfo: string) {
		return controllerInfo.split('\n');
	}

	function formatLoginTime(loginTime: string) {
		if (!loginTime) return '--:--';

		try {
			const date = parseISO(loginTime);
			return format(date, 'MMM d, h:mm a');
		} catch (error) {
			console.log('Date parsing error:', error, loginTime);
			return '--:--';
		}
	}
</script>

<div class="border-b border-slate-700/60 last:border-b-0">
	<button
		class="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-left transition-colors"
		onclick={() => (expanded = !expanded)}
	>
		<div class="flex items-center gap-2">
			{#if controller.vatsimData.controllerInfo}
				<IconChevronDown
					class="h-3 w-3 text-slate-400 {expanded
						? 'rotate-180'
						: ''} transition-transform duration-200"
				/>
			{/if}
			{#if primaryPosition}
				<div class="flex min-w-0 flex-1 flex-col gap-1">
					<span class="truncate text-sm font-semibold text-white">
						{primaryPosition.radioName}
					</span>
					<div class="flex items-center gap-2">
						<div class="truncate text-xs text-slate-400">
							{formatLoginTime(controller.loginTime)}
						</div>
						<div class="mt-0.5 truncate text-xs text-slate-400">
							{controller.vatsimData.realName}
						</div>
					</div>
				</div>
			{:else}
				<div class="min-w-0 flex-1">
					<div class="flex min-w-0 items-center gap-2">
						<span class="truncate text-sm font-semibold text-white">Not Active</span>
					</div>
					<div class="mt-0.5 truncate text-xs text-slate-400">
						{controller.vatsimData.realName}
					</div>
				</div>
			{/if}
		</div>
		<div class="flex flex-shrink-0 items-center gap-2">
			{#if primaryPosition}
				<div
					class="rounded-sm border border-slate-500/30 bg-slate-500/20 px-1.5 py-0.5 font-mono text-xs text-slate-300"
				>
					{formatFrequency(primaryPosition.frequency)}
				</div>
			{:else}
				<div
					class="rounded-sm border border-slate-500/30 bg-slate-500/20 px-1.5 py-0.5 font-mono text-xs text-slate-400"
				>
					--
				</div>
			{/if}
		</div>
	</button>
	{#if expanded && controller.vatsimData.controllerInfo}
		<div class="px-3 pb-2">
			<code class="block rounded bg-slate-700/50 px-2 py-1 font-mono text-xs text-slate-300">
				{#each getControllerInfoLines(controller.vatsimData.controllerInfo) as line}
					{line}<br />
				{/each}
			</code>
		</div>
	{/if}
</div>
