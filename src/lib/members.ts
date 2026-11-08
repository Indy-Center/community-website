import type { User } from '$lib/db/schema/users';

/**
 * The user columns a page may send to show another member: their names and operating initials.
 * Page data reaches the browser, so never select a whole user row (email, VATSIM Connect data)
 * for a page; select these.
 */
export const memberNameColumns = {
	firstName: true,
	lastName: true,
	preferredName: true,
	operatingInitials: true
} as const;

/** The columns a controller picker shows and searches: a member's names, plus id and CID. */
export const memberPickerColumns = { id: true, cid: true, ...memberNameColumns } as const;

export type PickableMember = Pick<User, keyof typeof memberPickerColumns>;

/**
 * The preferred name a member really chose, or null. Settings pre-fills the preferred name with
 * "First Last", so one that matches the full name isn't a choice and must not stand in for
 * name privacy. Every load that shows a display name uses this to decide.
 */
export function customPreferredName(
	preferredName: string | null | undefined,
	firstName: string | undefined,
	lastName: string | undefined
): string | null {
	const normalize = (name: string) => name.replace(/\s+/g, ' ').trim().toLowerCase();
	const trimmed = preferredName?.trim();
	return trimmed && normalize(trimmed) !== normalize(`${firstName} ${lastName}`) ? trimmed : null;
}
