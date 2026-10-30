import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { userCertificationsTable } from '$lib/db/schema/certifications';
import { userEndorsementsTable } from '$lib/db/schema/endorsements';
import { usersTable } from '$lib/db/schema/users';
import type { Database } from '$lib/server/db';
import { seedMember, testDb } from '$lib/testing/db';
import { syncUserMembership } from './membership';

let db: Database;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
	db = await testDb();
	fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
	vi.stubGlobal('fetch', fetchMock);
	// A made-up person on the roster, with a site account that is not yet a controller
	await seedMember(db, {
		cid: '1000001',
		firstName: 'Alex',
		lastName: 'Sample',
		rating: 'S3',
		certification: 'T-RC',
		user: { id: 'user-1', email: 'alex@example.test', membership: 'community' }
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

async function becomeController() {
	const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, 'user-1') });
	await syncUserMembership(db, user!);
}

describe('a user who becomes a controller', () => {
	it('is made a controller and gets no rows in the old certification and endorsement tables', async () => {
		await becomeController();

		const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, 'user-1') });
		expect(user?.membership).toBe('controller');
		expect(await db.select().from(userCertificationsTable)).toEqual([]);
		expect(await db.select().from(userEndorsementsTable)).toEqual([]);
	});

	it('sends the senior staff alert without a credential field', async () => {
		await becomeController();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
		const [embed] = JSON.parse(init.body).embeds;
		expect(embed.title).toBe('Controller Membership');
		expect(embed.description).toContain('is now a controller');
		const names = embed.fields.map((field: { name: string }) => field.name);
		expect(names).toEqual(['Operating Initials']);
	});
});
