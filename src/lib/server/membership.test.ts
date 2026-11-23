import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { userCertificationsTable } from '$lib/db/schema/certifications';
import { userEndorsementsTable } from '$lib/db/schema/endorsements';
import { usersTable } from '$lib/db/schema/users';
import type { Database } from '$lib/server/db';
import { seedMember, testDb } from '$lib/testing/db';
import { clearClientTokenCache } from './identity';
import { syncMemberships, syncUserMembership } from './membership';
import { logger } from './logger';

// The senior staff alert needs a webhook to send to
vi.mock('$env/dynamic/private', async (importOriginal) => {
	const original = await importOriginal<typeof import('$env/dynamic/private')>();
	return {
		env: {
			...original.env,
			DISCORD_WEBHOOK_SENIOR_STAFF_ALERTS: 'https://discord.test/webhook',
			IDENTITY_URL: 'https://identity.test',
			IDENTITY_API_CLIENT_ID: 'community-api',
			IDENTITY_API_CLIENT_SECRET: 'made-up-secret'
		}
	};
});

let db: Database;
let fetchMock: ReturnType<typeof vi.fn>;
let identityPatchStatus: number;

beforeEach(async () => {
	db = await testDb();
	clearClientTokenCache();
	identityPatchStatus = 204;
	// A fake identity and a fake Discord webhook behind fetch
	fetchMock = vi.fn(async (url: string) => {
		if (url === 'https://identity.test/oauth/token') {
			return Response.json({ access_token: 'token-1', expires_in: 3600 });
		}
		if (url.startsWith('https://identity.test/api/users/')) {
			return identityPatchStatus === 204
				? new Response(null, { status: 204 })
				: Response.json({ error: 'insufficient_scope' }, { status: identityPatchStatus });
		}
		return new Response(null, { status: 204 });
	});
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

		const webhookCalls = fetchMock.mock.calls.filter(
			([url]) => url === 'https://discord.test/webhook'
		);
		expect(webhookCalls).toHaveLength(1);
		const [, init] = webhookCalls[0] as [string, { body: string }];
		const [embed] = JSON.parse(init.body).embeds;
		expect(embed.title).toBe('Controller Membership');
		expect(embed.description).toContain('is now a controller');
		const names = embed.fields.map((field: { name: string }) => field.name);
		expect(names).toEqual(['Operating Initials']);
	});

	it('has its initials written to identity, then stored on the row', async () => {
		await becomeController();

		const patch = fetchMock.mock.calls.find(([url]) => String(url).includes('/api/users/'));
		expect(patch?.[0]).toBe('https://identity.test/api/users/1000001');
		expect(JSON.parse((patch?.[1] as { body: string }).body)).toEqual({ operating_initials: 'SE' });
		const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, 'user-1') });
		expect(user?.operatingInitials).toBe('SE');
	});

	it('keeps the row unchanged and logs the error when identity refuses', async () => {
		identityPatchStatus = 403;
		const logged = vi.spyOn(logger, 'error').mockImplementation(() => {});

		await becomeController();

		const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, 'user-1') });
		expect(user?.operatingInitials).toBeNull();
		expect(logged).toHaveBeenCalledTimes(1);
		expect(String(logged.mock.calls[0][0])).toContain('1000001');
		logged.mockRestore();
	});
});

describe('a controller who leaves the roster', () => {
	it('keeps their operating initials through the bulk demotion', async () => {
		await seedMember(db, {
			cid: '1000002',
			firstName: 'Blake',
			lastName: 'Example',
			onRoster: false,
			user: {
				id: 'user-2',
				email: 'blake@example.test',
				membership: 'controller',
				operatingInitials: 'BE'
			}
		});

		await syncMemberships(db);

		const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, 'user-2') });
		expect(user?.membership).toBe('community');
		expect(user?.operatingInitials).toBe('BE');
		expect(
			fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/users/1000002'))
		).toEqual([]);
	});
});
