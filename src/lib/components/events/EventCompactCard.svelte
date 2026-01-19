<script lang="ts">
	import { format } from 'date-fns';
	import { utc } from '@date-fns/utc';
	import IconClock from '~icons/mdi/clock-outline';
	import type { Event } from '$lib/db/schema/events';
	import ImageWithFallback from '$lib/components/ui/ImageWithFallback.svelte';

	let { event }: { event: Event } = $props();

	const startDate = event.startTime;
	const endDate = event.endTime;
	const startTimeUTC = format(utc(startDate), 'HH:mm');
	const endTimeUTC = format(utc(endDate), 'HH:mm');
	const startLocal = format(startDate, 'HH:mm');
	const endLocal = format(endDate, 'HH:mm');
	const localTimezone = format(startDate, 'zzz');
	const eventDate = format(startDate, 'MMM d');
</script>

<a href={`/events/${event.id}`} class="group block">
	<article
		class="flex overflow-hidden rounded-lg border border-slate-700/60 bg-slate-800/40 backdrop-blur-sm transition-all duration-300 hover:border-sky-500/30 hover:shadow-md hover:shadow-sky-500/5"
	>
		<!-- Event Banner - Left Side -->
		<div class="relative h-24 w-32 flex-shrink-0 overflow-hidden">
			<ImageWithFallback
				src={event.bannerUrl}
				alt="{event.name} banner"
				class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
				fallbackClass="h-full w-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900"
			/>
			<div class="absolute inset-0 bg-gradient-to-r from-transparent to-slate-800/20"></div>
		</div>

		<!-- Event Content - Right Side -->
		<div class="flex flex-1 flex-col justify-between p-3">
			<div>
				<h3 class="mb-1 line-clamp-1 text-sm font-semibold text-white transition-colors duration-300 group-hover:text-sky-300">
					{event.name}
				</h3>
				{#if event.description}
					<p class="mb-2 line-clamp-2 text-xs text-slate-400">
						{event.description}
					</p>
				{/if}
			</div>

			<!-- Event Time -->
			{#if event.startTime}
				<div class="flex items-center justify-between text-xs">
					<time class="inline-flex items-center gap-1 text-slate-400">
						<IconClock class="h-3 w-3" />
						{startLocal} {localTimezone}
					</time>
					<span class="font-medium text-sky-300">{eventDate}</span>
				</div>
			{/if}
		</div>
	</article>
</a>
