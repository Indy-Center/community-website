<script lang="ts">
	import { Badge, Card, Heading, Time } from '@indy-center/centerline-svelte';
	import type { Event } from '$lib/db/schema/events';
	import { supportsRosters } from '$lib/config/events';
	import ImageWithFallback from '$lib/components/ui/ImageWithFallback.svelte';
	import AddToCalendarDropdown from './AddToCalendarDropdown.svelte';
	import EventTypeBadge from './EventTypeBadge.svelte';
	import RosterTypeBadge from './RosterTypeBadge.svelte';

	let {
		event,
		level = 3,
		details = false
	}: {
		event: Event;
		level?: 2 | 3 | 4;
		/** Its type and roster badges, a Draft badge, and the add-to-calendar menu */
		details?: boolean;
	} = $props();
</script>

<!-- The link is on the heading; it stretches over the card so the whole card can be clicked.
     Controls on the card sit above it (relative z-10). -->
<Card as="article" flush class="relative flex h-full flex-col overflow-hidden">
	<ImageWithFallback
		src={event.bannerUrl}
		alt=""
		class="h-32 w-full shrink-0 object-cover"
		fallbackClass="h-32 w-full shrink-0"
	/>
	<div class="flex flex-1 flex-col p-4">
		<Heading {level} look={4} class="line-clamp-2">
			<a
				href="/events/{event.id}"
				class="after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-ring"
			>
				{event.name}
			</a>
		</Heading>
		{#if details}
			<div class="mt-2 flex flex-wrap gap-1">
				{#if !event.isPublished}
					<Badge variant="yellow" size="sm" pill>Draft</Badge>
				{/if}
				<EventTypeBadge eventType={event.type} size="sm" />
				{#if supportsRosters(event.type)}
					<RosterTypeBadge rosterType={event.rosterType} size="sm" />
				{/if}
			</div>
		{/if}
		{#if event.description}
			<p class="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">{event.description}</p>
		{/if}
		<div
			class="mt-3 flex items-end justify-between gap-2 border-t border-border pt-2 text-sm text-foreground-soft"
		>
			<Time value={event.startTime} end={event.endTime} show="datetime" zone="both" />
			{#if details}
				<div class="relative z-10 shrink-0">
					<AddToCalendarDropdown {event} compact />
				</div>
			{/if}
		</div>
	</div>
</Card>
