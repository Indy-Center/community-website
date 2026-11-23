import { describe, expect, it } from 'vitest';
import { memberName } from './members';

const jordan = { cid: '1000001', firstName: 'Jordan', lastName: 'Sample' };

describe('memberName', () => {
	it('is the first and last name for a member with no preferred name', () => {
		expect(memberName({ ...jordan, preferredName: null, namePrivacy: false })).toBe(
			'Jordan Sample'
		);
	});

	it('is the first name and CID for a member with name privacy and no preferred name', () => {
		expect(memberName({ ...jordan, preferredName: null, namePrivacy: true })).toBe(
			'Jordan 1000001'
		);
	});

	it('is the preferred name when one is set, with or without name privacy', () => {
		expect(memberName({ ...jordan, preferredName: 'Jay S.', namePrivacy: true })).toBe('Jay S.');
		expect(memberName({ ...jordan, preferredName: 'Jay S.', namePrivacy: false })).toBe('Jay S.');
	});

	it('treats an older preferred name equal to the full name as no choice', () => {
		expect(memberName({ ...jordan, preferredName: 'Jordan Sample', namePrivacy: true })).toBe(
			'Jordan 1000001'
		);
	});

	it('is the full name for a member who is not on the roster', () => {
		expect(memberName({ ...jordan, preferredName: null })).toBe('Jordan Sample');
	});
});
