import z from 'zod';

const instant = (message: string) => z.iso.datetime({ message });

// Lengths keep the request inside one Discord embed (field values are capped at 1024 characters)
export const staffingRequestSchema = z
	.object({
		organization: z.string().trim().min(1, 'Enter your organization’s name').max(100),
		eventName: z.string().trim().min(1, 'Enter the event’s name').max(100),
		// Instants in UTC, as DateTimeInput sends them
		start: instant('Pick when the event starts'),
		end: instant('Pick when the event ends'),
		airports: z.string().trim().min(1, 'List the airports, such as KIND, KCVG').max(200),
		// Optional in the schema so the box starts empty; required below
		pilotCount: z
			.number('Enter a number, such as 40')
			.int('Enter a whole number, such as 40')
			.min(1, 'Enter a number, such as 40')
			.max(10000, 'Enter 10,000 or fewer')
			.optional(),
		link: z
			.url({ protocol: /^https?$/, message: 'Enter a full web address, starting with https://' })
			.max(500)
			.optional(),
		email: z.email('Enter an email address, such as you@example.com').max(254).optional(),
		discord: z.string().trim().max(40).optional(),
		details: z.string().trim().min(1, 'Tell us about the event').max(1000)
	})
	.refine((request) => request.pilotCount !== undefined, {
		message: 'Enter a number, such as 40',
		path: ['pilotCount']
	})
	.refine((request) => !request.start || request.start > new Date().toISOString(), {
		message: 'Pick a start in the future',
		path: ['start']
	})
	.refine((request) => !request.start || !request.end || request.end > request.start, {
		message: 'Pick an end after the start',
		path: ['end']
	})
	// No path: a form-level error, shown on the contact group
	.refine((request) => request.email || request.discord, {
		message: 'Give an email, a Discord username, or both'
	});

export type StaffingRequest = z.infer<typeof staffingRequestSchema>;
