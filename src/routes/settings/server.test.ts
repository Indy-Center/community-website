import { describe, expect, it } from 'vitest';
import { GET, POST } from './+server';

describe('/settings', () => {
	it('redirects to the profile in edit mode', () => {
		expect(() => GET()).toThrow(
			expect.objectContaining({ status: 302, location: '/profile?edit' })
		);
	});

	it('answers a POST with 405', () => {
		const response = POST();

		expect(response.status).toBe(405);
		expect(response.headers.get('Allow')).toBe('GET');
	});
});
