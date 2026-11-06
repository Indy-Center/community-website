import { describe, expect, it } from 'vitest';
import type { AtcBooking } from '$lib/types/bookings';
import {
	findBookingConflict,
	getBookablePositions,
	getUpcomingBookings,
	groupPositions,
	meetsRequirements,
	mergePendingBookings,
	PENDING_MAX_MINUTES,
	type BookablePosition,
	type PendingRow
} from './bookings';

const requires = (...entries: string[][]) => ({
	requiredCredentials: entries.map((anyOf) => ({ anyOf }))
});

describe('meetsRequirements', () => {
	it('needs nothing for a position with no requirements', () => {
		expect(meetsRequirements(requires(), null, [])).toBe(true);
	});

	it('is met by the credential itself, as a certification or an endorsement', () => {
		expect(meetsRequirements(requires(['A-LC']), 'A-LC', [])).toBe(true);
		expect(meetsRequirements(requires(['S-LC']), null, ['S-LC'])).toBe(true);
	});

	it('is met by a higher credential on the ladder', () => {
		expect(meetsRequirements(requires(['S-GC']), 'T-RC', [])).toBe(true);
		expect(meetsRequirements(requires(['S-LC']), 'A-LC', [])).toBe(true);
		expect(meetsRequirements(requires(['A-GC']), null, ['S-LC'])).toBe(true);
	});

	it('is not met by a lower credential', () => {
		expect(meetsRequirements(requires(['A-LC']), 'A-GC', ['S-LC'])).toBe(false);
		expect(meetsRequirements(requires(['T-RC']), 'A-LC', [])).toBe(false);
	});

	it('needs every entry met, and any one credential within an entry', () => {
		const position = requires(['T-RC', 'E-RC'], ['T2-CTR']);

		expect(meetsRequirements(position, 'E-RC', ['T2-CTR'])).toBe(true);
		expect(meetsRequirements(position, 'E-RC', [])).toBe(false);
		expect(meetsRequirements(position, null, ['T2-CTR'])).toBe(false);
	});

	it('matches credentials off the ladder, such as T2-CTR, only as themselves', () => {
		expect(meetsRequirements(requires(['T2-CTR']), 'E-RC', [])).toBe(false);
		expect(meetsRequirements(requires(['T2-CTR']), 'E-RC', ['T2-CTR'])).toBe(true);
	});
});

const booking = (overrides: Partial<AtcBooking>): AtcBooking => ({
	id: 1,
	externalId: null,
	callsign: 'IND_TWR',
	cid: 1000001,
	type: 'booking',
	start: '2026-12-01 18:00:00',
	end: '2026-12-01 20:00:00',
	...overrides
});

const NOW = new Date('2026-12-01T12:00:00Z');
const pendingRow = (overrides: Partial<PendingRow>): PendingRow => ({
	externalId: 'pending-1',
	callsign: 'IND_GND',
	cid: '1000002',
	start: new Date('2026-12-01T21:00:00Z'),
	end: new Date('2026-12-01T22:00:00Z'),
	createdAt: new Date(NOW.getTime() - 60000),
	...overrides
});

describe('mergePendingBookings', () => {
	it('adds a pending booking to the list, in start order, marked pending', () => {
		const { bookings, doneIds } = mergePendingBookings(
			[booking({ id: 2 })],
			[pendingRow({ start: new Date('2026-12-01T17:00:00Z') })],
			NOW
		);

		expect(bookings.map((b) => [b.externalId, b.pending ?? false])).toEqual([
			['pending-1', true],
			[null, false]
		]);
		expect(bookings[0]).toMatchObject({
			callsign: 'IND_GND',
			cid: 1000002,
			start: '2026-12-01 17:00:00'
		});
		expect(doneIds).toEqual([]);
	});

	it('drops a pending booking once the list shows its externalId', () => {
		const { bookings, doneIds } = mergePendingBookings(
			[booking({ externalId: 'pending-1' })],
			[pendingRow({ callsign: 'IND_TWR' })],
			NOW
		);

		expect(bookings).toHaveLength(1);
		expect(bookings[0].pending).toBeUndefined();
		expect(doneIds).toEqual(['pending-1']);
	});

	it('drops a pending booking that has waited too long, as the booking system refused it', () => {
		const old = new Date(NOW.getTime() - (PENDING_MAX_MINUTES + 1) * 60000);
		const { bookings, doneIds } = mergePendingBookings([], [pendingRow({ createdAt: old })], NOW);

		expect(bookings).toEqual([]);
		expect(doneIds).toEqual(['pending-1']);
	});

	it('holds the position: a pending booking counts as a conflict', () => {
		const { bookings } = mergePendingBookings([], [pendingRow({})], NOW);
		const start = new Date('2026-12-01T21:30:00Z');
		const end = new Date('2026-12-01T22:30:00Z');

		expect(findBookingConflict(bookings, 'IND_GND', start, end)?.externalId).toBe('pending-1');
		expect(findBookingConflict(bookings, 'IND_TWR', start, end)).toBeUndefined();
	});
});

