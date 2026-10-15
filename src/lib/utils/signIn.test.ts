import { describe, expect, it } from 'vitest';
import { signInHref } from './signIn';

describe('signInHref', () => {
	it('returns to the given path after signing in', () => {
		expect(signInHref('/partners/example-scenery')).toBe(
			'/login/connect?returnUrl=%2Fpartners%2Fexample-scenery'
		);
	});
});
