import { z } from 'zod';
import { MAX_BOOKING_ADVANCE_DAYS, MAX_BOOKING_HOURS } from '$lib/config/bookings';

// Times are UTC ISO strings from our DateTimeInput component
const bookingTimes = {
	start: z
		.string()
		.min(1, { message: 'Start time is required' })
		.transform((str) => new Date(str)),
	end: z
		.string()
		.min(1, { message: 'End time is required' })
		.transform((str) => new Date(str))
};

const endAfterStart = (data: { start: Date; end: Date }) => data.end > data.start;
const endAfterStartError = { message: 'End time must be after the start time', path: ['end'] };

const HOUR_MS = 60 * 60 * 1000;
const withinMaxLength = (data: { start: Date; end: Date }) =>
	data.end.getTime() - data.start.getTime() <= MAX_BOOKING_HOURS * HOUR_MS;
const withinMaxLengthError = {
	message: `Bookings can be at most ${MAX_BOOKING_HOURS} hours long`,
	path: ['end']
};

const withinAdvanceWindow = (data: { start: Date }) =>
	data.start.getTime() <= Date.now() + MAX_BOOKING_ADVANCE_DAYS * 24 * HOUR_MS;
const withinAdvanceWindowError = {
	message: `Bookings can start at most ${MAX_BOOKING_ADVANCE_DAYS} days ahead`,
	path: ['start']
};

export const bookingSchema = z
	.object({ callsign: z.string().min(1, { message: 'Position is required' }), ...bookingTimes })
	.refine(endAfterStart, endAfterStartError)
	.refine(withinMaxLength, withinMaxLengthError)
	.refine(withinAdvanceWindow, withinAdvanceWindowError);

export const bookingUpdateSchema = z
	.object({ externalId: z.string().min(1).max(64), ...bookingTimes })
	.refine(endAfterStart, endAfterStartError)
	.refine(withinMaxLength, withinMaxLengthError)
	.refine(withinAdvanceWindow, withinAdvanceWindowError);

export type BookingSchema = typeof bookingSchema;
export type BookingUpdateSchema = typeof bookingUpdateSchema;
