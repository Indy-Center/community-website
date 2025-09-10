<script lang="ts">
	import { goto } from '$app/navigation';
	import { utc } from '@date-fns/utc';
	import { format } from 'date-fns';
	import IconClock from '~icons/mdi/clock-outline';
	import IconGlobe from '~icons/mdi/earth';
	import IconCreate from '~icons/mdi/plus';
	import VatsimEventDropdown from '$lib/components/events/VatsimEventDropdown.svelte';

	let { data } = $props();
	let { events, vatsimEvents } = data;

	// Sort events by start time and separate next event from others
	const sortedEvents = events.sort(
		(a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
	);
	const nextEvent = sortedEvents[0];
	const otherEvents = sortedEvents.slice(1);
</script>

<div class="mb-8">
	<div class="flex items-center justify-between gap-3">
		<h1 class="text-3xl font-bold text-white">Events</h1>
		<div class="flex items-center gap-3">
			{#if data.user && data.roles?.includes('events:manage')}
				<!-- VATSIM Import Dropdown -->
				<VatsimEventDropdown {vatsimEvents} />

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
	<div class="flex items-center justify-between gap-3">
		<p class="mt-2 text-gray-400">The upcoming events for Indy Center.</p>
	</div>
</div>

{#if events.length === 0}
	<div
		class="rounded-xl border border-slate-700/60 bg-slate-800/60 p-12 text-center backdrop-blur-sm"
	>
		<div
			class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700/50"
		>
			<IconCreate class="h-8 w-8 text-gray-400" />
		</div>
		<h3 class="mb-2 text-lg font-medium text-white">No events scheduled</h3>
		{#if data.user && data.roles?.includes('events:manage')}
			<p class="mb-6 text-gray-400">
				Get started by creating your first event or importing from VATSIM.
			</p>
			<div class="flex justify-center gap-3">
				<!-- VATSIM Import Dropdown -->
				<VatsimEventDropdown {vatsimEvents} />

				<a
					href="/events/new"
					class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 hover:shadow-xl focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
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
					class="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-r from-slate-800/60 via-slate-800/40 to-slate-800/60 backdrop-blur-sm transition-all duration-300 hover:border-sky-500/30 hover:shadow-xl hover:shadow-sky-500/10"
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
						{:else}
							<!-- Fallback banner for featured event -->
							<div class="relative lg:w-80 lg:flex-shrink-0">
								<div
									class="h-48 w-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 lg:h-full lg:rounded-r-2xl"
								>
									<div class="absolute inset-0 flex items-center justify-center">
										<IconGlobe class="h-12 w-12 text-slate-600" />
									</div>
									<div
										class="absolute inset-0 bg-gradient-to-l from-transparent via-slate-800/20 to-slate-800/40 lg:rounded-r-2xl lg:bg-gradient-to-r"
									></div>
								</div>
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

	<!-- Other Upcoming Events -->
	{#if otherEvents.length > 0}
		<div class="mb-8">
			<h2 class="mb-6 text-xl font-bold text-white">Upcoming Events</h2>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each otherEvents as event}
					<a href="/events/{event.id}" class="group block">
						<article
							class="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-sm transition-all duration-300 hover:border-sky-500/30 hover:shadow-lg hover:shadow-sky-500/5"
						>
							<!-- Event Banner -->
							{#if event.bannerUrl}
								<div class="relative h-32 overflow-hidden">
									<img
										src={event.bannerUrl}
										alt="{event.name} banner"
										class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
										loading="lazy"
									/>
									<div
										class="absolute inset-0 bg-gradient-to-t from-slate-800/60 to-transparent"
									></div>
								</div>
							{:else}
								<!-- Fallback banner with gradient -->
								<div
									class="relative h-32 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900"
								>
									<div class="absolute inset-0 flex items-center justify-center">
										<IconGlobe class="h-8 w-8 text-slate-500" />
									</div>
									<div
										class="absolute inset-0 bg-gradient-to-t from-slate-800/60 to-transparent"
									></div>
								</div>
							{/if}

							<!-- Event Content -->
							<div class="p-4">
								<h3
									class="mb-2 line-clamp-2 text-lg font-semibold text-white transition-colors duration-300 group-hover:text-sky-300"
								>
									{event.name}
								</h3>

								{#if event.description}
									<p class="mb-3 line-clamp-3 text-sm text-slate-300">
										{event.description}
									</p>
								{/if}

								<!-- Event Metadata -->
								<div class="mb-3 flex flex-wrap gap-2">
									<span
										class="inline-flex items-center rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-300"
									>
										{event.type}
									</span>
								</div>

								<!-- Event Time -->
								{#if event.startTime}
									<div class="flex flex-col gap-1 text-xs">
										<time class="inline-flex items-center gap-1 text-slate-400">
											<IconGlobe class="h-3 w-3" />
											{format(utc(event.startTime), "MMM d, yyyy 'at' HH:mm")} Zulu
										</time>
										<time class="inline-flex items-center gap-1 text-sky-300">
											<IconClock class="h-3 w-3" />
											{format(event.startTime, "MMM d, yyyy 'at' HH:mm")} Local
										</time>
									</div>
								{/if}
							</div>
						</article>
					</a>
				{/each}
			</div>
		</div>
	{/if}
{/if}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
