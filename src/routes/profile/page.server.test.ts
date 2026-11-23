import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
import { fakeLarry, type FakeLarry } from '$lib/testing/larry';
import { callLoad } from '$lib/testing/site';
import { SAVED_MESSAGES, UNAVAILABLE } from '$lib/forms/profile';
import { SYNC_QUEUED, TEAMSPEAK_CONNECT_URL, UNLINKED } from '$lib/profile/linkedAccounts';
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

function fakeCookies() {
	const jar = new Map<string, string>();
	return {
		jar,
		get: (name: string) => jar.get(name),
		set: (name: string, value: string) => jar.set(name, value),
		delete: (name: string) => jar.delete(name)
	};
}

/** The Centerline toasts raised for the next page (`toastFromServer`). */
const toasts = (cookies: ReturnType<typeof fakeCookies>) =>
	JSON.parse(cookies.jar.get('centerline-toasts') ?? '[]') as { level: string; message: string }[];

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
		cookies = fakeCookies(),
		failRowWrite = false
	}: {
		userId?: string;
		larry?: FakeLarry;
		cookies?: ReturnType<typeof fakeCookies>;
		/** Makes the local row's update throw, as a D1 failure would. */
		failRowWrite?: boolean;
	} = {}
) {
	const request = new Request('https://flyindycenter.com/profile?edit&/save', {
		method: 'POST',
		body: new URLSearchParams(fields)
	});
	const locals = await signedIn(userId);
	if (failRowWrite) {
		locals.db = new Proxy(db, {
			get: (target, key, receiver) =>
				key === 'update'
					? () => {
							throw new Error('D1_ERROR: database is locked');
						}
					: Reflect.get(target, key, receiver)
		});
	}
	try {
		const result = (await actions.save({
			request,
			locals,
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
		expect(toasts(cookies)).toEqual([{ level: 'success', message: SAVED_MESSAGES.soon }]);
	});

	it('saves a bio change without writing to identity or asking larry', async () => {
		const { redirect, cookies, larry } = await save({ ...unchanged, bio: 'Only this changed.' });

		expect(redirect?.location).toBe('/profile');
		expect(identity.writes).toEqual([]);
		expect(larry.synced).toEqual([]);
		expect((await row()).bio).toBe('Only this changed.');
		expect(toasts(cookies)).toEqual([{ level: 'success', message: SAVED_MESSAGES.saved }]);
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

	it("puts identity back when the local row can't be written after both identity writes", async () => {
		identity.claims = claimsFor({ preferred_name: 'Jordan', pronouns: 'he/him' });

		const { result, larry, cookies } = await save(
			{
				...unchanged,
				nameChoice: 'initial',
				pronounsChoice: 'they/them',
				operatingInitials: 'JY'
			},
			{ failRowWrite: true }
		);

		expect(result?.status).toBe(503);
		expect(result?.data?.form.message).toBe(UNAVAILABLE);
		expect(identity.writes.map(({ path, body }) => ({ path, body }))).toEqual([
			{ path: '/api/users/1000001', body: { operating_initials: 'JY' } },
			{ path: '/api/me', body: { preferred_name: 'Jordan S.', pronouns: 'they/them' } },
			// Undone newest first
			{ path: '/api/me', body: { preferred_name: 'Jordan', pronouns: 'he/him' } },
			{ path: '/api/users/1000001', body: { operating_initials: 'JS' } }
		]);
		expect(identity.claims).toMatchObject({
			preferred_name: 'Jordan',
			pronouns: 'he/him',
			operating_initials: 'JS'
		});
		expect(larry.synced).toEqual([]);
		expect(toasts(cookies)).toEqual([]);
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

	it('saves the full name as text for a member with name privacy who chooses it', async () => {
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
			{ ...unchanged, nameChoice: 'full', operatingInitials: 'CH' },
			{ userId: 'user-casey' }
		);

		expect(identity.writes.map(({ path, body }) => ({ path, body }))).toEqual([
			{ path: '/api/me', body: { preferred_name: 'Casey Hiddenlast' } }
		]);
		expect((await row('user-casey')).preferredName).toBe('Casey Hiddenlast');
		const data = await visit('user-casey', { href: '/profile?edit' });
		expect(data.shownName).toBe('Casey Hiddenlast');
		expect(data.form.data.nameChoice).toBe('full');
	});

	it('says the nickname updates at the next sync when larry declines', async () => {
		const larry = fakeLarry({
			sync: [{ cid: 1000001, queued: false, reason: 'Synced in the last 2 minutes.' }]
		});

		const { cookies } = await save({ ...unchanged, nameChoice: 'first' }, { larry });

		expect(toasts(cookies)).toEqual([{ level: 'success', message: SAVED_MESSAGES.later }]);
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

		expect(toasts(cookies)).toEqual([{ level: 'success', message: SAVED_MESSAGES.saved }]);
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

describe('/profile Linked accounts', () => {
	it.each([
		[
			{ id: '100000000000000002', source: 'linked' as const },
			{ state: 'linked', account: '100000000000000002' }
		],
		[{ id: '100000000000000001', source: 'vatusa' as const }, { state: 'vatusa' }],
		[null, { state: 'none' }]
	])('shows the Discord row for %j', async (discord, row) => {
		const data = await visit('user-jordan', { larry: fakeLarry({ discord }) });

		expect(data.discord).toEqual(row);
	});

	it('shows the username the callback read, once', async () => {
		const cookies = fakeCookies();
		cookies.set(
			'profile_accounts',
			JSON.stringify({ discord: { id: '100000000000000002', username: 'jordan_s' } })
		);
		const larry = fakeLarry({ discord: { id: '100000000000000002', source: 'linked' } });

		const first = await visit('user-jordan', { larry, cookies });
		expect(first.discord).toEqual({ state: 'linked', account: '@jordan_s' });

		const second = await visit('user-jordan', { larry, cookies });
		expect(second.discord).toEqual({ state: 'linked', account: '100000000000000002' });
	});

	it('says links are unavailable, and still loads the profile, when larry is unreachable', async () => {
		const data = await visit('user-jordan', {
			larry: fakeLarry({ links: new Error('Network connection lost.') })
		});

		// The panel shows LINKS_UNAVAILABLE for a null row
		expect(data.discord).toBeNull();
		expect(data.links).toBeNull();
		expect(data.shownName).toBe('Jordan Sample');
		expect(data.certifications).toEqual(['T-RC']);
	});
});

/** Posts one of the Linked accounts panel's buttons, which always redirect back to /profile. */
async function press(
	action: 'unlink' | 'syncRoles' | 'linkTeamspeak',
	{
		userId = 'user-jordan',
		larry = fakeLarry(),
		cookies = fakeCookies(),
		service,
		token
	}: {
		userId?: string;
		larry?: FakeLarry;
		cookies?: ReturnType<typeof fakeCookies>;
		service?: string;
		token?: string;
	} = {}
) {
	const request = new Request(`https://flyindycenter.com/profile?/${action}`, {
		method: 'POST',
		// A CID in the request is ignored: only the session's is used
		body: new URLSearchParams({
			cid: '1000002',
			...(service ? { service } : {}),
			...(token ? { token } : {})
		})
	});
	try {
		await actions[action]({
			request,
			locals: await signedIn(userId),
			platform: { env: { LARRY: larry } },
			cookies
		} as never);
	} catch (thrown) {
		const { status, location } = thrown as { status: number; location: string };
		if (!location) throw thrown;
		const flash = cookies.jar.get('profile_accounts');
		return {
			redirect: { status, location },
			flash: flash ? JSON.parse(flash) : null,
			toasts: toasts(cookies),
			larry
		};
	}
	throw new Error(`${action} did not redirect`);
}

describe('/profile Unlink', () => {
	it("unlinks the session's own Discord account only, and says so in a toast", async () => {
		const { redirect, larry, flash, toasts } = await press('unlink');

		expect(redirect).toEqual({ status: 303, location: '/profile' });
		expect(larry.unlinked).toEqual([{ cid: 1000001, service: 'discord' }]);
		expect(toasts).toEqual([{ level: 'success', message: UNLINKED.discord }]);
		expect(flash).toBeNull();
	});

	it("shows larry's refusal as it comes, in a toast", async () => {
		const { flash, toasts } = await press('unlink', {
			larry: fakeLarry({ unlink: new Error('Something went wrong at larry.') })
		});

		expect(toasts).toEqual([{ level: 'danger', message: 'Something went wrong at larry.' }]);
		expect(flash).toBeNull();
	});
});

describe('/profile TeamSpeak', () => {
	it('renders both rows with a linked TeamSpeak identity, shortened', async () => {
		const data = await visit('user-jordan', {
			larry: fakeLarry({ teamspeak: { uid: 'x7KqMadeUpUniqueIdentifier3dE=' } })
		});

		expect(data.discord).toEqual({ state: 'vatusa' });
		expect(data.teamspeak).toEqual({ state: 'linked', uid: 'x7Kq…3dE=' });
	});

	it('shows the not-linked row, asking larry nothing but the links', async () => {
		const larry = fakeLarry();
		const data = await visit('user-jordan', { larry });

		expect(data.discord).toEqual({ state: 'vatusa' });
		expect(data.teamspeak).toEqual({ state: 'none' });
		expect(larry.confirmed).toEqual([]);
		expect(larry.unlinked).toEqual([]);
		expect(TEAMSPEAK_CONNECT_URL).toBe('https://tmspk.gg/s/ZID');
	});

	it('has no TeamSpeak row when larry is unreachable', async () => {
		const data = await visit('user-jordan', { larry: fakeLarry({ links: new Error('down') }) });
		expect(data.teamspeak).toBeNull();
	});

	it('only asks on opening ?ts=, linking nothing until the member confirms', async () => {
		const larry = fakeLarry();

		const data = await visit('user-jordan', { href: '/profile?ts=made-up-token', larry });

		expect(data.pendingTsLink).toBe('made-up-token');
		expect(larry.confirmed).toEqual([]);
		expect((await visit('user-jordan', { larry })).pendingTsLink).toBeNull();
	});

	it("links the confirmed token for the session's CID, and says so in a toast", async () => {
		const { redirect, larry, toasts, flash } = await press('linkTeamspeak', {
			token: 'made-up-token'
		});

		expect(redirect).toEqual({ status: 303, location: '/profile' });
		expect(larry.confirmed).toEqual([{ cid: 1000001, token: 'made-up-token' }]);
		expect(toasts).toEqual([{ level: 'success', message: 'TeamSpeak linked.' }]);
		expect(flash).toBeNull();
	});

	it.each([
		"This link has expired or was already used. Reconnect to TeamSpeak and we'll send you a new one.",
		'That TeamSpeak identity is linked to another member.'
	])("shows larry's refusal as given, in a toast: %s", async (message) => {
		const { flash, toasts } = await press('linkTeamspeak', {
			token: 'old',
			larry: fakeLarry({ confirmTs: new Error(message) })
		});

		expect(toasts).toEqual([{ level: 'danger', message }]);
		expect(flash).toBeNull();
	});

	it('refuses a confirm with no token, asking larry nothing', async () => {
		const larry = fakeLarry();
		const result = await actions.linkTeamspeak({
			request: new Request('https://flyindycenter.com/profile?/linkTeamspeak', {
				method: 'POST',
				body: new URLSearchParams()
			}),
			locals: await signedIn('user-jordan'),
			platform: { env: { LARRY: larry } },
			cookies: fakeCookies()
		} as never);

		expect(result).toMatchObject({ status: 400 });
		expect(larry.confirmed).toEqual([]);
	});

	it('goes through sign-in and keeps the token when signed out', async () => {
		const larry = fakeLarry();
		await expect(visit(null, { href: '/profile?ts=made-up-token', larry })).rejects.toMatchObject({
			status: 302,
			location: `/login/connect?returnUrl=${encodeURIComponent('/profile?ts=made-up-token')}`
		});
		expect(larry.confirmed).toEqual([]);
	});

	it("unlinks the session's own TeamSpeak identity only", async () => {
		const { redirect, larry, toasts } = await press('unlink', { service: 'teamspeak' });

		expect(redirect).toEqual({ status: 303, location: '/profile' });
		expect(larry.unlinked).toEqual([{ cid: 1000001, service: 'teamspeak' }]);
		expect(toasts).toEqual([{ level: 'success', message: UNLINKED.teamspeak }]);
	});
});

describe('/profile Sync my roles', () => {
	it("syncs the session's own CID only, and says when", async () => {
		const { larry, toasts } = await press('syncRoles');

		expect(larry.synced).toEqual([[1000001]]);
		expect(toasts).toEqual([{ level: 'success', message: SYNC_QUEUED }]);
	});

	it("shows larry's reason as given when it declines", async () => {
		const { toasts } = await press('syncRoles', {
			larry: fakeLarry({
				sync: [{ cid: 1000001, queued: false, reason: 'Synced in the last 2 minutes.' }]
			})
		});

		expect(toasts).toEqual([{ level: 'info', message: 'Synced in the last 2 minutes.' }]);
	});
});
