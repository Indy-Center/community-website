<script lang="ts">
	import { format } from 'date-fns';
	import { utc } from '@date-fns/utc';
	import IconGlobe from '~icons/mdi/earth';
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
	const eventYear = format(startDate, 'yyyy');
	const currentYear = new Date().getFullYear().toString();
</script>

<a href={`/events/${event.id}`} class="group block h-full">
	<article
		class="flex h-full flex-col overflow-hidden rounded-lg border border-slate-700/60 bg-slate-800/40 backdrop-blur-sm transition-all duration-300 hover:border-sky-500/40 hover:shadow-lg hover:shadow-sky-500/10"
	>
		<!-- Event Banner -->
		<div class="relative h-32 flex-shrink-0 overflow-hidden">
			<ImageWithFallback
				src={event.bannerUrl}
				alt="{event.name} banner"
				class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
				fallbackClass="h-full w-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900"
			/>
			<div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>

			<!-- Date Badge -->
			<div class="absolute right-2 top-2">
				<div class="flex flex-col items-center rounded-md bg-slate-900/90 px-2 py-1.5 backdrop-blur-sm">
					<span class="text-lg font-bold leading-none text-white">{eventDate.split(' ')[1]}</span>
					<span class="text-[10px] font-medium uppercase leading-none text-sky-400">{eventDate.split(' ')[0]}</span>
				</div>
			</div>
		</div>

		<!-- Event Content -->
		<div class="flex flex-1 flex-col p-3">
			<h3 class="mb-1.5 line-clamp-2 text-base font-bold text-white transition-colors duration-300 group-hover:text-sky-300">
				{event.name}
			</h3>

			{#if event.description}
				<p class="mb-3 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-400">
					{event.description}
				</p>
			{/if}

			<!-- Event Time -->
			{#if event.startTime}
				<div class="mt-auto space-y-0.5 border-t border-slate-700/60 pt-2">
					<div class="flex items-center gap-1.5 text-[11px] text-slate-400">
						<IconGlobe class="h-3 w-3" />
						<span>{startTimeUTC} - {endTimeUTC} UTC</span>
					</div>
					<div class="flex items-center gap-1.5 text-xs font-medium text-sky-300">
						<IconClock class="h-3 w-3" />
						<span>{startLocal} - {endLocal} {localTimezone}</span>
					</div>
				</div>
			{/if}
		</div>
	</article>
</a>
