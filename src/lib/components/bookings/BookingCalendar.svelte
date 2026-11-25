<script lang="ts">
	import { format } from 'date-fns';
	import { getPositions, Position, Time } from '@indy-center/centerline-svelte';
	import {
		getCalendarWeek,
		inZone,
		layoutCalendarDay,
		parseBookingTime
	} from '$lib/utils/bookings';
	import { positionText } from '$lib/positionText';
	import type { AtcBooking, BookingType, CmsPosition } from '$lib/types/bookings';
	import IconChevronLeft from '~icons/mdi/chevron-left';
	import IconChevronRight from '~icons/mdi/chevron-right';
	import IconMinus from '~icons/mdi/magnify-minus-outline';
	import IconPlus from '~icons/mdi/magnify-plus-outline';

	type Props = {
		bookings: AtcBooking[];
		names: Record<string, string>;
		// ExternalIds of the bookings the viewer may change
		manageable: string[];
		onEdit?: (booking: AtcBooking) => void;
		// Opens an event's block to list its positions
		onOpenGroup?: (booking: AtcBooking) => void;
		// The member's time zone from Centerline's setTimeZone; undefined draws the week in Zulu
		zone?: string;
	};

	let { bookings, names, manageable, onEdit, onOpenGroup, zone }: Props = $props();

	// The root layout's catalogue, for tooltips in words; blocks show <Position> itself
	const positions = getPositions<CmsPosition>();

	// How tall an hour is, in pixels. A taller hour gives a booking room for more lines of text.
	const ZOOM_LEVELS = [28, 40, 56, 72];
	let zoom = $state(1);
	const hourHeight = $derived(ZOOM_LEVELS[zoom]);

	// A booking shows as many lines as fit under its position's name
	const LINE_PX = 14;
	const PADDING_PX = 5;
	// A rolling week starting today in the member's zone, so upcoming bookings are always in view
	const now = new Date();
	let weekOffset = $state(0);

	const week = $derived(getCalendarWeek(now, weekOffset, zone));
	const days = $derived(
		week.map((day) => ({ day, segments: layoutCalendarDay(bookings, day, zone) }))
	);
	const today = $derived(getCalendarWeek(now, 0, zone)[0]);
	// A day with bookings side by side gets a wider column, so each keeps room to be read
	const MIN_LANE_PX = 100;
	// From this many side by side, a booking puts its time before the booker's name
	const COMPACT_LANES = 3;
	const gridColumns = $derived(
		`3rem ${days
			.map(({ segments }) => {
				const lanes = Math.max(1, ...segments.map((segment) => segment.lanes));
				return `minmax(${lanes * MIN_LANE_PX}px, ${lanes}fr)`;
			})
			.join(' ')}`
	);
	const lastBookingEnd = $derived(
		Math.max(0, ...bookings.map((booking) => parseBookingTime(booking.end).getTime()))
	);
	const hasLaterWeeks = $derived(week[6].end.getTime() < lastBookingEnd);

	const typeClasses: Record<BookingType, string> = {
		booking: 'border-sky-400/60 bg-sky-500/25 text-sky-100',
		event: 'border-purple-400/60 bg-purple-500/25 text-purple-100',
		exam: 'border-orange-400/60 bg-orange-500/25 text-orange-100',
		training: 'border-green-400/60 bg-green-500/25 text-green-100'
	};

	// Labels in the member's zone: "Tue", "Nov 24", and hours as "2 PM", or "14z" in Zulu
	const dayLabel = (day: Date, pattern: string) => format(inZone(day, zone), pattern);
	const hourLabel = (hour: number) =>
		zone ? format(new Date(2000, 0, 1, hour), 'h a') : `${String(hour).padStart(2, '0')}z`;
	// A booking's times in words, for the tooltip, which can't hold <Time>
	const clock = (time: string) =>
		zone
			? format(inZone(parseBookingTime(time), zone), 'h:mm a')
			: format(inZone(parseBookingTime(time)), 'HHmm') + 'z';
	const timeRange = (booking: AtcBooking) => `${clock(booking.start)}–${clock(booking.end)}`;
	const isToday = (day: Date) => day.getTime() === today.start.getTime();

	const navButton =
		'cursor-pointer rounded-lg border border-slate-600 p-1.5 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40';
</script>

