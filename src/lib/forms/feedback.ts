import z from 'zod';

export const feedbackSchema = z.object({
	controllerId: z.string(),
	// Pending -> Approved | Rejected
	status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
	// Poor, Fair, Good, Excellent
	rating: z.enum(['poor', 'fair', 'good', 'excellent']).default('' as 'poor'),
	// Free flow field like Indy Center, or CMH_LCE
	position: z.string(),
	// The submitters callsign (optional)
	callsign: z.string().optional(),
	// Comments field
	feedback: z.string().optional()
});
