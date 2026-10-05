import { z } from 'zod';

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

export const bookingSchema = z
	.object({ callsign: z.string().min(1, { message: 'Position is required' }), ...bookingTimes })
	.refine(endAfterStart, endAfterStartError);

export const bookingUpdateSchema = z
	.object({ id: z.coerce.number().int().positive(), ...bookingTimes })
	.refine(endAfterStart, endAfterStartError);

export type BookingSchema = typeof bookingSchema;
export type BookingUpdateSchema = typeof bookingUpdateSchema;
