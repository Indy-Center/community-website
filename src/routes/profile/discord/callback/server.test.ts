import { inspect } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { userSessionsTable, usersTable } from '$lib/db/schema/users';
import { DISCORD_NOT_CONFIRMED } from '$lib/profile/linkedAccounts';
import type { Database } from '$lib/server/db';
import { logger } from '$lib/server/logger';
import { seedMember, testDb } from '$lib/testing/db';
import { fakeLarry, type FakeLarry } from '$lib/testing/larry';
import { GET } from './+server';

vi.mock('$env/dynamic/private', async (importOriginal) => {
	const original = await importOriginal<typeof import('$env/dynamic/private')>();
	return {
		env: {
			...original.env,
			DISCORD_CLIENT_ID: 'made-up-client-id',
			DISCORD_CLIENT_SECRET: 'made-up-client-secret'
		}
	};
});

// A made-up member token, looked for everywhere it must never be kept
const ACCESS_TOKEN = 'made-up-discord-access-token';
const DISCORD_ID = '100000000000000002';

let db: Database;
let discord: { tokenStatus: number; meStatus: number; requests: string[] };

const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
	const url = new URL(input instanceof Request ? input.url : String(input));
	discord.requests.push(`${init?.method ?? 'GET'} ${url.pathname}`);
	if (url.pathname === '/api/oauth2/token') {
		if (discord.tokenStatus !== 200) {
			return Response.json({ error: 'invalid_grant' }, { status: discord.tokenStatus });
		}
		return Response.json({
			access_token: ACCESS_TOKEN,
			token_type: 'Bearer',
			expires_in: 604800,
			refresh_token: 'made-up-refresh-token',
			scope: 'identify guilds.join'
		});
	}
	if (url.pathname === '/api/v10/users/@me') {
		if (new Headers(init?.headers).get('Authorization') !== `Bearer ${ACCESS_TOKEN}`) {
			return new Response(null, { status: 401 });
		}
		if (discord.meStatus !== 200) return new Response(null, { status: discord.meStatus });
		return Response.json({ id: DISCORD_ID, username: 'jordan_s', global_name: 'Jordan' });
	}
	return new Response('Not found', { status: 404 });
});

function fakeCookies(state: string | null = 'good-state') {
	const jar = new Map<string, string>();
	if (state) jar.set('discord_oauth_state', state);
	return {
		jar,
		get: (name: string) => jar.get(name),
		set: (name: string, value: string) => jar.set(name, value),
		delete: (name: string) => jar.delete(name)
	};
}

const logged: unknown[][] = [];

beforeEach(async () => {
	db = await testDb();
	discord = { tokenStatus: 200, meStatus: 200, requests: [] };
	logged.length = 0;
	vi.stubGlobal('fetch', fetchMock);
	for (const level of ['error', 'warn', 'info', 'log', 'debug'] as const) {
		vi.spyOn(logger, level).mockImplementation((...args: unknown[]) => {
			logged.push(args);
		});
	}
	await seedMember(db, {
		cid: '1000001',
		firstName: 'Jordan',
		lastName: 'Sample',
		user: { id: 'user-jordan', email: 'jordan@private.example.test' }
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	fetchMock.mockClear();
});

async function callback(
	query: string,
	{
		signedIn = true,
		larry = fakeLarry(),
		cookies = fakeCookies()
	}: { signedIn?: boolean; larry?: FakeLarry; cookies?: ReturnType<typeof fakeCookies> } = {}
) {
	const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, 'user-jordan') });
	const session = {
		id: 'session-1',
		userId: 'user-jordan',
		expiresAt: new Date('2026-12-01T00:00:00Z'),
		data: { identityToken: 'member-identity-token' }
	};
	const url = new URL(`https://flyindycenter.com/profile/discord/callback${query}`);
	try {
		await GET({
			url,
			locals: signedIn ? { db, user, session, roles: [] } : { db, roles: [] },
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
			larry,
			cookies,
			session
		};
	}
	throw new Error('The callback did not redirect');
}

