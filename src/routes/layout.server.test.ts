import { describe, expect, it } from 'vitest';
import { callLoad } from '$lib/testing/site';
import { load } from './+layout.server';

describe('every page', () => {
	it("sends a signed-in visitor's page no session, so never their identity access token", () => {
		const data = callLoad(load, {
			locals: {
				user: { id: 'user-1', cid: '1234567' },
				roles: [],
				session: {
					id: 'session-1',
					userId: 'user-1',
					expiresAt: new Date('2026-11-14T12:00:00Z'),
					data: { identityToken: 'secret-access-token' }
				}
			}
		});

		expect(data).toEqual({ user: { id: 'user-1', cid: '1234567' }, roles: [] });
	});
});
