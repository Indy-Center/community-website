import { describe, expect, it } from 'vitest';
import { cmsPosition } from '$lib/testing/bookings';
import {
	briefingLength,
	composeBriefing,
	DISCORD_LIMIT,
	escapeMentions,
	fixedLength,
	rosterSections
} from './briefing';

// Every position and name here is made up
const zid = { id: 'ZID', name: 'Indianapolis ARTCC', parent: null };
const crw = { id: 'CRW', name: 'Charleston ATCT', parent: null };
const sdf = { id: 'SDF', name: 'Louisville ATCT/TRACON', parent: null };
const catalogue = [
	cmsPosition('CRW_GND', { id: 'crw-gnd', shortName: 'GC', facility: crw }),
	cmsPosition('CRW_TWR', { id: 'crw-twr', shortName: 'LC', facility: crw }),
	cmsPosition('CRW_APP', { id: 'crw-app', shortName: 'SR', facility: crw }),
	cmsPosition('IND_87_CTR', { id: 'ind-87', shortName: 'APE87', facility: zid }),
	cmsPosition('IND_24_CTR', { id: 'ind-24', shortName: 'PKB24', facility: zid }),
	cmsPosition('SDF_DEL', { id: 'sdf-del', shortName: null, facility: sdf })
];

const event = {
	name: 'Example Fly-In',
	startTime: new Date('2026-12-05T23:00:00Z'),
	url: 'https://flyindycenter.com/events/event-1'
};

describe('rosterSections', () => {
	it('lists the center first, then facilities alphabetically, top position down', () => {
		const sections = rosterSections(
			[
				{ positionId: 'sdf-del', holder: null },
				{ positionId: 'crw-gnd', holder: null },
				{ positionId: 'crw-twr', holder: null },
				{ positionId: 'ind-87', holder: null },
				{ positionId: 'crw-app', holder: 'Wiley Sample' },
				{ positionId: 'ind-24', holder: 'Stephen Example' }
			],
			catalogue
		);

		expect(sections).toEqual([
			'## __ZID__\nPKB24 - Stephen Example\nAPE87 - Vacant',
			'## __CRW__\nSR - Wiley Sample\nLC - Vacant\nGC - Vacant',
			// No short name: the callsign
			'## __SDF__\nSDF_DEL - Vacant'
		]);
	});

	it("puts positions the catalogue doesn't know last, by their ID", () => {
		expect(
			rosterSections(
				[
					{ positionId: 'gone', holder: 'Jordan Sample' },
					{ positionId: 'crw-twr', holder: null }
				],
				catalogue
			)
		).toEqual(['## __CRW__\nLC - Vacant', '## __Other__\ngone - Jordan Sample']);
	});

	it("never lets a member's name ping anyone", () => {
		const [section] = rosterSections([{ positionId: 'crw-twr', holder: '@everyone' }], catalogue);
		expect(section).not.toContain('@everyone');
	});
});

describe('escapeMentions', () => {
	it('breaks mass, user and role mentions, and keeps the rest', () => {
		const escaped = escapeMentions('Hi @everyone and @here, ask <@123> or <@&456>. a@b.com');

		expect(escaped).not.toMatch(/@everyone|@here|<@/);
		expect(escaped.replace(/​/g, '')).toBe(
			'Hi @everyone and @here, ask <@123> or <@&456>. a@b.com'
		);
	});

	it("uses Discord's line endings", () => {
		expect(escapeMentions('one\r\ntwo')).toBe('one\ntwo');
	});
});

describe('composeBriefing', () => {
	const sections = rosterSections(
		[
			{ positionId: 'ind-24', holder: 'Stephen Example' },
			{ positionId: 'crw-twr', holder: null }
		],
		catalogue
	);

	it('pings the role, links the event and gives its start, then the briefing and roster', () => {
		expect(composeBriefing(event, '42', 'Expect heavy arrivals.', sections)).toEqual([
			[
				'<@&42>',
				'# [Example Fly-In](<https://flyindycenter.com/events/event-1>)',
				'Event starts at <t:1796511600:f> (<t:1796511600:R>)',
				'',
				'Expect heavy arrivals.',
				'',
				'## __ZID__',
				'PKB24 - Stephen Example',
				'## __CRW__',
				'LC - Vacant'
			].join('\n')
		]);
	});

	it('counts exactly what is posted, keeping room for the longest ping', () => {
		const fixed = fixedLength(event, sections);
		const text = 'Line one\r\nLine two @here';
		const [posted] = composeBriefing(event, '4'.repeat(20), text, sections);

		expect(briefingLength(fixed, text)).toBe(posted.length);
		expect(briefingLength(fixed, '   ')).toBe(fixed);
	});

	it('moves the roster to messages of its own once it no longer fits', () => {
		const text = 'x'.repeat(DISCORD_LIMIT - 150);
		const messages = composeBriefing(event, '42', text, sections);

		expect(messages).toHaveLength(2);
		expect(messages[0].endsWith(text)).toBe(true);
		expect(messages[1]).toBe(sections.join('\n'));
		messages.forEach((message) => expect(message.length).toBeLessThanOrEqual(DISCORD_LIMIT));
	});

	it('splits a roster too long for one message between facilities, and by line within one', () => {
		const long = Array.from({ length: 150 }, (_, i) => `POS${i} - Somebody Example`);
		const big = [`## __ZID__\n${long.join('\n')}`, '## __CRW__\nLC - Vacant'];
		const messages = composeBriefing(event, '42', 'Brief.', big);

		expect(messages.length).toBeGreaterThan(2);
		messages.forEach((message) => expect(message.length).toBeLessThanOrEqual(DISCORD_LIMIT));
		expect(messages.slice(1).join('\n')).toBe(big.join('\n'));
	});
});
