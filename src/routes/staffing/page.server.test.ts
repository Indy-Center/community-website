import { describe, expect, it, vi } from 'vitest';
import type { ChannelSend } from '@indy-center/indy-larry-worker';
import { logger } from '$lib/server/logger';
import { actions, load } from './+page.server';

const pilot = {
	id: 'user-pat',
	cid: 1000200,
	firstName: 'Pat',
	lastName: 'Pilot',
	preferredName: null
};

const filledIn = {
	organization: 'Example Virtual',
	eventName: 'Midwest Fly-In',
	start: '2030-12-14T18:00:00.000Z',
	end: '2030-12-14T22:00:00.000Z',
	airports: 'KIND, KCVG',
	pilotCount: '40',
	link: 'https://example.test/fly-in',
	email: 'events@example.test',
	discord: '',
	details: 'Round robin between Indy and Cincinnati.'
};

/** A stand-in for Larry's binding that records what it was asked to send. */
function fakeLarry(fail = false) {
	const sent: ChannelSend[] = [];
	return {
		sent,
		async send(request: ChannelSend) {
			if (fail) throw new Error('Missing Access');
			sent.push(request);
			return { channelId: '1', messageId: '2' };
		}
	};
}

function submit(
	fields: Record<string, string>,
	{ user = pilot as object | null, larry = fakeLarry() } = {}
) {
	const request = new Request('https://flyindycenter.com/staffing', {
		method: 'POST',
		body: new URLSearchParams(fields)
	});
	const event = {
		request,
		locals: { user: user ?? undefined, roles: [] },
		platform: { env: { LARRY: larry } }
	};
	return actions.default(event as never) as Promise<{
		status?: number;
		data?: {
			form?: {
				valid: boolean;
				errors: Record<string, string[] | undefined>;
				message?: { type: string };
			};
		};
		form?: {
			valid: boolean;
			errors: Record<string, string[] | undefined>;
			message?: { type: string; text: string };
		};
	}>;
}

describe('/staffing', () => {
	it('shows a guest the sign-in prompt instead of the form', async () => {
		expect((await load({ locals: { roles: [] } } as never)).signedIn).toBe(false);
	});

	it('posts the request to beta testing as one embed, pinging nobody', async () => {
		const larry = fakeLarry();
		const result = await submit(filledIn, { larry });

		expect(result.form?.message?.type).toBe('success');
		expect(larry.sent).toHaveLength(1);
		const [message] = larry.sent;
		expect(message.channel).toBe('beta-testing');
		expect(message.allowedMentions).toEqual({ parse: [] });
		expect(message.buttons).toEqual([{ label: 'Event page', url: 'https://example.test/fly-in' }]);
		expect(message.embeds?.[0]).toMatchObject({
			title: 'Staffing request: Example Virtual',
			description: 'Round robin between Indy and Cincinnati.'
		});
		expect(Object.fromEntries(message.embeds![0].fields!.map((f) => [f.name, f.value]))).toEqual({
			Event: 'Midwest Fly-In',
			When: 'Sat, Dec 14, 2030, 1800Z–2200Z\n<t:1923501600:f> to <t:1923516000:t> your time',
			Airports: 'KIND, KCVG',
			'Expected pilots': '40',
			Contact: 'Email: events@example.test',
			'Submitted by': 'Pat Pilot (1000200)'
		});
	});

	it('adds a Discord username under the email, and leaves out the button without a link', async () => {
		const larry = fakeLarry();
		await submit({ ...filledIn, link: '', discord: 'pilot_pat' }, { larry });

		const [message] = larry.sent;
		expect(message.buttons).toBeUndefined();
		expect(message.embeds![0].fields!.find((f) => f.name === 'Contact')?.value).toBe(
			'Email: events@example.test\nDiscord: pilot_pat'
		);
	});

	it('asks for an email even with a Discord username, and sends nothing', async () => {
		const larry = fakeLarry();
		const result = await submit({ ...filledIn, email: '', discord: 'pilot_pat' }, { larry });

		expect(result.status).toBe(400);
		expect(result.data?.form?.errors.email).toEqual([
			'Enter an email address, such as you@example.com'
		]);
		expect(larry.sent).toHaveLength(0);
	});

	it('asks for an end after the start, and a start in the future', async () => {
		const backwards = await submit({ ...filledIn, end: '2030-12-14T17:00:00.000Z' });
		expect(backwards.data?.form?.errors.end).toEqual(['Pick an end after the start']);

		const past = await submit({
			...filledIn,
			start: '2020-01-01T18:00:00.000Z',
			end: '2020-01-01T22:00:00.000Z'
		});
		expect(past.data?.form?.errors.start).toEqual(['Pick a start in the future']);
	});

	it('names the end day when the event runs past midnight Zulu', async () => {
		const larry = fakeLarry();
		await submit(
			{ ...filledIn, start: '2030-12-14T23:00:00.000Z', end: '2030-12-15T02:00:00.000Z' },
			{ larry }
		);

		const when = larry.sent[0].embeds![0].fields!.find((f) => f.name === 'When')?.value;
		expect(when?.split('\n')[0]).toBe('Sat, Dec 14, 2030, 2300Z–Sun, Dec 15, 2030, 0200Z');
	});

	it('refuses a link that is not a web address', async () => {
		const result = await submit({ ...filledIn, link: 'javascript:alert(1)' });

		expect(result.status).toBe(400);
		expect(result.data?.form?.errors.link).toBeDefined();
	});

	it('tells the pilot when Larry refuses the message', async () => {
		const error = vi.spyOn(logger, 'error').mockImplementation(() => logger);
		const result = await submit(filledIn, { larry: fakeLarry(true) });

		expect(result.status).toBe(502);
		expect(result.data?.form?.message?.type).toBe('error');
		expect(error).toHaveBeenCalled();
		error.mockRestore();
	});

	it('refuses a guest', async () => {
		const larry = fakeLarry();
		const result = await submit(filledIn, { user: null, larry });

		expect(result.status).toBe(401);
		expect(larry.sent).toHaveLength(0);
	});
});
