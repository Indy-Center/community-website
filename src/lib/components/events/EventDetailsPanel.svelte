<script lang="ts">
	import { format } from 'date-fns';
	import { utc } from '@date-fns/utc';
	import IconGlobe from '~icons/mdi/earth';
	import IconClock from '~icons/mdi/clock';
	import IconInformation from '~icons/mdi/information';
	import Panel from '$lib/components/Panel.svelte';
	import type { Event } from '$lib/db/schema/events';
	import RosterTypeBadge from './RosterTypeBadge.svelte';
	import EventTypeBadge from './EventTypeBadge.svelte';

	let { event }: { event: Event } = $props();
</script>

<Panel title="Event Information" icon={IconInformation} mode="dark">
	<div class="p-6">
		<div class="space-y-4">
			<!-- Badges -->
			<div class="flex items-center gap-2">
				<EventTypeBadge eventType={event.type} />
				{#if event.rosterType !== 'none'}
					<RosterTypeBadge rosterType={event.rosterType} />
				{/if}
			</div>

			<!-- Event Times -->
			{#if event.startTime && event.endTime}
				<div class="space-y-3">
					<!-- UTC -->
					<div class="flex items-center">
						<div class="flex w-36 items-center gap-3">
							<IconGlobe class="h-4 w-4 flex-shrink-0 text-sky-400" />
							<div class="text-sm font-medium text-sky-300">
								{format(utc(event.startTime), 'MMM d, yyyy')}
							</div>
						</div>
						<div class="ml-6 text-sm text-white tabular-nums">
							{format(utc(event.startTime), 'HH:mm')} - {format(utc(event.endTime), 'HH:mm')}
							<span class="ml-2 text-xs font-medium text-sky-400/70 uppercase">UTC</span>
						</div>
					</div>

					<!-- Local -->
					<div class="flex items-center">
						<div class="flex w-36 items-center gap-3">
							<IconClock class="h-4 w-4 flex-shrink-0 text-gray-400" />
							<div class="text-sm font-medium text-gray-300">
								{format(event.startTime, 'MMM d, yyyy')}
							</div>
						</div>
						<div class="ml-6 text-sm text-white tabular-nums">
							{format(event.startTime, 'HH:mm')} - {format(event.endTime, 'HH:mm')}
							<span class="ml-2 text-xs font-medium text-gray-400/70 uppercase">
								{format(event.startTime, 'zzz')}
							</span>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</Panel>
