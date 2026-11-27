<script lang="ts">
	import { bookingTypeClasses as typeClasses } from './bookingTypes';
	import { format } from 'date-fns';
	import {
		Button,
		Card,
		getPositions,
		Heading,
		Icon,
		Modal,
		Position,
		Time
	} from '@indy-center/centerline-svelte';
	import { mdiChevronLeft, mdiChevronRight } from '@mdi/js';
	import {
		bookingsOnDay,
		getCalendarMonth,
		getCalendarWeek,
		inZone,
		parseBookingTime,
		positionCount,
		type CalendarDay
	} from '$lib/utils/bookings';
	import { positionText } from '$lib/positionText';
	import type { AtcBooking, CmsPosition } from '$lib/types/bookings';

	type Props = {
		bookings: AtcBooking[];
		names: Record<string, string>;
		// ExternalIds of the bookings the viewer may change
		manageable: string[];
		onEdit?: (booking: AtcBooking) => void;
		// Opens an event's block to list its positions
		onOpenGroup?: (booking: AtcBooking) => void;
		// The member's time zone from Centerline's setTimeZone; undefined draws the month in Zulu
		zone?: string;
	};

	let { bookings, names, manageable, onEdit, onOpenGroup, zone }: Props = $props();

	// The root layout's catalogue, for tooltips in words
	const positions = getPositions<CmsPosition>();

	// A day shows this many bookings; the rest open in a list of the whole day
	const SHOWN_PER_DAY = 3;

	const now = new Date();
	let monthOffset = $state(0);

	const calendar = $derived(getCalendarMonth(now, monthOffset, zone));
	const lastBookingEnd = $derived(
		Math.max(0, ...bookings.map((booking) => parseBookingTime(booking.end).getTime()))
	);
	const hasLaterMonths = $derived(calendar.end.getTime() < lastBookingEnd);

	const label = (day: Date, pattern: string) => format(inZone(day, zone), pattern);
	// Today's midnight in the member's zone, to mark its square
	const todayStart = $derived(getCalendarWeek(now, 0, zone)[0].start.getTime());

	const editable = (booking: AtcBooking) =>
		!!onEdit && booking.externalId !== null && manageable.includes(booking.externalId);
	const describe = (booking: AtcBooking) =>
		booking.group
			? `${booking.group.name} · ${positionCount(booking.group.members.length)}`
			: `${positionText(booking.callsign, positions())} · ${names[booking.cid] ?? booking.cid}${
					booking.type !== 'booking' ? ` · ${booking.type}` : ''
				}`;

	// A day with more bookings than fit opens them all here
	let dayOpen = $state(false);
	let openedDay: { day: CalendarDay; bookings: AtcBooking[] } | undefined = $state();

	function openDay(day: CalendarDay, dayBookings: AtcBooking[]) {
		openedDay = { day, bookings: dayBookings };
		dayOpen = true;
	}

	function choose(booking: AtcBooking) {
		dayOpen = false;
		if (booking.group) onOpenGroup?.(booking);
		else onEdit?.(booking);
	}
</script>

<!-- One booking on a day: its start in the member's zone and its position (or event) -->
{#snippet entry(booking: AtcBooking)}
	{@const classes = `flex w-full min-w-0 items-center gap-1 overflow-hidden rounded border px-1 py-0.5 text-left text-[11px] leading-tight ${typeClasses[booking.type]}`}
	{#snippet content()}
		<Time class="shrink-0 opacity-80" value={parseBookingTime(booking.start)} />
		{#if booking.group}
			<span class="truncate font-semibold">{booking.group.name}</span>
		{:else}
			<Position class="truncate" callsign={booking.callsign} show={['radioName']} />
		{/if}
	{/snippet}
	{#if booking.group || editable(booking)}
		<button
			type="button"
			onclick={() => choose(booking)}
			title={describe(booking)}
			class="{classes} cursor-pointer hover:brightness-110 focus-visible:outline-2 focus-visible:outline-ring"
		>
			{@render content()}
		</button>
	{:else}
		<div title={describe(booking)} class={classes}>{@render content()}</div>
	{/if}
{/snippet}

<Card flush>
	<div class="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
		<Button
			variant="secondary"
			size="sm"
			disabled={monthOffset === 0}
			onclick={() => monthOffset--}
			aria-label="Previous month"
		>
			<Icon path={mdiChevronLeft} />
		</Button>
		<Heading level={2} look={4}>
			{label(calendar.month, 'MMMM yyyy')}
		</Heading>
		<Button
			variant="secondary"
			size="sm"
			disabled={!hasLaterMonths}
			onclick={() => monthOffset++}
			aria-label="Next month"
		>
			<Icon path={mdiChevronRight} />
		</Button>
	</div>

	<div class="overflow-x-auto">
		<div class="grid min-w-[760px] grid-cols-7">
			{#each calendar.weeks[0] as day (day.start.getTime())}
				<div
					class="border-b border-border px-2 py-2 text-center text-xs font-semibold text-foreground-soft uppercase not-first:border-l"
				>
					{label(day.start, 'EEE')}
				</div>
			{/each}

			{#each calendar.weeks.flat() as day, i (day.start.getTime())}
				{@const dayBookings = bookingsOnDay(bookings, day)}
				{@const past = day.end.getTime() <= now.getTime()}
				<div
					class="flex min-h-28 flex-col gap-1 border-border p-1.5 {i % 7 ? 'border-l' : ''} {i >= 7
						? 'border-t'
						: ''} {day.inMonth && !past ? '' : 'bg-muted/40'}"
				>
					<div
						class="flex size-6 items-center justify-center self-end rounded-full text-xs {day.start.getTime() ===
						todayStart
							? 'bg-primary font-semibold text-primary-foreground'
							: day.inMonth
								? 'text-foreground-soft'
								: 'text-muted-foreground'}"
					>
						{label(day.start, 'd')}
					</div>
					{#each dayBookings.slice(0, SHOWN_PER_DAY) as booking (booking.externalId ?? booking.id)}
						{@render entry(booking)}
					{/each}
					{#if dayBookings.length > SHOWN_PER_DAY}
						<button
							type="button"
							onclick={() => openDay(day, dayBookings)}
							class="cursor-pointer rounded px-1 text-left text-[11px] font-medium text-link underline hover:no-underline focus-visible:outline-2 focus-visible:outline-ring"
						>
							+{dayBookings.length - SHOWN_PER_DAY} more
						</button>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</Card>

<Modal title={openedDay ? label(openedDay.day.start, 'EEEE, MMMM d') : ''} bind:open={dayOpen}>
	{#if openedDay}
		<ul class="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto">
			{#each openedDay.bookings as booking (booking.externalId ?? booking.id)}
				<li class="flex items-center gap-3">
					<div class="min-w-0 flex-1">{@render entry(booking)}</div>
					{#if !booking.group}
						<span class="shrink-0 text-xs text-muted-foreground"
							>{names[booking.cid] ?? booking.cid}</span
						>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</Modal>
