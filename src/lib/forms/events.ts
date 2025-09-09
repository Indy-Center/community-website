import { z } from 'zod';

export const eventPositionSchema = z.object({
	eventId: z.string().min(1),
	facility: z.string().min(1),
	position: z.string().min(1),
	requiredEndorsements: z.array(z.string()).min(0).optional(),
	requiredCertifications: z.array(z.string()).min(0).optional(),
	opensAt: z.date(),
	closesAt: z.date()
});

export const eventSchema = z.object({
	name: z.string().min(1).nonempty(),
	description: z.string().min(1).nonempty(),
	bannerUrl: z.string().min(1).nonempty(),
	vatsimEventId: z.number().optional(),
	type: z.enum(['community', 'support']),
	rosterType: z.enum(['none', 'open', 'assigned']),
	positions: z.array(eventPositionSchema),
	// This is a string that starts in UTC time from VATSIM's API,
	// But the datetime-local HTML component only gives you back date and time (no tz)
	// So we need to add the Z to the end of the string to make it UTC
	startTime: z.string().transform((str) => new Date(str + 'Z')),
	endTime: z.string().transform((str) => new Date(str + 'Z'))
});
