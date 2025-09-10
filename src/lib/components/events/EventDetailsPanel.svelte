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
		<div class="flex items-center gap-2">
			<EventTypeBadge eventType={event.type} />
			<RosterTypeBadge rosterType={event.rosterType} />
		</div>
		<dl class="space-y-3">
			{#if event.startTime && event.endTime}
				<div>
					<dt class="mb-2 text-sm font-medium text-gray-400">Event Times</dt>
					<dd class="space-y-2">
						<!-- UTC -->
						<div class="flex items-center gap-2">
							<IconGlobe class="h-4 w-4 flex-shrink-0 text-sky-400" />
							<div class="text-sm">
								<span class="font-medium text-sky-300"
									>{format(utc(event.startTime), 'MMM d, yyyy')}</span
								>
								<span class="ml-2 text-white">
									{format(utc(event.startTime), 'HH:mm')} - {format(utc(event.endTime), 'HH:mm')}
								</span>
								<span class="ml-1 text-xs text-gray-500">UTC</span>
							</div>
						</div>

						<!-- Local -->
						<div class="flex items-center gap-2">
							<IconClock class="h-4 w-4 flex-shrink-0 text-gray-400" />
							<div class="text-sm">
								<span class="font-medium text-gray-300"
									>{format(event.startTime, 'MMM d, yyyy')}</span
								>
								<span class="ml-2 text-white">
									{format(event.startTime, 'HH:mm')} - {format(event.endTime, 'HH:mm')}
								</span>
								<span class="ml-1 text-xs text-gray-500">Local</span>
							</div>
						</div>
					</dd>
				</div>
			{/if}
		</dl>
	</div>
</Panel>
