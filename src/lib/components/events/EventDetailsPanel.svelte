<script lang="ts">
	import { Icon, Panel, Time } from '@indy-center/centerline-svelte';
	import { mdiClockOutline, mdiEarth, mdiInformation } from '@mdi/js';
	import type { Event } from '$lib/db/schema/events';
	import RosterTypeBadge from './RosterTypeBadge.svelte';
	import EventTypeBadge from './EventTypeBadge.svelte';
	import { supportsRosters } from '$lib/config/events';

	let { event, class: className = '' }: { event: Event; class?: string } = $props();
</script>

<Panel title="Event information" level={2} class={className}>
	{#snippet icon()}<Icon path={mdiInformation} />{/snippet}
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap gap-2">
			<EventTypeBadge eventType={event.type} />
			{#if supportsRosters(event.type)}
				<RosterTypeBadge rosterType={event.rosterType} />
			{/if}
		</div>
		{#if event.startTime && event.endTime}
			<!-- The member's own time first, then Zulu for matching what controllers say. Each on its
			     own line, so neither is lost at the end of a long one. -->
			<ul class="flex flex-col gap-2 text-sm">
				<li class="flex items-center gap-3 font-medium text-foreground">
					<Icon path={mdiClockOutline} label="Your time" class="shrink-0 text-muted-foreground" />
					<Time value={event.startTime} end={event.endTime} show="datetime" />
				</li>
				<li class="flex items-center gap-3 text-foreground-soft">
					<Icon path={mdiEarth} label="Zulu" class="shrink-0 text-muted-foreground" />
					<Time value={event.startTime} end={event.endTime} show="datetime" zone="zulu" />
				</li>
			</ul>
		{/if}
	</div>
</Panel>
