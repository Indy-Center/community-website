import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usersTable } from '$lib/db/schema/users';
import type { Database } from '$lib/server/db';
import { seedMember, testDb } from '$lib/testing/db';
import { checkIdentity } from './identityCheck';
import { createSession } from './session';

let db: Database;
let fetchMock: ReturnType<typeof vi.fn>;

const claims = (overrides: Record<string, unknown> = {}) => ({
	sub: '1000001',
	name: 'Jordan Sample',
	given_name: 'Jordan',
	family_name: 'Sample',
	preferred_name: null,
	pronouns: 'they/them',
	email: 'jordan@private.example.test',
	rating: 'S2',
	pilot_rating: 'NEW',
	division: 'USA',
	region: 'AMAS',
	subdivision: 'ZID',
	roles: ['community:admin'],
	operating_initials: 'JS',
	active: true,
	...overrides
});

beforeEach(async () => {
	db = await testDb();
	await seedMember(db, {
		cid: '1000001',
		firstName: 'Jordan',
		lastName: 'Sample',
		user: {
			id: 'user-jordan',
			email: 'jordan@private.example.test',
			pronouns: 'they/them',
			operatingInitials: 'JS'
		}
	});
	fetchMock = vi.fn();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

async function check() {
	const user = (await db.query.usersTable.findFirst())!;
	const session = await createSession('token', user.id, db, {
		identityToken: 'member-token',
		identityCheckedAt: 0
	});
	const updates = vi.spyOn(db, 'update');
	const result = await checkIdentity(session, user, db);
	const usersWrites = updates.mock.calls.filter(([table]) => table === usersTable).length;
	return { result, usersWrites, row: (await db.query.usersTable.findFirst())! };
}

describe('checkIdentity', () => {
	it("copies identity's changed preferred name, pronouns and initials into the member's row", async () => {
		fetchMock.mockResolvedValueOnce(
			Response.json(
				claims({ preferred_name: 'Jay S.', pronouns: 'he/him', operating_initials: 'JY' })
			)
		);

		const { result, row } = await check();

		expect(row).toMatchObject({
			preferredName: 'Jay S.',
			pronouns: 'he/him',
			operatingInitials: 'JY'
		});
		expect(result?.user).toMatchObject({ preferredName: 'Jay S.', operatingInitials: 'JY' });
		expect(result?.roles).toEqual(['community:admin']);
	});

	it('writes nothing to the row when nothing changed', async () => {
		fetchMock.mockResolvedValueOnce(Response.json(claims()));

		const { usersWrites, row } = await check();

		expect(usersWrites).toBe(0);
		expect(row).toMatchObject({
			preferredName: null,
			pronouns: 'they/them',
			operatingInitials: 'JS'
		});
	});

	it('leaves the row as it is when identity is down', async () => {
		fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

		const { result, usersWrites } = await check();

		expect(usersWrites).toBe(0);
		expect(result?.user.pronouns).toBe('they/them');
	});
});
