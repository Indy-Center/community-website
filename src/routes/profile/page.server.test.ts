import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Links, SyncMembersResult } from '@indy-center/indy-larry-worker';
import { eq } from 'drizzle-orm';
import { usersTable } from '$lib/db/schema/users';
import type { Database } from '$lib/server/db';
import { clearClientTokenCache } from '$lib/server/identity';
import {
	AVAILABLE_CREDENTIALS,
	seedAvailableCredentials,
	seedMember,
	testDb
} from '$lib/testing/db';
import { callLoad } from '$lib/testing/site';
import { SAVED_MESSAGES, UNAVAILABLE } from '$lib/forms/profile';
import { actions, load } from './+page.server';

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

/** What the fake identity holds for the signed-in member, and how it answers. */
let identity: {
	claims: Record<string, unknown>;
	down: boolean;
	meStatus: number;
	writes: { method: string; path: string; auth: string | null; body: unknown }[];
};

function claimsFor(overrides: Record<string, unknown> = {}) {
	return {
		sub: '1000001',
		name: 'Jordan Sample',
		given_name: 'Jordan',
		family_name: 'Sample',
		preferred_name: null,
		pronouns: null,
		email: 'jordan@private.example.test',
		rating: 'S2',
		pilot_rating: 'NEW',
		division: 'USA',
		region: 'AMAS',
		subdivision: 'ZID',
		roles: [],
		operating_initials: 'JS',
		active: true,
		...overrides
	};
}

// A fake identity behind fetch: userinfo, the client token, and the two writes
const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
	const url = new URL(input);
	if (identity.down) throw new TypeError('fetch failed');
	if (url.pathname === '/oauth/userinfo') return Response.json(identity.claims);
	if (url.pathname === '/oauth/token') {
		return Response.json({ access_token: 'client-token', expires_in: 3600 });
	}
	const body = init?.body ? JSON.parse(init.body as string) : null;
	identity.writes.push({
		method: init?.method ?? 'GET',
		path: url.pathname,
		auth: new Headers(init?.headers).get('Authorization'),
		body
	});
	if (url.pathname === '/api/me') {
		if (identity.meStatus !== 200) {
			return Response.json({ error: 'server_error' }, { status: identity.meStatus });
		}
		Object.assign(identity.claims, body);
		return Response.json(identity.claims);
	}
	if (url.pathname.startsWith('/api/users/')) {
		Object.assign(identity.claims, body);
		return new Response(null, { status: 204 });
	}
	return new Response('Not found', { status: 404 });
});

/** A fake LARRY binding: who it was asked to sync, and what it answers. */
function fakeLarry(opts: { discord?: Links['discord']; sync?: SyncMembersResult | Error } = {}) {
	const synced: number[][] = [];
	return {
		synced,
		getLinks: async (): Promise<Links> => ({
			discord:
				opts.discord === undefined ? { id: '100000000000000001', source: 'vatusa' } : opts.discord,
			teamspeak: null
		}),
		syncMembers: async (cids: number[]) => {
			synced.push(cids);
			if (opts.sync instanceof Error) throw opts.sync;
			return opts.sync ?? cids.map((cid) => ({ cid, queued: true as const }));
		}
	};
}

function fakeCookies() {
	const jar = new Map<string, string>();
	return {
		jar,
		get: (name: string) => jar.get(name),
		set: (name: string, value: string) => jar.set(name, value),
		delete: (name: string) => jar.delete(name)
	};
}

