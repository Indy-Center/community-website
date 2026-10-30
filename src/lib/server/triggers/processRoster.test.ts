import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Roster, RosterMember } from '@indy-center/training-tools';
import { usersTable } from '$lib/db/schema/users';
import type { Database } from '$lib/server/db';
import { readAvailableCredentials, readMemberCredentials } from '$lib/server/roster';
import { seedMember, testDb } from '$lib/testing/db';
import { runProcessRoster } from './processRoster';

const facilityInfo = vi.hoisted(() => ({
	fetch: vi.fn(async () => ({ id: 'ZID', atm: 0, datm: 0, ta: 0, ec: 0, fe: 0, wm: 0 }))
}));
vi.mock('$lib/server/vatsim/vatusaDataClient', () => ({ fetchFacilityInfo: facilityInfo.fetch }));

// Every member here is made up; the repository is public.
function member(row: Partial<RosterMember> & { cid: string }): RosterMember {
	return {
		firstName: 'Alex',
		lastName: 'Sample',
		namePrivacy: false,
		rating: 'S2',
		facilityJoinedAt: '2024-02-03T00:00:00+00:00',
		roles: [],
		certification: null,
		endorsements: [],
		...row
	};
}

const CREDENTIALS: Roster['credentials'] = [
	{
		code: 'S-GC',
		kind: 'certification',
		name: 'Simple Ground Control',
		order: 1,
		description: 'Ground at the smaller fields.'
	},
	{
		code: 'T-RC',
		kind: 'certification',
		name: 'Terminal Radar Control',
		order: 2,
		description: 'Approach and departure.'
	},
	{
		code: 'T2-CTR',
		kind: 'endorsement',
		name: 'Tier 2 Center',
		order: 3,
		description: 'The busier center sectors.'
	}
];

/** A stand-in for the training app's binding: answers `roster`, or throws once `down()`. */
function fakeTraining(roster: Roster) {
	let down = false;
	return {
		getRoster: async () => {
			if (down) throw new Error('training-tools unreachable');
			return roster;
		},
		serve(next: Roster) {
			roster = next;
		},
		down() {
			down = true;
		}
	};
}

const GOOD: Roster = {
	credentials: CREDENTIALS,
	members: [
		member({
			cid: '1000001',
			firstName: 'Jordan',
			lastName: 'Sample',
			rating: 'S3',
			roles: ['ATM'],
			certification: 'T-RC',
			endorsements: ['T2-CTR']
		}),
		member({ cid: '1000002', firstName: 'Morgan', namePrivacy: true, facilityJoinedAt: null })
	]
};

let db: Database;

