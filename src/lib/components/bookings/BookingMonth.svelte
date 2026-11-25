<script lang="ts">
	import { format } from 'date-fns';
	import { getPositions, Position, Time } from '@indy-center/centerline-svelte';
	import Modal from '$lib/components/Modal.svelte';
	import {
		bookingsOnDay,
		getCalendarMonth,
		getCalendarWeek,
		inZone,
		parseBookingTime,
		type CalendarDay
	} from '$lib/utils/bookings';
	import { positionText } from '$lib/positionText';
	import type { AtcBooking, BookingType, CmsPosition } from '$lib/types/bookings';
	import IconChevronLeft from '~icons/mdi/chevron-left';
	import IconChevronRight from '~icons/mdi/chevron-right';

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

	const typeClasses: Record<BookingType, string> = {
		booking: 'border-sky-400/60 bg-sky-500/25 text-sky-100',
		event: 'border-purple-400/60 bg-purple-500/25 text-purple-100',
		exam: 'border-orange-400/60 bg-orange-500/25 text-orange-100',
		training: 'border-green-400/60 bg-green-500/25 text-green-100'
	};

	const editable = (booking: AtcBooking) =>
		!!onEdit && booking.externalId !== null && manageable.includes(booking.externalId);
	const describe = (booking: AtcBooking) =>
		booking.group
			? `${booking.group.name} · ${booking.group.members.length} positions`
			: `${positionText(booking.callsign, positions())} · ${names[booking.cid] ?? booking.cid}${
					booking.type !== 'booking' ? ` · ${booking.type}` : ''
				}`;

	// A day with more bookings than fit opens them all here
	let dayModal: Modal | undefined = $state();
	let openedDay: { day: CalendarDay; bookings: AtcBooking[] } | undefined = $state();

	function openDay(day: CalendarDay, dayBookings: AtcBooking[]) {
		openedDay = { day, bookings: dayBookings };
		dayModal?.open();
	}

	function choose(booking: AtcBooking) {
		dayModal?.close();
		if (booking.group) onOpenGroup?.(booking);
		else onEdit?.(booking);
	}

	const navButton =
		'cursor-pointer rounded-lg border border-slate-600 p-1.5 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40';
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
			class="{classes} cursor-pointer hover:brightness-125"
		>
			{@render content()}
		</button>
	{:else}
		<div title={describe(booking)} class={classes}>{@render content()}</div>
	{/if}
{/snippet}

<div class="rounded-lg border border-slate-700/60 bg-slate-800/60 shadow-sm backdrop-blur-sm">
	<div class="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
		<button
			type="button"
			class={navButton}
			disabled={monthOffset === 0}
			onclick={() => monthOffset--}
			aria-label="Previous month"
		>
			<IconChevronLeft class="h-5 w-5" />
		</button>
		<h2 class="text-sm font-semibold tracking-wide text-white uppercase">
			{label(calendar.month, 'MMMM yyyy')}
		</h2>
		<button
			type="button"
			class={navButton}
			disabled={!hasLaterMonths}
			onclick={() => monthOffset++}
			aria-label="Next month"
		>
			<IconChevronRight class="h-5 w-5" />
		</button>
	</div>

	<div class="overflow-x-auto">
		<div class="grid min-w-[760px] grid-cols-7">
			{#each calendar.weeks[0] as day (day.start.getTime())}
				<div
					class="border-b border-slate-700/60 px-2 py-2 text-center text-xs font-semibold text-slate-300 uppercase not-first:border-l"
				>
					{label(day.start, 'EEE')}
				</div>
			{/each}

			{#each calendar.weeks.flat() as day, i (day.start.getTime())}
				{@const dayBookings = bookingsOnDay(bookings, day)}
				{@const past = day.end.getTime() <= now.getTime()}
				<div
					class="flex min-h-28 flex-col gap-1 border-slate-700/60 p-1.5 {i % 7
						? 'border-l'
						: ''} {i >= 7 ? 'border-t' : ''} {day.inMonth && !past ? '' : 'bg-slate-900/30'}"
				>
					<div
						class="flex size-6 items-center justify-center self-end rounded-full text-xs {day.start.getTime() ===
						todayStart
							? 'bg-sky-600 font-semibold text-white'
							: day.inMonth
								? 'text-slate-300'
								: 'text-slate-500'}"
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
							class="cursor-pointer px-1 text-left text-[11px] font-medium text-sky-400 hover:text-sky-300"
						>
							+{dayBookings.length - SHOWN_PER_DAY} more
						</button>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<Modal title={openedDay ? label(openedDay.day.start, 'EEEE, MMMM d') : ''} bind:this={dayModal}>
	{#if openedDay}
		<ul class="max-h-[70vh] w-[420px] max-w-[90vw] space-y-1.5 overflow-y-auto p-2">
			{#each openedDay.bookings as booking (booking.externalId ?? booking.id)}
				<li class="flex items-center gap-3">
					<div class="min-w-0 flex-1">{@render entry(booking)}</div>
					{#if !booking.group}
						<span class="shrink-0 text-xs text-slate-400">{names[booking.cid] ?? booking.cid}</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</Modal>
