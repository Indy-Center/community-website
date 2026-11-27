import type { BookingType } from '$lib/types/bookings';

// Each booking type's colours on the Week and Month calendars, and its name in their legend. One
// list, so the legend always matches the blocks.
export const BOOKING_TYPES: { type: BookingType; label: string; classes: string }[] = [
	{ type: 'booking', label: 'Booking', classes: 'border-sky-400/60 bg-sky-500/25 text-sky-100' },
	{
		type: 'event',
		label: 'Event',
		classes: 'border-purple-400/60 bg-purple-500/25 text-purple-100'
	},
	{ type: 'exam', label: 'Exam', classes: 'border-orange-400/60 bg-orange-500/25 text-orange-100' },
	{
		type: 'training',
		label: 'Training',
		classes: 'border-green-400/60 bg-green-500/25 text-green-100'
	}
];

/** A booking block's colour classes, by its type. */
export const bookingTypeClasses = Object.fromEntries(
	BOOKING_TYPES.map(({ type, classes }) => [type, classes])
) as Record<BookingType, string>;
