import { z } from 'zod';
import { BANNED_TWO_LETTER_COMBINATIONS } from '$lib/config';
import { NAME_CHOICES } from '$lib/profile/nameChoice';

/** Shown in the edit form when identity can't be read or written. */
export const UNAVAILABLE = "Settings can't be changed right now. Try again in a few minutes.";

/** The confirmation after a save, shown in view mode. */
export const SAVED_MESSAGES = {
	saved: 'Profile saved.',
	soon: 'Profile saved. Your Discord nickname will update in a minute or two.',
	later: 'Profile saved. Your Discord nickname will update at the next sync.'
} as const;
export type SavedMessage = keyof typeof SAVED_MESSAGES;

export const MAX_BIO_LENGTH = 1000;
export const MAX_PREFERRED_NAME_LENGTH = 64;
export const MAX_PRONOUNS_LENGTH = 32;

/** The pronouns offered in the list; anything else is Custom…. */
export const PRONOUN_PRESETS = ['she/her', 'he/him', 'they/them'] as const;
export const PRONOUN_CHOICES = ['', ...PRONOUN_PRESETS, 'custom'] as const;

/**
 * The profile's edit form. `controller` holds the member's current operating initials when they
 * are on the controller roster, which is the only time the form has initials; null otherwise.
 * Every rule is checked at once, each refusal under its own field.
 */
export function profileSchema(controller: { operatingInitials: string | null } | null) {
	return z
		.object({
			nameChoice: z.enum(NAME_CHOICES),
			/** The "My preferred name" box. */
			preferredName: z.string().default(''),
			pronounsChoice: z.enum(PRONOUN_CHOICES).default(''),
			customPronouns: z.string().default(''),
			bio: z.string().default(''),
			operatingInitials: z.string().default('')
		})
		.superRefine((form, ctx) => {
			const refuse = (path: string, message: string) =>
				ctx.addIssue({ code: 'custom', path: [path], message });

			if (form.nameChoice === 'preferred') {
				const name = form.preferredName.trim();
				if (!name) refuse('preferredName', 'Type the name to show, or choose another option.');
				else if (name.length > MAX_PREFERRED_NAME_LENGTH) {
					refuse('preferredName', `Keep it to ${MAX_PREFERRED_NAME_LENGTH} characters.`);
				}
			}

			if (form.pronounsChoice === 'custom') {
				const pronouns = form.customPronouns.trim();
				if (!pronouns) refuse('customPronouns', 'Type your pronouns, or choose None.');
				else if (pronouns.length > MAX_PRONOUNS_LENGTH) {
					refuse('customPronouns', `Keep it to ${MAX_PRONOUNS_LENGTH} characters.`);
				}
			}

			const bioLength = form.bio.trim().length;
			if (bioLength > MAX_BIO_LENGTH) {
				refuse(
					'bio',
					`Keep it to ${MAX_BIO_LENGTH} characters (${bioLength - MAX_BIO_LENGTH} over).`
				);
			}

			if (controller) {
				const initials = form.operatingInitials.trim().toUpperCase();
				// A controller who holds none may leave the box empty
				const keptEmpty = !initials && controller.operatingInitials === null;
				if (!keptEmpty && !/^[A-Z]{2}$/.test(initials)) {
					refuse('operatingInitials', 'Use two letters.');
				} else if (BANNED_TWO_LETTER_COMBINATIONS.includes(initials)) {
					refuse('operatingInitials', "Those initials aren't available.");
				}
			}
		});
}

export type ProfileSchema = ReturnType<typeof profileSchema>;
