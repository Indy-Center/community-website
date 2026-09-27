import z from 'zod';

// What pilots submit. Status isn't here: new feedback is always pending, and staff move it on.
export const feedbackSchema = z.object({
	controllerId: z.string().min(1, 'Please select a controller'),
	// Poor, Fair, Good, Very Good, Excellent
	rating: z.enum(['poor', 'fair', 'good', 'very_good', 'excellent']).default('' as 'poor'),
	// Free flow field like Indy Center, or CMH_LCE
	position: z.string(),
	// The submitters callsign (optional)
	callsign: z.string().optional(),
	// Comments field
	feedback: z.string().optional()
});
