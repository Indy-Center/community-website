<script lang="ts">
	import { format } from 'date-fns';
	import { utc } from '@date-fns/utc';
	import IconClock from '~icons/mdi/clock-outline';
	import IconGlobe from '~icons/mdi/earth';
	import IconAccount from '~icons/mdi/account-group';
	import IconEdit from '~icons/mdi/pencil';
	import IconImage from '~icons/mdi/image';
	import IconTextLong from '~icons/mdi/text-long';
	import IconAccountGroup from '~icons/mdi/account-group';
	import Panel from '$lib/components/Panel.svelte';
	import EventDetailsPanel from '$lib/components/events/EventDetailsPanel.svelte';
	import DeleteButton from '$lib/components/forms/DeleteButton.svelte';

	const { data } = $props();
	const { event } = data;
</script>

<svelte:head>
	<title>Indy Center | {event?.name || 'Event'}</title>
</svelte:head>

{#if event}
	<!-- Event Header -->
	<div class="mb-8">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="flex-1">
				<h1 class="mb-3 text-3xl font-bold text-white">{event.name}</h1>
			</div>

			<!-- Action Buttons (if user has permissions) -->
			{#if data.user && data.roles?.includes('events:manage')}
				<div class="flex flex-shrink-0 gap-3">
					<a
						href="/events/{event.id}/edit"
						class="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-slate-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none"
					>
						<IconEdit class="h-4 w-4" />
						Edit Event
					</a>

					<DeleteButton
						action="delete"
						message="Are you sure you want to delete this event?"
						label="Delete Event"
					/>
				</div>
			{/if}
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
		<!-- Event Details - Main Column -->
		<div class="space-y-8 lg:col-span-2">
			<!-- Event Banner -->
			{#if event.bannerUrl}
				<div
					class="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-sm"
				>
					<img
						src={event.bannerUrl}
						alt="{event.name} banner"
						class="h-64 w-full object-cover sm:h-80"
						loading="lazy"
					/>
				</div>
			{/if}

			<!-- Event Description -->
			<Panel title="Event Details" icon={IconTextLong} mode="dark">
				<div class="p-8">
					<div class="prose max-w-none prose-invert">
						<p class="leading-relaxed whitespace-pre-line text-slate-300">{event.description}</p>
					</div>
				</div>
			</Panel>

			<!-- Event Positions (placeholder for future) -->
			{#if event.rosterType !== 'none'}
				<Panel title="Event Positions" icon={IconAccountGroup} mode="dark">
					<div class="p-8">
						<p class="text-slate-400">Position roster coming soon...</p>
					</div>
				</Panel>
			{/if}
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Event Info Card -->
			<EventDetailsPanel {event} />
		</div>
	</div>
{:else}
	<!-- Event Not Found -->
	<div class="py-12 text-center">
		<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
			<IconClock class="h-8 w-8 text-gray-400" />
		</div>
		<h1 class="mb-2 text-2xl font-bold text-white">Event Not Found</h1>
		<p class="mb-6 text-gray-400">
			The event you're looking for doesn't exist or has been removed.
		</p>
	</div>
{/if}