beforeEach(async () => {
	db = await testDb();
	clearClientTokenCache();
	identity = { claims: claimsFor(), down: false, meStatus: 200, writes: [] };
	vi.stubGlobal('fetch', fetchMock);
	await seedAvailableCredentials(db);
	await seedMember(db, {
		cid: '1000001',
		firstName: 'Jordan',
		lastName: 'Sample',
		certification: 'T-RC',
		endorsements: ['T2-CTR'],
		user: {
			id: 'user-jordan',
			email: 'jordan@private.example.test',
			operatingInitials: 'JS',
			bio: 'Flying since a long time ago.'
		}
	});
	await seedMember(db, {
		cid: '1000002',
		firstName: 'Robin',
		lastName: 'Example',
		user: { id: 'user-robin', email: 'robin@private.example.test' }
	});
	// A community member: a site account, not on the controller roster
	await seedMember(db, {
		cid: '1000003',
		firstName: 'Pat',
		lastName: 'Example',
		onRoster: false,
		user: { id: 'user-pat', email: 'pat@private.example.test', membership: 'community' }
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
	fetchMock.mockClear();
});

async function signedIn(userId: string) {
	const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
	return {
		db,
		user,
		roles: [],
		session: {
			id: 'session-1',
			userId,
			expiresAt: new Date('2026-12-01T00:00:00Z'),
			data: { identityToken: 'member-token' }
		}
	};
}

async function visit(
	userId: string | null = 'user-jordan',
	{ href = '/profile', larry = fakeLarry(), cookies = fakeCookies() } = {}
) {
	return callLoad(load, {
		locals: userId ? await signedIn(userId) : { db, roles: [] },
		url: new URL(href, 'https://flyindycenter.com'),
		platform: { env: { LARRY: larry } },
		cookies
	});
}

/** What the edit form posts when nothing is changed, for Jordan as seeded. */
const unchanged = {
	nameChoice: 'full',
	preferredName: '',
	pronounsChoice: '',
	customPronouns: '',
	bio: 'Flying since a long time ago.',
	operatingInitials: 'JS'
};

type ActionResult = {
	status: number;
	data?: {
		form: {
			valid: boolean;
			errors: Record<string, string[] | undefined>;
			message?: string;
			data: Record<string, string>;
		};
	};
};

async function save(
	fields: Record<string, string>,
	{
		userId = 'user-jordan',
		larry = fakeLarry(),
		cookies = fakeCookies()
	}: {
		userId?: string;
		larry?: ReturnType<typeof fakeLarry>;
		cookies?: ReturnType<typeof fakeCookies>;
	} = {}
) {
	const request = new Request('https://flyindycenter.com/profile?edit', {
		method: 'POST',
		body: new URLSearchParams(fields)
	});
	try {
		const result = (await actions.default({
			request,
			locals: await signedIn(userId),
			platform: { env: { LARRY: larry } },
			cookies
		} as never)) as unknown as ActionResult;
		return { result, redirect: null, cookies, larry };
	} catch (thrown) {
		const { status, location } = thrown as { status: number; location: string };
		if (!location) throw thrown;
		return { result: null, redirect: { status, location }, cookies, larry };
	}
}

const row = async (userId = 'user-jordan') =>
	(await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) }))!;

describe('/profile, signed out', () => {
	it.each(['/profile', '/profile?edit'])('sends %s to sign in and back', async (href) => {
		await expect(visit(null, { href })).rejects.toMatchObject({
			status: 302,
			location: `/login/connect?returnUrl=${encodeURIComponent(href)}`
		});
	});
});

describe('/profile', () => {
	it("shows the signed-in controller's certification and endorsements from the roster copy", async () => {
		const data = await visit();

		expect(data.certifications).toEqual(['T-RC']);
		expect(data.endorsements).toEqual(['T2-CTR']);
		expect(data.credentials).toEqual(
			AVAILABLE_CREDENTIALS.map(({ code, name }) => ({ code, name }))
		);
	});

	it('shows none for a community member, who is not on the controller roster', async () => {
		const data = await visit('user-pat');

		expect(data.certifications).toEqual([]);
		expect(data.hasPublicProfile).toBe(false);
	});

	it('opens edit mode at /profile?edit', async () => {
		expect((await visit()).editing).toBe(false);
		expect((await visit('user-jordan', { href: '/profile?edit' })).editing).toBe(true);
	});

	it.each([
		[null, 'full', ''],
		['Jordan', 'first', ''],
		['Jordan S.', 'initial', ''],
		['Jordan 1000001', 'firstCid', ''],
		['1000001', 'cid', ''],
		['Jay', 'preferred', 'Jay']
	])('selects the right option for a stored preferred name of %j', async (stored, choice, box) => {
		identity.claims = claimsFor({ preferred_name: stored });

		const { form, privacyDefault } = await visit();

		expect(form.data.nameChoice).toBe(choice);
		expect(form.data.preferredName).toBe(box);
		expect(privacyDefault).toBe(false);
	});

	it('starts a member with VATUSA name privacy who has not chosen on first name and CID', async () => {
		await seedMember(db, {
			cid: '1000004',
			firstName: 'Casey',
			lastName: 'Hiddenlast',
			namePrivacy: true,
			user: { id: 'user-casey', email: 'casey@private.example.test' }
		});
		identity.claims = claimsFor({
			sub: '1000004',
			given_name: 'Casey',
			family_name: 'Hiddenlast',
			operating_initials: null
		});

		const data = await visit('user-casey');

		expect(data.form.data.nameChoice).toBe('firstCid');
		expect(data.privacyDefault).toBe(true);
		expect(data.shownName).toBe('Casey 1000004');
	});

	it("shows identity's values over the local row's", async () => {
		identity.claims = claimsFor({ preferred_name: 'Jordan S.', pronouns: 'xe/xem' });

		const data = await visit();

		expect(data.shownName).toBe('Jordan S.');
		expect(data.form.data).toMatchObject({ pronounsChoice: 'custom', customPronouns: 'xe/xem' });
		expect(data.canSave).toBe(true);
	});

	it('uses the local row, and turns the form off, when identity is down', async () => {
		await db
			.update(usersTable)
			.set({ preferredName: 'Jordan', pronouns: 'they/them' })
			.where(eq(usersTable.id, 'user-jordan'));
		identity.down = true;

		const data = await visit('user-jordan', { href: '/profile?edit' });

		expect(data.canSave).toBe(false);
		expect(data.form.data).toMatchObject({ nameChoice: 'first', pronounsChoice: 'they/them' });
		expect(data.shownName).toBe('Jordan');
	});

	it('asks a controller on the roster with no initials to choose some', async () => {
		identity.claims = claimsFor({
			sub: '1000002',
			given_name: 'Robin',
			family_name: 'Example',
			operating_initials: null
		});

		expect((await visit('user-robin')).needsInitials).toBe(true);
		identity.claims = claimsFor();
		expect((await visit()).needsInitials).toBe(false);
	});

	it('gives no initials field to a member who is not a controller', async () => {
		identity.claims = claimsFor({
			sub: '1000003',
			given_name: 'Pat',
			family_name: 'Example',
			operating_initials: null
		});

		const data = await visit('user-pat');

		expect(data.isController).toBe(false);
		expect(data.needsInitials).toBe(false);
	});

	it("shows the saved confirmation once, after a save's redirect", async () => {
		const cookies = fakeCookies();
		cookies.set('profile_saved', 'soon');

		expect((await visit('user-jordan', { cookies })).savedMessage).toBe(SAVED_MESSAGES.soon);
		expect((await visit('user-jordan', { cookies })).savedMessage).toBeNull();
	});
});

