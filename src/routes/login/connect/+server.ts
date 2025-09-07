import type { RequestEvent } from '@sveltejs/kit';
import { generateCodeVerifier, generateState } from 'arctic';
import { client } from '$lib/server/oauth';
import { env } from '$env/dynamic/private';

export async function GET(event: RequestEvent): Promise<Response> {
	const state = generateState();

	const url = client.createAuthorizationURL(`${env.CONNECT_BASE_URL}/oauth/authorize`, state, [
		'full_name',
		'vatsim_details',
		'email'
	]);

	event.cookies.set('connect_oauth_state', state, {
		path: '/',
		httpOnly: true,
		maxAge: 60 * 10, // 10 minutes
		sameSite: 'lax'
	});

	return new Response(null, {
		status: 302,
		headers: {
			Location: url.toString()
		}
	});
}
