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
