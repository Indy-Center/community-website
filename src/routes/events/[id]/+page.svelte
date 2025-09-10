<script lang="ts">
	import { format } from 'date-fns';
	import { utc } from '@date-fns/utc';
	import IconClock from '~icons/mdi/clock-outline';
	import IconGlobe from '~icons/mdi/earth';
	import IconAccount from '~icons/mdi/account-group';
	import IconEdit from '~icons/mdi/pencil';
	import IconTrash from '~icons/mdi/trash-can-outline';
	import { goto } from '$app/navigation';

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

	// Format date range - show single date if same day, range if different days
	function formatDateRange(startDate: Date, endDate: Date, useUtc = false): string {
		const formatFn = useUtc
			? (date: Date) => format(utc(date), 'MMM d, yyyy')
			: (date: Date) => format(date, 'MMM d, yyyy');

		const startDateStr = formatFn(startDate);
		const endDateStr = formatFn(endDate);

		if (startDateStr === endDateStr) {
			return startDateStr; // Same day: "Sep 12, 2025"
		} else {
			// Different days: "Sep 12 - 13, 2025" or "Sep 30 - Oct 1, 2025"
			const startMonth = useUtc ? format(utc(startDate), 'MMM') : format(startDate, 'MMM');
			const startDay = useUtc ? format(utc(startDate), 'd') : format(startDate, 'd');
			const endMonth = useUtc ? format(utc(endDate), 'MMM') : format(endDate, 'MMM');
			const endDay = useUtc ? format(utc(endDate), 'd') : format(endDate, 'd');
			const year = useUtc ? format(utc(endDate), 'yyyy') : format(endDate, 'yyyy');

			if (startMonth === endMonth) {
				return `${startMonth} ${startDay} - ${endDay}, ${year}`;
			} else {
				return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
			}
		}
	}
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

				<!-- Event Metadata -->
				<div class="mb-4 flex flex-wrap items-center gap-3">
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
						{formatRosterType(event.rosterType)}
					</span>
				</div>

				<!-- Event Times -->
				{#if event.startTime && event.endTime}
					<div class="mb-6 flex flex-wrap items-center gap-3">
						<time
							class="inline-flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-2 text-sm font-medium text-slate-300 backdrop-blur-sm"
						>
							<IconGlobe class="h-4 w-4" />
							{format(utc(event.startTime), "MMM d, yyyy 'at' HH:mm")} - {format(
								utc(event.endTime),
								"MMM d, yyyy 'at' HH:mm"
							)} Zulu
						</time>
						<time
							class="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 backdrop-blur-sm"
						>
							<IconClock class="h-4 w-4" />
							{format(event.startTime, "MMM d, yyyy 'at' HH:mm")} - {format(
								event.endTime,
								"MMM d, yyyy 'at' HH:mm"
							)} Local
						</time>
					</div>
				{/if}
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

					<form
						method="POST"
						action="?/delete"
						onsubmit={(e) => {
							if (!confirm('Are you sure you want to delete this event?')) {
								e.preventDefault();
							}
						}}
						class="inline-block"
					>
						<button
							type="submit"
							class="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none"
						>
							<IconTrash class="h-4 w-4" />
							Delete Event
						</button>
					</form>
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
			<div class="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-8 backdrop-blur-sm">
				<h2 class="mb-4 text-xl font-semibold text-white">Event Details</h2>
				<div class="prose max-w-none prose-invert">
					<p class="leading-relaxed whitespace-pre-line text-slate-300">{event.description}</p>
				</div>
			</div>

			<!-- Event Positions (placeholder for future) -->
			<div class="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-8 backdrop-blur-sm">
				<h2 class="mb-4 text-xl font-semibold text-white">Event Positions</h2>
				<p class="text-slate-400">Position roster coming soon...</p>
			</div>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Event Info Card -->
			<div class="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 backdrop-blur-sm">
				<h3 class="mb-4 text-lg font-semibold text-white">Event Information</h3>
				<dl class="space-y-3">
					<div>
						<dt class="text-sm font-medium text-gray-400">Event Type</dt>
						<dd class="text-sm text-white">{formatEventType(event.type)}</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-400">Roster Type</dt>
						<dd class="text-sm text-white">{formatRosterType(event.rosterType)}</dd>
					</div>
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
											{format(utc(event.startTime), 'HH:mm')} - {format(
												utc(event.endTime),
												'HH:mm'
											)}
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

			<!-- Quick Actions Card -->
			<div class="rounded-2xl border border-slate-700/60 bg-slate-800/60 p-6 backdrop-blur-sm">
				<h3 class="mb-4 text-lg font-semibold text-white">Quick Actions</h3>
				<div class="space-y-3">
					<button
						class="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-sky-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
						disabled
					>
						Register for Event
						<span class="mt-1 block text-xs text-sky-200">Coming soon</span>
					</button>

					<button
						class="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-600 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none"
						disabled
					>
						Add to Calendar
						<span class="mt-1 block text-xs text-gray-400">Coming soon</span>
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Related Events (placeholder for future) -->
	<div class="mt-12 rounded-2xl border border-slate-700/60 bg-slate-800/60 p-8 backdrop-blur-sm">
		<h2 class="mb-4 text-xl font-semibold text-white">Related Events</h2>
		<p class="text-slate-400">More events from Indy Center coming soon...</p>
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
