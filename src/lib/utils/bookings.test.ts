import { describe, expect, it } from 'vitest';
import type { AtcBooking } from '$lib/types/bookings';
import {
	findBookingConflict,
	meetsRequirements,
	mergePendingBookings,
	PENDING_MAX_MINUTES,
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
