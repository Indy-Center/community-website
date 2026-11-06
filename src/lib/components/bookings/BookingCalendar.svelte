<script lang="ts">
	import { format } from 'date-fns';
	import { utc } from '@date-fns/utc';
	import {
		describePosition,
		getWeekDays,
		layoutCalendarDay,
		parseBookingTime,
		startOfUtcDay,
		type PositionLabel
	} from '$lib/utils/bookings';
	import type { AtcBooking, BookingType } from '$lib/types/bookings';
	import IconChevronLeft from '~icons/mdi/chevron-left';
	import IconChevronRight from '~icons/mdi/chevron-right';

	type Props = {
		bookings: AtcBooking[];
		names: Record<string, string>;
		positions: Record<string, PositionLabel>;
		manageableIds: number[];
		onEdit?: (booking: AtcBooking) => void;
	};

	let { bookings, names, positions, manageableIds, onEdit }: Props = $props();

	const HOUR_HEIGHT = 28;
	const DAY_MS = 86400000;

	// A rolling week starting today, so upcoming bookings are always in view
	const today = startOfUtcDay(new Date());
	let weekOffset = $state(0);

	const weekStart = $derived(new Date(today.getTime() + weekOffset * 7 * DAY_MS));
	const days = $derived(
		getWeekDays(weekStart).map((day) => ({ day, segments: layoutCalendarDay(bookings, day) }))
	);
	const lastBookingEnd = $derived(
		Math.max(0, ...bookings.map((booking) => parseBookingTime(booking.end).getTime()))
	);
	const hasLaterWeeks = $derived(weekStart.getTime() + 7 * DAY_MS < lastBookingEnd);

	const typeClasses: Record<BookingType, string> = {
		booking: 'border-sky-400/60 bg-sky-500/25 text-sky-100',
		event: 'border-purple-400/60 bg-purple-500/25 text-purple-100',
		exam: 'border-orange-400/60 bg-orange-500/25 text-orange-100',
		training: 'border-green-400/60 bg-green-500/25 text-green-100'
	};

	const zulu = (time: string) => format(utc(parseBookingTime(time)), 'HHmm') + 'z';
	const isToday = (day: Date) => day.getTime() === today.getTime();

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
			{format(utc(weekStart), 'MMM d')} – {format(
				utc(new Date(weekStart.getTime() + 6 * DAY_MS)),
				'MMM d'
			)}
			<span class="ml-1 font-normal text-slate-400 normal-case">(Zulu)</span>
		</h2>
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

	<div class="overflow-x-auto">
		<div class="grid min-w-[760px] grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
			<!-- Day headers -->
			<div class="border-b border-slate-700/60"></div>
			{#each days as { day } (day.getTime())}
				<div
					class="border-b border-l border-slate-700/60 px-2 py-2 text-center text-xs {isToday(day)
						? 'bg-sky-600/20 text-white'
						: 'text-slate-300'}"
				>
					<div class="font-semibold uppercase">{format(utc(day), 'EEE')}</div>
					<div class="text-slate-400">{format(utc(day), 'MMM d')}</div>
				</div>
			{/each}

			<!-- Hour labels -->
			<div class="relative" style="height: {24 * HOUR_HEIGHT}px">
				{#each { length: 12 } as _, i}
					<div
						class="absolute right-1 -translate-y-1/2 font-mono text-[10px] text-slate-500"
						style="top: {i * 2 * HOUR_HEIGHT}px"
					>
						{#if i > 0}{String(i * 2).padStart(2, '0')}z{/if}
					</div>
				{/each}
			</div>

			<!-- Day columns -->
			{#each days as { day, segments } (day.getTime())}
				<div
					class="relative border-l border-slate-700/60"
					style="height: {24 *
						HOUR_HEIGHT}px; background-image: repeating-linear-gradient(to bottom, rgb(51 65 85 / 0.35) 0 1px, transparent 1px {2 *
						HOUR_HEIGHT}px)"
				>
					{#each segments as segment (segment.booking.id)}
						{@const booking = segment.booking}
						{@const editable = onEdit && manageableIds.includes(booking.id)}
						{@const height = ((segment.endMinute - segment.startMinute) / 60) * HOUR_HEIGHT}
						{@const label = positions[booking.callsign]}
						{@const title = `${describePosition(booking.callsign, label)} · ${zulu(booking.start)}–${zulu(booking.end)} · ${
							names[booking.cid] ?? booking.cid
						}${booking.type !== 'booking' ? ` · ${booking.type}` : ''}`}
						{@const classes = `absolute overflow-hidden rounded border px-1 py-0.5 text-left text-[11px] leading-tight ${typeClasses[booking.type]}`}
						{@const style = `top: ${(segment.startMinute / 60) * HOUR_HEIGHT}px; height: ${
							height - 1
						}px; left: calc(${(segment.lane / segment.lanes) * 100}% + 2px); width: calc(${
							100 / segment.lanes
						}% - 4px)`}
						{#snippet content()}
							{#if label}
								<div class="truncate font-semibold">{label.title}</div>
							{:else}
								<div class="truncate font-mono font-semibold">{booking.callsign}</div>
							{/if}
							{#if height >= 2 * HOUR_HEIGHT}
								{#if label?.detail}
									<div class="truncate opacity-80">{label.detail}</div>
								{/if}
								<div class="truncate opacity-80">{zulu(booking.start)}–{zulu(booking.end)}</div>
								<div class="truncate opacity-80">{names[booking.cid] ?? booking.cid}</div>
							{/if}
						{/snippet}
						{#if editable}
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
