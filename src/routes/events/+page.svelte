<script lang="ts">
	import {
		Badge,
		Button,
		Card,
		EmptyState,
		Heading,
		Icon,
		PageHeader,
		Time
	} from '@indy-center/centerline-svelte';
	import { mdiCalendarBlank, mdiPlus } from '@mdi/js';
	import VatsimEventDropdown from '$lib/components/events/VatsimEventDropdown.svelte';
	import EventTypeBadge from '$lib/components/events/EventTypeBadge.svelte';
	import RosterTypeBadge from '$lib/components/events/RosterTypeBadge.svelte';
	import EventGridCard from '$lib/components/events/EventGridCard.svelte';
	import AddToCalendarDropdown from '$lib/components/events/AddToCalendarDropdown.svelte';
	import ImageWithFallback from '$lib/components/ui/ImageWithFallback.svelte';
	import { supportsRosters } from '$lib/config/events';
	import { canManageEvents } from '$lib/utils/permissions.js';
	import type { Event } from '$lib/db/schema/events';

	let { data } = $props();

	// Soonest first; the next one is featured
	const sortedEvents = $derived(
		[...data.events].sort(
			(a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
		)
	);
	const nextEvent = $derived(sortedEvents[0]);
	const otherEvents = $derived(sortedEvents.slice(1));

	const isInProgress = (event: Event) => {
		const now = new Date();
		return now >= new Date(event.startTime) && now <= new Date(event.endTime);
	};
</script>

<svelte:head>
	<title>Events | Indy Center</title>
</svelte:head>

<PageHeader title="Events" class="mb-8">
	The upcoming events for Indy Center.
	{#snippet actions()}
		{#if canManageEvents(data?.roles)}
			<VatsimEventDropdown vatsimEvents={data.vatsimEvents} />
			<Button href="/events/new">
				<Icon path={mdiPlus} />
				New event
			</Button>
		{/if}
	{/snippet}
</PageHeader>

{#if !nextEvent}
	<EmptyState title="No events scheduled" level={2}>
		{#snippet icon()}<Icon path={mdiCalendarBlank} />{/snippet}
		{canManageEvents(data?.roles)
			? 'Create the first one, or import one from VATSIM.'
			: 'Check back soon, or watch Discord for announcements.'}
	</EmptyState>
{:else}
	<!-- The next event, featured. Its link stretches over the card; controls sit above it. -->
	<Card as="article" flush class="relative mb-8 overflow-hidden">
		<div class="flex flex-col lg:flex-row">
			<div class="flex-1 p-6">
				<div class="mb-3 flex flex-wrap gap-2">
					{#if !nextEvent.isPublished}
						<Badge variant="yellow" pill>Draft</Badge>
					{/if}
					{#if isInProgress(nextEvent)}
						<Badge variant="green" pill>In progress</Badge>
					{:else}
						<Badge variant="sky" pill>Next event</Badge>
					{/if}
				</div>
				<Heading level={2} look={3}>
					<a
						href="/events/{nextEvent.id}"
						class="after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-ring"
					>
						{nextEvent.name}
					</a>
				</Heading>
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<EventTypeBadge eventType={nextEvent.type} />
					{#if supportsRosters(nextEvent.type)}
						<RosterTypeBadge rosterType={nextEvent.rosterType} />
					{/if}
				</div>
				{#if nextEvent.description}
					<p class="mt-4 line-clamp-3">{nextEvent.description}</p>
				{/if}
				<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
					<Time
						value={nextEvent.startTime}
						end={nextEvent.endTime}
						show="datetime"
						zone="both"
						class="font-medium text-foreground"
					/>
					<div class="relative z-10">
						<AddToCalendarDropdown event={nextEvent} />
					</div>
				</div>
			</div>
			<ImageWithFallback
				src={nextEvent.bannerUrl}
				alt=""
				class="h-40 w-full object-cover lg:h-auto lg:w-72"
				fallbackClass="h-40 w-full lg:h-auto lg:w-72"
			/>
		</div>
	</Card>

	{#if otherEvents.length > 0}
		<Heading level={2} class="mb-4">More upcoming events</Heading>
		<ul class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each otherEvents as event (event.id)}
				<li><EventGridCard {event} details /></li>
			{/each}
		</ul>
	{/if}
{/if}