describe('groupPositions', () => {
	const ind = { id: 'IND', name: 'Indianapolis ATCT/TRACON', parent: null };
	const field = (id: string, name: string) => ({
		id,
		name,
		parent: { id: 'IND', name: ind.name }
	});
	const at = (callsign: string, facility: BookablePosition['facility']): BookablePosition => ({
		callsign,
		name: callsign,
		radioName: callsign,
		type: 'ATCT',
		primary: false,
		facility
	});

	it('puts fields under their parent facility, and a parentless facility under itself', () => {
		const groups = groupPositions([
			at('BAK_TWR', field('BAK', 'Columbus Muni ATCT')),
			at('IND_TWR', ind),
			at('AID_GND', field('AID', 'Anderson Muni ATCT')),
			at('AID_TWR', field('AID', 'Anderson Muni ATCT')),
			at('ZZZ_TWR', { id: 'ZZZ', name: 'Another Field', parent: null })
		]);

		expect(
			groups.map((g) => [
				g.label,
				g.facilities.map((f) => [f.label, f.positions.map((p) => p.callsign)])
			])
		).toEqual([
			['Another Field', [['Another Field', ['ZZZ_TWR']]]],
			[
				'Indianapolis ATCT/TRACON',
				[
					['Anderson Muni ATCT', ['AID_GND', 'AID_TWR']],
					['Columbus Muni ATCT', ['BAK_TWR']],
					['Indianapolis ATCT/TRACON', ['IND_TWR']]
				]
			]
		]);
	});
});

describe('getUpcomingBookings', () => {
	const now = new Date('2026-12-01T12:00:00Z');
	const starting = (start: string) =>
		booking({ id: Math.random(), start, end: '2026-12-02 23:00:00' });

	it('keeps bookings starting within the lead time, soonest first, and drops the rest', () => {
		const later = starting('2026-12-01 14:30:00');
		const sooner = starting('2026-12-01 12:30:00');
		const upcoming = getUpcomingBookings(
			[
				later,
				starting('2026-12-01 15:00:01'),
				starting('2026-12-01 11:59:59'),
				starting('2026-12-01 12:00:00'),
				sooner,
				starting('2026-12-01 15:00:00')
			],
			now,
			3
		);

		expect(upcoming.map((b) => b.start)).toEqual([
			'2026-12-01 12:30:00',
			'2026-12-01 14:30:00',
			'2026-12-01 15:00:00'
		]);
	});
});

describe('getBookablePositions', () => {
	const facility = { id: 'ZID', name: 'Indianapolis ARTCC', parent: null };
	const feed = (callsign: string, extra: object = {}) => ({
		callsign,
		name: callsign,
		radioName: callsign,
		frequency: 1,
		facility,
		requiredCredentials: [],
		...extra
	});

	it('leaves out emergency (guard) positions', () => {
		const offered = getBookablePositions(
			[feed('IND_EM_CTR'), feed('IND_20_CTR'), feed('CMH_EM_APP'), feed('CMH_GND')],
			null,
			[]
		);

		expect(offered.map((p) => p.callsign)).toEqual(['IND_20_CTR', 'CMH_GND']);
	});

	it('puts primary positions first: the CMS star, or Falmouth 83 from config', () => {
		const offered = getBookablePositions(
			[
				feed('IND_17_CTR'),
				feed('IND_83_CTR'),
				feed('IND_18_CTR'),
				feed('IND_19_CTR', { starred: true })
			],
			null,
			[]
		);

		expect(offered.map((p) => [p.callsign, p.primary])).toEqual([
			['IND_83_CTR', true],
			['IND_19_CTR', true],
			['IND_17_CTR', false],
			['IND_18_CTR', false]
		]);
	});
});
