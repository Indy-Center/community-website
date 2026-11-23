import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	clearClientTokenCache,
	clientToken,
	updateOwnProfile,
	writeOperatingInitials
} from './identity';

const env = {
	IDENTITY_URL: 'https://identity.test',
	IDENTITY_API_CLIENT_ID: 'community-api',
	IDENTITY_API_CLIENT_SECRET: 'made-up-secret'
};

const tokenResponse = (token: string, expiresIn = 3600) =>
	Response.json({ access_token: token, token_type: 'Bearer', expires_in: expiresIn });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
	vi.useFakeTimers();
	clearClientTokenCache();
	fetchMock = vi.fn();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('clientToken', () => {
	it('asks identity for a client-credentials token under the API client', async () => {
		fetchMock.mockResolvedValueOnce(tokenResponse('token-1'));

		expect(await clientToken(env)).toBe('token-1');

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://identity.test/oauth/token');
		expect(init.method).toBe('POST');
		const body = new URLSearchParams(init.body as string);
		expect(Object.fromEntries(body)).toEqual({
			grant_type: 'client_credentials',
			client_id: 'community-api',
			client_secret: 'made-up-secret'
		});
	});

	it('is fetched once and reused while fresh', async () => {
		fetchMock.mockResolvedValue(tokenResponse('token-1'));

		await clientToken(env);
		vi.advanceTimersByTime(30 * 60 * 1000);
		expect(await clientToken(env)).toBe('token-1');

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('is fetched again a minute before it expires', async () => {
		fetchMock
			.mockResolvedValueOnce(tokenResponse('token-1'))
			.mockResolvedValueOnce(tokenResponse('token-2'));

		await clientToken(env);
		vi.advanceTimersByTime(59 * 60 * 1000 + 1);

		expect(await clientToken(env)).toBe('token-2');
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("throws when the API client's secret isn't set", async () => {
		await expect(clientToken({ ...env, IDENTITY_API_CLIENT_SECRET: undefined })).rejects.toThrow(
			"identity API client isn't configured"
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('throws with identity status and error code when the token is refused', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({ error: 'invalid_client' }, { status: 401 }));

		await expect(clientToken(env)).rejects.toThrow(/401.*invalid_client/);
	});
});

describe('writeOperatingInitials', () => {
	it("sends the CID's PATCH with the bearer token", async () => {
		fetchMock
			.mockResolvedValueOnce(tokenResponse('token-1'))
			.mockResolvedValueOnce(new Response(null, { status: 204 }));

		await writeOperatingInitials(env, '1000001', 'AS');

		const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
		expect(url).toBe('https://identity.test/api/users/1000001');
		expect(init.method).toBe('PATCH');
		expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-1');
		expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
		expect(JSON.parse(init.body as string)).toEqual({ operating_initials: 'AS' });
	});

	it('sends null to clear initials', async () => {
		fetchMock
			.mockResolvedValueOnce(tokenResponse('token-1'))
			.mockResolvedValueOnce(new Response(null, { status: 204 }));

		await writeOperatingInitials(env, '1000001', null);

		const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
		expect(JSON.parse(init.body as string)).toEqual({ operating_initials: null });
	});

	it('throws with identity status and error code on a 403', async () => {
		fetchMock
			.mockResolvedValueOnce(tokenResponse('token-1'))
			.mockResolvedValueOnce(Response.json({ error: 'insufficient_scope' }, { status: 403 }));

		await expect(writeOperatingInitials(env, '1000001', 'AS')).rejects.toMatchObject({
			status: 403,
			code: 'insufficient_scope'
		});
	});

	it('throws with identity status on a 5xx without a body', async () => {
		fetchMock
			.mockResolvedValueOnce(tokenResponse('token-1'))
			.mockResolvedValueOnce(new Response('boom', { status: 503 }));

		await expect(writeOperatingInitials(env, '1000001', 'AS')).rejects.toMatchObject({
			status: 503
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('refreshes the token once on a 401 and retries once', async () => {
		fetchMock
			.mockResolvedValueOnce(tokenResponse('token-1'))
			.mockResolvedValueOnce(Response.json({ error: 'invalid_token' }, { status: 401 }))
			.mockResolvedValueOnce(tokenResponse('token-2'))
			.mockResolvedValueOnce(new Response(null, { status: 204 }));

		await writeOperatingInitials(env, '1000001', 'AS');

		expect(fetchMock).toHaveBeenCalledTimes(4);
		const [, retry] = fetchMock.mock.calls[3] as [string, RequestInit];
		expect(new Headers(retry.headers).get('Authorization')).toBe('Bearer token-2');
	});

	it('gives up after one refresh when the retry is also a 401', async () => {
		fetchMock
			.mockResolvedValueOnce(tokenResponse('token-1'))
			.mockResolvedValueOnce(Response.json({ error: 'invalid_token' }, { status: 401 }))
			.mockResolvedValueOnce(tokenResponse('token-2'))
			.mockResolvedValueOnce(Response.json({ error: 'invalid_token' }, { status: 401 }));

		await expect(writeOperatingInitials(env, '1000001', 'AS')).rejects.toMatchObject({
			status: 401
		});
		expect(fetchMock).toHaveBeenCalledTimes(4);
	});
});

describe('updateOwnProfile', () => {
	it("sends PATCH /api/me with the member's own token, not the client's", async () => {
		fetchMock.mockResolvedValueOnce(Response.json({ sub: '1000001' }));

		await updateOwnProfile(env, 'member-token', { preferred_name: 'Jay S.', pronouns: null });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('https://identity.test/api/me');
		expect(init.method).toBe('PATCH');
		expect(new Headers(init.headers).get('Authorization')).toBe('Bearer member-token');
		expect(JSON.parse(init.body as string)).toEqual({ preferred_name: 'Jay S.', pronouns: null });
	});

	it('throws with identity status and error code when refused', async () => {
		fetchMock.mockResolvedValueOnce(Response.json({ error: 'invalid_request' }, { status: 400 }));

		await expect(
			updateOwnProfile(env, 'member-token', { pronouns: 'she/her' })
		).rejects.toMatchObject({ status: 400, code: 'invalid_request' });
	});
});
