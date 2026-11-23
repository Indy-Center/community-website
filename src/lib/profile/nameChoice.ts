// "Show my name as": the name choice, stored only as the preferred name it produces
// Used by the profile's load, its save and its preview.

export const NAME_CHOICES = ['full', 'first', 'initial', 'firstCid', 'cid', 'preferred'] as const;
export type NameChoice = (typeof NAME_CHOICES)[number];

/** A generated choice: every option but "My preferred name". */
export type GeneratedChoice = Exclude<NameChoice, 'preferred'>;

/** Whose name it is: their VATSIM first and last name, and CID. */
export type VatsimName = { cid: string; firstName: string; lastName: string };

export type NameOption = {
	choice: GeneratedChoice;
	/** The option as the member's own name shows it. */
	label: string;
	hint: string;
	/** What choosing it saves as the preferred name; null is the full name. */
	preferredName: string | null;
};

/**
 * The generated options, in the order the form shows them. Full name saves null, so the shown
 * name follows the VATSIM name, except with VATUSA name privacy: there null means "keep it
 * private" (First CID), so the full name is saved as text for the choice to show.
 */
export function nameOptions(
	{ cid, firstName, lastName }: VatsimName,
	namePrivacy = false
): NameOption[] {
	const initial = lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName;
	const fullName = `${firstName} ${lastName}`;
	return [
		{
			choice: 'full',
			label: fullName,
			hint: 'Your VATSIM first and last name',
			preferredName: namePrivacy ? fullName : null
		},
		{ choice: 'first', label: firstName, hint: 'Your first name only', preferredName: firstName },
		{
			choice: 'initial',
			label: initial,
			hint: 'Your first name and the first letter of your last',
			preferredName: initial
		},
		{
			choice: 'firstCid',
			label: `${firstName} ${cid}`,
			hint: 'Your first name and CID, as VATUSA shows a name kept private',
			preferredName: `${firstName} ${cid}`
		},
		{ choice: 'cid', label: cid, hint: 'Your CID and nothing else', preferredName: cid }
	];
}

/**
 * Works the choice back out from the stored preferred name. A member with VATUSA name privacy
 * who hasn't chosen starts on first name and CID (`privacyDefault`).
 */
export function inferNameChoice(
	member: VatsimName & { preferredName: string | null; namePrivacy: boolean }
): { choice: NameChoice; customName: string; privacyDefault: boolean } {
	if (member.preferredName === null) {
		return member.namePrivacy
			? { choice: 'firstCid', customName: '', privacyDefault: true }
			: { choice: 'full', customName: '', privacyDefault: false };
	}
	// The full name saved as text (a member with name privacy who chose it) is the full name too
	const match = nameOptions(member, true).find(
		(option) => option.preferredName === member.preferredName
	);
	return match
		? { choice: match.choice, customName: '', privacyDefault: false }
		: { choice: 'preferred', customName: member.preferredName, privacyDefault: false };
}

/**
 * The preferred name a choice saves; `customName` is the "My preferred name" box. `namePrivacy`
 * is VATUSA's flag, which makes the full name save as text (`nameOptions`).
 */
export function preferredNameFor(
	member: VatsimName,
	choice: NameChoice,
	customName: string,
	namePrivacy = false
): string | null {
	if (choice === 'preferred') return customName.trim();
	return nameOptions(member, namePrivacy).find((option) => option.choice === choice)!.preferredName;
}
