import { z } from 'zod';

export const MAX_BIO_LENGTH = 1000;

export const profileSchema = z.object({
	// Discord user IDs are numeric snowflakes
	discordId: z
		.string()
		.trim()
		.regex(/^(\d{17,20})?$/, { message: 'Discord ID must be 17–20 digits' })
		.optional(),
	// TeamSpeak unique identities are 20 bytes of base64, e.g. "0Vd1vVHEuyRS+5xyzAbCdEfGhIj=".
	// The "/" is escaped because this also becomes the input's HTML pattern, which browsers
	// compile with the stricter "v" regex flag where an unescaped "/" in a class is invalid.
	teamspeakUid: z
		.string()
		.trim()
		.regex(/^([A-Za-z0-9+\/]{27}=)?$/, {
			message: 'TeamSpeak identity must be 28 characters ending in "="'
		})
		.optional(),
	bio: z
		.string()
		.trim()
		.max(MAX_BIO_LENGTH, { message: `Bio must be ${MAX_BIO_LENGTH} characters or fewer` })
		.optional()
});

export type ProfileSchema = typeof profileSchema;