describe('/profile/discord/callback', () => {
	it('sends a signed-out visitor to sign in and back', async () => {
		const { redirect, larry } = await callback('?code=abc&state=good-state', { signedIn: false });

		expect(redirect).toEqual({
			status: 302,
			location: `/login/connect?returnUrl=${encodeURIComponent('/profile/discord/callback?code=abc&state=good-state')}`
		});
		expect(larry.linked).toEqual([]);
	});

	it.each([
		['a state that does not match', '?code=abc&state=other-state', 'good-state'],
		['no state cookie', '?code=abc&state=good-state', null],
		['a sign-in cancelled at Discord', '?error=access_denied&state=good-state', 'good-state']
	])('refuses %s with its message, linking nothing', async (_, query, state) => {
		const { redirect, flash, larry, cookies } = await callback(query, {
			cookies: fakeCookies(state)
		});

		expect(redirect).toEqual({ status: 302, location: '/profile' });
		expect(flash).toEqual({ level: 'danger', message: DISCORD_NOT_CONFIRMED });
		expect(larry.linked).toEqual([]);
		expect(discord.requests).toEqual([]);
		expect(cookies.jar.has('discord_oauth_state')).toBe(false);
	});

	it.each([
		['the code exchange', { tokenStatus: 400, meStatus: 200 }],
		['reading the account', { tokenStatus: 200, meStatus: 401 }]
	])('says Discord did not confirm the account when %s fails', async (_, answers) => {
		Object.assign(discord, answers);

		const { flash, larry } = await callback('?code=abc&state=good-state');

		expect(flash).toEqual({ level: 'danger', message: DISCORD_NOT_CONFIRMED });
		expect(larry.linked).toEqual([]);
	});

	it("links the account read from Discord to the session's CID, passing the access token", async () => {
		const { redirect, larry } = await callback('?code=abc&state=good-state&cid=1000002');

		expect(redirect).toEqual({ status: 302, location: '/profile' });
		expect(larry.linked).toEqual([
			{ cid: 1000001, discordId: DISCORD_ID, accessToken: ACCESS_TOKEN }
		]);
	});

	it('keeps the access token nowhere: not the session, the database, the cookies or the log', async () => {
		const { session, cookies } = await callback('?code=abc&state=good-state', {
			larry: fakeLarry({ link: new Error('That Discord account is linked to another member.') })
		});

		expect(session.data).toEqual({ identityToken: 'member-identity-token' });
		const rows = [
			...(await db.select().from(usersTable)),
			...(await db.select().from(userSessionsTable))
		];
		expect(JSON.stringify(rows)).not.toContain(ACCESS_TOKEN);
		expect(JSON.stringify([...cookies.jar])).not.toContain(ACCESS_TOKEN);
		expect(logged.length).toBeGreaterThan(0);
		expect(inspect(logged, { depth: 10 })).not.toContain(ACCESS_TOKEN);
	});

	it.each([
		[true, "Linked as @jordan_s. You've been added to the Indy Center Discord."],
		[false, 'Linked as @jordan_s. You were already in the Indy Center Discord.']
	])('says so on the card when joined is %s', async (joined, message) => {
		const { flash } = await callback('?code=abc&state=good-state', {
			larry: fakeLarry({ link: { joined } })
		});

		expect(flash).toEqual({
			level: 'success',
			message,
			discord: { id: DISCORD_ID, username: 'jordan_s' }
		});
	});

	it.each([
		'That Discord account is linked to another member.',
		"Your Discord account is linked, but we couldn't add you to the Indy Center Discord. Ask a staff member for an invite."
	])("shows larry's refusal as it comes: %s", async (refusal) => {
		const { flash } = await callback('?code=abc&state=good-state', {
			larry: fakeLarry({ link: new Error(refusal) })
		});

		expect(flash).toEqual({
			level: 'danger',
			message: refusal,
			discord: { id: DISCORD_ID, username: 'jordan_s' }
		});
	});
});
