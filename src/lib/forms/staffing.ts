import z from 'zod';

// Lengths keep the request inside one Discord embed (field values are capped at 1024 characters)
export const staffingRequestSchema = z
	.object({
		organization: z.string().trim().min(1, 'Enter your organization').max(100),
		eventName: z.string().trim().min(1, 'Enter the event name').max(100),
		// Zulu date and times, as the date and time inputs send them
		date: z.iso.date('Pick the event date'),
		startTime: z.iso.time({ precision: -1, message: 'Enter a start time' }),
		endTime: z.iso.time({ precision: -1, message: 'Enter an end time' }),
		airports: z.string().trim().min(1, 'List the airports involved').max(200),
		pilotCount: z
			.number('Enter a rough number of pilots')
			.int('Enter a whole number')
			.min(1, 'Enter a rough number of pilots')
			.max(10000),
		link: z
			.url({ protocol: /^https?$/, message: 'Enter a full web address, starting with https://' })
			.max(500)
			.optional(),
		email: z.email('Enter a valid email address').max(254).optional(),
		discord: z.string().trim().max(40).optional(),
		details: z.string().trim().min(1, 'Tell us about the event').max(1000)
	})
	.refine((request) => request.email || request.discord, {
		message: 'Give an email or a Discord username so we can reach you',
		path: ['email']
	});

export type StaffingRequest = z.infer<typeof staffingRequestSchema>;
