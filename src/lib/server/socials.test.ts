import { describe, expect, it, vi } from 'vitest';
import type { User } from '$lib/db/schema/users';
import type { LarryBinding, Links } from './larry';
import { logger } from './logger';
import { socialSteps } from './socials';

const member = { cid: '1000001' } as User;
const discord = (extra: Record<string, unknown> = {}) =>
	({ id: '800000000000000001', source: 'vatusa', ...extra }) as Links['discord'];

function larryAnswering(links: Links | Error) {
	return {
		getLinks: vi.fn(async () => {
			if (links instanceof Error) throw links;
			return links;
		})
	} as unknown as LarryBinding & { getLinks: ReturnType<typeof vi.fn> };
}

describe('socialSteps', () => {
	it('asks a signed-out visitor to sign in for both, without asking larry', async () => {
		const larry = larryAnswering({ discord: discord(), teamspeak: null });

		expect(await socialSteps(larry, null)).toEqual({ discord: 'sign-in', teamspeak: 'sign-in' });
		expect(larry.getLinks).not.toHaveBeenCalled();
	});

	it.each([
		['is in the server', { inServer: true }, 'open'],
		['is not in the server', { inServer: false }, 'join'],
		["couldn't be checked with Discord", { inServer: null }, 'join'],
		['comes from a larry before 1.5.0, which does not say', {}, 'join']
	])('offers a member whose account %s: %s', async (_, extra, step) => {
		const larry = larryAnswering({ discord: discord(extra), teamspeak: null });

		expect((await socialSteps(larry, member)).discord).toBe(step);
		expect(larry.getLinks).toHaveBeenCalledWith(1000001);
	});

	it('offers Join to a member with no Discord account at all', async () => {
		const larry = larryAnswering({ discord: null, teamspeak: null });

		expect((await socialSteps(larry, member)).discord).toBe('join');
	});

	it('says TeamSpeak is linked when larry has their identity, and offers Connect when not', async () => {
		const linked = larryAnswering({ discord: null, teamspeak: { uid: 'x7Kq3dE=' } });
		const unlinked = larryAnswering({ discord: null, teamspeak: null });

		expect((await socialSteps(linked, member)).teamspeak).toBe('linked');
		expect((await socialSteps(unlinked, member)).teamspeak).toBe('connect');
	});

	it("offers Join and Connect when larry can't be asked", async () => {
		vi.spyOn(logger, 'error').mockImplementation(() => {});

		expect(await socialSteps(larryAnswering(new Error('larry is down')), member)).toEqual({
			discord: 'join',
			teamspeak: 'connect'
		});
		expect(await socialSteps(undefined, member)).toEqual({ discord: 'join', teamspeak: 'connect' });
	});
});
