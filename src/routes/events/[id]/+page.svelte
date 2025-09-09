<script lang="ts">
	import { format } from 'date-fns';
	import { utc } from '@date-fns/utc';
	import IconClock from '~icons/mdi/clock-outline';
	import IconGlobe from '~icons/mdi/earth';
	import IconAccount from '~icons/mdi/account-group';
	import IconEdit from '~icons/mdi/pencil';
	import IconArrowLeft from '~icons/mdi/arrow-left';

	const { data } = $props();
	const { event } = data;

	// Format event type for display
	function formatEventType(type: string): string {
		return type.charAt(0).toUpperCase() + type.slice(1);
	}

	// Format roster type for display  
	function formatRosterType(rosterType: string): string {
		return rosterType.charAt(0).toUpperCase() + rosterType.slice(1);
	}
</script>

<svelte:head>
	<title>Indy Center | {event?.name || 'Event'}</title>
</svelte:head>

{#if event}
	<!-- Back Button -->
	<div class="mb-6">
		<a
			href="/events"
			class="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
		>
			<IconArrowLeft class="h-4 w-4" />
			Back to Events
		</a>
	</div>

	<!-- Event Header -->
	<div class="mb-8">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="flex-1">
				<h1 class="text-3xl font-bold text-white mb-3">{event.name}</h1>
				
				<!-- Event Metadata -->
				<div class="flex flex-wrap items-center gap-3 mb-4">
					<span
						class="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-300 backdrop-blur-sm"
					>
						<span class="h-2 w-2 rounded-full bg-sky-400"></span>
						{formatEventType(event.type)}
					</span>
					<span
						class="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-sm font-medium text-purple-300 backdrop-blur-sm"
					>
						<IconAccount class="h-4 w-4" />
						{formatRosterType(event.rosterType)} Roster
					</span>
				</div>

				<!-- Event Times -->
				{#if event.startTime && event.endTime}
					<div class="flex flex-wrap items-center gap-3 mb-6">
						<time
							class="inline-flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-2 text-sm font-medium text-slate-300 backdrop-blur-sm"
						>
							<IconGlobe class="h-4 w-4" />
							{format(utc(event.startTime), "MMM d, yyyy 'at' HH:mm")} - {format(utc(event.endTime), "HH:mm")} Zulu
						</time>
						<time
							class="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 backdrop-blur-sm"
						>
							<IconClock class="h-4 w-4" />
							{format(event.startTime, "MMM d, yyyy 'at' HH:mm")} - {format(event.endTime, "HH:mm")} Local
						</time>
					</div>
				{/if}
			</div>

			<!-- Edit Button (if user has permissions) -->
			{#if data.user && data.roles?.includes('events:manage')}
				<div class="flex-shrink-0">
					<a
						href="/events/{event.id}/edit"
						class="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-slate-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none"
					>
						<IconEdit class="h-4 w-4" />
						Edit Event
					</a>
				</div>
			{/if}
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
		<!-- Event Details - Main Column -->
		<div class="lg:col-span-2 space-y-8">
			<!-- Event Banner -->
			{#if event.bannerUrl}
				<div class="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-sm">
					<img
						src={event.bannerUrl}
						alt="{event.name} banner"
						class="h-64 w-full object-cover sm:h-80"
						loading="lazy"
					/>
				</div>
			{/if}

			<!-- Event Description -->
			<div class="rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-sm p-8">
				<h2 class="text-xl font-semibold text-white mb-4">Event Details</h2>
				<div class="prose prose-invert max-w-none">
					<p class="text-slate-300 leading-relaxed whitespace-pre-line">{event.description}</p>
				</div>
			</div>

			<!-- Event Positions (placeholder for future) -->
			<div class="rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-sm p-8">
				<h2 class="text-xl font-semibold text-white mb-4">Event Positions</h2>
				<p class="text-slate-400">Position roster coming soon...</p>
			</div>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Event Info Card -->
			<div class="rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-sm p-6">
				<h3 class="text-lg font-semibold text-white mb-4">Event Information</h3>
				<dl class="space-y-3">
					<div>
						<dt class="text-sm font-medium text-gray-400">Event Type</dt>
						<dd class="text-sm text-white">{formatEventType(event.type)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-400">Roster Type</dt>
						<dd class="text-sm text-white">{formatRosterType(event.rosterType)}</dd>
					</div>
					{#if event.startTime}
						<div>
							<dt class="text-sm font-medium text-gray-400">Start Time</dt>
							<dd class="text-sm text-white">
								{format(utc(event.startTime), "EEEE, MMMM d, yyyy")}
								<br />
								<span class="text-sky-300">{format(utc(event.startTime), "HH:mm")} UTC</span>
								• 
								<span class="text-gray-300">{format(event.startTime, "HH:mm")} Local</span>
							</dd>
						</div>
					{/if}
					{#if event.endTime}
						<div>
							<dt class="text-sm font-medium text-gray-400">End Time</dt>
							<dd class="text-sm text-white">
								{format(utc(event.endTime), "EEEE, MMMM d, yyyy")}
								<br />
								<span class="text-sky-300">{format(utc(event.endTime), "HH:mm")} UTC</span>
								• 
								<span class="text-gray-300">{format(event.endTime, "HH:mm")} Local</span>
							</dd>
						</div>
					{/if}
				</dl>
			</div>

			<!-- Quick Actions Card -->
			<div class="rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-sm p-6">
				<h3 class="text-lg font-semibold text-white mb-4">Quick Actions</h3>
				<div class="space-y-3">
					<button
						class="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-sky-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
						disabled
					>
						Register for Event
						<span class="block text-xs text-sky-200 mt-1">Coming soon</span>
					</button>
					
					<button
						class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
						disabled
					>
						Add to Calendar
						<span class="block text-xs text-gray-400 mt-1">Coming soon</span>
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Related Events (placeholder for future) -->
	<div class="mt-12 rounded-2xl border border-slate-700/60 bg-slate-800/60 backdrop-blur-sm p-8">
		<h2 class="text-xl font-semibold text-white mb-4">Related Events</h2>
		<p class="text-slate-400">More events from Indy Center coming soon...</p>
	</div>
{:else}
	<!-- Event Not Found -->
	<div class="text-center py-12">
		<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
			<IconClock class="h-8 w-8 text-gray-400" />
		</div>
		<h1 class="text-2xl font-bold text-white mb-2">Event Not Found</h1>
		<p class="text-gray-400 mb-6">The event you're looking for doesn't exist or has been removed.</p>
		<a
			href="/events"
			class="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-sky-700 hover:shadow-xl"
		>
			<IconArrowLeft class="h-4 w-4" />
			Back to Events
		</a>
	</div>
{/if}
