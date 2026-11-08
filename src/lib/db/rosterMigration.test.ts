import { describe, expect, it } from 'vitest';
import { testDbBefore } from '$lib/testing/db';

// A VATUSA roster record as the old copy held it. Made up; the repository is public.
function vatusaRecord(row: Record<string, unknown>) {
	return {
		cid: 1000001,
		fname: 'Casey',
		lname: 'Example',
		email: null,
		facility: 'ZID',
		rating: 4,
		rating_short: 'S3',
		facility_join: '2023-04-05T06:07:08+00:00',
		flag_homecontroller: true,
		flag_nameprivacy: false,
		roles: [],
		membership: 'home',
		...row
	};
}

describe('0012_roster_from_training', () => {
	it("carries a VATUSA-shaped row into the training app's named fields, with ZID roles only", async () => {
		const { client, db, migrate } = await testDbBefore('0012_roster_from_training');
		await client.execute({
			sql: 'INSERT INTO vatsim_controllers (cid, data) VALUES (?, ?), (?, ?)',
			args: [
				'1000001',
				JSON.stringify(
					vatusaRecord({
						roles: [
							{ id: 1, cid: 1000001, facility: 'ZID', role: 'ATM', created_at: '' },
							{ id: 2, cid: 1000001, facility: 'ZAU', role: 'INS', created_at: '' },
							{ id: 3, cid: 1000001, facility: 'ZID', role: 'MTR', created_at: '' }
						]
					})
				),
				'1000002',
				JSON.stringify(
					vatusaRecord({
						cid: 1000002,
						fname: 'Riley',
						lname: 'Hiddenname',
						flag_nameprivacy: true,
						rating_short: 'C1',
						facility_join: null,
						roles: null
					})
				)
			]
		});

		await migrate();

		const rows = await db.query.vatsimControllersTable.findMany({
			orderBy: (controllers, { asc }) => asc(controllers.cid)
		});
		expect(rows).toEqual([
			{
				cid: '1000001',
				firstName: 'Casey',
				lastName: 'Example',
				namePrivacy: false,
				rating: 'S3',
				facilityJoinedAt: '2023-04-05T06:07:08+00:00',
				roles: ['ATM', 'MTR'],
				certification: null,
				endorsements: []
			},
			{
				cid: '1000002',
				firstName: 'Riley',
				lastName: 'Hiddenname',
				namePrivacy: true,
				rating: 'C1',
				facilityJoinedAt: null,
				roles: [],
				certification: null,
				endorsements: []
			}
		]);
		expect(await db.query.availableCredentialsTable.findMany()).toEqual([]);
	});
});
