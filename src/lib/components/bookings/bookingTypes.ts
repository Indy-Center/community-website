import type { BadgeVariant } from '@indy-center/centerline-svelte';
import type { BookingType } from '$lib/types/bookings';

// Centerline's Badge hue steps (its `--hue` tint and `--ink` text, -600/-800 in light and
// -500/-300 in dark), so a block on the Week and Month calendars matches its type's badge in the
// list, in both schemes. Tailwind's hues don't follow the scheme as roles do, hence `dark:`.
const HUES: Record<BadgeVariant, string> = {
	sky: '[--hue:var(--color-sky-600)] [--ink:var(--color-sky-800)] dark:[--hue:var(--color-sky-500)] dark:[--ink:var(--color-sky-300)]',
	purple:
		'[--hue:var(--color-purple-600)] [--ink:var(--color-purple-800)] dark:[--hue:var(--color-purple-500)] dark:[--ink:var(--color-purple-300)]',
	green:
		'[--hue:var(--color-green-600)] [--ink:var(--color-green-800)] dark:[--hue:var(--color-green-500)] dark:[--ink:var(--color-green-300)]',
	red: '[--hue:var(--color-red-600)] [--ink:var(--color-red-800)] dark:[--hue:var(--color-red-500)] dark:[--ink:var(--color-red-300)]',
	orange:
		'[--hue:var(--color-orange-600)] [--ink:var(--color-orange-800)] dark:[--hue:var(--color-orange-500)] dark:[--ink:var(--color-orange-300)]',
	yellow:
		'[--hue:var(--color-yellow-600)] [--ink:var(--color-yellow-800)] dark:[--hue:var(--color-yellow-500)] dark:[--ink:var(--color-yellow-300)]',
	blue: '[--hue:var(--color-blue-600)] [--ink:var(--color-blue-800)] dark:[--hue:var(--color-blue-500)] dark:[--ink:var(--color-blue-300)]',
	gray: '[--hue:var(--color-gray-600)] [--ink:var(--color-gray-800)] dark:[--hue:var(--color-gray-500)] dark:[--ink:var(--color-gray-300)]'
};

// Each booking type's badge colour, and its name in the calendars' legend. One list, so the
// legend, the blocks and the list's badges always agree.
export const BOOKING_TYPES: { type: BookingType; label: string; variant: BadgeVariant }[] = [
	{ type: 'booking', label: 'Booking', variant: 'sky' },
	{ type: 'event', label: 'Event', variant: 'purple' },
	{ type: 'exam', label: 'Exam', variant: 'orange' },
	{ type: 'training', label: 'Training', variant: 'green' }
];

/** A booking type's badge colour. */
export const bookingTypeVariant = Object.fromEntries(
	BOOKING_TYPES.map(({ type, variant }) => [type, variant])
) as Record<BookingType, BadgeVariant>;

/** A booking block's colour classes, by its type: the badge's tint, stronger for a block. */
export const bookingTypeClasses = Object.fromEntries(
	BOOKING_TYPES.map(({ type, variant }) => [
		type,
		`${HUES[variant]} border-(--hue)/60 bg-(--hue)/20 text-(--ink)`
	])
) as Record<BookingType, string>;
