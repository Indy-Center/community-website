import { describe, expect, it } from 'vitest';
import { STAFF_POSITIONS, STAFF_TEAMS, defaultStaffEmail } from './staff';

describe('defaultStaffEmail', () => {
	it("puts the mailbox on the site's domain without www", () => {
		expect(defaultStaffEmail('atm', 'www.flyindycenter.com')).toBe('atm@flyindycenter.com');
		expect(defaultStaffEmail('web', 'flyindycenter.com')).toBe('web@flyindycenter.com');
	});

	it('gives every staff card its own mailbox', () => {
		const mailboxes = [...STAFF_POSITIONS, ...STAFF_TEAMS].map((card) => card.mailbox);
		expect(new Set(mailboxes).size).toBe(mailboxes.length);
	});
});
