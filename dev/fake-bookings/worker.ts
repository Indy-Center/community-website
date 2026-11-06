// A stand-in for the bookings Worker's default entrypoint (Indy-Center/bookings-worker), for local
// development only: run it beside the site under `wrangler dev` (see the README) and the site's
// `BOOKINGS` binding reaches it. Bookings live in memory, so they reset when it restarts. Writes
// land after a short delay, like the real Worker's queue, so the "pending" state can be seen. Every
// position and CID is made up; the repository is public.
import { WorkerEntrypoint } from 'cloudflare:workers';
import type { BookingsWorker, WorkerBooking, WorkerPosition } from '../../src/lib/types/bookings';

// How long a write takes to show up in the list
const QUEUE_DELAY_MS = 8000;

const facility = { id: 'IND', name: 'Indianapolis ATCT/TRACON', parent: null };

const POSITIONS: WorkerPosition[] = [
	{
		callsign: 'IND_DEL',
		name: 'Clearance Delivery',
		radioName: 'Indianapolis Clearance',
		frequency: 121650000,
		facility,
		requiredCredentials: [{ anyOf: ['S-GC'] }]
	},
	{
		callsign: 'IND_GND',
		name: 'Ground Control',
		radioName: 'Indianapolis Ground',
		frequency: 121900000,
		facility,
		requiredCredentials: [{ anyOf: ['A-GC'] }]
	},
	{
		callsign: 'IND_TWR',
		name: 'Local Control',
		radioName: 'Indianapolis Tower',
		frequency: 118300000,
		facility,
		requiredCredentials: [{ anyOf: ['A-LC'] }]
	},
	{
		callsign: 'IND_APP',
		name: 'Approach',
		radioName: 'Indianapolis Approach',
		frequency: 124200000,
		facility,
		requiredCredentials: [{ anyOf: ['T-RC'] }]
	},
	{
		callsign: 'ZID_CTR',
		name: 'Indianapolis Center',
		radioName: 'Indianapolis Center',
		frequency: 132250000,
		facility: { id: 'ZID', name: 'Indianapolis ARTCC', parent: null },
		requiredCredentials: [{ anyOf: ['E-RC'] }, { anyOf: ['T2-CTR'] }]
	}
];

const hours = (count: number) => new Date(Date.now() + count * 3600000);

let nextId = 100;
const bookings: WorkerBooking[] = [
	{
		id: 1,
		externalId: null,
		cid: 1000099,
		callsign: 'IND_TWR',
		type: 'event',
		start: hours(26),
		end: hours(29)
	}
];

export default class FakeBookings extends WorkerEntrypoint implements BookingsWorker {
	async listOrgBookings() {
		return bookings;
	}

	async getPositions() {
		return POSITIONS;
	}

	// A timer dies with the call that set it, so the delay is held open with waitUntil
	private later(apply: () => void) {
		this.ctx.waitUntil(
			new Promise<void>((resolve) => setTimeout(resolve, QUEUE_DELAY_MS)).then(apply)
		);
	}

	async createBooking(booking: Parameters<BookingsWorker['createBooking']>[0]) {
		this.later(() => {
			if (bookings.some((b) => b.externalId === booking.externalId)) return;
			bookings.push({ id: nextId++, type: 'booking', ...booking });
		});
	}

	async updateBooking(change: Parameters<BookingsWorker['updateBooking']>[0]) {
		this.later(() => {
			const booking = bookings.find((b) => b.externalId === change.externalId);
			if (booking)
				Object.assign(booking, {
					start: change.start ?? booking.start,
					end: change.end ?? booking.end
				});
		});
	}

	async cancelBooking({ externalId }: Parameters<BookingsWorker['cancelBooking']>[0]) {
		this.later(() => {
			const index = bookings.findIndex((b) => b.externalId === externalId);
			if (index !== -1) bookings.splice(index, 1);
		});
	}
}
