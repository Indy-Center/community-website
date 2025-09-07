import { OAuth2Client } from 'arctic';
import { env } from '$env/dynamic/private';

export const client = new OAuth2Client(
	env.CONNECT_CLIENT_ID!,
	env.CONNECT_CLIENT_SECRET!,
	env.CONNECT_CALLBACK_URL!
);
