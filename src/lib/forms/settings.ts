import { z } from 'zod';

export const userSettingsSchema = z.object({
	preferredName: z.string().min(1, { message: 'Preferred name is required' }),
	pronouns: z.string().optional()
});

export type UserSettingsSchema = typeof userSettingsSchema;