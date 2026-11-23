import { describe, expect, it } from 'vitest';
import { inferNameChoice, nameOptions, preferredNameFor } from './nameChoice';

const jordan = { cid: '1000001', firstName: 'Jordan', lastName: 'Sample' };

describe('nameOptions', () => {
	it("labels each option with the member's own name, and says what each saves", () => {
		expect(nameOptions(jordan)).toEqual([
			{
				choice: 'full',
				label: 'Jordan Sample',
				hint: 'Your VATSIM first and last name',
				preferredName: null
			},
			{ choice: 'first', label: 'Jordan', hint: 'Your first name only', preferredName: 'Jordan' },
			{
				choice: 'initial',
				label: 'Jordan S.',
				hint: 'Your first name and the first letter of your last',
				preferredName: 'Jordan S.'
			},
			{
				choice: 'firstCid',
				label: 'Jordan 1000001',
				hint: 'Your first name and CID, as VATUSA shows a name kept private',
				preferredName: 'Jordan 1000001'
			},
			{
				choice: 'cid',
				label: '1000001',
				hint: 'Your CID and nothing else',
				preferredName: '1000001'
			}
		]);
	});
});

describe('inferNameChoice', () => {
	const infer = (preferredName: string | null, namePrivacy = false) =>
		inferNameChoice({ ...jordan, preferredName, namePrivacy });

	it.each([
		[null, 'full'],
		['Jordan', 'first'],
		['Jordan S.', 'initial'],
		['Jordan 1000001', 'firstCid'],
		['1000001', 'cid']
	] as const)('selects the option a stored %j makes', (stored, choice) => {
		expect(infer(stored)).toEqual({ choice, customName: '', privacyDefault: false });
	});

	it('selects "My preferred name", with the text in its box, for anything else', () => {
		expect(infer('Jay')).toEqual({ choice: 'preferred', customName: 'Jay', privacyDefault: false });
	});

	it('starts a member with name privacy who has not chosen on first name and CID', () => {
		expect(infer(null, true)).toEqual({ choice: 'firstCid', customName: '', privacyDefault: true });
	});

	it('keeps the choice of a member with name privacy who has chosen', () => {
		expect(infer('Jordan', true)).toEqual({
			choice: 'first',
			customName: '',
			privacyDefault: false
		});
	});
});

describe('preferredNameFor', () => {
	it('saves the generated form for a generated choice, and null for the full name', () => {
		expect(preferredNameFor(jordan, 'full', 'ignored')).toBeNull();
		expect(preferredNameFor(jordan, 'initial', 'ignored')).toBe('Jordan S.');
		expect(preferredNameFor(jordan, 'firstCid', '')).toBe('Jordan 1000001');
	});

	it('saves the trimmed text for "My preferred name"', () => {
		expect(preferredNameFor(jordan, 'preferred', '  Jay  ')).toBe('Jay');
	});
});
