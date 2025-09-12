import { z } from 'zod';

export const userSettingsSchema = z.object({
	preferredName: z.string().min(1, { message: 'Preferred name is required' }),
	pronouns: z.string().optional(),
	operatingInitials: z.string().optional()
});

export const controllerSettingsSchema = z.object({
	preferredName: z.string().min(1, { message: 'Preferred name is required' }),
	pronouns: z.string().optional(),
	operatingInitials: z.string().length(2, { message: 'Operating initials must be exactly 2 letters' }).regex(/^[A-Z]{2}$/, { message: 'Operating initials must be 2 uppercase letters' })
});

export type UserSettingsSchema = typeof userSettingsSchema;
export type ControllerSettingsSchema = typeof controllerSettingsSchema;