import { z } from 'zod';

export const MAX_BIO_LENGTH = 1000;

export const profileSchema = z.object({
	bio: z
		.string()
		.trim()
		.max(MAX_BIO_LENGTH, { message: `Bio must be ${MAX_BIO_LENGTH} characters or fewer` })
		.optional()
});

export type ProfileSchema = typeof profileSchema;