describe('/profile save', () => {
	it('writes the initials, then /api/me, then the row, and resyncs Discord once', async () => {
		const { redirect, cookies, larry } = await save({
			...unchanged,
			nameChoice: 'initial',
			pronounsChoice: 'custom',
			customPronouns: ' xe/xem ',
			bio: 'New bio.',
			operatingInitials: 'jy'
		});

		expect(redirect).toEqual({ status: 303, location: '/profile' });
		expect(
			identity.writes.map(({ method, path, auth, body }) => ({ method, path, auth, body }))
		).toEqual([
			{
				method: 'PATCH',
				path: '/api/users/1000001',
				auth: 'Bearer client-token',
				body: { operating_initials: 'JY' }
			},
			{
				method: 'PATCH',
				path: '/api/me',
				auth: 'Bearer member-token',
				body: { preferred_name: 'Jordan S.', pronouns: 'xe/xem' }
			}
		]);
		expect(await row()).toMatchObject({
			preferredName: 'Jordan S.',
			pronouns: 'xe/xem',
			operatingInitials: 'JY',
			bio: 'New bio.'
		});
		expect(larry.synced).toEqual([[1000001]]);
		expect(cookies.jar.get('profile_saved')).toBe('soon');
	});

	it('saves a bio change without writing to identity or asking larry', async () => {
		const { redirect, cookies, larry } = await save({ ...unchanged, bio: 'Only this changed.' });

		expect(redirect?.location).toBe('/profile');
		expect(identity.writes).toEqual([]);
		expect(larry.synced).toEqual([]);
		expect((await row()).bio).toBe('Only this changed.');
		expect(cookies.jar.get('profile_saved')).toBe('saved');
	});

	it('puts the initials back when /api/me fails after they were written', async () => {
		identity.meStatus = 503;

		const { result } = await save({ ...unchanged, nameChoice: 'first', operatingInitials: 'JY' });

		expect(result?.status).toBe(503);
		expect(result?.data?.form.message).toBe(UNAVAILABLE);
		expect(identity.writes.map(({ path, body }) => ({ path, body }))).toEqual([
			{ path: '/api/users/1000001', body: { operating_initials: 'JY' } },
			{ path: '/api/me', body: { preferred_name: 'Jordan' } },
			{ path: '/api/users/1000001', body: { operating_initials: 'JS' } }
		]);
		expect(await row()).toMatchObject({ preferredName: null, operatingInitials: 'JS' });
	});

	it('saves nothing, and says so, when identity is down', async () => {
		identity.down = true;

		const { result } = await save({ ...unchanged, bio: 'Changed.' });

		expect(result?.status).toBe(503);
		expect(result?.data?.form.message).toBe(UNAVAILABLE);
		expect((await row()).bio).toBe('Flying since a long time ago.');
	});

	it('writes the privacy default, first name and CID, when saved as it was offered', async () => {
		await seedMember(db, {
			cid: '1000004',
			firstName: 'Casey',
			lastName: 'Hiddenlast',
			namePrivacy: true,
			user: { id: 'user-casey', email: 'casey@private.example.test', operatingInitials: 'CH' }
		});
		identity.claims = claimsFor({
			sub: '1000004',
			given_name: 'Casey',
			family_name: 'Hiddenlast',
			operating_initials: 'CH'
		});

		await save(
			{ ...unchanged, nameChoice: 'firstCid', operatingInitials: 'CH' },
			{ userId: 'user-casey' }
		);

		expect(identity.writes.map(({ path, body }) => ({ path, body }))).toEqual([
			{ path: '/api/me', body: { preferred_name: 'Casey 1000004' } }
		]);
	});

	it('says the nickname updates at the next sync when larry declines', async () => {
		const larry = fakeLarry({
			sync: [{ cid: 1000001, queued: false, reason: 'Synced in the last 2 minutes.' }]
		});

		const { cookies } = await save({ ...unchanged, nameChoice: 'first' }, { larry });

		expect(cookies.jar.get('profile_saved')).toBe('later');
	});

	it('still saves when larry throws', async () => {
		const larry = fakeLarry({ sync: new Error('larry is down') });

		const { redirect } = await save({ ...unchanged, nameChoice: 'first' }, { larry });

		expect(redirect?.location).toBe('/profile');
		expect((await row()).preferredName).toBe('Jordan');
	});

	it('leaves the Discord sentence out for a member with no Discord account', async () => {
		const larry = fakeLarry({ discord: null });

		const { cookies } = await save({ ...unchanged, nameChoice: 'first' }, { larry });

		expect(cookies.jar.get('profile_saved')).toBe('saved');
	});

	it.each([
		[
			{ nameChoice: 'preferred', preferredName: '  ' },
			'preferredName',
			'Type the name to show, or choose another option.'
		],
		[
			{ nameChoice: 'preferred', preferredName: 'x'.repeat(65) },
			'preferredName',
			'Keep it to 64 characters.'
		],
		[
			{ pronounsChoice: 'custom', customPronouns: '' },
			'customPronouns',
			'Type your pronouns, or choose None.'
		],
		[
			{ pronounsChoice: 'custom', customPronouns: 'x'.repeat(33) },
			'customPronouns',
			'Keep it to 32 characters.'
		],
		[{ bio: 'x'.repeat(1003) }, 'bio', 'Keep it to 1000 characters (3 over).'],
		[{ operatingInitials: 'J' }, 'operatingInitials', 'Use two letters.'],
		[{ operatingInitials: 'J1' }, 'operatingInitials', 'Use two letters.'],
		[{ operatingInitials: 'ss' }, 'operatingInitials', "Those initials aren't available."]
	])('refuses %j with its message, saving nothing', async (fields, field, message) => {
		const { result } = await save({ ...unchanged, ...fields });

		expect(result?.status).toBe(400);
		expect(result?.data?.form.errors[field]).toEqual([message]);
		expect(identity.writes).toEqual([]);
	});

	it('checks every field at once, keeping what was typed', async () => {
		const { result } = await save({
			...unchanged,
			nameChoice: 'preferred',
			preferredName: '',
			bio: 'x'.repeat(1001),
			operatingInitials: 'FU'
		});

		expect(Object.keys(result!.data!.form.errors).sort()).toEqual([
			'bio',
			'operatingInitials',
			'preferredName'
		]);
		expect(result?.data?.form.data.bio).toBe('x'.repeat(1001));
	});

	it('allows initials another member holds', async () => {
		const { redirect } = await save({ ...unchanged, operatingInitials: 'RE' });

		expect(redirect?.location).toBe('/profile');
	});

	it('refuses initials from a member who is not a controller, with a 400 and no message', async () => {
		identity.claims = claimsFor({
			sub: '1000003',
			given_name: 'Pat',
			family_name: 'Example',
			operating_initials: null
		});

		const { result } = await save(
			{ ...unchanged, operatingInitials: 'PE' },
			{ userId: 'user-pat' }
		);

		expect(result).toMatchObject({ status: 400 });
		expect(result?.data).toBeUndefined();
		expect(identity.writes).toEqual([]);
	});
});
