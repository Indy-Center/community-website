import { describe, expect, it } from 'vitest';
import type { BookingMember } from '$lib/types/bookings';
import {
	hasChanges,
	rosterChanges,
	t2Changes,
	toBookingMembers,
	type RosterController
} from './bookingRoster';

// Every CID here is made up; the repository is public.
const controller = (row: Partial<RosterController> & { cid: string }): RosterController => ({
	rating: 'S2',
	roles: [],
	endorsements: [],
	...row
});

const member = (row: Partial<BookingMember> & { cid: number }): BookingMember => ({
	rating: 3,
	role: 'member',
	isHome: true,
	isMentor: false,
	...row
});

describe('toBookingMembers', () => {
	it('sends home and visiting controllers alike, flagging visitors with isHome false', () => {
		const { members } = toBookingMembers(
			[controller({ cid: '1000001' }), controller({ cid: '1000002', rating: 'C1' })],
			new Set(['1000001'])
		);

		expect(members).toEqual([
			{ cid: 1000001, rating: 3, role: 'member', isHome: true, isMentor: false },
			{ cid: 1000002, rating: 5, role: 'member', isHome: false, isMentor: false }
		]);
	});

	it('marks instructors and mentors as mentors, and everyone a member', () => {
		const { members } = toBookingMembers(
			[
				controller({ cid: '1000001', roles: ['INS'] }),
				controller({ cid: '1000002', roles: ['MTR', 'EC'] }),
				controller({ cid: '1000003', roles: ['ATM'] })
			],
			new Set(['1000001', '1000002', '1000003'])
		);

		expect(members.map((m) => [m.cid, m.isMentor, m.role])).toEqual([
			[1000001, true, 'member'],
			[1000002, true, 'member'],
			[1000003, false, 'member']
		]);
	});

	it('leaves out a controller whose rating has no VATSIM number of 1 or more', () => {
		const { members, skipped } = toBookingMembers(
			[
				controller({ cid: '1000001', rating: 'SUS' }),
				controller({ cid: '1000002', rating: '??' }),
				controller({ cid: '1000003', rating: 'OBS' })
			],
			new Set()
		);

		expect(members.map((m) => [m.cid, m.rating])).toEqual([[1000003, 1]]);
		expect(skipped).toEqual(['1000001', '1000002']);
	});
});

describe('rosterChanges', () => {
	it('finds nothing when the booking system already matches', () => {
		const roster = [member({ cid: 1 }), member({ cid: 2, isHome: false })];
		expect(hasChanges(rosterChanges(roster, [...roster].reverse()))).toBe(false);
	});

	it('finds added, changed and removed members', () => {
		const changes = rosterChanges(
			[member({ cid: 1 }), member({ cid: 2 }), member({ cid: 3 })],
			[member({ cid: 1 }), member({ cid: 2, isMentor: true }), member({ cid: 4 })]
		);

		expect(changes).toEqual({ added: [4], changed: [2], removed: [3] });
		expect(hasChanges(changes)).toBe(true);
	});

	it('counts a manager the booking system holds as a change, since nobody manages it there', () => {
		const changes = rosterChanges([member({ cid: 1, role: 'manager' })], [member({ cid: 1 })]);
		expect(changes.changed).toEqual([1]);
	});
});

describe('t2Changes', () => {
	const t2 = (cid: string) => controller({ cid, endorsements: ['T2-CTR'] });

	it('grants a new holder, visitor or home', () => {
		expect(t2Changes([t2('1000001'), controller({ cid: '1000002' })], [])).toEqual({
			grant: [1000001],
			revoke: []
		});
	});

	it('leaves an already-granted holder alone', () => {
		expect(t2Changes([t2('1000001')], [{ id: 'e1', cid: 1000001 }])).toEqual({
			grant: [],
			revoke: []
		});
	});

	it('revokes from someone who lost T2-CTR, or left the roster', () => {
		const { grant, revoke } = t2Changes(
			[controller({ cid: '1000001' })],
			[
				{ id: 'e1', cid: 1000001 },
				{ id: 'e2', cid: 1000009 }
			]
		);

		expect(grant).toEqual([]);
		expect(revoke.map((e) => e.id)).toEqual(['e1', 'e2']);
	});

	it('keeps one endorsement per holder and revokes duplicates', () => {
		const { revoke } = t2Changes(
			[t2('1000001')],
			[
				{ id: 'e1', cid: 1000001 },
				{ id: 'e2', cid: 1000001 }
			]
		);
		expect(revoke.map((e) => e.id)).toEqual(['e2']);
	});
});
