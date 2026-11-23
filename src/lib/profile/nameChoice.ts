// "Show my name as": the name choice, stored only as the preferred name it produces
// (member-profile decision 0003). Used by the profile's load, its save and its preview.

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

/** The generated options, in the order the form shows them. */
export function nameOptions({ cid, firstName, lastName }: VatsimName): NameOption[] {
	const initial = lastName ? `${firstName} ${lastName.charAt(0)}.` : firstName;
	return [
		{
			choice: 'full',
			label: `${firstName} ${lastName}`,
			hint: 'Your VATSIM first and last name',
			preferredName: null
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
	const match = nameOptions(member).find((option) => option.preferredName === member.preferredName);
	return match
		? { choice: match.choice, customName: '', privacyDefault: false }
		: { choice: 'preferred', customName: member.preferredName, privacyDefault: false };
}

/** The preferred name a choice saves; `customName` is the "My preferred name" box. */
export function preferredNameFor(
	member: VatsimName,
	choice: NameChoice,
	customName: string
): string | null {
	if (choice === 'preferred') return customName.trim();
	return nameOptions(member).find((option) => option.choice === choice)!.preferredName;
}