beforeEach(async () => {
	db = await testDb();
	// The new- and leaving-controller alerts go to Discord
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response(null, { status: 204 }))
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

async function membership(id: string) {
	const user = await db.query.usersTable.findFirst({ where: (users, { eq }) => eq(users.id, id) });
	return user?.membership;
}

describe('the roster refresh', () => {
	it("stores the training app's members, their credentials and the available credentials", async () => {
		await runProcessRoster({ training: fakeTraining(GOOD), db });

		expect(
			await db.query.vatsimControllersTable.findMany({
				orderBy: (controllers, { asc }) => asc(controllers.cid)
			})
		).toEqual([
			{
				cid: '1000001',
				firstName: 'Jordan',
				lastName: 'Sample',
				namePrivacy: false,
				rating: 'S3',
				facilityJoinedAt: '2024-02-03T00:00:00+00:00',
				roles: ['ATM'],
				certification: 'T-RC',
				endorsements: ['T2-CTR']
			},
			{
				cid: '1000002',
				firstName: 'Morgan',
				lastName: 'Sample',
				namePrivacy: true,
				rating: 'S2',
				facilityJoinedAt: null,
				roles: [],
				certification: null,
				endorsements: []
			}
		]);
		expect(await readAvailableCredentials(db)).toEqual([
			{ code: 'S-GC', kind: 'certification', name: 'Simple Ground Control', order: 1 },
			{ code: 'T-RC', kind: 'certification', name: 'Terminal Radar Control', order: 2 },
			{ code: 'T2-CTR', kind: 'endorsement', name: 'Tier 2 Center', order: 3 }
		]);
	});

	it('gives a member with no site account their credentials, by CID', async () => {
		await runProcessRoster({ training: fakeTraining(GOOD), db });

		expect(await readMemberCredentials(db, '1000001')).toEqual({
			held: { certification: 'T-RC', endorsements: ['T2-CTR'] },
			credentials: [
				{ code: 'S-GC', kind: 'certification', name: 'Simple Ground Control', order: 1 },
				{ code: 'T-RC', kind: 'certification', name: 'Terminal Radar Control', order: 2 },
				{ code: 'T2-CTR', kind: 'endorsement', name: 'Tier 2 Center', order: 3 }
			]
		});
		expect(await readMemberCredentials(db, '1000009')).toMatchObject({ held: null });
	});

	it('drops a member who left', async () => {
		const training = fakeTraining(GOOD);
		await runProcessRoster({ training, db });

		training.serve({ ...GOOD, members: [GOOD.members[1]] });
		await runProcessRoster({ training, db });

		expect((await db.query.vatsimControllersTable.findMany()).map((m) => m.cid)).toEqual([
			'1000002'
		]);
		expect((await readMemberCredentials(db, '1000001')).held).toBeNull();
	});

	it('makes a signed-up member on the roster a controller, and one who left a community member', async () => {
		await seedMember(db, {
			cid: '1000001',
			firstName: 'Jordan',
			lastName: 'Sample',
			onRoster: false,
			user: { id: 'user-jordan', email: 'jordan@private.example.test', membership: 'community' }
		});
		await seedMember(db, {
			cid: '1000003',
			firstName: 'Taylor',
			lastName: 'Sample',
			user: { id: 'user-taylor', email: 'taylor@private.example.test' }
		});

		await runProcessRoster({ training: fakeTraining(GOOD), db });

		expect(await membership('user-jordan')).toBe('controller');
		expect(await membership('user-taylor')).toBe('community');
	});

	describe.each([
		['throws', (training: ReturnType<typeof fakeTraining>) => training.down()],
		[
			'answers with no members',
			(training: ReturnType<typeof fakeTraining>) => training.serve({ ...GOOD, members: [] })
		]
	])('when the training app %s', (_, fail) => {
		it('keeps the last copy and skips the membership sync', async () => {
			const training = fakeTraining(GOOD);
			await runProcessRoster({ training, db });
			const copy = await db.query.vatsimControllersTable.findMany();
			// Signed up after the last good refresh, and not on it
			await db.insert(usersTable).values({
				id: 'user-casey',
				cid: '1000004',
				firstName: 'Casey',
				lastName: 'Sample',
				email: 'casey@private.example.test',
				membership: 'controller',
				data: {} as never
			});

			fail(training);
			await runProcessRoster({ training, db });

			expect(await db.query.vatsimControllersTable.findMany()).toEqual(copy);
			expect(await readAvailableCredentials(db)).toHaveLength(3);
			expect(await membership('user-casey')).toBe('controller');
		});

		it('still syncs the staff points of contact', async () => {
			const training = fakeTraining(GOOD);
			fail(training);
			facilityInfo.fetch.mockResolvedValueOnce({
				id: 'ZID',
				atm: 1000001,
				datm: 0,
				ta: 0,
				ec: 0,
				fe: 0,
				wm: 0
			});

			await runProcessRoster({ training, db });

			expect(await db.query.staffPocsTable.findMany()).toEqual([
				{ position: 'ATM', cid: '1000001' }
			]);
		});
	});

	it('refreshes the roster when the staff points of contact cannot be fetched', async () => {
		facilityInfo.fetch.mockRejectedValueOnce(new Error('VATUSA down'));

		await runProcessRoster({ training: fakeTraining(GOOD), db });

		expect(await db.query.vatsimControllersTable.findMany()).toHaveLength(2);
	});
});
