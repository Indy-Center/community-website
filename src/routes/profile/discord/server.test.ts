import { describe, expect, it, vi } from 'vitest';
import { DISCORD_NOT_CONFIRMED } from '$lib/profile/linkedAccounts';
import { GET } from './+server';

const env = vi.hoisted(() => ({
	DISCORD_CLIENT_ID: 'made-up-client-id' as string | undefined,
	DISCORD_CLIENT_SECRET: 'made-up-client-secret' as string | undefined
}));
vi.mock('$env/dynamic/private', () => ({ env }));

function fakeCookies() {
	const jar = new Map<string, { value: string; options: unknown }>();
	return {
		jar,
		get: (name: string) => jar.get(name)?.value,
		set: (name: string, value: string, options: unknown) => jar.set(name, { value, options }),
		delete: (name: string) => jar.delete(name)
	};
}

function start(signedIn = true, query = '') {
	const cookies = fakeCookies();
	try {
		GET({
			url: new URL(`https://flyindycenter.com/profile/discord${query}`),
			locals: signedIn ? { user: { cid: '1000001' } } : {},
			cookies
		} as never);
	} catch (thrown) {
		const { status, location } = thrown as { status: number; location: string };
		if (!location) throw thrown;
		return { status, location, cookies };
	}
	throw new Error('Link Discord did not redirect');
}

describe('/profile/discord (Link Discord)', () => {
	it('sends a signed-out visitor to sign in and back to the profile', () => {
		expect(start(false)).toMatchObject({
			status: 302,
			location: `/login/connect?returnUrl=${encodeURIComponent('/profile')}`
		});
	});

	it('asks Discord for identify and guilds.join with a state it keeps in a cookie', () => {
		const { status, location, cookies } = start();

		const url = new URL(location);
		expect(status).toBe(302);
		expect(`${url.origin}${url.pathname}`).toBe('https://discord.com/oauth2/authorize');
		expect(url.searchParams.get('client_id')).toBe('made-up-client-id');
		expect(url.searchParams.get('scope')).toBe('identify guilds.join');
		expect(url.searchParams.get('redirect_uri')).toBe(
			'https://flyindycenter.com/profile/discord/callback'
		);
		const state = cookies.jar.get('discord_oauth_state');
		expect(state?.value).toBe(url.searchParams.get('state'));
		expect(state?.options).toMatchObject({ path: '/profile/discord', httpOnly: true });
	});

	it('keeps the page it was started from for the callback, and only a same-site path', () => {
		const { cookies } = start(true, '?return=%2Fsocials');
		expect(cookies.jar.get('discord_return')).toMatchObject({
			value: '/socials',
			options: { path: '/profile/discord', httpOnly: true }
		});

		for (const unsafe of [
			'https%3A%2F%2Fevil.example',
			'%2F%2Fevil.example',
			'%2F%5Cevil.example'
		]) {
			expect(start(true, `?return=${unsafe}`).cookies.jar.has('discord_return')).toBe(false);
		}
	});

	it('sends a signed-out visitor to sign in, then straight back into joining', () => {
		expect(start(false, '?return=%2F')).toMatchObject({
			status: 302,
			location: `/login/connect?returnUrl=${encodeURIComponent('/profile/discord?return=%2F')}`
		});
	});

	it("says Discord didn't confirm the account when the client isn't configured", () => {
		env.DISCORD_CLIENT_SECRET = undefined;
		try {
			const { location, cookies } = start();

			expect(location).toBe('/profile');
			expect(JSON.parse(cookies.jar.get('centerline-toasts')!.value)).toEqual([
				{ level: 'danger', message: DISCORD_NOT_CONFIRMED }
			]);
		} finally {
			env.DISCORD_CLIENT_SECRET = 'made-up-client-secret';
		}
	});
});
