import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usersTable } from '$lib/db/schema/users';
import type { Database } from '$lib/server/db';
import { seedMember, testDb } from '$lib/testing/db';
import { clearClientTokenCache } from './identity';
import { checkIdentity } from './identityCheck';
import { createSession } from './session';

vi.mock('$env/dynamic/private', async (importOriginal) => {
	const original = await importOriginal<typeof import('$env/dynamic/private')>();
	return {
		env: {
			...original.env,
			IDENTITY_URL: 'https://identity.test',
			IDENTITY_API_CLIENT_ID: 'community-api',
			IDENTITY_API_CLIENT_SECRET: 'made-up-secret'
		}
	};
});

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
	clearClientTokenCache();
	fetchMock = vi.fn();
	vi.stubGlobal('fetch', fetchMock);
});

/** A fake identity: userinfo answers these claims, the token and PATCH answer as given. */
function identity(userinfo: Record<string, unknown>, tokenStatus = 200) {
	fetchMock.mockImplementation(async (url: string) => {
		if (url.endsWith('/oauth/userinfo')) return Response.json(userinfo);
		if (url === 'https://identity.test/oauth/token') {
			return tokenStatus === 200
				? Response.json({ access_token: 'client-token', expires_in: 3600 })
				: Response.json({ error: 'invalid_client' }, { status: tokenStatus });
		}
		if (url === 'https://identity.test/api/users/1000001')
			return new Response(null, { status: 204 });
		throw new Error(`unexpected fetch ${url}`);
	});
}

/** The bodies of the PATCHes sent to identity's /api/users. */
const patches = () =>
	fetchMock.mock.calls
		.filter(([url]) => String(url).includes('/api/users/'))
		.map(([, init]) => JSON.parse((init as RequestInit).body as string));

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

	it("fills in identity's empty initials and pronouns from the row, and keeps them", async () => {
		identity(claims({ pronouns: null, operating_initials: null }));

		const { result, usersWrites, row } = await check();

		expect(patches()).toEqual([{ pronouns: 'they/them', operating_initials: 'JS' }]);
		expect(usersWrites).toBe(0);
		expect(row).toMatchObject({ pronouns: 'they/them', operatingInitials: 'JS' });
		expect(result?.user).toMatchObject({ pronouns: 'they/them', operatingInitials: 'JS' });
	});

	it('keeps the initials when identity refuses the fill, to try again at the next check', async () => {
		identity(claims({ operating_initials: null }), 401);

		const { result, usersWrites, row } = await check();

		expect(patches()).toEqual([]);
		expect(usersWrites).toBe(0);
		expect(row.operatingInitials).toBe('JS');
		expect(result?.user.operatingInitials).toBe('JS');
	});

	it("follows identity's empty preferred name over one equal to the full name, as the copy did", async () => {
		await db.update(usersTable).set({ preferredName: 'Jordan Sample' });
		identity(claims());

		const { row } = await check();

		expect(patches()).toEqual([]);
		expect(row.preferredName).toBeNull();
	});

	it("takes identity's value over the row's when identity holds one", async () => {
		identity(claims({ operating_initials: 'JY' }));

		const { row } = await check();

		expect(patches()).toEqual([]);
		expect(row.operatingInitials).toBe('JY');
	});

	it('leaves the row as it is when identity is down', async () => {
		fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

		const { result, usersWrites } = await check();

		expect(usersWrites).toBe(0);
		expect(result?.user.pronouns).toBe('they/them');
	});
});
