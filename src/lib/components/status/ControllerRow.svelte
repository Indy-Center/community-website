<script lang="ts">
	import IconChevronDown from '~icons/mdi/chevron-down';
	import { format, parseISO } from 'date-fns';
	import type { VnasController } from '$lib/types';

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

<div class="border-b border-gray-100 last:border-b-0">
	<button
		class="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-left transition-colors hover:bg-gray-50"
		onclick={() => (expanded = !expanded)}
	>
		<div class="flex items-center gap-2">
			<IconChevronDown
				class="h-3 w-3 text-gray-500 {expanded
					? 'rotate-180'
					: ''} transition-transform duration-200"
			/>
			{#if primaryPosition}
				<div class="flex flex-col gap-1 min-w-0 flex-1">
					<span class="truncate text-sm font-semibold text-gray-900">
						{primaryPosition.radioName}
					</span>
					<div class="flex items-center gap-2">
						<div class="truncate text-xs text-gray-500">
							{formatLoginTime(controller.loginTime)}
						</div>
						<div class="mt-0.5 truncate text-xs text-gray-500">
							{controller.vatsimData.realName}
						</div>
					</div>
				</div>
			{:else}
				<div class="min-w-0 flex-1">
					<div class="flex min-w-0 items-center gap-2">
						<span class="truncate text-sm font-semibold text-gray-900">Not Active</span>
					</div>
					<div class="mt-0.5 truncate text-xs text-gray-500">
						{controller.vatsimData.realName}
					</div>
				</div>
			{/if}
		</div>
		<div class="flex items-center gap-2 flex-shrink-0">
			{#if primaryPosition}
				<div class="rounded-sm bg-blue-100 px-1.5 py-0.5 font-mono text-xs text-blue-700">
					{controller.vatsimData.callsign || '--'}
				</div>
				<div class="rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">
					{formatFrequency(primaryPosition.frequency)}
				</div>
			{:else}
				<div class="rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">
					--
				</div>
			{/if}
		</div>
	</button>
	{#if expanded}
		<div class="px-3 pb-2">
			<code class="block rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600"
				>{controller.vatsimData.controllerInfo}</code
			>
		</div>
	{/if}
</div>
