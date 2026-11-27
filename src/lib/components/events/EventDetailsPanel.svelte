<script lang="ts">
	import { DescriptionList, Icon, Panel, Time } from '@indy-center/centerline-svelte';
	import { mdiInformation } from '@mdi/js';
	import type { Event } from '$lib/db/schema/events';
	import RosterTypeBadge from './RosterTypeBadge.svelte';
	import EventTypeBadge from './EventTypeBadge.svelte';
	import { supportsRosters } from '$lib/config/events';

	let { event }: { event: Event } = $props();
</script>

<Panel title="Event information" level={2}>
	{#snippet icon()}<Icon path={mdiInformation} />{/snippet}
	<DescriptionList>
		<div>
			<dt>Type</dt>
			<dd class="flex flex-wrap gap-2">
				<EventTypeBadge eventType={event.type} />
				{#if supportsRosters(event.type)}
					<RosterTypeBadge rosterType={event.rosterType} />
				{/if}
			</dd>
		</div>
		{#if event.startTime && event.endTime}
			<div>
				<dt>When</dt>
				<dd>
					<Time value={event.startTime} end={event.endTime} show="datetime" zone="both" />
				</dd>
			</div>
		{/if}
	</DescriptionList>
</Panel>
