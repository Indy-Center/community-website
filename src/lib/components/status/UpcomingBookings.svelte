<script lang="ts">
	import { format } from 'date-fns';
	import { utc } from '@date-fns/utc';
	import Panel from '$lib/components/Panel.svelte';
	import { describePosition, parseBookingTime, type PositionLabel } from '$lib/utils/bookings';
	import IconCalendarClock from '~icons/mdi/calendar-clock';

	type Props = {
		bookings: { callsign: string; type: string; start: string }[];
		positions: Record<string, PositionLabel>;
	};

	let { bookings, positions }: Props = $props();

	const zulu = (time: string) => format(utc(parseBookingTime(time)), 'HHmm') + 'z';

	// "in 2h 15m" or "in 40m", counted from the minute the page was drawn
	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 30000);
		return () => clearInterval(timer);
	});

	function until(time: string) {
		const minutes = Math.max(0, Math.round((parseBookingTime(time).getTime() - now) / 60000));
		return minutes >= 60 ? `in ${Math.floor(minutes / 60)}h ${minutes % 60}m` : `in ${minutes}m`;
	}
</script>

<Panel title="Controllers Starting Soon" icon={IconCalendarClock}>
	<ul class="divide-y divide-slate-700/60">
		{#each bookings as booking (booking.callsign + booking.start)}
			<li class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
				<span class="min-w-0 truncate font-semibold text-white" title={booking.callsign}>
					{describePosition(booking.callsign, positions[booking.callsign])}
				</span>
				<span class="shrink-0 text-right">
					<span class="font-mono text-white">{zulu(booking.start)}</span>
					<span class="ml-2 text-slate-400">{until(booking.start)}</span>
				</span>
			</li>
		{/each}
	</ul>
	<div class="border-t border-slate-700/60 px-4 py-3">
		<a
			href="/bookings"
			class="inline-flex items-center text-xs font-medium text-sky-400 transition-colors hover:text-sky-300"
		>
			View All Bookings →
		</a>
	</div>
</Panel>
