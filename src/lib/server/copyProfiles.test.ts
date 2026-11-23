import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usersTable } from '$lib/db/schema/users';
import { testDb } from '$lib/testing/db';
import type { Database } from '$lib/server/db';
import { copyProfiles, type CopyStore } from './copyProfiles';
import { clearClientTokenCache } from './identity';

const env = {
	IDENTITY_URL: 'https://identity.test',
	IDENTITY_API_CLIENT_ID: 'community-api',
	IDENTITY_API_CLIENT_SECRET: 'made-up-secret'
};

let db: Database;
let fetchMock: ReturnType<typeof vi.fn>;
let unknownCids: string[];

const store = (): CopyStore => ({
	users: async () => db.select().from(usersTable),
	setOperatingInitials: async (cid, initials) => {
		await db.update(usersTable).set({ operatingInitials: initials }).where(eq(usersTable.cid, cid));
	},
	clearPreferredName: async (cid) => {
		await db.update(usersTable).set({ preferredName: null }).where(eq(usersTable.cid, cid));
	}
});

async function addUser(
	cid: string,
	fields: Partial<typeof usersTable.$inferInsert> = {}
): Promise<void> {
	await db.insert(usersTable).values({
		id: `user-${cid}`,
		cid,
		firstName: 'Alex',
		lastName: 'Sample',
		email: `${cid}@example.test`,
		membership: 'controller',
		data: {} as never,
		...fields
	});
}

const patches = () =>
	fetchMock.mock.calls
		.filter(([url]) => String(url).includes('/api/users/'))
		.map(([url, init]) => ({
			cid: String(url).split('/').pop(),
			body: JSON.parse((init as RequestInit).body as string) as Record<string, unknown>
		}));

const run = (teachers: { cid: string; initials: string }[] = [], dryRun = false) =>
	copyProfiles({ env, store: store(), teachers, dryRun });

beforeEach(async () => {
	db = await testDb();
	clearClientTokenCache();
	unknownCids = [];
	fetchMock = vi.fn(async (url: string) => {
		if (url.endsWith('/oauth/token')) {
			return Response.json({ access_token: 'token-1', token_type: 'Bearer', expires_in: 3600 });
		}
		const cid = url.split('/').pop() ?? '';
		return unknownCids.includes(cid)
			? Response.json({ error: 'not_found' }, { status: 404 })
			: Response.json({});
	});
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('preferred name', () => {
	it('sends null when it equals the full name, ignoring case and padding, and clears it locally', async () => {
		await addUser('100001', { preferredName: '  alex SAMPLE ' });

		const report = await run();

		expect(patches()[0].body.preferred_name).toBeNull();
		expect(report.droppedFullNames).toBe(1);
		const [row] = await db.select().from(usersTable);
		expect(row.preferredName).toBeNull();
		expect(report.localFullNamesCleared).toEqual(['100001']);
	});

	it('clears a full name locally for a member identity does not know', async () => {
		await addUser('100001', { preferredName: 'Alex Sample' });
		unknownCids = ['100001'];

		const report = await run();

		const [row] = await db.select().from(usersTable);
		expect(row.preferredName).toBeNull();
		expect(report.skippedUnknown).toEqual(['100001']);
	});

	it('leaves the local full name alone on a dry run', async () => {
		await addUser('100001', { preferredName: 'Alex Sample' });

		const report = await run([], true);

		const [row] = await db.select().from(usersTable);
		expect(row.preferredName).toBe('Alex Sample');
		expect(report.localFullNamesCleared).toEqual([]);
	});

	it('sends another name as typed', async () => {
		await addUser('100001', { preferredName: 'Lex' });

		await run();

		expect(patches()[0].body.preferred_name).toBe('Lex');
	});

	it('sends nothing for an empty one', async () => {
		await addUser('100001', { preferredName: '  ' });
		await addUser('100002');

		await run();

		expect(patches().every(({ body }) => !('preferred_name' in body))).toBe(true);
	});

	it('cuts a name over 64 characters and logs the cut', async () => {
		await addUser('100001', { preferredName: 'x'.repeat(70) });

		const report = await run();

		expect(patches()[0].body.preferred_name).toBe('x'.repeat(64));
		expect(report.cuts).toEqual(['100001: preferred name cut from 70 to 64']);
	});
});

describe('pronouns', () => {
	it('copies them trimmed, sends null for empty and cuts over 32', async () => {
		await addUser('100001', { pronouns: ' they/them ' });
		await addUser('100002', { pronouns: '' });
		await addUser('100003', { pronouns: 'p'.repeat(40) });

		const report = await run();

		expect(patches().map(({ body }) => body.pronouns)).toEqual(['they/them', null, 'p'.repeat(32)]);
		expect(report.cuts).toEqual(['100003: pronouns cut from 40 to 32']);
	});
});

describe('operating initials', () => {
	it("a teacher's pair wins over community's and updates the local row", async () => {
		await addUser('100001', { operatingInitials: 'AB' });

		const report = await run([{ cid: '100001', initials: 'CD' }]);

		expect(patches()[0].body.operating_initials).toBe('CD');
		const [row] = await db.select().from(usersTable);
		expect(row.operatingInitials).toBe('CD');
		expect(report.localInitialsUpdated).toEqual(['100001']);
	});

	it("uses community's when there is no teacher pair", async () => {
		await addUser('100001', { operatingInitials: 'AB' });

		await run([{ cid: '100009', initials: 'ZZ' }]);

		expect(patches()[0].body.operating_initials).toBe('AB');
	});

	it('skips and logs a malformed pair, sending the rest', async () => {
		await addUser('100001', { operatingInitials: 'a1', pronouns: 'she/her' });

		const report = await run();

		expect(patches()[0].body).toEqual({ pronouns: 'she/her' });
		expect(report.skippedMalformed).toEqual(['100001: initials "a1" don\'t match ^[A-Z]{2}$']);
	});
});

describe('members identity does not know', () => {
	it('lists a 404 and carries on', async () => {
		await addUser('100001');
		await addUser('100002');
		unknownCids = ['100001'];

		const report = await run();

		expect(report.skippedUnknown).toEqual(['100001']);
		expect(report.patched).toBe(1);
		expect(patches()).toHaveLength(2);
	});
});

describe('--dry-run', () => {
	it('makes no PATCH and no local change, but lists the patches', async () => {
		await addUser('100001', { preferredName: 'Lex', operatingInitials: 'AB' });

		const report = await run([{ cid: '100001', initials: 'CD' }], true);

		expect(fetchMock).not.toHaveBeenCalled();
		expect(report.patches).toHaveLength(1);
		const [row] = await db.select().from(usersTable);
		expect(row.operatingInitials).toBe('AB');
	});
});
