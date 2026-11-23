import type { User } from '$lib/db/schema/users';

/**
 * The user columns a staff page may send to show another member: their names and operating
 * initials. Page data reaches the browser, so never select a whole user row (email, VATSIM
 * Connect data) for a page; select these. A page every visitor can see sends a `ShownMember`
 * instead, whose name `memberName` has worked out.
 */
export const memberNameColumns = {
	firstName: true,
	lastName: true,
	preferredName: true,
	operatingInitials: true
} as const;

/** The columns a staff controller picker shows and searches: a member's names, plus id and CID. */
export const memberPickerColumns = { id: true, cid: true, ...memberNameColumns } as const;

export type PickableMember = Pick<User, keyof typeof memberPickerColumns>;

/**
 * The preferred name a member chose, trimmed, or null. A preferred name equal to the full name is
 * a choice too: a member with VATUSA name privacy who chose their full name has it saved as text.
 * (The old settings page pre-filled "First Last"; the one-time copy cleared those before this
 * page went live.)
 */
export function customPreferredName(preferredName: string | null | undefined): string | null {
	return preferredName?.trim() || null;
}

/** What `memberName` needs. `namePrivacy` is VATUSA's flag, from the roster copy. */
export type NamedMember = {
	cid: string;
	firstName: string;
	lastName: string;
	preferredName?: string | null;
	/** Left out, or null, for a member who isn't on the roster. */
	namePrivacy?: boolean | null;
};

/**
 * How community shows a member, on every page: their preferred name; else, with VATUSA's name
 * privacy, their first name and CID ("Jordan 1000001"); else their first and last name. This is
 * the one place a private name is worked out: pages call it rather than formatting one.
 */
export function memberName(member: NamedMember): string {
	const { cid, firstName, lastName } = member;
	return (
		customPreferredName(member.preferredName) ??
		(member.namePrivacy ? `${firstName} ${cid}` : `${firstName} ${lastName}`)
	);
}

/**
 * A user query's columns for `shownMember`: the names, plus VATUSA's privacy flag from the
 * roster copy. Use it as `with: { user: shownMemberQuery }` or in `findMany`.
 */
export const shownMemberQuery = {
	columns: { cid: true, ...memberNameColumns },
	with: { controller: { columns: { namePrivacy: true } } }
} as const;

type ShownMemberRow = NamedMember & {
	operatingInitials: string | null;
	controller?: { namePrivacy: boolean } | null;
};

/** A member as a page any visitor sees shows them: never their last name or the privacy flag. */
export type ShownMember = { cid: string; name: string; operatingInitials: string | null };

export function shownMember(row: ShownMemberRow): ShownMember {
	return {
		cid: row.cid,
		name: memberName({ ...row, namePrivacy: row.controller?.namePrivacy }),
		operatingInitials: row.operatingInitials
	};
}

/** The user query for `pickableShownMember`: `shownMemberQuery` plus the user's id. */
export const pickableShownMemberQuery = {
	columns: { id: true, ...shownMemberQuery.columns },
	with: shownMemberQuery.with
} as const;

/**
 * A member in a public controller picker: their shown name, plus their VATSIM name to search by,
 * which is null when VATUSA name privacy hides it.
 */
export type PickableShownMember = ShownMember & { id: string; vatsimName: string | null };

export function pickableShownMember(row: ShownMemberRow & { id: string }): PickableShownMember {
	return {
		id: row.id,
		...shownMember(row),
		vatsimName: row.controller?.namePrivacy ? null : `${row.firstName} ${row.lastName}`
	};
}
