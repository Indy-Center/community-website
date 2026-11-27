<script lang="ts">
	import { Icon, Link, Panel, Position, Time } from '@indy-center/centerline-svelte';
	import { mdiCalendarClock } from '@mdi/js';
	import { parseBookingTime, positionCount } from '$lib/utils/bookings';

	type Props = {
		bookings: {
			callsign: string;
			type: string;
			start: string;
			group?: { eventId: string; name: string; count: number };
		}[];
	};

	let { bookings }: Props = $props();
</script>

<Panel title="Controllers starting soon" level={2} flush>
	{#snippet icon()}<Icon path={mdiCalendarClock} />{/snippet}
	<ul class="divide-y divide-border">
		{#each bookings as booking (booking.group?.eventId ?? booking.callsign + booking.start)}
			{@const start = parseBookingTime(booking.start)}
			<li class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
				{#if booking.group}
					<span class="min-w-0 truncate font-semibold text-foreground" title={booking.group.name}>
						{booking.group.name}
						<span class="font-normal text-muted-foreground">
							· {positionCount(booking.group.count)}
						</span>
					</span>
				{:else}
					<Position class="min-w-0" callsign={booking.callsign} layout="inline" />
				{/if}
				<span class="shrink-0 text-right">
					<Time value={start} zone="zulu" class="font-mono text-foreground" />
					<Time value={start} show="relative" class="ml-2 text-muted-foreground" />
				</span>
			</li>
		{/each}
	</ul>
	<div class="border-t border-border px-4 py-3 text-sm">
		<Link href="/bookings">All bookings</Link>
	</div>
</Panel>
