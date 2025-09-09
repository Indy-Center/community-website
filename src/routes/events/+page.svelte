<script lang="ts">
	import { goto } from '$app/navigation';
	import { utc } from '@date-fns/utc';
	import { format } from 'date-fns';
	import IconClock from '~icons/mdi/clock-outline';
	import IconGlobe from '~icons/mdi/earth';
	import IconCreate from '~icons/mdi/plus';

	let { data } = $props();
	let { events, vatsimEvents } = data;

	// Sort events by start time and separate next event from others
	const sortedEvents = events.sort(
		(a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
	);
	const nextEvent = sortedEvents[0];
	const otherEvents = sortedEvents.slice(1);

	function handleVatsimSelect(eventId: number) {
		goto(`/events/create?import=${eventId}`);
	}
</script>

<div class="mb-8">
	<h1 class="text-3xl font-bold text-white">Events</h1>
	<p class="mt-2 text-gray-400">The upcoming events for Indy Center.</p>
</div>

<div class="mb-8 flex items-center justify-end">
	<div class="flex items-center gap-3">
		{#if data.user && data.roles?.includes('events:manage')}
			<!-- Create New Event Button -->
			<a
				href="/events/new"
				class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 hover:shadow-xl focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
			>
				<IconCreate class="h-4 w-4" />
				Create New Event
			</a>
		{/if}
	</div>
</div>

{#if events.length === 0}
	<div
		class="border-opacity-50 bg-opacity-50 rounded-xl border border-slate-700 bg-slate-800 p-12 text-center backdrop-blur-sm"
	>
		<div
			class="bg-opacity-50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700"
		>
			<IconCreate class="h-8 w-8 text-gray-400" />
		</div>
		<h3 class="mb-2 text-lg font-medium text-white">No events scheduled</h3>
		{#if data.user && data.roles?.includes('events:manage')}
			<p class="mb-6 text-gray-400">
				Get started by creating your first event or importing from VATSIM.
			</p>
			<div class="flex justify-center gap-3">
				<a
					href="/events/new"
					class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 hover:shadow-xl"
				>
					<IconCreate class="h-4 w-4" />
					Create your first event
				</a>
			</div>
		{/if}
	</div>
{:else}
	<!-- Next Event - Detailed View -->
	{#if nextEvent}
		<div class="mb-12">
			<h2 class="mb-6 text-xl font-bold text-white">Next Event</h2>
			<a href="/events/{nextEvent.id}" class="block">
				<article
					class="group relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-r from-slate-800/60 via-slate-800/40 to-slate-800/60 backdrop-blur-sm transition-all duration-300 hover:border-sky-500/30 hover:shadow-xl hover:shadow-sky-500/10 cursor-pointer"
				>
				<div class="relative flex flex-col lg:flex-row">
					<!-- Event Content -->
					<div class="flex-1 p-8">
						<div class="mb-4">
							<h3
								class="text-2xl font-bold text-white transition-colors duration-300 group-hover:text-sky-300"
							>
								{nextEvent.name}
							</h3>
						</div>

						<!-- Event Metadata -->
						<div class="mb-6 flex flex-wrap items-center gap-3">
							<span
								class="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-300 backdrop-blur-sm"
							>
								<span class="h-2 w-2 rounded-full bg-sky-400"></span>
								{nextEvent.type}
							</span>
							<span
								class="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-sm font-medium text-purple-300 backdrop-blur-sm"
							>
								<span class="h-2 w-2 rounded-full bg-purple-400"></span>
								{nextEvent.rosterType}
							</span>
						</div>

						{#if nextEvent.description}
							<p class="mb-6 text-base leading-relaxed text-slate-300">{nextEvent.description}</p>
						{/if}

						{#if nextEvent.startTime}
							<div class="flex flex-wrap items-center gap-3">
								<time
									class="inline-flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-2 text-sm font-medium text-slate-300 backdrop-blur-sm"
								>
									<IconGlobe class="h-4 w-4" />
									{format(utc(nextEvent.startTime), "MMM d, yyyy 'at' HH:mm")} Zulu
								</time>
								<time
									class="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 backdrop-blur-sm"
								>
									<IconClock class="h-4 w-4" />
									{format(nextEvent.startTime, "MMM d, yyyy 'at' HH:mm")} Local
								</time>
							</div>
						{/if}
					</div>

					<!-- Event Banner -->
					{#if nextEvent.bannerUrl}
						<div class="relative lg:w-80 lg:flex-shrink-0">
							<div
								class="absolute inset-0 bg-gradient-to-l from-transparent via-slate-800/20 to-slate-800/40 lg:bg-gradient-to-r"
							></div>
							<img
								src={nextEvent.bannerUrl}
								alt="{nextEvent.name} banner"
								class="h-48 w-full object-cover lg:h-full lg:rounded-r-2xl"
								loading="lazy"
							/>
						</div>
					{/if}
				</div>

				<!-- Subtle glow effect on hover -->
				<div
					class="absolute inset-0 rounded-2xl bg-gradient-to-r from-sky-500/0 via-sky-500/0 to-sky-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-5"
				></div>
			</article>
			</a>
		</div>
	{/if}
{/if}
