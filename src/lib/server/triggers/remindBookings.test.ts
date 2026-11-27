import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cmsPosition, stubBookingsClient } from '$lib/testing/bookings';
import type { AtcBooking } from '$lib/types/bookings';
import type { VnasController } from '$lib/types/vnas';
import { runRemindBookings } from './remindBookings';

// Every controller here is made up; the repository is public.
const feeds = vi.hoisted(() => ({
	controllers: vi.fn(async (): Promise<unknown[]> => []),
	discordIds: vi.fn(async () => new Map([[1000001, 'discord-1000001']]))
}));
vi.mock('$lib/server/vatsim/vnasDataClient', () => ({ fetchControllers: feeds.controllers }));
vi.mock('$lib/server/vatsim/vatusaDataClient', () => ({
	fetchRosterDiscordIds: feeds.discordIds
}));

const runTime = new Date('2026-12-01T17:00:00Z');

const booking = (start: string, overrides: Partial<AtcBooking> = {}): AtcBooking => ({
	id: 1,
	externalId: null,
	callsign: 'IND_TWR',
	cid: 1000001,
	type: 'booking',
	start,
	end: '2026-12-01 21:00:00',
	...overrides
});

// Someone in the vNAS feed working one position
const working = (
	cid: string,
	position: { positionId?: string; defaultCallsign?: string }
): VnasController =>
	({
		artccId: 'ZID',
		isActive: true,
		isObserver: false,
		positions: [{ positionId: 'other', defaultCallsign: 'OTHER', isActive: true, ...position }],
		vatsimData: { cid, realName: 'Sam Example', callsign: 'IND_1_TWR' }
	}) as unknown as VnasController;

async function run(listed: AtcBooking[]) {
	type Dm = { embeds: { title: string; description: string }[] };
	const larry = { enqueueDirect: vi.fn(async (_dm: Dm) => {}) };
	await runRemindBookings(
		larry as unknown as Cloudflare.Env['LARRY'],
		stubBookingsClient({ listed }),
		async () => [cmsPosition('IND_TWR')],
		runTime
	);
	return larry.enqueueDirect.mock.calls.map(([dm]) => dm.embeds[0]);
}

describe('runRemindBookings', () => {
	beforeEach(() => {
		feeds.controllers.mockReset().mockResolvedValue([]);
	});

	it('reminds three hours before', async () => {
		expect(await run([booking('2026-12-01 20:00:00')])).toMatchObject([
			{ title: 'Upcoming booking' }
		]);
	});

	it('says nothing 30 minutes before when nobody is on the position', async () => {
		expect(await run([booking('2026-12-01 17:30:00')])).toEqual([]);
	});

	it('asks the controller to coordinate 30 minutes before when someone else is on it', async () => {
		feeds.controllers.mockResolvedValue([working('1000002', { positionId: 'vnas-IND_TWR' })]);

		const [dm, ...rest] = await run([booking('2026-12-01 17:30:00')]);
		expect(rest).toEqual([]);
		expect(dm.title).toBe('Your booked position is active');
		expect(dm.description).toContain('Sam Example');
		expect(dm.description).toContain('IND_1_TWR');
	});

	it('matches by callsign when the catalogue lacks the position', async () => {
		feeds.controllers.mockResolvedValue([working('1000002', { defaultCallsign: 'IND_GND' })]);

		expect(await run([booking('2026-12-01 17:30:00', { callsign: 'IND_GND' })])).toMatchObject([
			{ title: 'Your booked position is active' }
		]);
	});

	it("doesn't ask the booked controller to coordinate with themselves", async () => {
		feeds.controllers.mockResolvedValue([working('1000001', { positionId: 'vnas-IND_TWR' })]);

		expect(await run([booking('2026-12-01 17:30:00')])).toEqual([]);
	});

	it('ignores a position the controller has open but inactive', async () => {
		feeds.controllers.mockResolvedValue([
			working('1000002', { positionId: 'vnas-IND_TWR', isActive: false } as never)
		]);

		expect(await run([booking('2026-12-01 17:30:00')])).toEqual([]);
	});

	it('reminds 15 minutes before when nobody is on the position', async () => {
		expect(await run([booking('2026-12-01 17:15:00')])).toMatchObject([
			{ title: 'Your booking starts soon' }
		]);
	});

	it('skips the 15 minute reminder when the position is being worked', async () => {
		feeds.controllers.mockResolvedValue([working('1000002', { positionId: 'vnas-IND_TWR' })]);

		expect(await run([booking('2026-12-01 17:15:00')])).toEqual([]);
	});

	it('still reminds 15 minutes before when the vNAS feed is down', async () => {
		feeds.controllers.mockRejectedValue(new Error('feed down'));

		expect(
			await run([booking('2026-12-01 17:15:00'), booking('2026-12-01 17:30:00')])
		).toMatchObject([{ title: 'Your booking starts soon' }]);
	});

	it('leaves bookings outside every window alone', async () => {
		expect(await run([booking('2026-12-01 17:20:00'), booking('2026-12-01 17:35:00')])).toEqual([]);
	});
});