<div class="rounded-lg border border-slate-700/60 bg-slate-800/60 shadow-sm backdrop-blur-sm">
	<div class="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
		<button
			type="button"
			class={navButton}
			disabled={weekOffset === 0}
			onclick={() => weekOffset--}
			aria-label="Previous week"
		>
			<IconChevronLeft class="h-5 w-5" />
		</button>
		<h2 class="text-sm font-semibold tracking-wide text-white uppercase">
			{dayLabel(week[0].start, 'MMM d')} – {dayLabel(week[6].start, 'MMM d')}
		</h2>
		<div class="flex items-center gap-2">
			<div class="flex items-center gap-1" role="group" aria-label="Zoom">
				<button
					type="button"
					class={navButton}
					disabled={zoom === 0}
					onclick={() => zoom--}
					aria-label="Zoom out"
					title="Shorter hours"
				>
					<IconMinus class="h-5 w-5" />
				</button>
				<button
					type="button"
					class={navButton}
					disabled={zoom === ZOOM_LEVELS.length - 1}
					onclick={() => zoom++}
					aria-label="Zoom in"
					title="Taller hours, more text in each booking"
				>
					<IconPlus class="h-5 w-5" />
				</button>
			</div>
			<button
				type="button"
				class={navButton}
				disabled={!hasLaterWeeks}
				onclick={() => weekOffset++}
				aria-label="Next week"
			>
				<IconChevronRight class="h-5 w-5" />
			</button>
		</div>
	</div>

	<div class="overflow-x-auto">
		<div class="grid min-w-[760px]" style="grid-template-columns: {gridColumns}">
			<!-- Day headers -->
			<div class="border-b border-slate-700/60"></div>
			{#each days as { day } (day.start.getTime())}
				<div
					class="border-b border-l border-slate-700/60 px-2 py-2 text-center text-xs {isToday(
						day.start
					)
						? 'bg-sky-600/20 text-white'
						: 'text-slate-300'}"
				>
					<div class="font-semibold uppercase">{dayLabel(day.start, 'EEE')}</div>
					<div class="text-slate-400">{dayLabel(day.start, 'MMM d')}</div>
				</div>
			{/each}

			<!-- Hour labels -->
			<div class="relative" style="height: {24 * hourHeight}px">
				{#each { length: 12 } as _, i}
					<div
						class="absolute right-1 -translate-y-1/2 font-mono text-[10px] text-slate-500"
						style="top: {i * 2 * hourHeight}px"
					>
						{#if i > 0}{hourLabel(i * 2)}{/if}
					</div>
				{/each}
			</div>

			<!-- Day columns -->
			{#each days as { day, segments } (day.start.getTime())}
				<div
					class="relative border-l border-slate-700/60"
					style="height: {24 *
						hourHeight}px; background-image: repeating-linear-gradient(to bottom, rgb(51 65 85 / 0.35) 0 1px, transparent 1px {2 *
						hourHeight}px)"
				>
					{#each segments as segment (segment.booking.externalId ?? segment.booking.id)}
						{@const booking = segment.booking}
						{@const editable =
							onEdit && booking.externalId !== null && manageable.includes(booking.externalId)}
						{@const height = ((segment.endMinute - segment.startMinute) / 60) * hourHeight}
						{@const group = booking.group}
						{@const compact = segment.lanes >= COMPACT_LANES}
						{@const fit = Math.max(0, Math.floor((height - 1 - PADDING_PX) / LINE_PX) - 1)}
						<!-- null stands for the booking's times, drawn by <Time> in the member's zone -->
						{@const lines = (
							group
								? [`${group.members.length} positions`, null]
								: compact
									? [null, names[booking.cid] ?? String(booking.cid)]
									: [names[booking.cid] ?? String(booking.cid), null]
						).slice(0, fit)}
						{@const title = group
							? `${group.name} · ${group.members.length} positions · ${timeRange(booking)}`
							: `${positionText(booking.callsign, positions())} · ${timeRange(booking)} · ${
									names[booking.cid] ?? booking.cid
								}${booking.type !== 'booking' ? ` · ${booking.type}` : ''}`}
						{@const classes = `absolute overflow-hidden rounded border px-1 py-0.5 text-left text-[11px] leading-tight ${typeClasses[booking.type]}`}
						{@const style = `top: ${(segment.startMinute / 60) * hourHeight}px; height: ${
							height - 1
						}px; left: calc(${(segment.lane / segment.lanes) * 100}% + 2px); width: calc(${
							100 / segment.lanes
						}% - 4px)`}
						{#snippet content()}
							{#if group}
								<div class="truncate font-semibold">{group.name}</div>
							{:else}
								<!-- The radio name alone; the tooltip gives the sector -->
								<Position class="block truncate" callsign={booking.callsign} show={['radioName']} />
							{/if}
							{#each lines as line, i (i)}
								<div class="truncate opacity-80">
									{#if line === null}
										<Time
											value={parseBookingTime(booking.start)}
											end={parseBookingTime(booking.end)}
										/>
									{:else}
										{line}
									{/if}
								</div>
							{/each}
						{/snippet}
						{#if group}
							<button
								type="button"
								onclick={() => onOpenGroup?.(booking)}
								{title}
								class="{classes} cursor-pointer hover:brightness-125"
								{style}
							>
								{@render content()}
							</button>
						{:else if editable}
							<button
								type="button"
								onclick={() => onEdit?.(booking)}
								{title}
								class="{classes} cursor-pointer hover:brightness-125"
								{style}
							>
								{@render content()}
							</button>
						{:else}
							<div {title} class={classes} {style}>{@render content()}</div>
						{/if}
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>
